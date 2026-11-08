# Viewer V2 — mobile UX reference study

Date: **2026-11-07**. Companion to [V2_PLAN.md](./V2_PLAN.md) and [V2_RESOURCES.md](./V2_RESOURCES.md).
Research findings are **references and hypotheses**, not authorization to copy artwork/UI assets or promises of features in V2. Check current docs when implementing.

## First principles

1. Keep the 3D canvas visually dominant in **default viewing mode**.
2. Show actions for the **selected type of thing** (mesh, material, bone, reference image, empty space), not every tool all the time.
3. On phone, use contextual bottom sheets or small popovers; on tablets/desktops use dockable side inspector when there is room. The data/commands should be identical, only presentation changes.
4. Selection must be accurate without obscuring tiny targets with fingers; consider **press-and-drag magnifier / offset crosshair**, hover where supported, visible highlight before committing.
5. Separate interaction modes and preserve undo; do not overload tap, double-tap, long-press and two-finger gestures without a deterministic precedence model.
6. Let users hide all chrome, keep one-handed navigation, use familiar labels initially, and permit customization later.
7. Do not model an iPhone CAD app's entire feature hierarchy: focus on viewer, anatomical comparison, palette/render and basic object transforms.
8. Avoid user-visible coupling of **reference model materials** and **rendering-look presets**.

## Ranked close 3D/CAD references

| Product | iPhone/iPad reality (2026) | Verified design pattern | Reuse in V2 | Caution |
|---|---|---|---|---|
| [Valence 3D](https://www.manual.valence3d.app/modeler/) | Native modelling on iPhone/iPad | Minimal canvas; contextual command palette; selection changes available tools; iPhone uses sheets rather than iPad side panels; gizmos and inspector; customization | **Primary UI reference** for default canvas, selection, iPhone inspector, edit gizmos | Icon-only controls require discovery. Keep visible labels/tooltips until learned. |
| [Shapr3D](https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface) | **Ordinary iPhone: view-only** as of 2026-11-07; iPad full CAD (product docs: https://www.shapr3d.com/compatible-devices) | Adaptive tool menu by selected entity (face/sketch/body); direct manipulation; rapid task switching | Selection → suggested actions; conventional orientation cube, reset/fit | Most full-model screenshots are *iPad*. Don't claim the normal iPhone app can edit. |
| [Nomad Sculpt](https://nomadsculpt.com/manual/interface) | iPhone + iPad sculpting | Configurable gestures and interface scale; finger/stylus/mouse input can have different mappings; hide tools not relevant to selection | Hide/show chrome, customized precision control mode, adjustable targets | Dense sculpt toolbars are unnecessary in viewing mode. |
| [Onshape Mobile](https://cad.onshape.com/help/Content/Home/selection.htm) | iPhone + iPad CAD editing, internet required | Press-and-drag **precision selector** with crosshair offset to avoid finger occlusion; box selection; tap selection toggle | High priority for small-parts/eye/bill selection, not just gizmos | Full feature trees, constraint UI, modal dialogs are more than our V2 needs. |
| [Sketchfab Viewer](https://sketchfab.com/3d-viewer) | Browser, mobile | Lightweight 3D presentation, opt-in inspector, annotations and predefined view jumps; controls can be hidden (https://sketchfab.com/developers/viewer/initialization) | View/inspect vs edit separation; reference annotations, shareable camera views | Not a model editor; don't make our import workflow network-dependent. |

### Independent community sentiment (illustrative, not a formal user study)

- Shapr3D users praise intuitive touch+Pencil use but distinguish it from deeper CAD capabilities: https://www.reddit.com/r/Shapr3D/comments/1jqyy02/
- Nomad community users frequently cite more approachable touch UI than desktop ZBrush, though modelling skills still have learning curve: https://www.reddit.com/r/NomadSculpting/comments/1qtpvjw/
- Valence's simpler UI is one attraction among users seeking a one-time-purchase alternative to Shapr3D: https://www.reddit.com/r/3Dprinting/comments/1t5hjqe/valence_3d/
- Onshape iPhone community reviews include both mobile capability praise and usability constraints; treat as a rich UX **problem source**, not a style benchmark: https://apps.apple.com/ca/app/onshape-3d-cad/id923421284

## Adjacent 2D/mobile creative reference patterns

| Product | Primary reference | Useful translation |
|---|---|---|
| [Concepts](https://concepts.app/en/manual/workspace) | Customizable/movable radial tool wheel or toolbar; normal/compact/hidden chrome; press-drag directly on quick values | Optional compact radial **precision controller**, replace V1 permanent oversize retro dock; editable user-saved tool layout. |
| [Procreate Pocket](https://apps.apple.com/ca/app/procreate-pocket/id916366645) | Immersive canvas; simple top tools and deep contextual workspaces; gestures | **Canvas-first** default, dismissible panels, avoid dashboard/toolbar dominance. |
| [Linearity Curve](https://apps.apple.com/ca/app/linearity-curve-vector-design/id1219074514) | Direct node selection, handles, inspector and action context in vector editing | Part/object gizmo + explicit selection semantics, alignment from 2D to 3D. |
| [Lightroom Mobile](https://helpx.adobe.com/ca/lightroom/mobile/get-started/workspace-overview.html) | Bottom tasks for presets/edit/masking, nested controls rather than universal slider list | Look tiles with context-specific detail sliders, before/after, preserve distinction between source materials and output render. |

## Proposed mobile GUI interaction contract (evaluate with prototype)

**Canvas / passive View**: free orbit + pinch zoom + two-finger pan; small model picker, orientation cube, Fit, Look and optional Inspect. Close or collapse the bottom tool shelf. No material/transform handles absent a selection.

**Selection**: tap object to select/highlight (not isolate); selection shows an anchored compact 3–5 action shelf (Inspect, Isolate, Transform, Compare, More). **Long-press** invokes an offset precision crosshair for tiny targets (inspiration: Onshape). Explicit X to clear selection.

**Look**: a sheet of visual presets (Original, Pixel, Cel, Flat, Ink etc.). Select one then show only its relevant controls. Original preserves source textures/PBR. Before/after hold or A/B swipe. Palette quantization separate from source material.

**Compare**: choose second version → split initially; camera lock toggled; opacity overlay and reference image alignment follow. Label independent scale modes (Actual / Fit separately / Normalize) to avoid hiding silhouette differences.

**Edit (later)**: select object → Move, Rotate, Scale; visual gizmo plus editable numeric inputs and undo; reversible changes. No face/vertex editing or sculpting for V2 unless separately scoped.

**Controls**: default touch gestures. Optional compact precision panel (yaw, pitch, roll, zoom, numerical XYZ); V1 3DS stick + rotary controls preserved as selectable alternative. Users can hide all controls while viewing.

**Adaptive layout**: iPhone portrait bottom sheets; iPhone landscape smaller overlays/dockable narrow panel if available; iPad/desktop optional side inspector. One data model, no platform-specific duplicated business logic.

## Avoid blind imitation — comparative prototype tasks

Run at least two mobile GUI layouts in Playwright and on real iPhone:
1. Load local Porygon2 OBJ and a textured GLB; fit model; clear canvas chrome.
2. Select tiny eye part without accidental orbit; choose head vs eye; clear selection.
3. Switch Original → Pixel (4-colour custom) → Original and verify material fidelity.
4. Compare simplified Porygon2 to source reference side by side; align scale vs normalize.
5. Adjust bill transform, undo, export/save project (only once editing implemented).
6. Use in portrait/landscape, with VoiceOver labels, increased text, left/right hand; scroll bottom sheets while two-finger camera gestures remain consistent.

Record for each: taps to task, total screen occlusion %, success/error frequency, gesture conflicts and discoverability. These are testing metrics, not unsupported benchmarks.

## Source screenshots / visual review links

- Valence modeler overview (iPhone/iPad imagery): https://www.manual.valence3d.app/modeler/
- Valence toolbar and gizmos: https://manual.valence3d.app/modeler/toolbar/
- Shapr adaptive UI screenshots/GIF: https://support.shapr3d.com/hc/en-us/articles/7873882619548-Adaptive-user-interface
- Nomad interface guide: https://nomadsculpt.com/manual/interface
- Onshape precision selection demonstrations: https://cad.onshape.com/help/Content/Home/selection.htm
- Concepts Tool Wheel / compact mode images: https://concepts.app/en/manual/workspace
- Lightroom mobile screenshots: https://helpx.adobe.com/ca/lightroom/mobile/get-started/workspace-overview.html

Do not commit external screenshots into the GitHub Pages repository without appropriate license/permission. Link to primary source instead.

## Historical V1 screenshot coverage

**Corrected source:** the current standalone viewer has its own successful Chromium/WebKit screenshot artifacts, notably [run 41986502252](https://github.com/raskal-labs/3d-model-viewer/actions/runs/41986502252) and [run 41977432567](https://github.com/raskal-labs/3d-model-viewer/actions/runs/41977432567). Earlier PR #6 artifacts below belong to the *other* hosting repository and are not the current source-of-truth baselines.


Two **historical hosting-repo** screenshot artifact runs were found for PR #6, dated November 4, 2026:
- https://github.com/raskal-labs/raskal-labs.github.io/actions/runs/41977432567 — `desktop-effects.png`, `desktop-compare.png`, `mobile-panel.png`, `mobile-compare.png`.
- https://github.com/raskal-labs/raskal-labs.github.io/actions/runs/41986502252 — all four plus `webkit-mobile-compare.png`.

No screenshot attachments were found in PR #1–5 discussions during this audit. Earlier standalone UI revisions are preserved as Git commits, **not as existing screenshot archives**. If historical visual baseline is desired, Codex should check out known PR milestone commits/tags and render reproducible screenshots at matched viewports, angles and asset/preset state. Label failed/unrenderable historical revisions **Not verified** rather than claiming screenshot parity.
