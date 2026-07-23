---
source: docs/implementation-guide.md §1
---

# File naming — the suffix is load-bearing

**Always suffix.**

| Suffix         | Layer    | Declares                                                                |
| -------------- | -------- | ----------------------------------------------------------------------- |
| `*.model.ts`   | model    | abstract — no outer-layer imports, no ambient access, stateless modules |
| `*.port.ts`    | ports    | types only, boundary contract                                           |
| `*.service.ts` | service  | composition unit — assembly-only import                                 |
| `*.adapter.ts` | adapters | port implementation — assembly-only import                              |
| `*.context.ts` | assembly | context wiring (web/UI runtimes)                                        |
| `*.spec.ts`    | test     | unit test, colocated with its subject                                   |
| `*.e2e.ts`     | test     | end-to-end test, lives outside `src/`                                   |

- The theory allows the bare layer filename (`icons/model.ts`); this flavor opts
  not to — suffixed form even with one file per layer (`icons/icons.model.ts`).
  One form, zero ambiguity, a grep for `.model.ts` sweeps everything. (Another
  flavor may legally choose otherwise, as long as the layer stays visible in the
  import path.)
- A suffixless file inside a service directory is **blob** — pre-architectural
  residue awaiting distillation, consumable by assembly only
  ([blob](../blob.md)). A mature service has none; small type-only or constant
  helpers fold into the model file they serve.
- `.test.ts` is not used — one unit-test suffix, not two.
- No `.store.ts` in this flavor: reactive-state concerns materialize as ports
  and adapters (`*-store.port.ts`, `fs-*-store.adapter.ts`) — the Store pattern
  is a role, not a file kind ([pattern-store](../pattern-store.md)).
