# 3D Model Viewer — decision log

**Authoritative status/queue:** [PROJECT.yaml](./PROJECT.yaml) and [WORK.yaml](./WORK.yaml). This file records **accepted choices, rationale, consequences, supersession**, and open alternatives rather than a competing to-do list.

## Accepted — 2026-11-07: hybrid V2 rebuild and component reuse

Rebuild the architecture and GUI around a general-purpose viewer, **without** discarding reusable code. Keep Three.js, Porygon2/Chief source assets, render effects, model/camera presets, and valuable gesture-first/precision-control code. Refactor/extract algorithms; do not transplant V1's semantic four-colour shader, duplicated loader, global-state coupling and old DOM interface wholesale.

**Reason:** V1 is small but specialized. General materials, rigged GLB and full mobile comparison require different state boundaries; an in-place refactor risks repeatedly undoing original assumptions.

**Supersedes:** the implicit preference to keep extending the current monolithic viewer indefinitely.

## Accepted — 2026-11-07: preserve style, not restrictions

Simplified Porygon2 design remains important: keep its economical geometry and four-colour *appearance preset*. No forced low-colour interpretation of arbitrary imported GLB materials; native source fidelity is the V2 default. Only consider light-touch anatomy changes as a **separate** task.

## Accepted — 2026-11-07: iPhone viewer/inspector first, not Blender

Prioritize visual inspection, adaptive touch camera navigation, comparison, source model import, portable looks and small reversible edits. Defer full topology, sculpting, rig authoring and advanced CAD tools.

## Accepted — 2026-11-07: parallel foundation and GUI prototypes

Run V1 baseline, Pages isolation and first model importer spike alongside **three** UI prototype concepts: canvas-first, adaptive contextual controls, modular/precision. Final GUI selection remains **Proposed** until evaluated on common tasks and a real iPhone.

## Accepted — 2026-11-07: preserve V1, private fixtures and source authority

V1 stays in place until V2 acceptance; neither `233.glb` nor private historical user screenshots are redistributable test fixtures without rights review. This repo, `raskal-labs/3d-model-viewer`, is authoritative for viewer code and documentation. The separate Pages repo is not a second project authority.

## Accepted — 2026-11-07: source-local Atlas v2 enrollment structure

Use `.atlas/project.yaml` pointing to one PROJECT.yaml for shared state and one WORK.yaml for milestones/tasks/threads; CONTRACT/DECISIONS/ARCHITECTURE/PROGRESS own their distinct meaning. This local binding doesn't automatically update Atlas's central index. Preserve `atlas.porygon` parent relationship without creating an unreviewed duplicate parent entity.

## Proposed / open

- GUI pattern selection after real task comparison (`ux-review`).
- Offset-crosshair precision selection for tiny eye geometry (`mobile-precision`).
- Vite/build and GitHub Pages nested-route strategy; first inspect deployment (`m0-pages`).
- Which optional Meshopt/KTX2 import codecs have demonstrated fixture need.
- Where the private Draco reference can be tested lawfully without publication.
- Whether and when a separate simplified anatomy revision should be accepted (`anatomical-model`).
- Central Atlas child entity identity and dashboard source-registration mechanism (`atlas-enrollment`).

Changes to accepted decisions must include a new dated entry and clearly identify superseded constraints.
