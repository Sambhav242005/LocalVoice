# Native loading acceptance — 9 October 2026

Target: medium_phone, Android 36, x86_64, 6 GB configured RAM, 16 GB data partition. This is an emulator check, not a Note10 benchmark.

## Build and deterministic checks

- x86_64 Android development APK: compiled and installed.
- LocalVoiceRuntime Kotlin module: native compilation passed.
- llama.rn 0.13.0-rc.7 / bundled llama.cpp: CPU engine included. This upstream version is a release candidate; phone validation is required before production.
- ONNX Runtime Android: 1.30.0, pinned Maven dependency.
- Native artifact archive: package-published SHA-256 verified before extraction.
- Typecheck/lint: passed.
- Domain, manifest and runtime controller tests: 10 passed (integrity failures prevent initialization, warm-up failure releases the candidate, concurrent operations cannot race, untested ONNX sessions cannot become Ready).
- Expo Doctor: 21/21 passed.
- Android and web JavaScript exports: passed.

## Real-model acceptance

- LFM2.5-2.6B Q4_K_M: downloaded through the app, native SHA-256 passed, initialized and generated a real greeting. First verification/load/warm-up: 24.5 seconds; entire-app PSS: 2063 MiB. Unloading reduced app PSS to approximately 441 MiB and preserved files. Automatic loading on a later launch passed in 4.3 seconds with cached file pages.
- Nemotron ASR: all 13 files downloaded; native SHA-256 verification and encoder, decoder, joint and VAD ONNX session initialization passed. Verification/load: 3.0 seconds; entire-app PSS with LFM also resident: 2662 MiB. This confirms session loading only; streaming audio preprocessing and transcription decoding remain pending.
- KittenTTS: Android decoder port remains pending; the UI reports Unsupported and system speech is available.

## Scope

Demo calls remain scripted. Native prompt tests are separate. ASR session loading does not implement streaming transcription. KittenTTS cannot load without an Android decoder port. No microphone or real call audio is being tested.

Incoming-policy validation: emulator showed manual approval controls; Answer myself cancelled ringing without an AI session. Opt-in unanswered policy showed a 20-second countdown and started a demo session after the timeout. Tests: 11 passed; typecheck/lint, Expo Doctor and Android/web exports passed. Native permissions added through Expo configuration; no real call takeover tested.
