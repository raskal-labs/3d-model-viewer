# Porygon2 Style Lab

A Safari-compatible GitHub Pages viewer at `/porygon2/`. Open over HTTPS; do not open HTML directly from iOS Files.

## Defaults
- Style: Pixel
- Outline: Reactive, 2 internal pixels
- Palette: Original (black, pink/red, blue, white)
- Resolution: Native (up to 2x device pixel ratio)

## Controls
Styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome.
Palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype.
Outline modes: Off, Solid, Reactive, Ink. Width 0–5 px.
Resolution: 80p, 160p, 240p, Native.
Touch: drag to orbit, pinch to zoom, two-finger drag to pan.

## Model
`Porygon2-upright.obj` is the upright model, rotated -90 degrees about Z from the original OBJ. The bill was scaled to be flatter and wider, and its material is blue. The original `Porygon2.obj` is retained for comparison. `Porygon2.mtl` provides four base material definitions. The editable `edit_model.py` regenerates the upright OBJ from the original.

Eye placement is inherited from the original OBJ and remains unverified. The prior eye-adjusted GLB was not imported into this branch, so do not assume its exact eye coordinates are preserved.

## Rendering
The GLSL shaders are editable in `index.html`. Effects are screen-space approximations, not a texture-baked or fully art-directed match to the reference sprite. The Pixel mode uses exactly four opaque palette colours on the model, with reactive edge colour based on nearby pixels. The watercolour and sketch modes are procedural approximations. The renderer loads Three.js from jsDelivr and needs network access.

## Verification
Static source and mesh checks are required before merge; a live mobile Safari screenshot remains necessary for visual sign-off.
