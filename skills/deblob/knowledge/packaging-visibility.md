---
source:
  docs/architecture.md § Visibility, § The problem with index.ts, § Layers as
  the API surface, § The private/ directory
---

# Packaging & visibility — public by default, private by intention

- **No `index.ts`. Anywhere inside the codebase.** A barrel re-exporting model
  and service indistinguishably erases the layer from the import path — and
  every dependency rule becomes unenforceable by shape. The layer must be
  visible at the import site:
  `import { createIconsService } from "../icons/icons.service"` — the path IS
  the declaration, violations are red flags without opening a file.
- **Everything not under `private/` is public.** Aligns with the language (JS is
  public-by-default at every level) and with reality (90%+ of a service's
  contents are designed for external consumption).
- **`private/` is the only visibility boundary** (Rule 12). Nothing outside the
  containing service imports from it — **types included** (packaging rule; the
  type-only exemption is composition-scoped only). Applies fractally:
  `private/model.ts`, `private/child-service/`.
- The tradeoff is owned: public-by-default demands awareness of what you export.
  The alternatives are worse — barrels (rules unenforceable), a `public/`
  inverse (syntactic weight on the 90% to protect the 10%), access-control
  tooling (unmaintained complexity).
- Package boundary: same intent via `exports` subpaths keeping layers visible;
  exactly what a subpath may point at is **honestly unresolved** (guide, Open).

Mental model anchoring all of it: any service splittable into a real package at
any time — see [service-three-meanings](service-three-meanings.md).
