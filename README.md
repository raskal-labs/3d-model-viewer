# Porygon2 Style Lab (GitHub Pages)

Open https://raskal-labs.github.io/porygon2/ after merging and GitHub Pages publication.

## Controls
- Six styles: Pixel (default), Flat, Cel shaded, Watercolour, Ink / Sketch, Monochrome / Clay.
- Six palettes: Original (default), Game Boy, Graphite, Amber, Virtual Boy, Cyanotype.
- Outlines: Reactive (default), Solid, Ink, Off. Default width 2 pixels.
- Render resolution: 240p (default), 80p, 160p, Native.
- Touch: drag orbit, pinch zoom, two-finger pan, reset view.

## Model
The viewer loads the existing 13-part Porygon2.obj, rotates the entire model -90 degrees around Z, flattens the bill, and assigns the bill to the blue material group. These transforms are viewer-side so the original OBJ remains intact. This is **not** the final eye-corrected mesh. Eye, pupil and glint placements remain unverified.

The editable GLSL shaders live in index.html; the Python OBJ editor remains in edit_model.py.

## Testing / limitations
- Three.js modules load from jsDelivr over HTTPS; internet required.
- Browser smoke test and visual checks are required before merge. In particular: Safari ES modules, shader compile, eye visibility, orientation, all style/palette combinations, outline controls, and touch gestures.
- Watercolour and sketch are lightweight procedural approximations, not physically simulated media.
- Lighting palette is limited to four indexed colours in every mode; background is separate.
