"""Real local-model acceptance using synthetic speech, never cellular calls."""
import argparse
import json
import time
import urllib.request
import urllib.error
from pathlib import Path

CACHE = Path(__file__).resolve().parent.parent / '.localvoice-pc'


def main():
    parser = argparse.ArgumentParser()
    parser.add_argument('--test-stop', action='store_true')
    args = parser.parse_args()
    token = (CACHE / 'pairing-token.txt').read_text(encoding='utf-8').strip()

    def request(path, body=None):
        data = None if body is None else json.dumps(body).encode()
        query = urllib.request.Request('http://127.0.0.1:8090' + path, data=data,
                                       headers={'Authorization': 'Bearer ' + token, 'Content-Type': 'application/json'})
        try:
            with urllib.request.urlopen(query, timeout=180) as response:
                return json.load(response)
        except urllib.error.HTTPError as error:
            raise RuntimeError(error.read().decode()) from error

    for key in ('llm', 'asr', 'tts'):
        status = request('/status')
        if status['models'][key]['status'] not in ('loaded', 'ready'):
            request(f'/models/{key}/load', {})
            deadline = time.monotonic() + 300
            while time.monotonic() < deadline:
                model = request('/status')['models'][key]
                if model['status'] == 'error':
                    raise RuntimeError(model['message'])
                if model['status'] in ('loaded', 'ready'):
                    break
                time.sleep(1)
            else:
                raise RuntimeError(f'{key} load timed out.')
        print(f'{key}: initialized on PC', flush=True)
    result = request('/pipeline-test', {'text': 'Hello, please tell me who you are.', 'language': 'en-IN',
                                      'instructions': 'You are LocalVoice, an AI assistant. Answer in one short sentence.'})
    import base64
    audio = base64.b64decode(result.pop('audio'), validate=True)
    (CACHE / 'pipeline-reply.wav').write_bytes(audio)
    result['audioBytes'] = len(audio)
    if not result['transcript'] or not result['reply'] or not audio:
        raise RuntimeError('Voice pipeline returned an empty result.')
    if args.test_stop:
        stopped = request('/stop', {})
        assert all(model['status'] == 'unloaded' for model in stopped['models'].values())
        result['stopValidated'] = True
    (CACHE / 'smoke-report.json').write_text(json.dumps(result, indent=2), encoding='utf-8')
    print(json.dumps(result, indent=2), flush=True)


if __name__ == '__main__':
    main()
