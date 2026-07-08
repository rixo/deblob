---
source: docs/architecture.md § Distillation
---

# Distillation — when logic earns the model layer

Logic is born in the service layer, embedded in a use case, private in the
closure. Extracting it to model is a **commitment**: this knowledge stands on
its own, independent of the use case it was born in.

While it stays private in the closure:

- refactors are free;
- tests cover it implicitly through the service's use cases;
- naming is contextual (`score` is fine — context is obvious).

Extraction changes all three:

- **test surface grows** — every exported model function gets own tests, more
  surface for bad tests;
- **naming becomes a commitment** — `scoreIconRelevance`, now part of the API;
- **API surface grows** — the signature is a contract; changing it means
  updating consumers.

**The signal to extract**: could this function serve a consumer who doesn't care
about the use case it was born in? Practically: a second consumer needing the
same knowledge. Until then, keeping it private is discipline, not laziness — the
tradeoff tilts toward waiting.

Related: [decomposition](decomposition.md) (the same motion one scale up),
[layer-model](layer-model.md).
