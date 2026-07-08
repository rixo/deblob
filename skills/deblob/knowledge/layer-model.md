---
source: docs/architecture.md § Model
---

# Model — knowledge

The innermost layer: **what the service knows**. Types, pure functions,
constants, core business logic. The most constrained layer — and the most
valuable: everything else is plumbing you can rewire; model is the investment
you protect.

- Pure, stateless, deterministic. No side effects, no closures over mutable
  state, no I/O, no ambient/environment access.
- Depends on nothing outside the model layer. Model→model across services is
  legal (the constraint is layers, not packaging) — but mind the DAG:
  [acyclic](acyclic.md).
- **Pure third-party libraries count as model code** (schema validator, date lib
  — side-effect-free, deterministic). Anything touching I/O or ambient state is
  concrete → behind a port.
- Error classes and their guards are model — failure modes are domain
  vocabulary.
- Pure functions with no dependencies: essentially free to test — 100% unit
  coverage is the norm here.
- A model-only service is valid (types + pure functions, nothing else).

**Purity is a chain property**: a file is only as pure as its least-pure import.
A "model" file importing a service is not model — its label lies, and every
guarantee downstream is false.

When to move logic here from a service closure: [distillation](distillation.md).
