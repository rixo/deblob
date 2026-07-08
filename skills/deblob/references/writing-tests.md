---
source: docs/architecture.md (Testing) and docs/implementation-guide.md §8
---

# Writing tests

- **Write for the reviewer.** The test suite is the behavioral spec a human
  reviews. Every test reads: _given X, when Y with Z, expect A, B, C_ — the
  scenario visible in the body, not reconstructed from helpers. The unit under
  test is identifiable at a glance (name it in the title, keep the exercised
  call prominent). Fixture and assertion sit close enough to compare by eye.
  Don't DRY scenarios into invisibility — duplication between tests is cheaper
  than illegibility at the review gate.
- **Through the contract.** Input via the public API, assertions on documented
  behavior only — never internals, in calls or in assertions. Never export an
  internal for a test. Litmus: would the export survive deleting the tests?
- **Test factory, one per test module**: wraps assembly with sensible defaults
  (fixture adapters, nominal config); each test overrides only what its scenario
  is about. Default values are fine HERE (unlike production factories). Fixtures
  are adapters — architecturally, not metaphorically.
- **Placement**: unit specs colocate (`icons.service.spec.ts` next to its
  subject); e2e lives in root `tests/`, outside `src/`; unit fixtures in
  `__fixtures__/`; shared test utils in `src/lib/test/` or
  `src/lib/<domain>/test/` — ordinary services with layers, never `__tests__/`
  (runners execute that name).
- **Coverage**: 100% of the coverable layers (model, service, pure helpers),
  through contracts. Every exclusion carries a motivating comment. Test utils
  are never excluded — they reach 100% transitively through the tests that use
  them, or they're dead weight or hiding something.
- **Internal unit tests are the exception**, allowed for: a closed input set
  with pure logic (a parser), or a case unreachable through the contract without
  absurd fixtures. Default posture: the hexagon boundary.
- Pure model functions: test directly — no factory, plain in/out.

## When judgment is needed

- A failing unit test says _implementation moved_ (noise during refactor); a
  failing contract test says _behavior changed_ (signal). If your test would
  break under a behavior-preserving refactor, it's pinned to internals — rewrite
  it.

## Deeper

Per judgment — not required for implementation.

- [testing-contract](../knowledge/testing-contract.md) — through the contract,
  coverage rules
- [testing-seams](../knowledge/testing-seams.md) — seams are not test surfaces,
  the exceptions
- [testing-isolation](../knowledge/testing-isolation.md) — fixtures are
  adapters, the test factory
- [testing-reviewer](../knowledge/testing-reviewer.md) — tests as behavior
  statements for the reviewer
- `docs/implementation-guide.md` — §8
