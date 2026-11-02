# Porygon2 & Chief Style Lab

GitHub Pages viewer at `/porygon2/`. Serve over HTTP(S); opening directly from iOS Files does not support module loading.

## Defaults and controls
Pixel · Reactive 2px · Original · Native (device pixel ratio capped at 2).
Styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome.
Palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype.
Outlines: Off, Solid, Reactive, Ink; thickness 0–5 render-target pixels.
Resolution: 80p, 160p, 240p, Native.
Previous/next buttons or left/right keyboard arrows switch models. Arrow shortcuts leave form controls alone.
Drag to orbit, pinch to zoom, two-finger drag to pan. Two round touch dials control horizontal yaw and vertical pitch (also keyboard arrow-adjustable when focused). A central **Rotate / Pan** touch pad adds four directional buttons: Rotate orbits around the model; Pan shifts the camera and target together in screen-space, moving the model's image in the chosen direction. Tap once for a measured step or hold for continuous finer movement; keyboard activation of the focused pad directions also works. The mode buttons never change the character model. The left/right header buttons remain **model switchers**, not orbit controls. Reset camera restores that model's saved view when present, otherwise frames the model automatically. Defaults restores rendering settings.
Settings persist while switching models, including selections made during loading.


## Per-model camera presets
Open **Styles → Camera & view coordinates** to inspect the current world-space camera XYZ, orbit-target XYZ, yaw, pitch, distance and field of view. Camera and target fields are editable; use the on-screen horizontal and vertical dials or direct mouse/touch orbit to position the character.

**Set default view** saves the current model's camera position, orbit target and FOV in `localStorage` under a versioned key (one for Porygon2, one for Chief, extensible to future model IDs). The view is restored on switching back to the model or reloading this browser. **Clear saved default** reverts to built-in framing. **Copy camera JSON** exports a machine-readable preset for sharing or committing to site-wide defaults; it does **not** automatically modify the GitHub repository. Browsers that disable storage only retain the preset for the current page session. Camera presets affect the view, not mesh coordinates or model geometry.

## Models
`Porygon2-upright.obj` rotates the original OBJ -90 degrees about Z, with a flatter, wider blue oval bill. The original `Porygon2.obj` remains available; `edit_model.py` regenerates the upright mesh. `Porygon2.mtl` describes its base materials.
Eye placement is inherited from the source OBJ; no eye geometry redesign is included.
Chief uses `chief/chief-snap-lettered.obj`, its MTL and Snap textures, plus solid yellow helmet and dark lettering materials. Original preserves these colours; other palettes remap Chief by luminance.
Model switching ignores stale requests and disposes replaced geometry, materials and textures.

## Rendering
Editable GLSL lives in `index.html`. Pixel uses four opaque colours on Porygon2; Chief retains its original texture colours with Original selected. Watercolour and sketch are procedural approximations. Ink outlines add a grain pattern. Three.js 0.168.0 loads from jsDelivr and requires network access.

## Verification (2026-11-02)
Passed module syntax parsing and live Chromium/WebGL smoke checks: both model loads (13 and 10 meshes), six styles on each, six palettes, four outline modes, four resolutions, defaults and switching. Desktop and 390×844 phone layout inspected; no console warnings/errors reported.
Mobile Safari device testing remains outstanding. This documents the test boundary rather than claiming Safari sign-off.

Camera coordinate/dial/default-preset functionality was added afterward in a separate feature branch; it requires separate interactive acceptance testing. No 3D mesh/proportion or blue-belly edits are included in the camera-control change.
