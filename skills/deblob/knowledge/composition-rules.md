---
source: docs/architecture.md § Summary (rules 6–11)
---

# Composition rules

Composition units declare "I must be composed by assembly" — these rules keep
that promise enforceable:

6. **`.service.ts` → assembly-only import.** Not model, ports, other
   service-layer code, adapters.
7. **`.adapter.ts` → assembly-only import.** Same.
8. **Type-only imports are exempt from composition rules.** Depending on a
   contract's _shape_ is not depending on its implementation:
   `import type { IconsService } from "../icons/icons.service"` is legal
   anywhere; `import { createIconsService }` stays assembly-only. Covers the
   `IconsService["method"]` shorthand. The exemption does NOT extend to
   packaging: a type import is still a DAG edge ([acyclic](acyclic.md)) and
   `private/` stays sealed ([packaging-visibility](packaging-visibility.md)).
9. **Public composition units only.** Inside a service's `private/`, internal
   composition is unrestricted; `.service.ts`/`.adapter.ts` freely import their
   own service's `private/` files.
10. **Ports are types only** — runtime code in a port file means an extraction
    is pending ([layer-ports](layer-ports.md)).
11. **One port, one interface** — if the service layer branches on which adapter
    it got, the port isn't unified.
