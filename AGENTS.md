This is an Expo/React Native mobile application. Prioritize mobile-first patterns, performance, and cross-platform compatibility.

## Expo has changed — do not trust your training data

Expo ships breaking changes every SDK release. APIs you remember are likely renamed, moved, or removed. Before writing any code that touches an Expo, EAS, or React Native API:

1. Read the major version of the `expo` package in `package.json`.
2. Fetch the matching versioned docs: `https://docs.expo.dev/versions/v<major>.0.0/`
3. For anything else, fetch https://docs.expo.dev/llms.txt — an index of all Expo docs with corrections to common LLM misconceptions. Follow its links to the specific page you need; never answer from memory.

## Commands

Use `bunx` instead of `npx` if the project uses bun (`bun.lock` present).

```bash
npx expo install <package>  # ALWAYS use instead of npm/yarn/pnpm/bun add — resolves SDK-compatible versions
npx expo start              # start the dev server
npx expo lint               # lint
npx tsc --noEmit            # typecheck
npx expo-doctor             # diagnose dependency and config issues
npx expo install --fix      # fix incompatible package versions
```

Run lint and typecheck before declaring any task done.

## Navigation & Routing

- Use **Expo Router** for all navigation. Routes live in `src/app/` — every file there is a screen, `_layout.tsx` files define navigators. Keep non-route code (components, hooks, utils) outside `src/app/`.
- Import `Link`, `router`, and `useLocalSearchParams` from `expo-router`.
- Docs: https://docs.expo.dev/router/introduction.md

## Building with EAS

Use EAS to build, sign, and submit the app in the cloud (`eas build`, `eas submit`) and to ship over-the-air updates (`eas update`) — no local Xcode or Android Studio required. Run EAS CLI as `bunx eas-cli <command>` in Bun projects, or `npx eas-cli@latest <command>` otherwise; substitute that for bare `eas` in docs examples.
Docs: https://docs.expo.dev/eas/index.md

## Rules

- If `ios/` and `android/` directories do not exist, they are generated (Continuous Native Generation). Never create or edit them by hand — configure native behavior in `app.json` and config plugins.
- Expo Go only includes its bundled native modules. After adding a library with native code, the app needs a development build: `npx expo run:ios|android` locally, or `eas build --profile development`.
- Prefer recommended Expo modules over third-party libraries, and check your available skills before adding dependencies. Docs: https://docs.expo.dev/versions/latest/index.md

## LocalVoice product and boundaries

- Read PRODUCT.md, DESIGN.md and PLAN.md before changing architecture or interface behavior.
- Target Android ARM64 on Samsung Galaxy Note10 5G. Web is a UI preview only.
- Demo calls are synthetic; never present them as real telephony, AI output or benchmarks.
- The permanent stop control must remain visible during an active call on every route. Real calls must stop native generation, playback and the VoIP session before reporting completion.
- Keep model assets in app-private storage, pin repository revisions, check file sizes, and require streaming SHA-256 verification before native inference. Do not load multi-GB files into JavaScript memory to hash them.
- Keep call controller states in deterministic code. The language model cannot grant itself permission to perform actions.
- No stock Android SIM audio capture/injection claims. Real calls require a validated VoIP gateway and native audio adapter.
- Downloaded assets are not inference-ready. KittenTTS is experimental until its Android decoder and performance are validated.
- Store history locally. Current prototype storage is unencrypted; production storage needs encryption, retention, export and deletion controls.

## Context7

Use Context7 MCP for current library, framework, SDK, API, CLI and cloud documentation, even when familiar. Start with resolve-library-id, then query-docs for one concept at a time. Prefer exact version IDs when available. Refactoring, business logic and general programming do not require it.

## Graphify

When graphify-out/graph.json exists, begin codebase questions with `graphify query "<question>"`. Use `graphify path` for relationships and `graphify explain` for focused concepts. Prefer graphify-out/wiki/index.md for broad navigation. Dirty graph outputs are expected; they are not grounds to skip Graphify. Read GRAPH_REPORT.md only for broad reviews or insufficient query context. After code changes run `graphify update .` (AST-only). For `/graphify`, read the installed Graphify skill first.

## Validation

Run `npm run typecheck`, `npm run lint`, `npm test` and `npx expo-doctor`. Validate Android and web bundling when changing native imports or routing. Native download/resume, Hindi voice packs, device metrics and call audio require real-device tests; browser success does not prove these work.
