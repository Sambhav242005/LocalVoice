# PC/emulator validation — 9 October 2026

These are observed local tests, not physical SIM calling evidence or aggregate benchmarks.

## Environment

Windows PC, 32 GB RAM, NVIDIA RTX 4070 Ti 12 GB VRAM. Python 3.12.13, torch/torchaudio 2.11.0 CUDA 12.8, Transformers 5.19.0, kittenml 0.9.4, llama.cpp b11516 CUDA 13.4, Bumble 0.0.235. Android emulator 36.5.10, medium_phone Android 36 x86_64 image, Netsim virtual controller. Samsung phone was not attached to adb during these tests.

## Actual inference

- All selected PC weights were downloaded and verified with pinned byte sizes and streaming SHA-256 before loading.
- LFM 2.6B Q4_K_M warm-up passed. A separate prompt produced “Hello! How can I help you today?” in one measured request of 531 ms.
- Nemotron transcribed a Windows-synthesized English fixture, and then a KittenTTS-generated fixture, as “Hello, this is a local voice assistant test.” The latter measured 1,532 ms.
- KittenTTS produced a 24 kHz WAV containing 144,044 bytes in one measured request of 4,359 ms. Python UTF-8 mode corrected its Windows voice-file decoding failure without modifying package files.
- The combined synthetic Kitten → Nemotron → LFM → Kitten test returned the expected caller transcript, an actual model reply and nonempty generated reply audio. A test measured 9,609 ms for the entire synthetic chain. This includes generating the caller fixture, so it is not live-call response latency.
- The real authenticated stop endpoint returned all three models as unloaded after terminating their worker processes. Reload was tested afterward.

Repeated testing exposed that a 96-token LFM budget sometimes returned no final reply. The PC budget was increased to 256 tokens and a complete final reply was confirmed directly. Model identity/instruction-following, response limits and speech pacing still require tuning before real conversations.

## Emulator integration

- LocalVoice's actual Android development app displayed PC mode, accepted the masked pairing token and showed Connected through adb reverse on port 8090.
- The actual app's **Run synthetic PC voice test** produced the expected caller transcript, an LFM reply and PC speaker playback. One observed run took 27,813 ms including caller-fixture generation; this is not live-call response latency. All three models showed ready, and Stop PC AI was visible across routes.
- The emulator discovered and paired with LocalVoice PC headset test. HFP service-level connection completed; persistent test link keys enabled reconnection.
- A synthetic emulator GSM call established a CVSD SCO link after the probe distinguished legacy SCO parameters from eSCO S4 parameters.
- Raw SCO packets reached the PC. A later probe recorded a first packet of five zero bytes (`0000000000`). These are simulator packet observations, not validated 16-bit speech PCM. No real caller audio was captured and no AI audio was injected into a physical SIM call.
- Synthetic calls were ended after testing. SCO current state is shown independently from HFP connection and received packet counts. Stale probe reports are disconnected.

## Automated validation

TypeScript checks, Expo lint, domain/runtime/client tests and PC service tests cover pairing restrictions, integrity, cancellation and cleanup. Android/web exports and Expo Doctor are also checked. See the runbook for repeatable smoke testing:

```powershell
.venv-pc/Scripts/python.exe pc/smoke_test.py --test-stop
```

The next acceptance gate is a physical PC/phone HFP endpoint with verified two-way speech audio. Emulator transport success does not remove that gate.
