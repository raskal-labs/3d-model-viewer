# Codex instructions — 3D Model Viewer

This repository is the authoritative **implementation and local Atlas source** for the 3D Model Viewer. It is not the historical `raskal-labs.github.io/porygon2/` hosting copy. Inherit the policy of the private `raskal-labs/atlas` repository's `PRINCIPLES.md`, `STANDARDS.md` and `CONTRACT.md` (especially continuity, authority and evidence requirements). Do not copy weaker paraphrases of parent rules.

## Required reading before implementation

1. [PROJECT.yaml](./PROJECT.yaml) — canonical purpose, current state, issues and next checkpoint.
2. [WORK.yaml](./WORK.yaml) — canonical milestone/task/thread statuses and acceptance; use stable work IDs in PRs.
3. [CONTRACT.md](./CONTRACT.md), [ARCHITECTURE.md](./ARCHITECTURE.md), [DECISIONS.md](./DECISIONS.md), [PROGRESS.md](./PROGRESS.md).
4. [V2_PLAN.md](./V2_PLAN.md), [V2_RESOURCES.md](./V2_RESOURCES.md), [V2_UX_REFERENCES.md](./V2_UX_REFERENCES.md).
5. Existing V1 code: `index.html`, `render-lab.js`, `gesture-navigation.js`, `gesture-navigation.css`, `tests/` and the Pages workflow.

Roadmap/task Markdown pages are **reading guides**, not independent status ledgers. The Atlas v2 binding is `.atlas/project.yaml` in this repository; central Atlas enrollment is a *separate, currently unverified* step.

## Existing implementation — do not regress it

V1 already implements **static OBJ/STL/self-contained GLB/glTF upload** (up to 64 MB), gesture-first orbit/pan/roll/zoom, precision instruments with clutch, looks, palettes and comparisons. Do not reimplement existing features blindly, or claim they are missing merely because the earlier hosting copy lacked them. Imported materials are currently adapted to a custom stylized shader; skinned meshes are rejected and Draco decoding isn't wired up. These gaps are V2 work.

**Hybrid rebuild:** create isolated V2 core and GUI and reuse sensible Three.js loading, camera, gesture, shader/effects, model asset, font and test code, retaining the original Porygon2's simplified style as a legacy preset. Avoid requiring `palette[4]` semantic colour roles for arbitrary imports. Original materials/PBR are the new default.

Preserve V1 URL `/3d-model-viewer/` and source assets until explicit review. Build V2 at isolated `/3d-model-viewer/v2/` only after confirming actual static Pages deployment. Do not introduce a build that overwrites V1 or deploy unreviewed functionality.

Do **not** commit `233.glb`, user screenshots, extracted proprietary textures, or unknown-rights derivatives into this public repo. Use pinned, properly licensed public Khronos fixtures instead; private assets can be tested manually in an approved local workspace.

## Workflow and evidence

- Start with **M0 V1 baselines + standalone Pages verification** and a **minimal M1 source-faithful GLB/Draco import spike**, while comparing the GUI A/B/C prototypes.
- Keep PRs bounded, reversible and independently reviewable; no whole-project replacement in one change.
- Run browser tests where practical; distinguish Chromium, Linux WebKit, real iPhone Safari, static checks and unperformed tests.
- For each PR state WORK IDs, changes, exact test results/commands, screenshots and fixture provenance, limitations, affected source authority, remaining blockers and next checkpoint.
- Record accepted design/cutover changes in DECISIONS; append dated actual results in PROGRESS; update WORK/PROJECT only to reflect supported status. Valid Atlas statuses are `Mentioned`, `Proposed`, `In Progress`, `Verified`, `Blocked`, `Unknown`.
- `Verified` needs evidence appropriate to the result: docs present != build passing != true on-device acceptance. A merge is not permission for production cutover.
