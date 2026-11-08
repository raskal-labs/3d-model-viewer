# 3D Model Viewer — as-is code and proposed V2 boundaries

**Observed implementation:** repository `raskal-labs/3d-model-viewer`, branch `main`, inspected 2026-11-07. **V2 boundaries are proposed**, not implemented. [CONTRACT.md](./CONTRACT.md) owns non-negotiable requirements and [V2_PLAN.md](./V2_PLAN.md) gives detailed phased design.

## Source inventory and what to reuse

| Path | Existing capability | V2 disposition |
|---|---|---|
| `index.html` | Main V1 renderer (~521 lines), model definitions, camera state, built-in assets, custom stylized shader, static OBJ/STL/GLB/glTF upload and render loop | Keep as V1; extract useful camera/framing and rendering algorithms; replace model/material ownership in V2 |
| `render-lab.js` | ~802-line scene/look/filters/palettes, image overlay, compare split, model uploads UI, PNG and look JSON | Reuse effect algorithms/UX findings; separate importer, render pipeline and compare state |
| `gesture-navigation.js` / `.css` | Gesture-first orbit/pan/roll/zoom, reticle selector, optional precision instrument, clutch/undo/frame | **High-value component to adapt**, not a feature to rebuild unconditionally |
| `Porygon2.obj`, `Porygon2-upright.obj`, `.mtl`, `edit_model.py` | Original simplified Porygon2 and editable geometry transformation | Preserve for style fidelity and optional future geometry corrections |
| `chief/` | Chief OBJ/MTL/textures | Preserve; verify source textures and pose |
| `fonts/` | Licensed Pocket Fonts and font bundles | Keep original license and only use where actually helpful for UI |
| `tests/viewer-smoke.mjs` | Static model import, look, compare and Chromium/WebKit browser smoke/screenshots | Expand as baseline; add new import formats and visual assertions |
| `tests/gesture-navigation.mjs` | Isolated gesture/precision interaction smoke | Keep and extend for actual camera behaviour |
| `.github/workflows/viewer-smoke.yml` | PR Chromium smoke and artifact upload, installs WebKit | Preserve and refine; inspect which browsers test body actually exercises |
| `RENDER_LAB.md`, `README.md` | V1 user/docs and implementation limitations | Historical/current V1 reference; mark architecture proposals separately |

## Important observed limitations

- The existing V1 code **already supports** local static uploads: OBJ, STL, self-contained GLB/glTF. This is not an unimplemented feature.
- Uploaded skinning is explicitly rejected in `index.html`; there is no `DRACOLoader` use in inspected source. Loading a basic GLB is *not* evidence that `233.glb` opens.
- External MTL/textures and glTF sidecar resources aren't supported by the existing upload flow.
- On import, model materials are adapted to custom shader parameters rather than preserved as source PBR; this is the core fidelity/coupling problem.
- Rendering and comparisons share monolithic application state; the loop continuously requests animation frames, even when idle.
- The gesture-first controller already addresses some earlier UI problems; compare against its current behaviour before recreating camera controls.
- Current standalone repo's Pages build has previously completed successfully. Check the **current deployment setup and live route** before introducing Vite or an independent V2 build.

## Proposed V2 logical architecture

```text
Local Files / bundled models
           |
           v
Asset import pipeline -- diagnostics + immutable source materials/scene
           |
           v
Project document -- model instances / non-destructive overrides / history
           |             |
           |             +---- Inspector & selection
           |             +---- Compare & reference alignment
           |
           +---- Viewport state <-- gestures / optional precision instruments
           |
           +---- Renderer: source materials | Flat/Cel/Pixel/etc
           |                          -> optional palette -> effects
           |
           +---- Portable project + image/model export
```

Keep the logical APIs small: `AssetRecord`, `Document`, `ViewportState`, `RenderSettings`, `Session`; avoid a mandatory database/backend or heavyweight UI framework. The comparison workspaces must share the core loader and asset cache.

## Existing versus planned

**Existing:** working standalone viewer, imported static formats (subset), optional upload, appearance settings, gesture-first controls, render comparison and browser smoke.

**Planned:** model-independent GLB/Draco/sidecar import, native PBR fidelity, rig/animation support, isolated V2 app, mobile-adaptive GUI, precision part selection, richer reference alignment, reversible transforms, portable projects.

**Not proven:** `233.glb` successfully loaded, real iPhone Safari acceptance, source Atlas enrollment, V2 preview/build and end-to-end V2 test results.

## Scope and source authority

This is the **implementation repository**. The older `raskal-labs.github.io/porygon2/` route is a separate, stale hosting/development copy; do not treat its source or CI as this repo's current implementation. Keep hosting changes and viewer changes distinct. [WORK.yaml](./WORK.yaml) owns milestone and task status; [PROGRESS.md](./PROGRESS.md) owns dated evidence.
