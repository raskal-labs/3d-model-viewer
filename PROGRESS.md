# 3D Model Viewer — work evidence and continuity

**Role:** dated evidence and retrospective interpretation, not another active status ledger.
**Current state and next checkpoint:** [PROJECT.yaml](./PROJECT.yaml).
**Task status/acceptance:** [WORK.yaml](./WORK.yaml).
**Last reviewed:** 2026-11-07; GitHub source/Action records inspected, real device/browser deployment not checked in this pass.

## Project Continuity Snapshot

### Recent Work

- **Verified (source inspection):** `index.html`, `render-lab.js`, `gesture-navigation.js/.css` implement the standalone V1 source. Static OBJ/STL/self-contained GLB/glTF upload code exists; source rejects skinned meshes; materials are remapped into custom stylized shader instead of faithful source PBR. The scoped original code includes Porygon2/Chief assets and Pocket Fonts.
- **Verified (historical GitHub CI):** `41986502252` reported successful browser smoke on 2026-11-05 and `41986978503` reported successful Pages build/deployment. These are source-specific historical observations, **not** newly run integration tests or real iPhone acceptance.
- **Verified (repository documents):** this repo has a dedicated Atlas v2 binding, PROJECT/WORK authorities, local contract, architecture, decisions, timeline and Codex issue #4. **No V2 runtime code was implemented by these document changes.**
- **Not verified:** actual Draco `233.glb` import, GLB fidelity after conversion, V2 preview route, official Atlas schema validator run, central Atlas enrollment, fresh iPhone Safari gesture/performance test, and current live Pages availability.

### Recent Thinking

- **Accepted:** hybrid rebuild, preserve valuable gesture-first controls and simplified rendering, original-material fidelity for arbitrary models, separate V1 and V2, bounded non-destructive editing.
- **Proposed:** three common-task mobile GUI prototypes, Onshape-inspired precision selector, extended import/animation/texture support.
- **Correction:** Earlier documentation and Issue #7 were mistakenly written to `raskal-labs.github.io`. The correct development authority is **this** `3d-model-viewer` repository. Document source migration and correct links; don't silently claim the old host was canonical.

### Next Steps

Read `PROJECT.yaml` for the single authoritative checkpoint, and `WORK.yaml` for IDs `m0-screenshot-baseline`, `m0-pages`, `m0-fixtures`, `m1-importer`, `ux-a`, `ux-b`, `ux-c` and `ux-review`. These are future work, not work already performed.

## Timeline

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

## 2026-11-12 — non-destructive anatomy A/B implementation (local, awaiting aesthetic signoff)

- **Implemented:** `tools/refine_models.py` generates `Porygon2-refined.obj` and `chief/chief-refined.obj` from tracked source assets. Original OBJ/MTL/PNG files untouched; `index.html` registers two additional model choices, retains the original Porygon2/Chief first comparison pair, and maps `belly_blue` to the blue shader part.
- **Verified:** numerical geometry assertions (`tests/model-refinements.py`) pass, including Chief's unmodified Snap mesh; both revisions load and render through actual Three.js OBJLoader in desktop and mobile Chromium, including side/three-quarter view captures. The prior desktop+mobile Chromium smoke sequence passed through its last Chromium assertions; complete `viewer-smoke.mjs` exits at WebKit launch because GameCube lacks Playwright's `webkit-2370` executable. Therefore **no WebKit/Safari passing claim**.
- **Review needed:** compare the face/eye silhouette, bill depth, blue belly edge, Chief letter readability and hat contact from several angles on iPhone; decide whether revisions become defaults. No auto-deploy, no modification to V2, PhaseOne or the P2 asset archive.
