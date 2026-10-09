# LocalVoice

An Expo React Native Android controller for a local Windows voice AI runtime. AI runs on the PC by default; Android provides controls, monitoring, customization and locally stored demo call history.

**The PC pipeline works with synthetic audio. Real SIM calling, caller audio capture/injection and automatic call takeover remain unimplemented or unvalidated.**

## What works

| Feature | Current status |
| --- | --- |
| LFM2.5-2.6B Q4_K_M | Real PC reply generation with GPU offload tested |
| NVIDIA Nemotron 3.5 ASR 0.6B | FP16 CUDA, finite WAV transcription tested |
| KittenTTS 2 | PC synthesis tested, packed weights and student_w4 decoder |
| Android PC controller | Emulator tested: connection, readiness and synthetic voice pipeline |
| Stop PC AI | Stops workers/playback and unloads models; visible across routes while active |
| Bluetooth HFP/SCO experiment | Emulator pairing/raw packet transport observed; speech PCM unvalidated |
| Call history and recaps | Scripted demos and transcript-based recaps; not AI summaries |
| Physical SIM calls and unanswered takeover | Pending a validated two-way audio adapter |

Tested PC: Windows, 32 GB RAM, RTX 4070 Ti with 12 GB VRAM. Model download size is not runtime memory usage. Models stay resident until stopped; GPU usage also includes desktop applications and the emulator.

## Setup and try it

1. Run `npm install` for app dependencies.
2. Follow [PC_RUNTIME.md](PC_RUNTIME.md) to create the Python environment, install pinned dependencies and run `npm run pc:setup`.
3. Run `npm run pc:start` and start the development app with `npm start`. Build/install the custom APK if needed using the instructions below.
4. Connect the phone/emulator through USB debugging and reverse port 8090 as described in the runbook. The service binds only to loopback; connecting through the PC's LAN address is unsupported.
5. Open **Models**, enter the local pairing token and connect. Load the three models. Downloaded, loaded and inference-ready are separate states.
6. Tap **Run synthetic PC voice test**. The PC generates a caller fixture, transcribes it, generates a reply and synthesizes speech. Playback is on PC speakers.
7. Tap **Stop PC AI** to cancel processing/playback and release models. Cached downloads remain available.

Weights, pairing tokens, Bluetooth link keys, generated audio and logs stay in ignored `.localvoice-pc/`. Do not publish that directory. Prototype history and test audio are unencrypted.

## App and optional mobile mode

Overview shows processing host and model states. Settings includes light/dark/system themes, English/Hindi preferences, monitoring detail and instructions. Calls provides labeled demo conversations, manual approval/unanswered policy demonstrations, local history and immediate stop controls. These demo policies do not answer real calls.

Optional mobile mode retains model downloads, native SHA-256 verification and LFM inference tests. Android Nemotron ONNX session loading does not provide transcription. KittenTTS's Android decoder remains unsupported. Hindi and physical Note10 performance need device validation. Earlier results are in [NATIVE_VALIDATION.md](NATIVE_VALIDATION.md).

## Android development build on Windows

A custom development APK is required for native modules. Local builds require Android SDK and Java; Android Studio is not required. Configured EAS cloud builds can use the profiles in `eas.json`.

```powershell
npm install
npm run android:build
npm start
```

If llama.rn's native-artifact postinstall stalls on Windows:

```powershell
$env:RNLLAMA_SKIP_POSTINSTALL='1'
npm install
powershell -ExecutionPolicy Bypass -File scripts/install-llama-android.ps1
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
npx expo run:android --device medium_phone
```

Weights are not bundled in the APK. Expo Go does not contain the custom native runtime. `npm run web` provides a UI preview, not Android permission or call-audio validation.

## Validation and next steps

On 9 October 2026, typecheck, lint, 13 JavaScript tests, six Python tests, Expo Doctor (21/21) and Android/web bundling passed. The actual emulator app ran the synthetic PC voice pipeline and displayed its transcript and reply. SCO packets were simulator data, not verified caller speech. Results are individual experiments, not production readiness or aggregate benchmarks.

```powershell
npm run typecheck
npm run lint
npm test
npm run pc:test
npx expo-doctor
```

[PC_VALIDATION.md](PC_VALIDATION.md) records evidence. [PC_RUNTIME.md](PC_RUNTIME.md) contains setup and the current full plan: usable two-way PCM, physical PC/phone adapter, streaming/VAD/echo/barge-in, real approval/unanswered handling, grounded AI summaries, Hindi validation and a real-call soak. The older mobile/VoIP sections in [PLAN.md](PLAN.md) are historical context.

## Project guide

- `src/app/`: Expo Router screens.
- `src/core/`: PC client/runtime, demo controller, preferences and persistence.
- `src/components/`: model controls, permissions and shared UI.
- `pc/`: authenticated service, workers, pinned manifests, Bluetooth probe and tests.
- `scripts/setup-pc.ps1`: verified Windows llama.cpp/LFM setup.
- [AGENTS.md](AGENTS.md), [PRODUCT.md](PRODUCT.md), [DESIGN.md](DESIGN.md): development rules, product boundaries and interface decisions.
