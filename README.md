# Porygon2 & Chief Style Lab

## Project governance and V2 work

The active development authority is **this standalone repository**, not the older `raskal-labs.github.io/porygon2/` hosting copy. V1 already has gesture-first controls, static OBJ/STL/GLB uploads and Render Lab. **V2 is planned but not implemented.** The current implementation guide follows below.

Atlas project source:
- [PROJECT.yaml](./PROJECT.yaml) — current state, issues, next checkpoint.
- [WORK.yaml](./WORK.yaml) — milestone/task/thread acceptance and status.
- [CONTRACT.md](./CONTRACT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DECISIONS.md](./DECISIONS.md), [PROGRESS.md](./PROGRESS.md) — technical invariants, as-is/to-be boundaries, decisions, dated evidence.
- [ROADMAP.md](./ROADMAP.md), [TASKS.md](./TASKS.md) — human reading guides (not separate writable statuses).
- [V2_PLAN.md](./V2_PLAN.md), [V2_RESOURCES.md](./V2_RESOURCES.md), [V2_UX_REFERENCES.md](./V2_UX_REFERENCES.md) — detailed design, resources, UX research.
- [AGENTS.md](./AGENTS.md), [Issue #4](https://github.com/raskal-labs/3d-model-viewer/issues/4) — Codex instructions and tracking entry.
- [`.atlas/project.yaml`](./.atlas/project.yaml) — v2 source binding under `atlas.porygon` (central Atlas enrollment not yet verified).

Read-only local checks:

```bash
python3 -m pip install PyYAML jsonschema
python3 tools/validate-atlas-docs.py
# With Atlas checkout, additionally validate against official Atlas schemas:
python3 tools/validate-atlas-docs.py --atlas-root /lab/atlas/repo
```

The initial structural check confirms authority links but is **not** a substitute for official schema validation, semantic review or real iPhone testing.

---

GitHub Pages viewer at https://raskal-labs.github.io/3d-model-viewer/. Serve over HTTPS; opening HTML directly from Files on iOS does not load JavaScript modules.

## Default appearance
Style **Pixel**, outlines **Reactive 2px**, palette **Original**, resolution **Native** (pixel ratio capped at 2). Six styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome. Six palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype. Outline modes: Off, Solid, Reactive, Ink; the outline colour is selected separately from its style and the model palette; the Surface lines slider adds subtle mesh edges. Reactive and Ink vary edge coverage, and output colour reduction preserves the outline colour; render resolutions: 80p, 160p, 240p, Native.

## Camera and controls
The header **← / →** arrows switch character models (Porygon2, Chief, and future additions). They never adjust the camera.

### Gesture-first camera controls

Drag one finger to orbit. With two fingers, drag to pan, pinch to zoom, and twist to roll; these movements can be combined. Hold the reticle at the bottom center and drag to Orbit, Pan, Roll, Zoom, or Clutch, then release to open the selected precision control. Orbit uses a rocker-like surface; Pan uses a circular pad; Roll uses an outward drag followed by a circular arc; Zoom uses a slider. Hold Clutch while using other fingers to reduce viewport sensitivity. Tap the reticle to return to the last precision control, or tap it on first use to choose one. Undo and Frame are the glyph buttons at the lower left. Manual movement stops turntable rotation.

The Render Lab is a scrollable settings sheet. Use Models to open a static OBJ, STL, or self-contained GLB/glTF (up to 64 MB); uploads stay in the current tab. The Lab starts filters and overlays off on reload. Use the built-in looks, filter and guide presets, or save and later apply named looks in this browser. Look JSON can be copied, downloaded or imported; uploaded model, image and texture files are not included. Pocket Fonts are bundled with their license in `fonts/`.

## Coordinate editor, copy and paste
Open **Lab → Camera coordinates & presets**. All camera XYZ, orbit-target XYZ, yaw, pitch, roll, distance, and FOV can be entered manually. Enter a value and commit the field to update the scene. A live readout shows the derived angles, distance and FOV.

**Copy all** exports a versioned, model-specific preset containing position and target arrays, yaw, pitch, roll, distance, and FOV. **Copy selected** exports a useful subset; choose Camera XYZ, Target XYZ, Yaw/Pitch/Roll, Distance/FOV, or individual coordinates in the dropdown.

**Paste clipboard** attempts a clipboard read (which may require Safari permission); alternatively paste/type JSON into the text box. **Apply JSON** restores either a complete preset or partial values. Examples:

```json
{"yaw":34.3,"pitch":10.6,"roll":0}
```

```json
{"position":{"x":0.5}}
```

```json
{"position":[1.0,0.5,-3.0],"target":[0,0,0],"fov":40,"roll":15}
```

If both XYZ and angles are present, angles/distance take precedence in setting the camera's orientation relative to the supplied target. Full presets retain their model ID; a preset marked for Chief is rejected while Porygon2 is selected.

**Set default view** saves the current camera+target+FOV+roll to that model's versioned browser localStorage key; it is restored when returning to that character or reloading the page. **Clear saved default** removes that model's stored view. Saved browser presets do **not** change shared GitHub Pages defaults; send exported JSON to incorporate it into source control. When localStorage is unavailable, the preset lasts only until the tab closes.

## Models
`Porygon2-upright.obj` is the prior upright mesh with flattened blue oval bill; `Porygon2.obj` is the original, and `edit_model.py` regenerates the upright OBJ. The original mesh retains its original eyes and missing belly; a separate refined variant is available below.

Chief loads from `chief/chief-snap-lettered.obj` and its Snap texture assets. Original palette preserves Chief's helmet and textured colours. The original Chief helmet/lettering is likewise preserved; a separate refined variant is available below.

Viewer Three.js r168 is imported from jsDelivr. The pixel shader and procedural watercolour/sketch approximations live in `index.html`.

## Verification status
Prior Chromium smoke checks validated models (Porygon2 13 meshes, Chief 10 meshes), six rendering styles, palettes, outline modes and resolutions. This PR adds new control code and needs its own iPhone Safari testing; JS syntax and DOM IDs have been statically verified. Do not treat an unperformed interactive test as passed.

## Simplified anatomy A/B variants (November 12, 2026)

The built-in model picker now offers four distinct choices: **Porygon2**, **Chief**, **Porygon2 · refined**, **Chief · refined**. The first two are the unchanged source meshes and preserve the former default comparison pair. The two new files are derived revisions; neither original was overwritten.

- `Porygon2-refined.obj`: preserves the spherical head, neck, pink body, feet and tail; brings the two white eye assemblies, black pupils and white glints onto the forward-facing head; lengthens/flattens the existing blue bill; adds a low-profile blue belly overlay following the existing body mesh. This is the **same economical, low-detail style**, not a new model.
- `chief/chief-refined.obj`: preserves Pokémon Snap Porygon's original mesh and textures (Chief is **Porygon**, not Porygon2), lifts/tucks the yellow helmet slightly and centres/scales `CHIEF` onto its front facet. The original Chief remains as a baseline.
- `tools/refine_models.py` reproducibly regenerates both variants using only Python standard library; run `python3 tests/model-refinements.py` for geometry invariants. The original source assets and `edit_model.py` are deliberately unchanged.

**Status:** the OBJ assets load and render in headless Chromium; shape, text scale and placement remain open to artistic A/B review, particularly on a real iPhone Safari browser. The source models continue to be available for side-by-side comparisons. Neither the private `233.glb` nor PhaseOne reconstruction is included here.
