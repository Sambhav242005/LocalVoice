"""Local authenticated PC runtime. No public listener, phone numbers or telephony actions."""
import argparse
import base64
import hmac
import json
import os
import queue
import secrets
import subprocess
import sys
import threading
import time
import urllib.error
import urllib.request
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer

from assets import CACHE, ROOT, bundles, prepare


class Runtime:
    def __init__(self):
        self.lock = threading.RLock()
        self.operation = threading.Lock()
        self.epoch = 0
        self.processes = {}
        self.replies = {}
        self.states = {key: {'status': 'unloaded', 'message': 'Not loaded on PC.'} for key in ('llm', 'asr', 'tts')}
        self.last_ms = None

    def update(self, key, status, message, progress=None):
        with self.lock:
            self.states[key] = {'status': status, 'message': message, 'progress': progress}

    def snapshot(self):
        with self.lock:
            result = {'version': 1, 'host': 'pc', 'models': {k: dict(v) for k, v in self.states.items()},
                      'busy': self.operation.locked(), 'lastInferenceMs': self.last_ms,
                      'callAudio': 'not-validated', 'realCalls': False}
        try:
            result['bluetooth'] = json.loads((CACHE / 'bluetooth-probe.json').read_text(encoding='utf-8'))
            if time.time() - result['bluetooth'].get('updatedAt', 0) > 10:
                result['bluetooth'].update(advertising=False, hfpConnected=False, scoConnected=False)
        except (OSError, ValueError):
            result['bluetooth'] = {'advertising': False, 'realCallValidated': False}
        return result

    def start_load(self, key):
        if key not in self.states:
            raise ValueError('Unknown model.')
        if not self.operation.acquire(blocking=False):
            raise ValueError('Wait for the current PC operation.')
        if key in self.processes:
            self.operation.release()
            raise ValueError('Unload the model before replacing it.')
        epoch = self.epoch
        self.update(key, 'verifying', 'Checking PC assets…', 0)

        def load():
            started = time.monotonic()
            try:
                directory = prepare(key, lambda *args: self.update(key, *args) if self.epoch == epoch else None,
                                    lambda: self.epoch != epoch)
                if key == 'tts':
                    prepare('vocoder', lambda *args: self.update(key, *args) if self.epoch == epoch else None, lambda: self.epoch != epoch)
                if self.epoch != epoch:
                    return
                self.update(key, 'loading', 'Loading into PC memory…')
                log = (CACHE / f'{key}.log').open('a', encoding='utf-8')
                with self.lock:
                    if self.epoch != epoch:
                        log.close()
                        return
                    if key == 'llm':
                        executable = next((CACHE / 'llama-b11516').rglob('llama-server.exe'), None)
                        if not executable:
                            raise ValueError('Run scripts/setup-pc.ps1 to install the pinned llama-server.')
                        path = directory / bundles()[key]['files'][0]['path']
                        command = [str(executable), '-m', str(path), '--host', '127.0.0.1', '--port', '8091',
                                   '-c', '2048', '-ngl', '99', '--jinja', '--reasoning', 'off', '--no-webui']
                        process = subprocess.Popen(command, stdout=log, stderr=log, creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                    else:
                        process = subprocess.Popen([sys.executable, str(ROOT / 'pc/worker.py'), key], stdin=subprocess.PIPE,
                                                   stdout=subprocess.PIPE, stderr=log, text=True, encoding='utf-8',
                                                   env={**os.environ, 'PYTHONUTF8': '1', 'HF_HUB_OFFLINE': '1', 'TRANSFORMERS_OFFLINE': '1'},
                                                   creationflags=getattr(subprocess, 'CREATE_NO_WINDOW', 0))
                        responses = queue.Queue()
                        self.replies[key] = responses

                        def read():
                            for line in process.stdout:
                                try:
                                    responses.put(json.loads(line))
                                except ValueError:
                                    pass
                            responses.put({'error': 'PC worker exited. See its local log.'})
                        threading.Thread(target=read, daemon=True).start()
                    self.processes[key] = process
                log.close()
                if key == 'llm':
                    deadline = time.monotonic() + 180
                    while time.monotonic() < deadline:
                        if self.epoch != epoch:
                            return
                        if process.poll() is not None:
                            raise ValueError('llama-server exited. See .localvoice-pc/llm.log.')
                        try:
                            with urllib.request.urlopen('http://127.0.0.1:8091/health', timeout=2) as response:
                                if response.status == 200:
                                    break
                        except (OSError, urllib.error.URLError):
                            time.sleep(0.25)
                    else:
                        raise ValueError('PC model initialization timed out.')
                    self.completion('Say hello in one short sentence.', 'Be brief.')
                    status, message = 'ready', 'LFM loaded on PC; warm-up inference passed.'
                else:
                    reply = self.replies[key].get(timeout=300)
                    if reply.get('error'):
                        raise ValueError(reply['error'])
                    status, message = 'loaded', reply['message']
                if self.epoch == epoch:
                    self.update(key, status, message)
                    self.states[key]['elapsedMs'] = round((time.monotonic() - started) * 1000)
            except Exception as error:
                if self.epoch == epoch:
                    self.kill(key)
                    self.update(key, 'error', str(error))
            finally:
                self.operation.release()
        threading.Thread(target=load, daemon=True).start()

    def completion(self, text, instructions):
        body = json.dumps({'messages': [{'role': 'system', 'content': instructions}, {'role': 'user', 'content': text}],
                           'max_tokens': 256, 'temperature': 0.2, 'stream': False,
                           'chat_template_kwargs': {'enable_thinking': False}}).encode()
        request = urllib.request.Request('http://127.0.0.1:8091/v1/chat/completions', data=body,
                                         headers={'Content-Type': 'application/json'})
        with urllib.request.urlopen(request, timeout=120) as response:
            content = json.load(response)['choices'][0]['message']['content']
        if not content or not content.strip():
            raise ValueError('PC model returned no final reply.')
        return {'text': content.strip()}

    def infer(self, key, request, locked=False):
        if not locked and not self.operation.acquire(blocking=False):
            raise ValueError('Wait for the current PC operation.')
        epoch = self.epoch
        started = time.monotonic()
        try:
            if self.states[key]['status'] not in ('ready', 'loaded'):
                raise ValueError('Load the PC model first.')
            if key == 'llm':
                result = self.completion(request['text'], request.get('instructions', 'Be brief and helpful.'))
            else:
                process = self.processes[key]
                process.stdin.write(json.dumps(request) + '\n')
                process.stdin.flush()
                result = self.replies[key].get(timeout=180)
                if result.get('error'):
                    raise ValueError(result['error'])
            if epoch != self.epoch:
                raise ValueError('Generation cancelled.')
            self.last_ms = round((time.monotonic() - started) * 1000)
            self.update(key, 'ready', 'PC inference test passed.')
            return {**result, 'elapsedMs': self.last_ms, 'host': 'pc'}
        except queue.Empty:
            self.kill(key)
            self.update(key, 'error', 'Inference timed out; worker released.')
            raise ValueError('PC inference timed out.')
        finally:
            if not locked:
                self.operation.release()

    def pipeline(self, request):
        if not self.operation.acquire(blocking=False):
            raise ValueError('Wait for the current PC operation.')
        epoch = self.epoch
        started = time.monotonic()
        try:
            for key in ('tts', 'asr', 'llm'):
                if self.states[key]['status'] not in ('ready', 'loaded'):
                    raise ValueError('Load all three PC models before the synthetic voice test.')
            source = self.infer('tts', request, locked=True)
            if self.epoch != epoch:
                raise ValueError('Voice test cancelled.')
            transcript = self.infer('asr', {'audio': source['audio'], 'language': 'hi-IN' if request.get('language') == 'hi-IN' else 'en-US'}, locked=True)
            if not transcript['text']:
                raise ValueError('No speech decoded from the generated test clip.')
            reply = self.infer('llm', {'text': transcript['text'], 'instructions': request.get('instructions', 'Be brief.')}, locked=True)
            voice = self.infer('tts', {'text': reply['text'], 'language': request.get('language', 'en-IN')}, locked=True)
            if self.epoch != epoch:
                raise ValueError('Voice test cancelled.')
            return {**voice, 'transcript': transcript['text'], 'reply': reply['text'], 'synthetic': True,
                    'elapsedMs': round((time.monotonic() - started) * 1000)}
        finally:
            self.operation.release()

    def kill(self, key):
        with self.lock:
            process = self.processes.get(key)
            if process:
                if process.poll() is None:
                    process.terminate()
                    try:
                        process.wait(timeout=5)
                    except subprocess.TimeoutExpired:
                        process.kill()
                        process.wait(timeout=5)
                self.processes.pop(key, None)
                self.replies.pop(key, None)

    def stop(self):
        with self.lock:
            self.epoch += 1
        for key in list(self.states):
            self.kill(key)
            self.update(key, 'unloaded', 'Stopped and released PC engine.')
        if sys.platform == 'win32':
            import winsound
            winsound.PlaySound(None, 0)
        return self.snapshot()


def handler(runtime, token):
    class Handler(BaseHTTPRequestHandler):
        def log_message(self, *_):
            pass  # Do not log prompts, audio or credentials.

        def send_json(self, code, value):
            body = json.dumps(value).encode()
            self.send_response(code)
            self.send_header('Content-Type', 'application/json')
            self.send_header('Content-Length', str(len(body)))
            self.send_header('Cache-Control', 'no-store')
            self.end_headers()
            try:
                self.wfile.write(body)
            except (BrokenPipeError, ConnectionResetError):
                pass

        def authorized(self):
            if not hmac.compare_digest(self.headers.get('Authorization', ''), f'Bearer {token}'):
                self.send_json(401, {'error': 'Pairing token required.'})
                return False
            return True

        def do_GET(self):
            if self.authorized():
                self.send_json(200 if self.path == '/status' else 404, runtime.snapshot() if self.path == '/status' else {'error': 'Not found.'})

        def do_POST(self):
            if not self.authorized():
                return
            try:
                size = int(self.headers.get('Content-Length', '0'))
                if size < 0 or size > 8 * 1024 * 1024:
                    self.send_json(413, {'error': 'Request too large; use a short audio sample.'})
                    return
                body = json.loads(self.rfile.read(size) or b'{}')
                if self.path == '/stop':
                    self.send_json(200, runtime.stop())
                elif self.path.startswith('/models/') and self.path.endswith('/load'):
                    runtime.start_load(self.path.split('/')[2])
                    self.send_json(202, runtime.snapshot())
                elif self.path in ('/chat', '/transcribe', '/synthesize', '/pipeline-test'):
                    key = {'/chat': 'llm', '/transcribe': 'asr', '/synthesize': 'tts', '/pipeline-test': 'tts'}[self.path]
                    if key != 'asr' and (not isinstance(body.get('text'), str) or not 0 < len(body['text']) <= 4000):
                        raise ValueError('Text must contain 1–4000 characters.')
                    request_epoch = runtime.epoch
                    result = runtime.pipeline(body) if self.path == '/pipeline-test' else runtime.infer(key, body)
                    if key == 'tts' and body.get('play') is True:
                        if sys.platform != 'win32':
                            raise ValueError('PC speaker preview currently requires Windows.')
                        import winsound
                        with runtime.lock:
                            if runtime.epoch != request_epoch:
                                raise ValueError('Playback cancelled.')
                            path = CACHE / 'voice-preview.wav'
                            path.write_bytes(base64.b64decode(result['audio'], validate=True))
                            winsound.PlaySound(str(path), winsound.SND_FILENAME | winsound.SND_ASYNC)
                        result = {k: v for k, v in result.items() if k != 'audio'}
                    self.send_json(200, result)
                else:
                    self.send_json(404, {'error': 'Not found.'})
            except (ValueError, KeyError, OSError, queue.Empty) as error:
                self.send_json(400, {'error': str(error)})
    return Handler


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--port', type=int, default=8090)
    args = parser.parse_args()
    CACHE.mkdir(parents=True, exist_ok=True)
    token_path = CACHE / 'pairing-token.txt'
    if not token_path.exists():
        token_path.write_text(secrets.token_urlsafe(32), encoding='utf-8')
    token = token_path.read_text(encoding='utf-8').strip()
    runtime = Runtime()
    server = ThreadingHTTPServer(('127.0.0.1', args.port), handler(runtime, token))
    print(f'LocalVoice PC listening on 127.0.0.1:{args.port}. Pairing token: {token_path}', flush=True)
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        pass
    finally:
        runtime.stop()
        server.server_close()


if __name__ == '__main__':
    main()
