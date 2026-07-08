---
source: docs/implementation-guide.md §8
---

# Testing in practice — placement, factories, coverage

Tests are written for the reviewer and go through the contract — the rules live
in [testing-reviewer](../testing-reviewer.md) and
[testing-contract](../testing-contract.md). The flavor's materialization:

- **Unit tests (`*.spec.ts`) colocate with their subject**; **e2e (`*.e2e.ts`)
  lives outside `src/`** (root `tests/` per package). Unit exercises the
  codebase from inside, e2e from outside — placement mirrors semantics.
- **Fixtures**: unit fixtures colocate (`__fixtures__/` next to the specs); e2e
  fixtures live with the e2e tests. Fixtures are test-purpose adapters
  ([testing-isolation](../testing-isolation.md)) — shared ones follow the normal
  sharing progression.
- **Shared test utils** live in `test/` directories that are ordinary services:
  `src/lib/test/` codebase-wide, `src/lib/<domain>/test/` domain-scoped. Named
  layers, usual packaging rules. Not `__tests__/` — test runners execute what's
  in there; the name promises "tests that run".
- **Test utils are NOT coverage-excluded.** No dedicated tests (circular), but
  100% transitively through the tests using them. A util below 100% is dead
  weight or hiding something — justify case-by-case or rip it.
- **Test factory pattern [prescribed]** — one per test module, wrapping service
  assembly with sensible defaults; tests override only what they mean to test.
  Inline per-test assembly is the debt shape.
- **Coverage: 100% of the coverable layers** (model, service, pure helpers).
  **Every exclusion motivated by a comment at the exclusion site**: type-only
  files (`ports/`), generated code, thin platform glue covered by e2e. An
  unmotivated exclude list is debt — it hides exactly the code most likely to be
  hiding something.
