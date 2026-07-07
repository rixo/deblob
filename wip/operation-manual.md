# Operation manual — ground decisions (RAW DUMP, sort later)

> Operational decisions made on the ground that the theory only lightly covers.
> Flight-manual / operation-manual material (level 3: how). Kept separate to
> avoid polluting the theory docs. Unsorted — capture now, organise later.

---

## Testing: where shared test utils live

Theory allows shared test utils but doesn't specify placement. Decided (for
**unit** test utils):

- `src/lib/test/` — globally shared kernel (test utils for the whole codebase).
- `src/lib/[domain]/test/` — shared kernel still scoped to a given domain
  (intra-domain sharing). Usual packaging rules apply (`private/` etc.).

**ADR — why not `__tests__`?** Considered it ("like Jest"). Rejected: Jest will
actually *run* anything inside `__tests__`. Putting test *utilities* there abuses
the expectation of the Jest crowd (they read `__tests__` as "tests that run", not
helpers). Don't overload the name.

## Testing: coverage of test utils (gotcha)

Agent instinct was to **exclude** test utils from coverage. Wrong.

- Test utils should NOT get their own dedicated tests — that goes circular fast.
- BUT that does NOT mean exclude them from coverage.
- They should reach **100% coverage transitively** — naturally, via the tests
  that use them.
- If they don't hit 100% transitively, they are either **dead weight** or
  **hiding something**.
- Rule: test utils are NOT excluded from coverage. If a util isn't 100%
  (transitively), a case-by-case justification is required — either rip the dead
  code, or explain why keeping it makes sense.

## Testing: the `tests/` name collision (not our making)

- Root `tests/` (NOT `src/tests/`) = **e2e**. Lives *outside* the codebase
  (`~src`) because e2e exercises the system from the outside — tautological,
  that's what e2e means. No access to internals.
- Inside `src/` = unit / integration test dirs (per the placement rules above).
  These DO have access to codebase internals.
- The collision on the word "tests" isn't ours: unit tests, integration tests,
  e2e tests — all called "tests", all different meanings. We just use the
  existing vocabulary. Disambiguate by location (root vs src) + qualifier.

## Testing: exporting internals "for tests" (subtlety agents hit)

In one stint we had to export a previously-internal (unexported) model-layer
function. The line:

- Exporting **to wire a unit test directly into a util/internal function** (not
  the public API) = **VIOLATION** (tests go through the contract).
- Exporting **as public API** — promoting it to genuine public surface, to be
  *used* (even if a consumer happens to be a test) = **fine**.

Test: is the thing now genuinely part of the public contract (and you'd keep it
exported regardless of tests)? Or are you reaching into internals under cover of
"well, it's exported now"? The first is fine, the second is the violation.

## Testing: `tests/` dirs are normal deblobbed hexagons

Apart from the specials above, test dirs behave like normal deblob services:

- They name their layers (model / service / ...), follow the same conventions.
- Special bit: their **model layer gets 100% coverage transitively** (this is
  the part that differs from the default contract-coverage posture).
- They carry some special *meaning*, but structurally that's just additional —
  underneath, they're ordinary services.

---

## To sort later

- ~~Does this whole testing section become its own page in the operation
  manual, or fold into the architecture doc's Testing section?~~ **Resolved
  (2026-07-07): folded into the [implementation guide](./implementation-guide.md)
  §8 Testing** (placement, `__tests__` ADR, transitive-100% rule,
  exporting-internals litmus). This file keeps the raw originals until the
  guide stabilizes, then these entries get pruned.
- "transitive 100% on test-util / test-model" deserves a crisp general
  statement + maybe a tooling note (how coverage is measured to see it).
