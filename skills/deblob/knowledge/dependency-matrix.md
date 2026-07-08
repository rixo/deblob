---
source: docs/architecture.md § The dependency matrix, § Summary (rules 1–5)
---

# The dependency matrix

Layer rules and composition rules intersected — a "may" entry means neither
forbids it. Governs **runtime imports** (type-only exemption:
[composition-rules](composition-rules.md)).

| Layer        | May import from                                  | Never from                                        |
| ------------ | ------------------------------------------------ | ------------------------------------------------- |
| **model**    | model, pure third-party libs                     | everything else, incl. concrete                   |
| **ports**    | model, ports (types only)                        | everything else, incl. concrete                   |
| **service**  | model, ports                                     | adapters, other `.service.ts`, concrete, assembly |
| **adapters** | model, ports, own service's `private/`, concrete | other adapters, assembly                          |
| **assembly** | anything                                         | —                                                 |

"Concrete" = platform/I/O: `node:fs`, HTTP clients, DB drivers. Pure
deterministic libraries count as model.

The five layer rules behind it:

1. **Dependencies point inward** —
   `model < ports < service, adapters < assembly`; lateral (same layer) OK.
2. **Layer visible in the import path** — no `index.ts` indirection
   ([packaging-visibility](packaging-visibility.md)).
3. **Purity is a chain property** — labels only hold if the whole import chain
   honours them ([layer-model](layer-model.md)).
4. **Service never depends on concrete** — that bypasses its ports and kills
   testability.
5. **Only assembly imports blob** ([blob](blob.md)).

The matrix is about layers, not packaging: model in service A may import model
from service B — subject to the DAG ([acyclic](acyclic.md)) and `private/`
([packaging-visibility](packaging-visibility.md)).
