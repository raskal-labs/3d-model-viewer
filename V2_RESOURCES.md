# 3D Viewer V2 — verified dev resources / fixture inventory

Collected: **2026-11-07**. This file is a curated starting kit, **not** a dependency lockfile and not evidence these assets were downloaded into the repo. Verify exact versions, file licenses and browser support before vendoring.

## Ready-to-run fixture acquisition

A pinned downloader is now committed as [tools/fetch-v2-fixtures.sh](./tools/fetch-v2-fixtures.sh). Run it from the repo root (requires `curl`):

```bash
bash tools/fetch-v2-fixtures.sh
```

It downloads three small **CC0 model asset** families at Khronos revision `8f492390ddc7a2ae221a1369ef560589cf8c70fb` (2026-10-23): `AnimatedMorphCube` (GLB/morph), `SimpleSkin` (glTF/multiple sidecars/rig) and `SimpleTexture` (glTF/texture). Individual upstream `LICENSE.md` files, provenance and local `SHA256SUMS` accompany the files. The license documentation itself can be CC-BY-4.0.

Output: `v2/tests/fixtures/khronos/` (ignored by Git). It intentionally does **not** download private `233.glb` or any Pokémon reference assets. A Draco regression asset can be generated locally from CC0 AnimatedMorphCube using glTF Transform, after the tool is installed. **The download script has not yet been executed in a network-capable development environment.**

## Existing reusable source (in this repository)

**Source correction:** use the standalone `3d-model-viewer` checkout, which also contains `gesture-navigation.js/.css`, the new gesture test, and working static file uploads. The older `raskal-labs.github.io/porygon2` mirror is not the development authority.


| Path | Reuse strategy |
|---|---|
| `Porygon2.obj`, `Porygon2-upright.obj`, `Porygon2.mtl`, `edit_model.py` | Preserve assets and parametric source; V1 visual-regression fixtures. |
| `chief/` | Textured OBJ/MTL and PNG dependency fixture. |
| `index.html` | Extract/adapt camera JSON, geometry framing, outline/pixel shader ideas, NOT hardcoded colour/part classification or V1 UI. |
| `render-lab.js` | Port effects, looks, model-upload picker, presets, before/after and comparison concepts as isolated modules. |
| `tests/viewer-smoke.mjs`, `tests/gesture-navigation.mjs` | Extend browser, import and navigation smoke + screenshots; still requires physical iPhone testing. |
| `.github/workflows/viewer-smoke.yml` | CI starting point; installs Chromium and WebKit, and the current script tests both. Preserve and extend their screenshot coverage. |
| `README.md`, `RENDER_LAB.md` | Legacy behaviour/quality reference, not new architecture. |

## Engine, loaders and colour management

- Three.js main docs: https://threejs.org/docs/
- GLTFLoader (preserves glTF scene + animations; Draco, Meshopt, KTX2 hookups): https://threejs.org/docs/pages/GLTFLoader.html
- OrbitControls: https://threejs.org/docs/pages/OrbitControls.html
- GLTFExporter (verify round-tripping before claiming lossless editing): https://threejs.org/docs/pages/GLTFExporter.html
- OutlinePass for selected-object highlights (separate from stylized contours): https://threejs.org/docs/pages/OutlinePass.html
- Color management: https://threejs.org/manual/pages/color-management.html
- Three.js on-demand rendering: https://threejs.org/manual/pages/rendering-on-demand.html
- glTF official spec / extension registry: https://github.com/KhronosGroup/glTF
- Draco geometry extension: https://github.com/KhronosGroup/glTF/blob/main/extensions/2.0/Khronos/KHR_draco_mesh_compression/README.md

**Implementation note:** Prefer `GLTFLoader` with local `DRACOLoader` decoder assets packaged by build. Do not rely on a public runtime decoder URL or an external service. Add `MeshoptDecoder` and `KTX2Loader` only where justified by test coverage. Keep Three/addons on one pinned package version. Use correct sRGB texture semantics and test against original materials before artistic overrides.

## Tooling (proposed, not installed/configured yet)

- Vite (static-build option and GitHub Pages deployment): https://vite.dev/guide/static-deploy
- glTF Transform CLI (inspection/conversion/preprocessing, no need to import into editor): https://gltf-transform.dev/cli
- Khronos glTF Validator (official validation, Node package `gltf-validator`): https://github.com/KhronosGroup/glTF-Validator
- Playwright test runner (Chromium + WebKit + mobile emulation): https://playwright.dev/docs/intro
- Browser/device emulation caveats (WebKit emulation does **not** replace real iPhone Safari): https://playwright.dev/docs/browsers
- MDN WebGL best practices (context loss, memory, texture sizes, DPR): https://developer.mozilla.org/en-US/docs/Web/API/WebGL_API/WebGL_best_practices

**GitHub Pages caveat:** This standalone repository deploys via GitHub Pages (historical success run 41986978503). A Vite build needs an explicit deployment strategy. Build V2 for its actual nested URL (e.g. `/3d-model-viewer/v2/`) and make sure V1, original models and public root files survive deployment. Inspect existing Pages settings/workflows before changing publication.

## Public test models (links to sources; not yet vendored)

Khronos catalog: https://github.khronos.org/glTF-Assets/
Source and per-model licensing: https://github.com/KhronosGroup/glTF-Sample-Assets
Reuse metadata: https://github.com/KhronosGroup/glTF-Sample-Assets/blob/main/REUSE.toml

| Fixture | What it tests | Source |
|---|---|---|
| Box | Tiny baseline GLB for geometry/scene load | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Box |
| BoxTextured | Basic texture/material handling | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/BoxTextured |
| Box With Spaces | Relative external resources and URI-escaped spaces | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Box%20With%20Spaces |
| SimpleSkin | Skinned joints and hierarchy | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/SimpleSkin |
| AnimatedMorphCube | Morph target + animation playback | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/AnimatedMorphCube |
| Fox | Multiple rigged animation clips / camera fitting (check model-specific credits/license before copying) | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/Fox |
| CarConcept (Draco variant) | Draco + KTX2 decoding combination; size/performance consideration, optional | https://github.com/KhronosGroup/glTF-Sample-Assets/tree/main/Models/CarConcept |

The sample collection has **per-asset** licenses; do not treat every model as CC0 or silently commit all samples. Prefer small CC0 fixtures with explicit metadata; for large models, provide an opt-in download script with exact revision/hash and notices. Do not make CI rely on mutable raw/main downloads once fixtures are selected.

### Private / project-specific fixtures (manual only unless cleared for redistribution)

- `233.glb`: user-supplied, Draco-compressed, skinned Porygon2 reference model. Not in this repo. Request local file when running integration checks. Test on iPhone Safari with import-from-Files and log both decoder readiness and model visibility. **Do not publish**, even as a compressed or converted derivative.
- Current simplified Porygon2 OBJ and Chief OBJ+MTL/PNGs: already tracked here; establish fixed camera/colour screenshot baselines for both.
- Flat many-colour model, invalid/corrupted file, missing texture and intentionally incompatible extension: generate tiny synthetic fixtures locally when needed; no third-party licensing questions.

## Regression and mobile QA details

- Original V1 style: Pixel / Reactive 2 px / Original / Native. Include front/side/three-quarter captures with deterministic cameras, not only a single screenshot.
- Verify imported original materials on a known PBR asset, with no forced four-colour remapping.
- Compare view in portrait iPhone sizes with safe areas; test camera+selection gestures and scrollable bottom sheets; keyboard focus/VoiceOver labels. Do not globally block accessibility zoom just to prevent canvas gestures.
- Check constrained memory: downscale postprocess render targets when appropriate, dispose textures/materials/URLs, handle WebGL context loss and rapid file switching.
- Continue running WebKit and Chromium in CI; perform **manual on-device Safari testing** for iOS gestures, file-picker behaviour, FPS and camera rendering.
- Measure before setting performance budgets. Avoid claiming smooth real-device rendering from desktop emulation alone.

## Optional acquisition workflow (Codex should implement at M0/M1)

1. Select a small, legally redistributable subset of Khronos models.
2. Read each model's README/license/REUSE entry. Record author, SPDX license and source commit.
3. Download or generate fixtures into dedicated `v2/tests/fixtures/` with SHA-256 and `LICENSES.md`, or a scripted private cache for large assets.
4. Never fetch mutable URLs during release CI without integrity pinning.
5. Log private `233.glb` as `Manual: Unknown / Not Provided` in CI, not a falsely passing automated test.

## Recommended first API spike

A tiny `GLTFLoader` + `DRACOLoader` scene with faithful original materials, local GLB input, orbit, fit-to-bounds, error states and 1 screenshot test. Prove this vertical slice **before** porting artistic shaders or building advanced editing UI.
