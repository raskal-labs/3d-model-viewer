# 3D Model Viewer — execution guide

**Canonical IDs, work status and acceptance:** [WORK.yaml](./WORK.yaml); this document is not a second checklist.

## First Codex implementation slice

Start at [Issue #4](https://github.com/raskal-labs/3d-model-viewer/issues/4) and read [AGENTS.md](./AGENTS.md), [CONTRACT.md](./CONTRACT.md), [PROJECT.yaml](./PROJECT.yaml), [WORK.yaml](./WORK.yaml), [ARCHITECTURE.md](./ARCHITECTURE.md), [V2_PLAN.md](./V2_PLAN.md).

1. `m0-screenshot-baseline`: reproducible V1 screenshot/camera/renderer test baselines, plus upload/gesture regressions. The older hosting repo's artifacts are only historical references.
2. `m0-pages`: confirm the actual **standalone repo** GitHub Pages deployment configuration; create isolated V2 preview route without modifying V1.
3. `m0-fixtures`: download and verify licensed public test assets; keep private `233.glb` outside Git.
4. `m1-importer`: minimal V2 faithful GLB/Draco and resource-sidecar import with native materials; keep existing V1 upload path functional.

Deliver reviewable PRs with exact test output and screenshots; don't migrate/cut over production route automatically.

## Parallel UX

- `ux-a`: canvas-first.
- `ux-b`: adaptive selection workspace.
- `ux-c`: configurable precision/control surface.
- `ux-review`: same iPhone tasks/viewports; explicit decision with evidence. Preserve working gesture-navigation code as a candidate for reuse.

## Later work

`m2-looks`, `m4-comparison`, `m5-projects`, with `mobile-precision` as an exploratory thread. `anatomical-model` is a separate optional geometry refinement. `atlas-enrollment` covers central Atlas synchronization and identity.

Progress is reconciled in PROJECT/WORK/PROGRESS; issue checkboxes and chat messages are not substitute acceptance evidence.
