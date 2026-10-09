# LocalVoice

<!-- impeccable:product-schema 1 -->

## Platform
android

## Stack
User requested Expo with React Native and TypeScript. Web is a UI preview, not an inference or telephony target.

## Users
The owner of a Samsung Galaxy Note10 5G wants a local English/Hindi voice assistant and visibility into its calls.

## Product Purpose
Download model assets, monitor conversations, inspect each call and its summary, and stop a call when necessary. Let the owner customize settings and compare their preferences.

## Capabilities and Constraints
Target stack: NVIDIA Nemotron 3.5 ASR, LiquidAI LFM2.5-2.6B, experimental KittenTTS 2, Android system TTS fallback. Model capabilities in the supplied brief require device validation. Stock Android cellular audio cannot be assumed available; production calls require a VoIP audio path. Native inference needs a development build. Demo activity must be explicitly labeled. No measured phone performance exists yet.

## Operating Context
First deliver a runnable application foundation, then microphone benchmarking, then gateway calls. Theme, monitoring detail, language and download policy are customizable per the user's follow-up. Light theme initially is an assumption; both themes must ship.

## Product Principles
- Keep stop controls immediately reachable.
- Separate asset download state from runtime readiness.
- Store history locally and label synthetic data.
- Show missing integration and measurements honestly.

## Evidence on Hand
User supplied a model-stack brief; model repositories are being checked against current public metadata. No live calls or benchmark results were supplied.
