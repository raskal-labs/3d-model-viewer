# Porygon2 & Chief Style Lab

GitHub Pages viewer at `/porygon2/`. Serve over HTTPS; opening HTML directly from Files on iOS does not load JavaScript modules.

## Default appearance
Style **Pixel**, outlines **Reactive 2px**, palette **Original**, resolution **Native** (pixel ratio capped at 2). Six styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome. Six palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype. Outline modes: Off, Solid, Reactive, Ink; render resolutions: 80p, 160p, 240p, Native.

## Camera and controls
The header **← / →** buttons (or keyboard arrows outside controls) switch character models; the arrows never rotate the camera.

The camera HUD has:
- **3DS-style analogue circle pad** with a draggable thumb. In **Rotate** mode, moving the pad orbits the selected model (yaw and pitch). In **Pan** mode, it translates the camera and orbit target together, moving the model's image without moving its geometry. Keyboard arrows work when the circle pad has focus.
- **Yaw** styled as a horizontal volume slider; **Pitch** as a vertical volume slider. Their directions are independent.
- **Roll** as a third slider: banks the camera around its viewing axis without rotating or modifying the model's mesh.
- **↺ Reset** restores this model's saved camera preset, or the automatic built-in view if none is saved.
- **⎘ Copy** copies the full camera preset JSON without opening settings.
- **123 Values** hides camera numbers by default, and shows/hides the HUD readouts on demand.
- **Gestures On/Off** enables/disables orbit, pan, and zoom gestures directly on the 3D canvas. The HUD remains functional while gestures are off.

## Coordinate editor, copy and paste
Open **Styles → Camera coordinates & presets**. All camera XYZ, orbit-target XYZ, yaw, pitch, roll, distance, and FOV can be entered manually. Enter a value and commit the field to update the scene. A live readout shows the derived angles, distance and FOV.

**Copy all** exports a versioned, model-specific preset containing position and target arrays, yaw, pitch, roll, distance, and FOV. **Copy selected** exports a useful subset; choose Camera XYZ, Target XYZ, Yaw/Pitch/Roll, Distance/FOV, or individual coordinates in the dropdown. The always-visible **⎘ Copy** is an additional shortcut for all values.

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
