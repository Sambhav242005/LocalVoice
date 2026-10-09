# PC and mobile runtime

The owner's current direction is PC-hosted AI with an Expo Android controller. PC mode is the default. The phone does not automatically download or load models in PC mode. The existing mobile experiment remains selectable. Real SIM audio and automatic answering are still disconnected.

## Run on this Windows PC

Python 3.12, uv, and an NVIDIA driver are used. This workstation has 32 GB RAM and an RTX 4070 Ti with 12 GB VRAM. The runtime listens only on loopback; it does not open a firewall port or expose a public service.

```powershell
uv venv --python 3.12 .venv-pc
uv pip install --python .venv-pc/Scripts/python.exe torch==2.11.0 torchaudio==2.11.0 --index https://download.pytorch.org/whl/cu128
uv pip install --python .venv-pc/Scripts/python.exe -r pc/requirements.lock.txt
npm run pc:setup
npm run pc:start
```

`pc:setup` downloads and verifies the pinned llama.cpp b11516 Windows CUDA binaries and LFM Q4_K_M. Use `powershell -File scripts/setup-pc.ps1 -Cpu` for CPU-only llama.cpp. Python ASR/TTS choose CUDA when available; CPU performance is not validated.

In Models, enter the token from `.localvoice-pc/pairing-token.txt`. It is a local development credential, stored in the prototype's unencrypted app preferences; production pairing requires secure storage and rotation. Never commit or send the token to a remote service.

For emulator or physical phone over USB:

```powershell
adb -s <device-serial> reverse tcp:8090 tcp:8090
```

Use `http://127.0.0.1:8090` in Models with USB reverse. The emulator can alternatively use `http://10.0.2.2:8090`. LAN access is intentionally not implemented; cleartext development traffic is confined to localhost/USB. Web remains a UI preview.

## Models and actual readiness

- LFM: the existing pinned 2.6B Q4_K_M GGUF runs in llama-server on the PC. Loading includes SHA-256 verification and a real warm-up request before `ready`.
- Nemotron: the pinned NVIDIA Transformers checkpoint runs in a separate Python process, with FP16 on this GPU. It is distinct from the Android community INT4 ONNX bundle. `loaded` means initialization only; a real WAV transcription must pass before `ready`.
- KittenTTS 2: pinned Python packed weights, student_w4 decoder, speaker/voice files, and a separately pinned Chatterbox S3 vocoder run on the PC. This differs from the Android C++ bundle. Successful speech synthesis promotes it from `loaded` to `ready`.

Model assets are in ignored `.localvoice-pc/models/`. Revisions, byte sizes and SHA-256 are pinned in `pc/models.json` and the existing mobile LFM manifest. Downloads and hashing use bounded buffers. PC loading downloads missing files automatically; interrupted Python transfers restart the incomplete file on retry. It does not yet provide background job recovery or range resume.

The app polls status every two seconds and announces transitions to inference-ready. The service shows downloading, verifying, loading, loaded, ready and error separately. Measurements are for individual requests, not quality scores or aggregate benchmarks.

PC stop remains visible across routes while models are resident or an operation is running. Response length limits and instruction-following still need conversational tuning; inference success is not a call-quality assessment.

## API

All routes require `Authorization: Bearer <pairing-token>`.

| Route | Purpose |
|---|---|
| GET `/status` | PC models, operation status and emulator Bluetooth probe |
| POST `/models/llm/load`, `/models/asr/load`, `/models/tts/load` | Download, verify and initialize one model |
| POST `/chat` | `{text, instructions}` → actual LFM reply |
| POST `/transcribe` | `{audio, language}` → transcript; audio is base64 WAV, at most 60 seconds |
| POST `/synthesize` | `{text, language, play?}` → generated WAV or optional Windows speaker preview |
| POST `/pipeline-test` | Synthetic Kitten → Nemotron → LFM → Kitten test, with optional PC speaker playback |
| POST `/stop` | Cancel downloads/loading, terminate inference processes, await exit, stop PC playback |

Stop releases the models; reload before another test. A failed stop is an error, never a completed call. No endpoint dials, answers or forwards real calls. Prompts/audio/tokens are not added to HTTP access logs. Local test audio files are unencrypted and must be deleted when no longer wanted.

## Emulator virtual Bluetooth experiment

```powershell
emulator -avd medium_phone -no-snapshot-load -packet-streamer-endpoint default
npm run pc:bluetooth-test
```

The test uses Bumble 0.0.235 and Netsim/RootCanal. Pair **LocalVoice PC headset test** in the emulator's Bluetooth settings. The probe advertises the HFP hands-free service and negotiates with the emulator's phone audio gateway. Its timestamped report is `.localvoice-pc/bluetooth-probe.json`; stale reports are shown disconnected. Link keys stay in the ignored private cache.

Synthetic calls can be injected using `adb -s emulator-5554 emu gsm call 5550100`, accepted with `gsm accept`, and ended with `gsm cancel`. These commands affect the emulator only. HFP connection, SCO establishment, received audio bytes and physical SIM validation are separate fields. An HFP connection alone does not prove PCM capture or injection.

This virtual radio does not connect to the actual Samsung phone. A physical phone needs an external PC Bluetooth HFP endpoint and a working SCO audio interface on Windows, or dedicated bridge hardware. Windows Phone Link call control alone does not establish an AI-accessible PCM interface.

## Remaining work

1. HFP and SCO links have been established in the emulator; raw packets were received. Validate that packet payloads are usable speech PCM and prove two-way audio, rather than treating link establishment as an audio test.
2. Validate a physical PC/phone headset endpoint with a controlled call: caller audio reaches PC and generated audio reaches the caller. No auto-answer before this passes.
3. Add audio resampling, VAD, echo handling, streaming ASR and barge-in to the PC controller. The current ASR API processes finite WAV clips.
4. Wire manual approval/unanswered policy to the validated adapter. Stop must cancel models, playback and the actual call transport before history completion.
5. Add grounded PC-generated summaries and incremental transcripts to the app's call history. Current demo calls and recaps remain scripted.
6. Test English/Hindi, remote hangup, disconnect/reconnect, cancellation, background app behavior and a 20-minute real-call soak. Encrypt/retain/delete production data and secure pairing before release.

## Primary references

- [llama.cpp server](https://github.com/ggml-org/llama.cpp/tree/master/tools/server)
- [NVIDIA Nemotron model and Transformers usage](https://huggingface.co/nvidia/nemotron-3.5-asr-streaming-0.6b)
- [KittenTTS 2 model](https://huggingface.co/KittenML/kitten-tts-2)
- [Bumble Android emulator integration](https://google.github.io/bumble/platforms/android.html)
