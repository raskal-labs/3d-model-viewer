# Porygon2 & Chief Style Lab

GitHub Pages viewer at `/porygon2/`. Serve over HTTPS; opening HTML directly from Files on iOS does not load JavaScript modules.

## Default appearance
Style **Pixel**, outlines **Reactive 2px**, palette **Original**, resolution **Native** (pixel ratio capped at 2). Six styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome. Six palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype. Outline modes: Off, Solid, Reactive, Ink; render resolutions: 80p, 160p, 240p, Native.

## Camera and controls
The header **← / →** arrows switch character models (Porygon2, Chief, and future additions). They never adjust the camera.

### Pocket-radio wheels and a DJ fader
The mobile viewer now uses **two matching, partially recessed 88px radial wheels**, as if mounted inside a handheld electronic device: the **Pitch wheel** pokes out of a narrow left-side opening, and the **Yaw wheel** pokes out from a matching horizontal opening near the bottom. Only the textured outer rim is visible. The virtual wheel textures rotate beneath stationary index marks while you drag; the internal disc diameters are identical, even though their visible slots have different orientations.

**Zoom** is intentionally different: a classic **DJ-mixer-style vertical linear fader** on the right, with a fixed centre groove and a brushed-metal thumb that travels a finite distance. Move its thumb upward to zoom closer and downward to zoom out. The slider shows a physical position instead of simulating infinite turning.

The **3DS-inspired circle pad** has two touch regions:
- Drag its **centre** to use the selected Rotate, Pan, Roll or Zoom mode; the existing two-layer buttons still show both **Rotate/Roll** and **Pan/Zoom**, with the inactive label visibly dimmed. Shift swaps the bright/dim assignments and remaps the bottom wheel from Yaw to Roll.
- Trace a circle around its **outer rim** to twist the knob and **roll the camera continuously**, independently of the current mode. Passing 360° does not stop or reverse the roll. A rotating peripheral marking shows the current bank. For numerical readout and exported camera JSON, roll can accumulate multiple turns.

**Pitch** is always available on the left wheel. **Reset** stays in the bottom row. **•••** contains Copy JSON, Values, Gestures, axis Lock and Expand. **⌄ Hide / ⌃ Show** folds the entire dock away independently of the overflow menu. Numerical values are hidden by default.

### Touch and page navigation
The scene canvas fills the page. When Gestures are enabled, dragging empty canvas space rotates the camera, pinching zooms the **3D camera**, and two-finger dragging pans. Turning Gestures Off disables canvas manipulation but leaves the roller wheels and circle pad available.

The HTML body is fixed, page scrolling and rubber-band overscroll are suppressed, and native pinch/double-tap **webpage** zoom is blocked where Safari permits. The **Styles** panel itself remains scrollable for its settings. Browser chrome and iOS accessibility zoom are outside the website's control.

## Coordinate editor, copy and paste
Open **Styles → Camera coordinates & presets**. All camera XYZ, orbit-target XYZ, yaw, pitch, roll, distance, and FOV can be entered manually. Enter a value and commit the field to update the scene. A live readout shows the derived angles, distance and FOV.

**Copy all** exports a versioned, model-specific preset containing position and target arrays, yaw, pitch, roll, distance, and FOV. **Copy selected** exports a useful subset; choose Camera XYZ, Target XYZ, Yaw/Pitch/Roll, Distance/FOV, or individual coordinates in the dropdown. The **••• → Copy camera JSON** action is an additional shortcut for all values.

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
