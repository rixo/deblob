---
source: docs/architecture.md § Patterns, Store
---

# Store — reactive state as a role

_Reality-check pending in root PLAN (arch-touches): zero `.store.ts` files exist
in practice._

A **role**, not a file kind: a service whose state is reactive — consumers
observe changes rather than polling. Relevant where UI must reflect changing
data.

In the implementation guide's flavor, store concerns materialize as ordinary
ports and adapters (`*-store.port.ts`, `fs-*-store.adapter.ts`); in
context-composition flavors, as context-provided reactive services.

Pattern vocabulary exists to communicate _why a service exists and how it should
be used_ — patterns add no new structural categories, and any rules they add
belong to the pattern, not the core architecture.
