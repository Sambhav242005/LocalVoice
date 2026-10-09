# LocalVoice

Expo React Native Android app with a customizable teal dashboard, model downloads, native LFM loading/inference tests, Nemotron ONNX session loading and call-flow demos. See [PLAN.md](PLAN.md) for the speech pipeline and VoIP roadmap.

## Run

```sh
npm install
npm start
# Browser UI preview
npm run web
# Android development build: needs Android SDK, Java and a device/emulator
npm run android:build
```

Expo Go can preview bundled-module features when its SDK matches this project. Production native inference and calls require a custom development build. EAS profiles are provided in `eas.json`; using cloud builds requires your EAS account/project setup.

## Try it

1. Start a demo call from Overview or Calls.
2. Enter a caller message, inspect the transcript, and press **End call now**.
3. Open its saved transcript and recap. Search history or filter completed/stopped calls.
4. Open Settings to change light/dark/device theme, English/Hindi, monitor detail and spoken demo responses. Try the presets.
5. On Android, open Models and download a bundle. Automatic mode is opt-in, Wi-Fi only by default, and foreground-only. Experimental KittenTTS downloads require a separate opt-in.
6. In the development APK, tap **Load model**. Files undergo streaming native SHA-256 checks before opening. LFM shows verifying → loading → warming → ready only after a real completion succeeds. A notice confirms success; errors have retry controls.
7. Use **Local LFM test** to generate a real reply with saved instructions. **Unload model** releases the context and keeps downloaded files. Optional automatic LFM loading attempts once per app session after the download completes. It is off by default; unloading disables it.

### Windows native build

Use an ARM64 phone or x86_64 emulator with sufficient RAM (the test emulator uses 6 GB) and storage. CPU-only loading starts with 2K context and two threads. GGUF weights are memory-mapped: resident RAM grows as pages are used, rather than necessarily copying the whole file into RAM at once. The displayed PSS is memory for the entire app, not the model alone.

If the library's native-artifact postinstall stalls on Windows, use this fallback:

```powershell
$env:RNLLAMA_SKIP_POSTINSTALL='1'
npm install
powershell -ExecutionPolicy Bypass -File scripts/install-llama-android.ps1
$env:ANDROID_HOME="$env:LOCALAPPDATA\Android\Sdk"
npx expo run:android --device medium_phone
```

The fallback resumes the pinned release download and checks the package's published SHA-256 before extracting Android libraries. No model weights are bundled in the APK. Expo Go cannot load the custom runtime.

## Implemented and pending

Demo calls are synthetic and responses are scripted. Recaps extract caller text; they are not AI summaries. System speech uses installed device voices and may depend on voice packs/connectivity. Custom instructions apply to the separate LFM test. Native loading reports elapsed time and app PSS after load. No real SIM/VoIP calls, microphone decoding or call-model pipeline are wired up. Battery, thermal and voice latency remain unmeasured.

Model downloads use pinned URLs, exact sizes, pause/resume and app-private storage. Every load verifies all hashes natively using a bounded buffer. Small metadata hashes are now pinned too. Nemotron loads encoder/decoder/joint/VAD ONNX sessions and reports **loaded**, not transcription-ready; the streaming audio and decoding pipeline remains pending. KittenTTS's Torch decoder has no Android port here and cannot be loaded. Native behavior still needs Note10 validation.

History/settings use unencrypted local prototype storage; avoid sensitive call content. Production adds encrypted SQLite, retention and export/deletion controls. See PLAN.md for acceptance gates and required gateway inputs.

## Validation

```sh
npm run typecheck
npm run lint
npm test
npx expo-doctor
npx expo export --platform android
npx expo export --platform web
```

Tests cover network download policy and deterministic call termination/recap generation. Exports validate JavaScript bundling, not APK compilation or on-device inference. Dependency audit output is retained in `dependency-audit.json`; compatible fixes and Android verification remain a release gate.

Foundation checks on 9 October 2026: browser call flow and Android demo start/stop/recap passed. Native loading update: eight domain/lifecycle tests pass, typecheck/lint pass, Expo Doctor passes 21/21 and Android/web exports pass. The x86_64 development APK compiled and was installed on medium_phone with 6 GB RAM. Real-model acceptance results are recorded in `NATIVE_VALIDATION.md`. No Note10 performance or microphone/call pipeline validation exists yet. npm audit retains 28 findings (18 high, 10 moderate); incompatible force downgrades were not applied.

## Structure

- `src/app`: Expo Router destinations and call detail.
- `src/core`: call domain, local persistence and download orchestration.
- `src/components`: theme roles, reusable controls and transcript UI.
- `src/data/models.json`: pinned model asset manifest.
- `AGENTS.md`: development instructions.
- `DESIGN.md`: interface decisions.
- `PLAN.md`: full implementation plan.
