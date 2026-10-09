import { mkdir, writeFile } from 'node:fs/promises';
import { createHash } from 'node:crypto';
const definitions = [
  { id: 'asr', name: 'Nemotron 3.5 ASR', role: 'Speech recognition', repo: 'onnx-community/nemotron-3.5-asr-streaming-0.6b-onnx-int4', experimental: false, files: ['encoder.onnx', 'encoder.onnx.data', 'decoder.onnx', 'decoder.onnx.data', 'joint.onnx', 'joint.onnx.data', 'silero_vad.onnx', 'audio_processor_config.json', 'model_config.json', 'genai_config.json', 'tokenizer.json', 'tokenizer_config.json', 'vocab.txt'] },
  { id: 'llm', name: 'LFM2.5-2.6B', role: 'Conversation', repo: 'LiquidAI/LFM2.5-2.6B-GGUF', experimental: false, files: ['LFM2.5-2.6B-Q4_K_M.gguf'] },
  { id: 'tts', name: 'KittenTTS 2', role: 'Speech output · experimental C++ bundle', repo: 'KittenML/kitten-tts-2', experimental: true, files: ['cpp/model-tq2_1.gguf', 'cpp/student_w4/decoder.pt', 'cpp/student_w4/voices.json', 'config.json'] },
];
const models = [];
for (const definition of definitions) {
  const response = await fetch(`https://huggingface.co/api/models/${definition.repo}?blobs=true`);
  if (!response.ok) throw new Error(`${definition.repo}: HTTP ${response.status}`);
  const metadata = await response.json();
  const files = await Promise.all(definition.files.map(async path => {
    const file = metadata.siblings.find(item => item.rfilename === path);
    if (!file || !Number.isSafeInteger(file.size)) throw new Error(`Missing size: ${path}`);
    const url = `https://huggingface.co/${definition.repo}/resolve/${metadata.sha}/${path}`;
    let sha256 = file.lfs?.sha256;
    if (!sha256) {
      if (file.size > 5 * 1024 ** 2) throw new Error(`Published hash required: ${path}`);
      const asset = await fetch(url);
      if (!asset.ok) throw new Error(`HTTP ${asset.status}: ${path}`);
      const bytes = Buffer.from(await asset.arrayBuffer());
      if (bytes.length !== file.size) throw new Error(`Size mismatch: ${path}`);
      sha256 = createHash('sha256').update(bytes).digest('hex');
    }
    return { path, bytes: file.size, sha256, url };
  }));
  models.push({ ...definition, revision: metadata.sha, files, bytes: files.reduce((sum, file) => sum + file.bytes, 0) });
}
await mkdir('src/data', { recursive: true });
await writeFile('src/data/models.json', JSON.stringify(models, null, 2) + '\n');
console.log('Pinned three bundles and small metadata hashes. No model weights downloaded.');
