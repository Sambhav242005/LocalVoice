import hashlib
import json
import sys
import tempfile
import threading
import unittest
import urllib.error
import urllib.request
from http.server import ThreadingHTTPServer
from pathlib import Path
from unittest.mock import Mock

sys.path.insert(0, str(Path(__file__).resolve().parents[1]))
from assets import verify, bundles
from server import Runtime, handler


class RuntimeTests(unittest.TestCase):
    def test_corrupt_or_truncated_weights_fail_integrity(self):
        with tempfile.TemporaryDirectory() as directory:
            path = Path(directory) / 'weights'
            file = {'bytes': 4, 'sha256': hashlib.sha256(b'good').hexdigest()}
            path.write_bytes(b'bad')
            self.assertFalse(verify(path, file))
            path.write_bytes(b'evil')
            self.assertFalse(verify(path, file))
            path.write_bytes(b'good')
            self.assertTrue(verify(path, file))

    def test_manifest_pins_every_pc_asset(self):
        for bundle in bundles().values():
            self.assertEqual(len(bundle['revision']), 40)
            for file in bundle['files']:
                self.assertEqual(len(file['sha256']), 64)
                self.assertGreater(file['bytes'], 0)
                self.assertNotIn('..', Path(file['path']).parts)
                self.assertFalse(Path(file['path']).is_absolute())
                self.assertIn(bundle['revision'], file['url'])

    def test_stop_waits_for_process_exit_before_reporting_unloaded(self):
        runtime = Runtime()
        process = Mock()
        process.poll.return_value = None
        runtime.processes['llm'] = process
        old_epoch = runtime.epoch
        result = runtime.stop()
        process.terminate.assert_called_once()
        process.wait.assert_called_once_with(timeout=5)
        self.assertGreater(runtime.epoch, old_epoch)
        self.assertEqual(result['models']['llm']['status'], 'unloaded')
        self.assertFalse(runtime.processes)

    def test_failed_process_release_cannot_claim_success(self):
        runtime = Runtime()
        process = Mock()
        process.poll.return_value = None
        process.wait.side_effect = OSError('cannot wait')
        runtime.processes['llm'] = process
        with self.assertRaises(OSError):
            runtime.stop()
        self.assertIn('llm', runtime.processes)

    def test_unpaired_requests_cannot_load_models(self):
        runtime = Runtime()
        server = ThreadingHTTPServer(('127.0.0.1', 0), handler(runtime, 'test-token'))
        thread = threading.Thread(target=server.serve_forever, daemon=True)
        thread.start()
        try:
            url = f'http://127.0.0.1:{server.server_port}/models/llm/load'
            request = urllib.request.Request(url, data=b'{}', headers={'Content-Type': 'application/json'})
            with self.assertRaises(urllib.error.HTTPError) as failure:
                urllib.request.urlopen(request)
            self.assertEqual(failure.exception.code, 401)
            self.assertFalse(runtime.processes)
            self.assertFalse(runtime.operation.locked())
        finally:
            server.shutdown()
            server.server_close()

    def test_synthetic_pipeline_reserves_the_controller_and_cancels_between_stages(self):
        runtime = Runtime()
        for key in runtime.states:
            runtime.update(key, 'ready', 'ready')
        def first_stage(*_, **__):
            self.assertTrue(runtime.operation.locked())
            runtime.epoch += 1
            return {'audio': 'fixture'}
        runtime.infer = Mock(side_effect=first_stage)
        with self.assertRaisesRegex(ValueError, 'cancelled'):
            runtime.pipeline({'text': 'test'})
        runtime.infer.assert_called_once()
        self.assertFalse(runtime.operation.locked())


if __name__ == '__main__':
    unittest.main()
