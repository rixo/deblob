---
source: docs/architecture.md § Service layer, § Inversion of Control
---

# Service layer — decisions

**What the service does**: the use cases it offers. Each function on the
returned API is a use case (`list`, `resolve`, `import`, `publish`). The service
exists _because_ these use cases exist. Can't name the use cases? You don't have
a service — you have a utility bag.

Where model is knowledge, the service layer is **decisions**: which model
functions to call, in what order, with what inputs, combined with which injected
data. It orchestrates; it doesn't compute.

- Factory function returning the API: `createIconsService({ source, store })` —
  one destructured object of dependencies, typed with port types.
- **Module-level code stays stateless** — state lives inside the factory closure
  (Rule 17). Each factory call = an independent instance.
- May import: model, ports. Never: adapters, other `.service.ts`, concrete I/O
  ([dependency-matrix](dependency-matrix.md)).
- `.service.ts` is a composition unit: assembly-only import
  ([composition-rules](composition-rules.md)).

**IoC — no defaults, no exceptions.** All dependencies explicit; assembly
provides them. Default parameter values for dependencies statically wire
adapters into the service: they violate the matrix, defeat code splitting,
scatter assembly across modules, and lose central control of side-effect
surfaces. Tempting ("nominal case works out of the box") and harmful — always.

Logic often starts here, private in the closure; when it stabilizes, extract to
model: [distillation](distillation.md).
