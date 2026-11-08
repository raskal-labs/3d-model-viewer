# 3D Model Viewer — roadmap reading view

**Canonical milestones and acceptance:** [WORK.yaml](./WORK.yaml), IDs `m0`–`m5`. This file is a human explanation of their dependency order, not an independently maintained status ledger. [PROJECT.yaml](./PROJECT.yaml) owns the next checkpoint and current state.

```text
M0   Verify real V1 (uploads, gestures, render styles, comparisons)
 │    and protect standalone Pages deployment
 │
 ├── In parallel: prototype mobile GUI A/B/C
 │
 ▼
M1   Source-faithful GLB/Draco, sidecar resources, materials, rigs
 │
 ▼
M2   Reusable source-independent looks, pixels and palette pipeline
 │
 ▼
M3   Accepted adaptive/canvas-first mobile interface
 │
 ▼
M4   Selection, component inspection and registered comparisons
 │
 ▼
M5   Limited reversible edits and portable projects
```

Existing V1 capabilities **already include** standalone OBJ/STL/GLB uploads, gesture-first navigation with optional precision instruments, multiple render styles, and a split compare view. The milestones extend rather than rebuild these without reason.

**Safe preview gate:** V1 fixed-camera baselines, tested build/deployment strategy, isolated V2 path, existing V1 unaffected.

**Useful V2 gate:** Importer fidelity/Draco + core looks + practical on-phone canvas GUI.

**Comparison gate:** Anatomy can be compared at matching angles and explicit scale with 2D/3D references.

**Editor gate:** Object transform/undo and project import/export round-trip, no promise of full mesh editing.

**Production cutover:** Explicit acceptance, real iPhone Safari QA, V1 rollback and static Pages publication verification. GUI A/B/C design results need an accepted decision rather than a favoured screenshot alone.

See [V2_PLAN.md](./V2_PLAN.md) for detail and [WORK.yaml](./WORK.yaml) for tasks/status.
