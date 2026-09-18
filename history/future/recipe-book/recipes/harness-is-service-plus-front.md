---
captured: 2026-09-18
from: driver-layer step 04, checkpoint 2
---

# A test harness that builds, runs and asserts

**Problem.** Your specs need a harness: take some input, wire the real chain
over in-memory adapters, run it, compare the outcome with an expectation. One
function doing all of it is the natural first draft, and it has no layer. As an
assembly it runs use cases and asserts, which assembly may not do. As a service
it imports other services' factories and the test runner, a tech. As a
suffixless file it is blob. Binding it as test kind by config gives it a kind
with no name in the tree. Every check is green or nearly so, and the placement
is still wrong.

**The move.** Service plus assembly front, the trigger in the test. The service
owns the use case and speaks to the chain through a port it declares
(`run(input) → outcome`); it is specced over a fake port. The assembly front
builds the in-memory adapters from the input, wires the real chain as the port's
one adapter, and returns the service instance without running anything. Each
spec is then two lines: build the instance, call it, assert. The test runner is
named in spec files only.

**Why it is right.** The one kind allowed to both build and fire is the test.
Everything that had a layer got one, and the part that had none, build plus fire
plus assert, turned out to be two lines that belong in the spec anyway.

**This works for every test utility, not just a harness.** A fixture builder, a
fake server, a seeder, a snapshot normalizer, a "run the pipeline and check"
helper: whatever a test helper does, sort it the same way. What it _knows_ (the
fixture's shape, the normalization rule, the expected-file grammar) is model.
What it _decides_ over I/O (start the server, seed, run the chain, compare) is a
service behind a port. What it _wires_ (the in-memory adapters, the fakes, the
service instance) is an assembly front that returns the instance and runs
nothing. What it _asserts_ is the spec's, two lines, because the spec is the
only kind allowed to build and fire. A test helper is not exempt from the layers
because it serves tests; it is code, and "helpers have layers too" applies to it
with no discount. If after sorting nothing is left for a shared file, that is
the expected outcome, not a failure.

**The instance in deblob.** The verdict-case harness: a tree of strings with its
red lines marked, run through the real chain, matched against the markers.

```ts
// runner/ports/check.port.ts
export interface Check {
  run(input: { config: unknown; checks?: readonly CheckName[] }): Promise<Violation[]>
}

// runner/runner.service.ts
export const createRunner = ({ check }: { check: Check }) => ({
  judge: async (row: Case): Promise<VerdictMatch> => {
    const markers = Object.entries(row.files).flatMap(([path, source]) => markersOf(path, source))
    const violations = await check.run({ config: row.config ?? {}, checks: row.checks })
    return matchVerdicts(markers, violations.flatMap(reportedOf))
  },
})

// runner/cases.assembly.ts
export const assembleCase = (files: Case["files"]) => {
  const fs = createMemoryFs(under(CASE_ROOT, files))
  const check: Check = { run: async ({ config, checks }) => /* resolveConfig, scan, extractGraph, detectors */ }
  return { ...createRunner({ check }), check }
}

// cases/layers.spec.ts
test.each(ROWS)("$name", async (row) => {
  const { judge } = assembleCase(row.files)
  expect(await judge(row)).toEqual(AS_MARKED)
})
```

**Where.** `lib/cases/runner/`, `lib/cases/*.spec.ts`.
