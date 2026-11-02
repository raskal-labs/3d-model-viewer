# Porygon2 & Chief Style Lab

GitHub Pages viewer at `/porygon2/`. Serve over HTTP(S); opening directly from iOS Files does not support module loading.

## Defaults and controls
Pixel · Reactive 2px · Original · Native (device pixel ratio capped at 2).
Styles: Flat, Cel shaded, Pixel, Watercolour, Ink / Sketch, Monochrome.
Palettes: Original, Game Boy, Graphite, Amber, Virtual Boy, Cyanotype.
Outlines: Off, Solid, Reactive, Ink; thickness 0–5 render-target pixels.
Resolution: 80p, 160p, 240p, Native.
Previous/next buttons or left/right keyboard arrows switch models. Arrow shortcuts leave form controls alone.
Drag to orbit, pinch to zoom, two-finger drag to pan. Reset camera reframes the current model. Defaults restores rendering settings.
Settings persist while switching models, including selections made during loading.

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
