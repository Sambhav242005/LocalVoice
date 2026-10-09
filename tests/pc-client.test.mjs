import test from 'node:test';
import assert from 'node:assert/strict';
import { pcAddress, pcRequest } from '../src/core/pc-client.ts';

test('PC pairing refuses external addresses and URL credentials', () => {
  assert.equal(pcAddress(' http://10.0.2.2:8090 '), 'http://10.0.2.2:8090');
  for (const address of ['https://example.com', 'http://user:secret@localhost:8090', 'http://127.0.0.1:8090/other', 'file:///tmp/server']) assert.throws(() => pcAddress(address));
});

test('missing pairing token prevents transmitting a prompt', async () => {
  await assert.rejects(pcRequest('http://127.0.0.1:8090', '', '/chat', { text: 'private' }), /pairing token/);
});
