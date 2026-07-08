# deblob

Experimental research notes on web-dev architecture and workflow — much of it
about writing and reviewing code in the AI-coding era. Shared early and in the
open: a working notebook, not a finished method.

The stance is opinionated and aimed at being **enforceable** — machine-checkable
import shapes and review gates, not just principles. TypeScript / ESM.

Two bodies of theory, one stance:

- **Architecture** — the rules of the game. Hexagonal layers, ports & adapters,
  the "blob" (pre-architectural residue that shrinks under extraction).
  Dependencies enforceable by import shape, not by reasoning.
- **Workflow** — how to proceed. Spec-driven development plus a ground-level
  self-review pass. Doing things in the right order, at the right time.

One philosophy at two scales — **structure** and **process**. Isolation and
clear boundaries keep doors open (optionality) _and_ make behaviour reviewable;
the same boundary serves both.

Not a new theory — Cockburn, Martin, Evans, SOLID, TDD made prescriptive and
machine-checkable for a specific tech context. Teeth, not principles.

## Contents

The architecture unfolds why → what → how; each level is standalone for its
scope:

| Where                                                            | What                                                                                                                                              |
| ---------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| [docs/architecture.md](./docs/architecture.md)                   | **Why** — the theory: layers, ports & adapters, the rules and their reasoning                                                                     |
| [docs/implementation-guide.md](./docs/implementation-guide.md)   | **What** — one flavor made concrete: file naming, layouts, patterns (TypeScript/ESM, factory-injection)                                           |
| [skills/](./skills/)                                             | **How** — the flight manual as agent skills: [deblob](./skills/deblob/SKILL.md) (architecture ground rules); commit / review / sdd skills coming  |
| [docs/sdd.md](./docs/sdd.md)                                     | The workflow: spec-driven development, two axes (history / living docs), review gates                                                             |
| [docs/self-review-checklist.md](./docs/self-review-checklist.md) | Working material — the ground-level self-review pass (will fold into a skill)                                                                     |
| [history/](./history/)                                           | This project's own chapters — dogfooding the methodology: [GOAL](./history/GOAL.md), rolling [PLAN](./history/PLAN.md), [META](./history/META.md) |

Planned alongside the skills: a CLI that machine-checks the mechanical rules
(dependency DAG, layer matrix, composition, visibility) in CI — skills carry
judgment, tooling carries determinism.

## Status

Early and experimental. Nothing is settled; names, layout, and claims will move.

## Licence

© 2026 rixo. Docs licensed under [CC BY 4.0](./LICENSE). Code (when it lands)
will carry its own permissive licence.
