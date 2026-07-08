---
source: docs/architecture.md § Terminology
---

# Service — one word, three concerns

**Service** is the primary unit of the architecture. It sits at the intersection
of three independent concerns — keep them distinct when reasoning:

1. **Isolation** (hexagonal) — a service contains one or more hexagons;
   `.service.ts` / `.adapter.ts` files declare composition units: "I must be
   composed by assembly." See [hexagon](hexagon.md).
2. **Layering** — its code is organized in concentric layers (model < ports <
   service < adapters < assembly), dependencies pointing inward. See
   [dependency-matrix](dependency-matrix.md).
3. **Packaging** — the service (the directory) is the unit of ownership,
   visibility (`private/`), and DAG participation. See
   [packaging-visibility](packaging-visibility.md), [acyclic](acyclic.md).

Two meanings in the wild — context disambiguates:

- **Service, the package**: the directory, the organizational unit, the DAG
  node.
- **`.service.ts`, the composition unit**: the file declaring a hexagon that
  expects assembly to compose it.

Mental model for packaging: any service should be **splittable into a real
package at any time**. If that feels impossible — tangled imports, no clear
public surface — there is placement debt even while all checks pass.
