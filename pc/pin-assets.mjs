// Intentionally refresh this manifest only after reviewing upstream revisions.
import { createHash } from 'node:crypto';
import { writeFile } from 'node:fs/promises';
const specs = [
  { id: 'asr', repo: 'nvidia/nemotron-3.5-asr-streaming-0.6b', revision: 'ea30d66debe3740a08b573244286791d423d6b3e', select: path => path.endsWith('.json') || path === 'model.safetensors' },
  { id: 'tts', repo: 'KittenML/kitten-tts-2', revision: 'f2eee74f4467855ad58fe16f1fb7b7df473263fd', select: path => path === 'config.json' || path === 'decoders/student_w4.pt' || path === 'speaker/model.safetensors' || (path.startsWith('lm/') && !path.endsWith('.safetensors')) || path === 'lm/model-ternary.safetensors' || path.startsWith('voices/') },
  { id: 'vocoder', repo: 'ResembleAI/chatterbox-turbo', revision: '749d1c1a46eb10492095d68fbcf55691ccf137cd', select: path => path === 's3gen_meanflow.safetensors' },
];
const bundles = [];
for (const { select, ...spec } of specs) {
  const response = await fetch(`https://huggingface.co/api/models/${spec.repo}/revision/${spec.revision}?blobs=true`);
  if (!response.ok) throw new Error(`Metadata HTTP ${response.status}`);
  const metadata = await response.json();
  const files = [];
  for (const file of metadata.siblings.filter(file => select(file.rfilename))) {
    const url = `https://huggingface.co/${spec.repo}/resolve/${spec.revision}/${file.rfilename}`;
    let sha256 = file.lfs?.sha256;
    if (!sha256) {
      if (file.size > 5_000_000) throw new Error(`No streaming digest for ${file.rfilename}`);
      const small = await fetch(url);
      if (!small.ok) throw new Error(`File HTTP ${small.status}`);
      sha256 = createHash('sha256').update(Buffer.from(await small.arrayBuffer())).digest('hex');
    }
    files.push({ path: file.rfilename, bytes: file.size, sha256, url });
  }
  bundles.push({ ...spec, files });
}
await writeFile(new URL('./models.json', import.meta.url), `${JSON.stringify(bundles, null, 2)}\n`);
console.log('Pinned PC ASR and TTS assets. Review pc/models.json before inference.');
