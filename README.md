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
clear boundaries keep doors open (optionality) *and* make behaviour reviewable;
the same boundary serves both.

Not a new theory — Cockburn, Martin, Evans, SOLID, TDD made prescriptive and
machine-checkable for a specific tech context. Teeth, not principles.

## Status

Early and experimental. Nothing is settled; names, layout, and claims will move.

## Licence

© 2026 rixo. Docs licensed under [CC BY 4.0](./LICENSE). Code (when it lands)
will carry its own permissive licence.
