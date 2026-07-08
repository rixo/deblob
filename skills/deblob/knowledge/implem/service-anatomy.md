---
source: docs/implementation-guide.md §2
---

# Service directory anatomy

Canonical full-shape service:

```
icons/
  icons.model.ts              # pure domain: types, computation
  icons.model.spec.ts
  icons.service.ts            # use cases; factory createIconsService
  icons.service.spec.ts
  ports/
    icon-source.port.ts       # boundary contracts (types only)
    icon-store.port.ts
  adapters/
    manifest-source.adapter.ts   (+ .spec.ts)
    fs-icon-store.adapter.ts     (+ .spec.ts)
  private/
    scoring.model.ts          # internal to icons/ — invisible outside
  README.md                   # the service's living doc
```

- **Grouping dirs (`ports/`, `adapters/`) are filing, not architecture** — out
  of the flavor's scope. The suffix carries the layer; a single-port service may
  keep its port at the root, five adapters probably want `adapters/`.
- **`private/`** — the only visibility boundary
  ([packaging-visibility](../packaging-visibility.md)): internal models and
  private services the public service composes but does not export.
- **`drivers/`** — inbound-adapter/entrypoint code belonging to the package
  (e.g. `drivers/cli/`): the thin layer translating an external trigger into
  service calls, plus its assembly.
- **An adapter with its own ports is normal** (adapters are hexagons): a
  directory adapter carrying `ports/` nests exactly like a service
  ([nesting](../nesting.md)).
- **`README.md` per service** — the living doc: what it is _now_, its API, its
  layer map. History stays in `history/`.
- **When to split**: never a file-count threshold — the decomposition signals
  ([decomposition](../decomposition.md)): test pressure, naming pressure,
  cognitive load. Extract to model first; split when that's not enough.
