# 3D Model Viewer — project-local contract

**Authority:** implementation invariants and release boundaries for this repository.
**Inherited policy:** [Atlas PRINCIPLES](https://github.com/raskal-labs/atlas/blob/main/PRINCIPLES.md), [STANDARDS](https://github.com/raskal-labs/atlas/blob/main/STANDARDS.md), [CONTRACT](https://github.com/raskal-labs/atlas/blob/main/CONTRACT.md), especially §9–10. The parent rules are inherited, not duplicated.
**Current source truth:** [PROJECT.yaml](./PROJECT.yaml); **work acceptance/status:** [WORK.yaml](./WORK.yaml); **decision history:** [DECISIONS.md](./DECISIONS.md).

## 1. Product and authority boundary

A **general-purpose, mobile-first 3D model viewer, reference comparator and rendering studio**, with limited reversible object edits. Not a Blender replacement, full CAD app, mesh sculptor, rigging suite, or hosted model store.

This repository is the authoritative source of the viewer implementation and project documentation. GitHub Pages deployments and old copies of files in `raskal-labs.github.io/porygon2/` are **delivery surfaces / historical references, not the development authority**. Don't duplicate live project/work records in those hosting paths.

V1 runs at `/3d-model-viewer/` and already includes local static OBJ/STL/self-contained GLB/glTF uploads, gestures/precision instruments, and Render Lab. Keep V1 intact until explicit V2 acceptance. V2 is developed separately at `/3d-model-viewer/v2/`, subject to validating actual Pages routing before touching the deployment.

## 2. Core state invariants

- **Source asset** is immutable upon import: preserve model geometry, materials, textures, node hierarchy, skeleton, morph and animations when supported. Unsupported features produce diagnostics, not silent losses.
- **Project document** owns scene/model instances, non-destructive object/material overrides, annotations, reference images, comparison alignment, history and reversible work.
- **Viewport** owns camera orientation, target, framing, projection and synchronized-compare configuration; different input gestures, reticle and optional precision controllers drive one camera authority.
- **Rendering** owns original material mode and optional artistic looks, output palette quantization, outlines, effects and export. Changing Look must not mutate imported source materials.
- **UI session** owns transient panels, selection, and temporary inputs. Local browser caches may supplement but not replace portable project export.
- **Outputs** (screen pixels, screenshots, look presets) are not the source mesh or evidence of a geometry modification.

Avoid importing a Porygon-specific material taxonomy into general GLB, a fixed four-entry palette array, hardcoded mesh-name part IDs, or independently loading the same asset in comparison mode.

## 3. Model and render contract

The **existing V1** can open standalone static OBJ/STL/GLB/glTF files (up to 64 MB), but does not advertise Draco, sidecar import bundles, skinned animation playback or complete source-PBR fidelity. **V2 must fill these gaps**, not claim that all model importing begins from zero.

V2 baseline: GLB/glTF with `KHR_draco_mesh_compression`; OBJ + MTL + textures; glTF sidecars; faithful source material, texture colour spaces, alpha and supported rig/animation/morph data; robust loading, limits, cancellation, and errors. Complex extension coverage should be justified by fixtures.

Default appearance for arbitrary models = **Original materials, no colour reduction**. The existing simplified Porygon2/Chief styles remain optional presets. Post-processing and palette selection happen after source interpretation. A four-colour output preset remains valid, but isn't required for arbitrary assets.

## 4. Mobile interaction contract

Canvas-first default; one-finger orbit, two-finger pan, pinch zoom and twist roll as already implemented. Preserve useful precision reticle, optional clutch and gesture affordances; do not needlessly rewrite or permanently display them. Adaptive, selection-aware tools are evaluated in A/B/C GUI prototypes before selecting a final design. Small-part selection must not require finger-obscured tap accuracy.

Touch camera movement, object selection, project manipulation and reference alignment must have an explicit interaction precedence to prevent accidental changes. Selection ≠ isolation. Numeric precision controls should be accessible when required. Phone portrait/landscape and desktop may have different layout surfaces but share the same state and commands.

## 5. Compare, editing, persistence

Comparison modes should clearly distinguish **actual relative scale**, **separately fitted**, and **normalized** sizes; overlays and reference images need explicit adjustable alignment. Synchronized viewports share loader/cache ownership, not imported-mesh mutation.

V2 lightweight editing is limited to **reversible object transforms** and simple material overrides with undo/redo. Bone/skinned-mesh semantics require separate tests. Full vertex/sculpt/retopology/rig editing is not in scope.

Projects need a versioned, portable, independently restorable format. Separate model export, image export and project export; disclose if a feature doesn't round-trip in GLTFExporter.

## 6. Security, licensing and provenance

- The user-provided Draco-compressed `233.glb`, private screenshots, extracted game textures, and unlicensed derivatives are **private manual fixtures**. Do not publish them or implicitly claim redistribution rights.
- Public model test assets require explicit per-model licensing checks; pin upstream versions and retain notices.
- Local file imports stay local; no mandatory network uploads/account service. Bundle decoder assets with pinned V2 dependencies instead of runtime CDN reliance.
- No private paths, secrets or personal information in public CI artifacts or sample assets.

## 7. Verification and release gate

A `Verified` milestone requires evidence **matching its specific acceptance**, not simply a commit, a checkbox or a syntactically valid document. The existing Playwright Chromium/Linux WebKit checks are not real iPhone Safari acceptance.

Production V2 switch requires: confirmed original-material fidelity and usable GLB/Draco, matching fixed-camera V1 presets, tested imports and error states, shared loader in comparison, mobile gesture and panel acceptance on a **real iPhone**, performance/memory evidence, rollback demonstration, and an explicit cutover decision. Preserve a stable V1 legacy route.

## 8. Continuity and changes

Every meaningful implementation work unit should reconcile canonical PROJECT/WORK as necessary, append dated evidence in PROGRESS, and record accepted/superseded decisions in DECISIONS. Roadmap and task Markdown are reading guides only, not a second status ledger. Planned work never authorizes production changes, asset destruction or private model publication.
