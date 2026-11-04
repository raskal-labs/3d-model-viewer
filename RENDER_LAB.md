# Porygon Viewer: Render Lab & Comparison

## Scope
One compact Styles panel containing collapsible groups. Existing touch gestures, recessed X/Y wheels, zoom fader, camera JSON, and model arrows are retained. A header **⇔** button toggles synchronized side-by-side model comparison.

This is an additive render preview workflow; it never writes model geometry, source textures, or assets back to Git.

## Implemented on this branch
- **Appearance:** Existing six styles, four outline modes, width, six built-in palettes and resolution choices, plus editable four-colour custom palette.
- **Scene:** Solid studio/black/white/chroma/Game Boy backdrops, gradient studio/sunset, transparency-style checkerboard, custom solid colour.
- **Lighting:** Original, unlit, studio, soft, hard, dramatic, rim, overhead, underlit, and custom angle, elevation and intensity. Shading is stylized, not physical PBR.
- **Quick looks:** Clean, Game Boy, Virtual Boy, CRT TV, PS1-inspired, Blueprint. Presets configure independent effects rather than creating more base render styles.
- **Materials:** Nearest/linear sampling, matte/glossy/metal-*like* simulated highlights. Image texture replacement only for parts with an existing image-textured UV material; restores without replacing the source file.
- **Palette:** Output quantization to 2, 4, 8 or 16 generated colours, plus Bayer-pattern ordered dithering. Four editable source slots are used to derive larger palettes. This is not semantic colour-part remapping for imported full-colour textures.
- **Post effects:** Grain, scanlines, vignette, CRT curvature, pixel grid, halftone, chromatic aberration, bloom approximation, sepia, threshold, posterize, brightness, contrast, saturation.
- **Overlays:** Mesh wireframe, crosshair, rule-of-thirds guides, independently selectable mesh parts, uploaded translucent reference image and opacity.
- **Compare:** Switch models with existing arrows; toggle split screen with ⇔ or Styles → Compare. Both halves use the same orbit angles, appearance and proportional model framing. Right-hand model selectable.
- **Capture/presets:** Save composite PNG (including the reference image and comparison labels); copy complete appearance JSON; import look JSON; persist appearance settings per browser; adjustable turntable rotation.

## Not in this pass
- True PBR materials and physically correct cast shadows.
- UV unwrapping or arbitrary texture mapping on Porygon2 (the supplied OBJ has no `vt` coordinates).
- Texture painting, bone/animation editing or motion playback.
- Arbitrary 3D model upload; the model list currently includes the known Porygon2 and Chief assets.
- Multiple independent per-side styles/cameras: compare currently intentionally shares camera orientation, effects and look.
- Alpha-transparent PNG or full background-image compositing.
- Automatic sprite difference/onion-skin registration and blend-mode editor.
- True error-diffusion dithering; the included dithering is GPU-friendly ordered Bayer.
- Mobile Safari performance or gesture acceptance is **not yet verified**. Watch GPU cost of simultaneous bloom, CRT and split compare.

## Acceptance checks (before merge)
1. Open in desktop Chrome or Firefox; ensure no JS errors and models actually render.
2. Toggle ⇔. Verify two distinct models, correct left/right labels, and synced angle changes from gestures/dials.
3. Switch left model while comparing. Ensure the right model auto-selects the other character; switch compare off and verify full-size view.
4. Change resolution among 80p/160p/240p/Native while comparing; confirm each viewport fills exactly half the canvas on standard and Retina devices.
5. Choose every lighting and backdrop preset, including checkerboard and custom colour; check Porygon2 and Chief.
6. Recolour custom palette slots and quantize to 2, 4, 8, 16; check appearance of Chief's textured helmet.
7. Enable each filter individually, combine several, then hold the **bypass filters** button.
8. Toggle wireframe, select/hide mesh parts, upload a reference image and adjust opacity; verify the frame is visible in screenshots.
9. Apply a replacement texture to Chief, restore it; ensure attempts on non-UV Porygon2 report unsupported parts.
10. Capture PNG and export/import a look JSON. Reload and verify locally saved appearance.
11. On iPhone Safari, verify Styles panel scroll, no webpage pinch zoom, working camera dials/fader, no performance regression or crash.
12. Review shader compilation warnings and performance under split + Native resolution + bloom before merge.

## Architecture notes
`index.html` remains authoritative for model definitions, camera UI, render style shaders and original post-outline pass. `render-lab.js` adds the new UI and a second postprocessing pass with optional split render-to-texture. It keeps original meshes and material textures unchanged on disk. In-memory wireframe graphics are disposed when the primary model is unloaded.

A single shared base look is used for side-by-side comparison to avoid visual differences being caused by different shader settings. For future A/B-style comparisons, introduce a separate **per-side render configuration** rather than duplicating the entire viewer.
