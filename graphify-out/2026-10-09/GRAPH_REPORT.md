# Graph Report - LocalVoice  (2026-10-09)

## Corpus Check
- 40 files · ~55,770 words
- Verdict: corpus is large enough that graph structure adds value.

## Summary
- 252 nodes · 373 edges · 21 communities (15 shown, 6 thin omitted)
- Extraction: 100% EXTRACTED · 0% INFERRED · 0% AMBIGUOUS
- Token cost: 0 input · 0 output

## Community Hubs (Navigation)
- dependencies
- useTheme
- scripts
- store.tsx
- expo
- LocalVoice implementation plan
- AGENTS.md
- LocalVoice
- tsconfig.json
- Design System: LocalVoice
- eslint.config.js
- Main dashboard
- pin-models.mjs
- Main dashboard
- runtime.ts
- LocalVoiceRuntimeModule
- hash-manifest.mjs
- Native loading acceptance — 9 October 2026

## God Nodes (most connected - your core abstractions)
1. `useTheme()` - 21 edges
2. `useStore()` - 18 edges
3. `expo` - 12 edges
4. `LocalVoice implementation plan` - 11 edges
5. `scripts` - 9 edges
6. `Txt()` - 9 edges
7. `Button()` - 9 edges
8. `Design System: LocalVoice` - 9 edges
9. `LocalVoice` - 9 edges
10. `Panel()` - 8 edges

## Surprising Connections (you probably didn't know these)
- `TabLayout()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(tabs)/_layout.tsx → src/components/ui.tsx
- `CallDetail()` --calls--> `useStore()`  [EXTRACTED]
  src/app/call/[id].tsx → src/core/store.tsx
- `useStoreValue()` --calls--> `useModelRuntime()`  [EXTRACTED]
  src/core/store.tsx → src/core/runtime.ts
- `Calls()` --calls--> `useTheme()`  [EXTRACTED]
  src/app/(tabs)/calls.tsx → src/components/ui.tsx
- `Calls()` --calls--> `useStore()`  [EXTRACTED]
  src/app/(tabs)/calls.tsx → src/core/store.tsx

## Import Cycles
- None detected.

## Communities (21 total, 6 thin omitted)

### Community 0 - "dependencies"
Cohesion: 0.05
Nodes (41): expo, expo-build-properties, expo-constants, expo-dev-client, expo-file-system, expo-font, expo-linking, expo-network (+33 more)

### Community 1 - "useTheme"
Cohesion: 0.26
Nodes (20): expo-router, CallDetail(), Shell(), Calls(), Overview(), TabLayout(), Models(), Settings() (+12 more)

### Community 2 - "scripts"
Cohesion: 0.09
Nodes (22): eslint, devDependencies, eslint, eslint-config-expo, @types/react, typescript, eslint-config-expo, main (+14 more)

### Community 3 - "store.tsx"
Cohesion: 0.20
Nodes (18): Call, canDownload(), defaults, demoReply(), finishCall(), Language, Message, Settings (+10 more)

### Community 4 - "expo"
Cohesion: 0.08
Nodes (23): backgroundColor, backgroundImage, foregroundImage, monochromeImage, adaptiveIcon, package, predictiveBackGestureEnabled, expo (+15 more)

### Community 5 - "LocalVoice implementation plan"
Cohesion: 0.10
Nodes (18): Architecture, Current delivery, LocalVoice implementation plan, Model manifest and sources, Outcome, Stage 1 — App and model setup, Stage 2 — Native microphone benchmark, Stage 3 — Call intelligence and history (+10 more)

### Community 6 - "AGENTS.md"
Cohesion: 0.20
Nodes (9): Building with EAS, Commands, Context7, Expo has changed — do not trust your training data, Graphify, LocalVoice product and boundaries, Navigation & Routing, Rules (+1 more)

### Community 7 - "LocalVoice"
Cohesion: 0.20
Nodes (9): Capabilities and Constraints, Evidence on Hand, LocalVoice, Operating Context, Platform, Product Principles, Product Purpose, Stack (+1 more)

### Community 8 - "tsconfig.json"
Cohesion: 0.40
Nodes (4): expo/tsconfig.base, compilerOptions, strict, extends

### Community 9 - "Design System: LocalVoice"
Cohesion: 0.10
Nodes (20): Buttons, Cards / Containers, Colors, Components, Design System: LocalVoice, Do:, Do's and Don'ts, Don't: (+12 more)

### Community 14 - "runtime.ts"
Cohesion: 0.16
Nodes (8): models, LoadedEngine, RuntimeController, RuntimeState, RuntimeStatus, RuntimeNative, useModelRuntime(), Verification

### Community 19 - "Native loading acceptance — 9 October 2026"
Cohesion: 0.40
Nodes (4): Build and deterministic checks, Native loading acceptance — 9 October 2026, Real-model acceptance, Scope

## Knowledge Gaps
- **122 isolated node(s):** `name`, `slug`, `scheme`, `version`, `orientation` (+117 more)
  These have ≤1 connection - possible missing edges or undocumented components.
- **6 thin communities (<3 nodes) omitted from report** — run `graphify query` to explore isolated nodes.

## Suggested Questions
_Questions this graph is uniquely positioned to answer:_

- **Why does `dependencies` connect `dependencies` to `scripts`?**
  _High betweenness centrality (0.054) - this node is a cross-community bridge._
- **Why does `expo-router` connect `useTheme` to `expo`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **Why does `plugins` connect `expo` to `useTheme`?**
  _High betweenness centrality (0.053) - this node is a cross-community bridge._
- **What connects `name`, `slug`, `scheme` to the rest of the system?**
  _122 weakly-connected nodes found - possible documentation gaps or missing edges._
- **Should `dependencies` be split into smaller, more focused modules?**
  _Cohesion score 0.04878048780487805 - nodes in this community are weakly interconnected._
- **Should `scripts` be split into smaller, more focused modules?**
  _Cohesion score 0.08695652173913043 - nodes in this community are weakly interconnected._
- **Should `expo` be split into smaller, more focused modules?**
  _Cohesion score 0.08333333333333333 - nodes in this community are weakly interconnected._