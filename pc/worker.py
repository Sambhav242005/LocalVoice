"""Isolated ASR/TTS processes: cancellation terminates the process and releases GPU memory."""
import base64
import contextlib
import io
import json
import sys
import traceback

from assets import CACHE


def emit(result):
    print(json.dumps(result), flush=True)


def main():
    model_id = sys.argv[1]
    directory = CACHE / 'models' / model_id
    # Keep third-party progress/prints out of the JSON protocol.
    with contextlib.redirect_stdout(sys.stderr):
        if model_id == 'asr':
            import torch
            from transformers import AutoModelForRNNT, AutoProcessor
            processor = AutoProcessor.from_pretrained(str(directory), local_files_only=True)
            model = AutoModelForRNNT.from_pretrained(str(directory), local_files_only=True,
                                                    dtype=torch.float16 if torch.cuda.is_available() else torch.float32).to('cuda' if torch.cuda.is_available() else 'cpu')
            model.eval()
        else:
            import kittenml.kittentts2.vocoder as vocoder
            def pinned_vocoder(repo_id, filename, **_):
                if repo_id != 'ResembleAI/chatterbox-turbo' or filename != 's3gen_meanflow.safetensors':
                    raise ValueError('Unpinned auxiliary model requested.')
                return str(CACHE / 'models/vocoder/s3gen_meanflow.safetensors')
            vocoder.hf_hub_download = pinned_vocoder
            from kittenml import KittenTTS
            model = KittenTTS(str(directory), weights='packed', decoder='student_w4')
    emit({'status': 'loaded', 'message': 'PC engine initialized; awaiting an inference test.'})
    for line in sys.stdin:
        try:
            request = json.loads(line)
            with contextlib.redirect_stdout(sys.stderr):
                import numpy as np
                import soundfile as sf
                if model_id == 'asr':
                    import torch
                    import scipy.signal
                    audio, rate = sf.read(io.BytesIO(base64.b64decode(request['audio'], validate=True)), dtype='float32')
                    if len(audio) > rate * 60:
                        raise ValueError('Use a test clip of at most 60 seconds.')
                    if audio.ndim > 1:
                        audio = audio.mean(axis=1)
                    target = processor.feature_extractor.sampling_rate
                    if rate != target:
                        from math import gcd
                        factor = gcd(rate, target)
                        audio = scipy.signal.resample_poly(audio, target // factor, rate // factor)
                    inputs = processor(audio, sampling_rate=target, language=request.get('language', 'auto'))
                    inputs.to(model.device, dtype=model.dtype)
                    with torch.inference_mode():
                        output = model.generate(**inputs, return_dict_in_generate=True)
                    decoded = processor.decode(output.sequences, skip_special_tokens=True)
                    result = {'text': (decoded[0] if isinstance(decoded, list) else decoded).strip()}
                else:
                    language = request.get('language', 'en-IN')
                    audio = model.generate(request['text'], voice='Hindi' if language == 'hi-IN' else 'Bruno',
                                           normalize=language != 'hi-IN')
                    buffer = io.BytesIO()
                    sf.write(buffer, np.asarray(audio), model.sample_rate, format='WAV', subtype='PCM_16')
                    result = {'audio': base64.b64encode(buffer.getvalue()).decode(), 'sampleRate': model.sample_rate}
            emit(result)
        except Exception as error:
            traceback.print_exc(file=sys.stderr)
            emit({'error': str(error)})


if __name__ == '__main__':
    try:
        main()
    except Exception as error:
        traceback.print_exc(file=sys.stderr)
        emit({'error': str(error)})
        sys.exit(1)
