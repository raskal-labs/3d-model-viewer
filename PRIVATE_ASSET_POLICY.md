# Model asset storage policy

This public repository contains **viewer code only**. Never commit, embed, bundle, attach as an artifact, or publish real model meshes or their textures, screenshots, sprite sheets, proprietary references, or source files here. This applies to official game meshes as well as all Porygon/Chief, PhaseOne, Minimal, Mini, and future custom models.

- Canonical assets and working revisions belong in the **private GameCube asset library**, not this repository or public GitHub Pages.
- The private installation at `https://3d.rsk.al/v3/` uses a same-origin `/model-library/` endpoint, reachable only from LAN or WireGuard. The viewer code may be published separately but must not contain model data or public asset URLs.
- Classify collection entries as `Official game models` or `Our models` with provenance, game, variant, author, revision and source information maintained privately. Files remain separated from the public app build.
- Client-side editing drafts remain browser-local until explicitly saved to the private library; publishing the website never uploads model data.
- Public tests use **synthetic meshes generated in test code** and may not include copyrighted/proprietary models or screenshots of private models.

**History notice:** Older versions of this public repository included model files. Their removal from the current branch does **not** remove those blobs from Git history, forks, or caches. Treat full history sanitization/repository-privacy changes as a separate, explicitly verified operation. Do not assert that old copies are inaccessible.

The public V2 viewer starts with **no default model**, not even a procedural demo mesh. No Minimal, Mini, Chief, PhaseOne, official, fan-made or other 3D model may be preloaded into its public release. Synthetic test fixtures may be generated only during CI; they are not published as viewer assets.
