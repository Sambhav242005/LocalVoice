"""Pinned downloads with bounded memory hashing; no inferred readiness."""
import hashlib
import json
import urllib.request
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
CACHE = ROOT / '.localvoice-pc'


def bundles():
    mobile = json.loads((ROOT / 'src/data/models.json').read_text(encoding='utf-8'))
    pc = json.loads((ROOT / 'pc/models.json').read_text(encoding='utf-8'))
    return {bundle['id']: bundle for bundle in [next(b for b in mobile if b['id'] == 'llm'), *pc]}


def verify(path, file):
    if not path.is_file() or path.stat().st_size != file['bytes']:
        return False
    digest = hashlib.sha256()
    with path.open('rb') as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b''):
            digest.update(chunk)
    return digest.hexdigest() == file['sha256']


def prepare(model_id, update, cancelled):
    bundle = bundles()[model_id]
    directory = CACHE / 'models' / model_id
    total = sum(file['bytes'] for file in bundle['files'])
    complete = 0
    for file in bundle['files']:
        if cancelled():
            raise RuntimeError('Operation cancelled.')
        destination = directory / file['path']
        destination.parent.mkdir(parents=True, exist_ok=True)
        update('verifying', f"Verifying {file['path']}", complete / total)
        if not verify(destination, file):
            partial = destination.with_name(destination.name + '.part')
            # Restart incomplete transfers rather than trusting unvalidated range support.
            request = urllib.request.Request(file['url'], headers={'User-Agent': 'LocalVoice-PC/1'})
            with urllib.request.urlopen(request, timeout=60) as response, partial.open('wb') as output:
                downloaded = 0
                while chunk := response.read(1024 * 1024):
                    if cancelled():
                        raise RuntimeError('Operation cancelled.')
                    output.write(chunk)
                    downloaded += len(chunk)
                    update('downloading', f"Downloading {file['path']}", (complete + downloaded) / total)
                    if downloaded > file['bytes']:
                        raise ValueError('Download exceeded pinned size.')
            if not verify(partial, file):
                raise ValueError(f"Integrity check failed: {file['path']}")
            partial.replace(destination)
        complete += file['bytes']
    return directory
