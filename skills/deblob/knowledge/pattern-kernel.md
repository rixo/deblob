---
source: docs/architecture.md § Patterns, Kernel
---

# Kernel — shared concepts with governance

A service holding shared domain concepts, typically extracted to prevent
dependency cycles between consumers ([sharing](sharing.md), step 3). Pure model,
or service-layer code — **no composition units** (once it has those, it's a full
service, possibly anti-corruption infrastructure, not a kernel).

- The domain doesn't have to be "business" — it has to be **coherent**. Business
  (`Provider`, `Theme`) and technical (`util/vite.ts`, `util/path.ts`) kernels
  obey the same governance: divergence pressure and consumer-specific leakage
  apply to `removeInline()` exactly as to `Provider`.
- **Shared utilities go in a kernel, grouped by meaningful domain — never
  "misc".** `util/vite.ts` + `util/path.ts` (one coherent concept per file) is
  clean shared code; a grab-bag `utils/index.ts` mixing paths, dates and Vite
  helpers is a junk drawer. The fix is domain decomposition discipline, not a
  new category. Agents default to clean decomposition, always.
- Names matter (ubiquitous language): storing utilities in something called a
  kernel that isn't coherent is `animal = fruits` — structurally sound,
  semantically wrong.

Watch for the cracking kernel ([sharing](sharing.md), step 4).
