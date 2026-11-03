# Porygon2 & Chief Style Lab

GitHub Pages viewer at `/porygon2/`. Serve over HTTPS; opening HTML directly from Files on iOS does not load JavaScript modules.

## Default appearance
Style **Pixel**, outlines **Reactive 2px**, palette **Original**, resolution **Native** (pixel ratio capped at 2). Six styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome. Six palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype. Outline modes: Off, Solid, Reactive, Ink; render resolutions: 80p, 160p, 240p, Native.

## Camera and controls
The header **← / →** arrows switch character models (Porygon2, Chief, and future additions). They never adjust the camera.

### Ace Attorney-inspired roller layout
The mobile viewer has a narrow, collapsible inspection dock inspired by the handheld game's object inspection interface:
- **Bottom horizontal knurled wheel — Yaw:** drag left/right to turn the view around the character. With **Shift** held, this same wheel becomes **Roll**, banking the camera around its viewing axis.
- **Left vertical knurled wheel — Pitch:** drag up/down to tilt the camera. This wheel always remains Pitch, even with Shift.
- **Right vertical knurled wheel — Zoom:** drag up/down to move the camera closer or farther. This wheel always remains Zoom.
- **Small 3DS-style circle pad in the middle:** drag or press keyboard arrow keys when focused. Its action depends on the current mode (Rotate, Pan, Roll, or Zoom). Pan translates the camera and target together without altering the model geometry.
- **Shift mode selector:** two layered buttons each display both labels. In normal mode, **Rotate** and **Pan** are bright and **Roll** and **Zoom** remain dimmed but visible. Shift reverses the bright/dim treatment and changes the circle pad actions to Roll and Zoom. The horizontal wheel switches to Roll, while the two vertical Pitch/Zoom wheels stay dedicated.
- **Reset** is always available on the bottom button row. The **••• menu** keeps Copy camera JSON, Values, canvas Gestures, single-axis Pad Lock, and Expand controls.
- **⌄ Hide / ⌃ Show** folds the entire bottom dock away to just its small tab. This is separate from the **••• menu**, which only expands or collapses the extra actions.

The knurled drums use *relative drag*, not linear slider positions. The textured track moves beneath a fixed central indicator. Keyboard arrows on a focused wheel provide discrete adjustments. Numerical readouts are hidden by default; choose **••• → Show values** to display them.

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
