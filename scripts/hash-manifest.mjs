import { readFile, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const path = 'src/data/models.json';
const models = JSON.parse(await readFile(path, 'utf8'));
for (const model of models) {
  for (const file of model.files) {
    if (file.sha256) continue;
    if (file.bytes > 5 * 1024 ** 2) throw new Error(`Published hash required for large asset: ${file.path}`);
    const response = await fetch(file.url);
    if (!response.ok) throw new Error(`HTTP ${response.status}: ${file.path}`);
    const bytes = Buffer.from(await response.arrayBuffer());
    if (bytes.length !== file.bytes) throw new Error(`Size mismatch: ${file.path}`);
    file.sha256 = createHash('sha256').update(bytes).digest('hex');
  }
}
await writeFile(path, JSON.stringify(models, null, 2) + '\n');
console.log('Hashed pinned small metadata files; revisions unchanged.');
