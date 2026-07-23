---
source: docs/architecture.md § Model
---

# Model — knowledge

The innermost layer: **what the service knows**. Types, pure functions,
constants, self-contained factories, core business logic. The most constrained
layer — and the most valuable: everything else is plumbing you can rewire; model
is the investment you protect.

The bar is **abstractness** — the opposite of rule 4's "concrete", not of
"implemented": no contact with the world outside the computation (I/O, time,
randomness, platform):

- Depends on nothing outside the model layer — no ports, no concrete imports, no
  I/O. Model→model across services is legal (the constraint is layers, not
  packaging) — but mind the DAG: [acyclic](acyclic.md).
- No ambient environment access — time, randomness, `globalThis` are inputs
  passed by the caller, not discoveries.
- Modules are stateless (rule 17) — no module-level mutable state, exported or
  not (top-level `let`, unfrozen collections, anything a closure could capture
  at module scope); state lives inside factories, and instances are created by
  callers, never exported.
- **Self-contained factories are model code** — closure state is fine when the
  factory depends on nothing (domain machines, entities, dependency-free
  reactive stores). A factory taking a port or a service is a composition unit →
  service layer.
- **Pure third-party libraries count as model code** (schema validator, date lib
  — side-effect-free, deterministic). Anything touching I/O or ambient state is
  concrete → behind a port.
- Error classes and their guards are model — failure modes are domain
  vocabulary.
- Pure functions and self-contained factories: testable with plain values, no
  mocks — 100% unit coverage is the norm here.
- A model-only service is valid (types + pure functions, nothing else).

**Abstractness is a chain property**: a file is only as abstract as its
least-abstract import. A "model" file importing a service is not model — its
label lies, and every guarantee downstream is false.

When to move logic here from a service closure: [distillation](distillation.md).
