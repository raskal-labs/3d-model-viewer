# 3D Model Viewer V2 — hybrid rebuild / implementation reference

> **Design/implementation reference, not canonical progress.** Atlas project state is in [PROJECT.yaml](./PROJECT.yaml); milestone/task statuses and acceptance are in [WORK.yaml](./WORK.yaml); binding invariants are in [CONTRACT.md](./CONTRACT.md). Sections below retain the original approved implementation strategy; progress must be reconciled in canonical files.

Status: **Proposed implementation plan** (planning only; no V2 code has been implemented).
Last reviewed: 2026-11-09.
Source: `raskal-labs/3d-model-viewer` on `main`; leave the V1 viewer working until V2 acceptance.
Companion: [V2_RESOURCES.md](./V2_RESOURCES.md). Scoped Codex rules: [AGENTS.md](./AGENTS.md).

> **Current-source correction (2026-11-07):** The actual development authority is this standalone repository. Unlike the older hosting copy, V1 here already supports static OBJ/STL/GLB/glTF uploads and has gesture-first navigation (`gesture-navigation.js/.css`). M1 must **extend** existing uploads for Draco, sidecar resources, faithful PBR and skinned/animated models; M3 must **evaluate/reuse** current touch controls. Source authority: [PROJECT.yaml](./PROJECT.yaml), [WORK.yaml](./WORK.yaml), [CONTRACT.md](./CONTRACT.md). The older site repo's Issue #7 is superseded by this repo's [Issue #4](https://github.com/raskal-labs/3d-model-viewer/issues/4).

## Goal, boundaries, decision

Create a general-purpose, **iPhone-first** 3D viewer, inspection and comparison studio with minimal non-destructive transforms. Do **not** recreate Blender. Preserve V1's simplified Porygon2 aesthetic as a preset, not as a restriction on arbitrary imported assets.

**Strategy: hybrid.** Build fresh model/document/rendering state boundaries and GUI; adapt known-good shader/effects/camera ideas; keep Three.js, OBJ assets, Chief textures, editable Python source, established looks and camera exports. Do not mechanically port the V1 DOM, four-colour shader, duplicated loader, global-state coupling or permanent controller dock.

## Existing inventory / invariants

- `index.html` (~521 lines): current viewer, 4-entry `palette[4]` Porygon-specific shader, built-in OBJ assets **and static OBJ/STL/self-contained GLB/glTF uploads**, camera rendering; upload skinned meshes explicitly rejected.
- `render-lab.js` (~802 lines): effects, comparison, parts, scene lighting, 4-colour custom palette, localStorage looks, upload/model picker and PNG export.
- `Porygon2.obj`, `Porygon2-upright.obj`, `Porygon2.mtl`, `edit_model.py`; `chief/` assets stay unchanged.
- `gesture-navigation.js/.css` already implements gesture-first orbit/pan/roll/zoom and precision reticle with clutch. Reuse/adapt, do not rebuild without evidence. `tests/viewer-smoke.mjs`, `tests/gesture-navigation.mjs`, `.github/workflows/viewer-smoke.yml` cover browser checks, but not real-device Safari.
- V1 defaults: Pixel, Reactive 2 px, Original colours, Native. Preserve via a named preset, with visual snapshots.
- The standalone `/3d-model-viewer/` V1 route must remain usable during V2 rollout. Do not overwrite old files just to reorganize them.
- User-supplied `233.glb` is a **private/manual test fixture**, not a public redistributable model. It is Draco-compressed, has texture and rig data per prior inspection; do not embed in public repo or assume Codex can fetch it.

## Target architecture (logical modules; avoid needless scaffolding)

```

  [V1 unchanged at repository root]
  v2/
    index.html, app entry, styles
    core/             # document/model state, stable IDs, imports, resources, selection
    rendering/        # original materials, alternate looks, palette, outlines, effects
    view/             # camera state, gestures, framing, compare viewports
    ui/               # canvas, navigation, bottom sheets, contextual inspectors
    persistence/      # schema versioning, import/export, browser cache
    tests/            # core + browser + visual reference tests
```

Use Three.js modules and a small, static-deployable build pipeline (evaluate Vite; see resource doc). Prefer plain TypeScript or JavaScript modules and CSS; don't add a large UI framework without proving a need. Design stable interfaces first:

- `AssetRecord`: immutable original resource(s), source URIs/files, import diagnostics, original material/scene/animation references.
- `Document`: scene instances, appearance overrides, transforms, annotations, reference images, current selection, history.
- `ViewportState`: camera/target/roll/framing/projection, quality and comparison layout; distinct from input controls.
- `RenderSettings`: `materialMode`, `lookPreset`, `paletteMode`, `outputPalette[]`, resolution and post effects. No semantic material assignment based on specific OBJ mesh names.
- `Session`: active document, UI mode, panels, and transient values; keep separate from saved project.

## Milestones (ordered, test-gated)

### M0 — Baseline and safety
- Capture deterministic V1 screenshots at fixed camera/style/resolution for Porygon2 and Chief, plus smoke results.
- Record source commit, asset hashes, colours and expected meshes. Verify live rendering (not just module parsing) and narrow iPhone viewport.
- Establish V2 preview route (e.g. `/3d-model-viewer/v2/`) and CI build path **without replacing the existing standalone viewer at `/3d-model-viewer/` or breaking its V1 route**. Check actual Pages deployment configuration first. V1 regression is required in every deploy.
- Pin direct dependencies and committed lockfile; use consistent versions across Three and addons. No floating CDN imports in production.

### M1 — Format-agnostic loading and correct originals (first vertical slice)
- Extend existing static OBJ/STL/self-contained GLB/glTF upload to preserve original materials, support GLB/glTF via GLTFLoader + DRACOLoader (add Meshopt/KTX2 only when fixture requires) and external OBJ+MTL/texture and glTF sidecars. Add STL only if it remains cheap.
- Local iOS Files picker and drag/drop on desktop. Multi-file glTF sidecars and OBJ/MTL/textures need relative-path resolution, missing-dependency diagnostics and URL cleanup. Don't presume directory picker works on iOS.
- Preserve hierarchy, original materials, texture colour spaces, skinning, morphs and animation clips; do not replace materials merely to view the asset.
- Fit arbitrary size/orientation; sensible near/far planes and camera infrastructure supporting both perspective and orthographic projection. Treat imported model axes/front as an explicit adjustable convention, not a guaranteed standard. Robust loading/error/cancel and WebGL context-loss recovery.
- Pass tests using current Porygon2 and Chief, a public coloured textured GLB, and a public skinned/morph target example. Exercise `233.glb` manually when provided.

### M2 — Independent render pipeline + meaningful reuse
- Default = faithful source materials (PBR where present); Unlit, Flat, Cel and Clay are **non-destructive overrides**. Preserve original material references.
- Port/adapt V1 Pixel, Reactive outline, Native/80p/160p/240p and best effects behind a small renderer API. Do not copy old `palette[4]`, `partId` nor source-mesh classification.
- `Source colours → material/look → optional output palette/quantization → effects`. Default quantization Off. 2/4/8/16 and custom N-colour palettes as renderer-supported, no false claims about arbitrary shader uniform capacity.
- Preserve alpha correctly across postprocessing and PNG export. Track sRGB/linear handling and colour fidelity with reference tests. No fancy effects until original-material tests pass.
- Do not run a hot render loop while idle; resume for interactions/animation/turntable. Bound DPR and render-target memory on iPhone.

### M3 — Mobile-first GUI replacement (ship-ready viewer)
- Provide a Perspective / Orthographic projection toggle and six model-space camera snaps: Front, Back, Left, Right, Top, Bottom. Switching projection should preserve viewing direction, orbit target and approximate on-screen scale rather than reset the camera.
- Keep free orbit, pan, zoom and frame-to-fit usable in orthographic mode. Offer an optional orientation cube: tap faces for six axial snaps, edges/corners for diagonal views; make it hideable and keyboard/screen-reader accessible where possible. It must not permanently obstruct the phone canvas.
- Distinguish model-local front/up from world axes; allow users to correct imported model orientation, and keep orthographic names consistent across saved views and compare panes. Do not silently change model geometry.
- Canvas is primary. Compact model/library picker in header; narrow contextual toolbar; bottom sheets for **View, Look, Inspect, Compare**; reveal controls only for the active task.
- Direct gestures: drag orbit, pinch zoom, two-finger pan, tap selection, double tap frame/focus. Avoid hijacking gestures over scrollable menus. Preserve accessibility zoom and keyboard navigation as far as platform permits.
- Thumbnail-style Look choices; contextual settings only. Put wheel/circle-pad/zoom-fader functionality into optional **Precision/Retro Controller** module, not the default permanent dock.
- Model switching and project state must work beyond the two bundled models. Loading status, warnings, and empty state should be understandable on small screens.

### M4 — Inspection and comparison (high-value for Porygon anatomy)
- Tap/raycast selection; hierarchy for meshes/materials/bones; highlight, hide, isolate, inspect bounds and transforms. Selected != isolated.
- Comparison modes: synchronized side-by-side **first**, then onion-skin/opacity and slider if performance supports them. Explicit scale normalisation vs real scale; manual alignment/reset.
- Reference images align in model/screen space, with adjustable translation, scale, rotation and opacity; use all six standardized orthographic views and consistent snap alignment across compare panes.
- One shared importer and document system for both viewports. Avoid V1's independent compare loader/cache implementation. Clean GPU resources after switching.

### M5 — Small, non-destructive editing + persistence (later)
- Object-level move/rotate/scale, material colour overrides, history/undo/redo. Correct skin/bone semantics. Do not promise mesh sculpting or retopology.
- Versioned portable project document, resilient browser cache (IndexedDB), model-ref integrity checks, export/import and backups. Browser storage is convenience, not the sole source.
- Distinguish Export image vs Export project vs Export model. GLTFExporter may be used only after verifying which features round-trip. Export failures must be explicit.

## Required tests / release gates

Automated:
1. Existing V1 smoke checks remain green.
2. GLB native/PBR colours and texture orientation verified; no material mutation just from toggling Look.
3. Draco compressed GLB opens; missing decoder produces informative error.
4. OBJ+MTL+texture and plain OBJ work. Multi-file glTF with relative URI spaces works.
5. Static Porygon2 retains expected colours, head/eyes/bill geometry and original look snapshot.
6. Skinned and morph-animated model displays intact, with clips listed where available.
7. Two model sizes: fit/reframe, near/far, all six orthographic directions, perspective toggle preserving orientation/apparent scale, pan/zoom/orbit and orientation correction; no clipping.
8. Compare synchronisation, alignment and shared loader; no duplicated model-cache ownership.
9. Import error/cancel/corrupt files, rapid model switching, cleanup, WebGL context loss.
10. iPhone layout safe-area, touch target sizes, panel scroll, selection/pinch/twist conflicts, GPU memory.
11. WebKit + Chromium CI screenshots, console-error checks and artifacts; **manual real iPhone Safari** is mandatory before switching URL.

Performance: log CPU/GPU frame time where measurable, resource counts and memory; choose numeric thresholds only after baseline measurements. Do not invent hard requirements.

## Delivery workflow for Codex

1. Read this plan, [V2_RESOURCES.md](./V2_RESOURCES.md) and existing V1 code/README/tests **before** coding.
2. Provide brief architecture/API map + explicit reuse list as first PR artifact; identify source of truth for model, camera and look state.
3. Ship **small reviewable PRs per milestone**; no giant untested replacement. Keep V1 unchanged and V2 preview separate.
4. Reuse shaders by extracting and testing algorithms, **not** by transplanting V1's four-colour mesh/material assumptions.
5. For each PR include: before/after screenshot, exact automated checks, new fixtures and licenses, manual Safari checklist and any unresolved limitations.
6. Never check private `233.glb`, unlicensed Pokémon reference assets, extracted textures, or uploads into the public repo. Use private/manual tests unless redistribution rights are confirmed.
7. Switch `/` to V2 **only after** explicit compatibility, visual quality, and real-device acceptance; retain V1 as legacy.
8. No backend, accounts, network model search or Blender-equivalent editing in this scope.

## Key decision criteria

- User can load an arbitrary standard GLB on iPhone and see original material fidelity immediately.
- Original simplified Porygon2 still looks like **our** Porygon2 under its legacy preset.
- Controls are useful with the GUI hidden; complex features do not occupy the default canvas.
- Compare two versions against a reference without accidentally normalizing away anatomy.
- Every editing operation is reversible and can be exported in a durable project file.
