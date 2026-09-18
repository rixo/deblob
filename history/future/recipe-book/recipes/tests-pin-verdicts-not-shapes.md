---
captured: 2026-09-18
from: driver-layer step 03 handback, step 04 opening
status:
  NOT RATIFIED as a recipe — it is the `deblob-test` story itself (pull tests
  toward high-level behavior), a chapter of its own; kept here as illustration
  material for that chapter (rixo, 2026-09-18)
---

# Tests that pin an internal shape

**Problem.** A component absorbs a hard, open-ended input, a language's syntax,
a protocol's dialects, a file format's variants, and its tests pin what it
produces: positions, lists of kinds, intermediate records. The suite is long,
green, and the reviewer cannot vouch for one line of it without opening the
component. "Test public API and behavior" did not help: the exported function's
return shape _is_ the public API, and it is still a shape only the next link
reads. Nobody gets the special cases right by thinking; the suite grows and
proves less.

**The move.** No test pins an internal shape: an expectation is a sentence the
reviewer signs without opening the code. For a chain that ends in a judgment,
that sentence is a verdict, a minimal input with its expected outcomes marked,
run through the real chain end to end (ESLint's `RuleTester`, rustc's UI tests
with their expected diagnostics). Coverage stays at 100 from those cases plus
conformance tests on ports; a branch no realistic input reaches is deleted; the
compiler is the floor for what counts as a realistic input. Contracts get tests,
links do not.

**Why it is right.** A verdict corpus capitalises: every reported false positive
becomes a permanent case, and the reviewer judges each in the subject's
language. A shape pin only ever costs maintenance and proves what the code
already says.

**The instance in deblob.** The reader's spec pinned hook line numbers, kind
lists and bound callees over fifty tests. Replaced, for the rules, by cases:

```ts
{
  name: "a model importing a service is inward-deps on the import line",
  files: {
    "src/totals.service.ts": `export const createTotals = () => ({})`,
    "src/report.model.ts": `
      import { createTotals } from "./totals.service.ts" // red inward-deps, runtime-import
      export const report = createTotals
    `,
  },
}
```

The marker is the expectation; the row runs config resolution, scan, oxc
parsing, the reader and the detectors over a memory filesystem, and the test
asserts the report matches the markers. The reading spec's fate is assessed once
the corpus exists (SPEC 04, decision 6).

**Where.** `lib/cases/`, SPEC 04 § Goal and § Testing, the `deblob-test` card.
