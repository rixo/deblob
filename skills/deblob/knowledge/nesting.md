---
source: docs/architecture.md § Nesting
---

# Nesting — filing, not architecture

_The direction law below is a **derived** generalization, staged for arch
clarification (see root PLAN, arch-touches + packaging research)._

A service directory may contain other service directories. This is **semantic
grouping** — filing. It confers zero privilege:

- A nested service follows the exact same rules as a sibling: own DAG
  participation, own `private/` boundary, own layers.
- A child cannot access its parent's `private/`.
- Layer directories (`icons/ports/`, `icons/model/`) are NOT nested services —
  they're internal structure, part of `icons`, and may use its `private/`.

**The documented trap**: importing from your own adapter's model or service
code. The adapter already depends on the parent (it implements the parent's port
— a child→parent edge); the parent importing anything back from it closes a
cycle.

**Derived direction law**: a nested adapter's edges point UP by nature —
therefore the parent stays import-blind to its own adapters, always. Assembly,
not the parent, touches them.

**Open research** (root PLAN): the packaging dimension of containment is
under-articulated — if any service must be splittable into a real package
anytime, "a service contains child services" likely implies hard negative rules
not yet discovered. Treat clever parent↔child arrangements with suspicion until
that lands.
