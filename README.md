# Porygon2 Safari viewer

Visit /porygon2/ on the published GitHub Pages domain.

- Touch drag: orbit
- Pinch: zoom
- Two-finger drag: pan
- Reset view: restore camera
- The model is loaded automatically from Porygon2.obj over HTTPS.
- 160-pixel-high internal render, nearest-neighbour output.
- Palette: #C84850, #5060C0, #FFFFFF, #000000.
- Shader source is editable inside index.html.
- The OBJ is editable with edit_model.py; original MTL/GLB exports remain available in the ChatGPT package.

## Known limitations
The eye placement is not visually verified. Lighting and edge shading are approximations of the supplied sprite; the current viewer has not been verified in mobile Safari. Three.js is loaded from jsDelivr, requiring internet access.

This branch intentionally leaves the existing root site untouched.
