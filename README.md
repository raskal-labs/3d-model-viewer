# Porygon2 & Chief Style Lab

GitHub Pages viewer at https://raskal-labs.github.io/3d-model-viewer/. Serve over HTTPS; opening HTML directly from Files on iOS does not load JavaScript modules.

## Default appearance
Style **Pixel**, outlines **Reactive 2px**, palette **Original**, resolution **Native** (pixel ratio capped at 2). Six styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome. Six palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype. Outline modes: Off, Solid, Reactive, Ink; the outline colour is selected separately from its style and the model palette. Reactive and Ink vary edge coverage, and output colour reduction preserves the outline colour; render resolutions: 80p, 160p, 240p, Native.

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
`Porygon2-upright.obj` is the prior upright mesh with flattened blue oval bill; `Porygon2.obj` is the original, and `edit_model.py` regenerates the upright OBJ. Eye placement, blue belly, and proportions are **unchanged by this camera-control PR**.

Chief loads from `chief/chief-snap-lettered.obj` and its Snap texture assets. Original palette preserves Chief's helmet and textured colours. Helmet lettering/fit is likewise not changed by this PR.

Viewer Three.js r168 is imported from jsDelivr. The pixel shader and procedural watercolour/sketch approximations live in `index.html`.

## Verification status
Prior Chromium smoke checks validated models (Porygon2 13 meshes, Chief 10 meshes), six rendering styles, palettes, outline modes and resolutions. This PR adds new control code and needs its own iPhone Safari testing; JS syntax and DOM IDs have been statically verified. Do not treat an unperformed interactive test as passed.
