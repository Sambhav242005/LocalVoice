import test from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';

test('every loadable asset has a pinned revision, SHA-256 and safe relative path', async () => {
  const models = JSON.parse(await readFile(new URL('../src/data/models.json', import.meta.url), 'utf8'));
  for (const model of models) {
    assert.match(model.revision, /^[a-f0-9]{40}$/);
    assert.equal(model.bytes, model.files.reduce((total, file) => total + file.bytes, 0));
    for (const file of model.files) {
      assert.match(file.sha256, /^[a-f0-9]{64}$/);
      assert.ok(Number.isSafeInteger(file.bytes) && file.bytes > 0);
      assert.ok(!file.path.startsWith('/') && !file.path.includes('..'));
      assert.equal(file.url, `https://huggingface.co/${model.repo}/resolve/${model.revision}/${file.path}`);
    }
  }
});
