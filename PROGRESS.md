# 3D Model Viewer — work evidence and continuity

**Role:** dated evidence and retrospective interpretation, not another active status ledger.
**Current state and next checkpoint:** [PROJECT.yaml](./PROJECT.yaml).
**Task status/acceptance:** [WORK.yaml](./WORK.yaml).
**Last reviewed:** 2026-11-18. See the dated entry for the V2 review branch.

## Project Continuity Snapshot

### Recent Work

- **Verified (Chromium):** the isolated V2 studio opens model files using original materials and neutral lighting, restores the same textured frame after a material override, exposes the authored looks, and opens a public Draco-compressed GLB. Pages configuration still uses `main:/` for the V1 deployment.
- **Verified (source inspection):** `index.html`, `render-lab.js`, `gesture-navigation.js/.css` implement the standalone V1 source. Static OBJ/STL/self-contained GLB/glTF upload code exists; source rejects skinned meshes; materials are remapped into custom stylized shader instead of faithful source PBR. The scoped original code includes Porygon2/Chief assets and Pocket Fonts.
- **Verified (historical GitHub CI):** `41986502252` reported successful browser smoke on 2026-11-05 and `41986978503` reported successful Pages build/deployment. These are source-specific historical observations, **not** newly run integration tests or real iPhone acceptance.
- **Verified (repository documents):** this repo has a dedicated Atlas v2 binding, PROJECT/WORK authorities, local contract, architecture, decisions, timeline and Codex issue #4. That historical document-only change preceded the V2 runtime.
- **Unknown:** private Draco `233.glb` compatibility, current iPhone Safari acceptance, central Atlas enrollment and comparison parity.

### Recent Thinking

- **Accepted:** hybrid rebuild, preserve valuable gesture-first controls and simplified rendering, original-material fidelity for arbitrary models, separate V1 and V2, bounded non-destructive editing.
- **Proposed:** three common-task mobile GUI prototypes, Onshape-inspired precision selector, extended import/animation/texture support.
- **Correction:** Earlier documentation and Issue #7 were mistakenly written to `raskal-labs.github.io`. The correct development authority is **this** `3d-model-viewer` repository. Document source migration and correct links; don't silently claim the old host was canonical.

### Next Steps

Read `PROJECT.yaml` for the single authoritative checkpoint, and `WORK.yaml` for IDs `m0-screenshot-baseline`, `m0-pages`, `m0-fixtures`, `m1-importer`, `ux-a`, `ux-b`, `ux-c` and `ux-review`. The work records describe what remains for acceptance.

## Timeline

### 2026-11-19 — Stone motion and local effects

- Added per-stone lift, sway and turn, colour pulse and hue cycle, and Inner Ember, Rune Current and Facet Edge Glow. Settings persist by model. The authored inlay is selectable, and projected runes follow the moving model.
- Local headless Chromium verified visible frame changes and reset for each effect, levitation and pause, rune resizing during rotation, native rune glow, per-model settings, and the camera pads at a phone viewport.
- The release branch includes the advanced playback, pose and render tools from the active private preview. Installation and verification on the private preview are pending GameCube access.
- Work IDs `m2-looks` and `stone-studio-controls`.

### 2026-11-18 — Model colours and icon-maker runes

- Studio installations can set the same-origin `icon-runes` meta setting to load the icon maker’s rune catalogue. The private deployment uses 18 source glyphs. The editor projects them onto the stone surface and saves rune, size and colours per library model in browser storage.
- Added individual effect tints and colour controls for Minimal Porygon2 and the rebuilt Chief. Chief and the rebuilt Smoky Snowflake Slab were checked in the front, side and three-quarter views. Phone-sized Chromium verified the live library cards, persistence, resets and six effect tints. All 52 stone GLBs enabled rune controls and projected onto a front surface.
- Work IDs `m2-looks`, `anatomical-model`.

### 2026-11-18 — Resonance chamber accents

- Added Prism orbit, Electric trace and Pressure tide to Looks & View. These viewer adaptations share the existing animation toggle and can use bloom. Their default is off.
- Work ID `m2-looks`. Chromium compared a rendered frame for each effect to the clean frame, checked that switching the effect off restored the clean frame, and ran the existing studio coverage with the Khronos fixtures and local Draco sample.

### 2026-11-18 — Quick asset picker and floating controls

- The V2 picker opens on recent models, with sideways scrolling, vertical swipes between library views, and preview images in both the quick picker and full search. The library gateway serves optional thumbnails for known catalog assets through the existing private route.
- The Looks & View and precision panels have translucent backgrounds, draggable headings and resize grips. The header stays in view when panel content scrolls.
- Work IDs `ux-a`, `ux-b`, `ux-c`. Chromium checks exercised the picker, touch drag and resize, menu dismissal, and camera controls with the pinned public fixtures and the local Draco sample. Physical iPhone Safari remains to be tested.

### 2026-11-18 — General model studio review branch

- Added a static `/v2/` entry point with the shared gesture recognizer, perspective and orthographic snap views, source materials, Draco and sidecar import, and playback of the first animation clip. The default studio does not run a postprocessing pass.
- Added general inspection looks plus new implementations of Resonance mineral rim lighting, bloom, ribbons and sparks, Banana Palm Initial cel contours and PS1 snapping/dithering, and V1-inspired pixel, ink, watercolour and monochrome looks. The complete exact legacy lab remains at the root URL.
- Fixture provenance: `tools/fetch-v2-fixtures.sh` pins the public Khronos assets. The local Draco sample was generated from AnimatedMorphCube with glTF Transform CLI 4.2.1. Fixture binaries and Chromium screenshots are outside Git.
- Work IDs: `m0-pages`, `m0-fixtures`, `m1-importer`, `m2-looks`, and `camera-orthographic`. Review iPhone behavior, comparison parity, and exact matching of legacy camera presets before a cutover.

### 2026-11-02 — Historical camera UI screenshots

Two older Chief camera-control screenshots were later retrieved from the user's private ChatGPT file library. They show the earlier paired circular yaw/pitch approach; they are private historical references, **not fixtures in this repository**.

### 2026-11-04–05 — Standalone repository development and CI

This repository was created Nov 4. GitHub Actions includes:
- [Browser smoke run 41986502252](https://github.com/raskal-labs/3d-model-viewer/actions/runs/41986502252), completed successfully Nov 5.
- [Pages deployment run 41986978503](https://github.com/raskal-labs/3d-model-viewer/actions/runs/41986978503), completed successfully Nov 5.

Current source already has gesture-based touch navigation, static model upload, render styles, comparisons and standalone smoke tests. Some earlier screenshots and CI artifacts belong instead to the **separate** `raskal-labs.github.io/porygon2/` copy; their source history should not be conflated.

### 2026-11-05–07 — Product redesign

The user requested the distinctive simplified Porygon2 look be preserved while allowing anatomical refinements. A general-purpose iPhone 3D viewer/inspector, comparison and limited editing tool emerged. Hybrid rebuild was selected over both an in-place large refactor and a zero-reuse rewrite. Three competing GUI concepts and mobile CAD/creative app references were proposed.

### 2026-11-07 — Repository-location correction and formal Atlas records

The previous Atlas docs were mistakenly committed to the hosting repo. Corrected target to `raskal-labs/3d-model-viewer`. Added local project-state binding and work authority, architectural contract and documentation, and [target issue #4](https://github.com/raskal-labs/3d-model-viewer/issues/4). Current V1 source/format support was re-audited so the new roadmap doesn't duplicate existing features. No source renderer or production deployment modifications.

## Evidence rules

A future PR should report associated WORK IDs, source revision, operations performed, exact test commands/results, manual Safari limitations, private fixture availability, follow-up steps and any changed decision. After meaningful work, update canonical PROJECT/WORK and append only material facts here. `Verified` requires evidence appropriate to the **claim**, not merely a successful write to Git or a screenshot of an unrelated state.
