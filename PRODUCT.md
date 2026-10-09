# LocalVoice

<!-- impeccable:product-schema 1 -->

## Platform
android

Current owner direction: PC-hosted inference with the Android app as a controller and monitor. See PC_RUNTIME.md. The previous phone-native pipeline remains an experimental alternative. PC mode is the default; model download and loading controls target the PC, with no automatic phone inference. Bluetooth emulator experiments and physical SIM call validation are separate milestones.

## Stack
User requested Expo with React Native and TypeScript. Web is a UI preview, not an inference or telephony target.

## Users
The owner of a Samsung Galaxy Note10 5G wants a local English/Hindi voice assistant and visibility into its calls.

## Product Purpose
Download model assets, monitor conversations, inspect each call and its summary, and stop a call when necessary. Let the owner customize settings and compare their preferences.

## Capabilities and Constraints
Current PC stack: NVIDIA Nemotron 3.5 ASR, LiquidAI LFM2.5-2.6B Q4_K_M and KittenTTS 2. All three passed PC inference tests, including the emulator app's synthetic voice test. Real calls require a validated external Bluetooth audio adapter or VoIP audio path. Native mobile inference needs a development build. Demo activity must be explicitly labeled. No measured physical-phone performance exists yet.

## Operating Context
The PC hosts inference and speaker playback; Android controls it through an authenticated loopback service and adb reverse. Next validate useful two-way speech audio and a physical phone adapter. Theme, monitoring detail, language and processing host are customizable. Both light and dark themes ship.

## Product Principles
- Keep stop controls immediately reachable.
- Separate asset download state from runtime readiness.
- Store history locally and label synthetic data.
- Show missing integration and measurements honestly.

## Evidence on Hand
Pinned PC assets passed streaming SHA-256 verification. Real inference and emulator observations are recorded in PC_VALIDATION.md. Emulator HFP/SCO transport does not prove useful PCM or physical SIM calling. Individual timing samples are not aggregate benchmarks.
