---
captured: 2026-09-18
from: driver-layer step 04, checkpoint 2
revised:
  2026-10-08, the suite kind — a harness has a legal home now, so this is a
  choice and no longer the only way; to reassess against the canon of the day
---

# A test harness with logic of its own gets layers

**Problem.** Your specs need a harness: take some input, wire the real chain
over in-memory adapters, run it, compare the outcome with an expectation. One
function doing all of it is the natural first draft, and it has a legal home: a
suite, shared test code with a test file's rights. That is enough for a small
one. A harness that grows logic of its own (a grammar for the expectations, a
matching rule, a way to run the chain) is a small program, and in a suite that
logic is tested by nothing but the specs that happen to use it.

**The move.** Service plus assembly front, the trigger in the test. The service
owns the use case and speaks to the chain through a port it declares
(`run(input) → outcome`); it is specced over a fake port. The assembly front
builds the in-memory adapters from the input, wires the real chain as the port's
one adapter, and returns the service instance without running anything. Each
spec is then two lines: build the instance, call it, assert. The test runner is
named in spec files only.

**Why it is right.** What the harness knows and decides gets a layer, a contract
and tests of its own, like any code that carries logic. The part that had no
layer, build plus fire plus assert, turns out to be two lines that belong in the
spec anyway.

**The same sorting works for any test helper, and comes first.** A fixture
builder, a fake server, a seeder, a snapshot normalizer, a "run the pipeline and
check" helper: what it _knows_ (the fixture's shape, the normalization rule, the
expected-file grammar) is model; what it _decides_ over I/O (start the server,
seed, run the chain, compare) is a service behind a port; a fake is an adapter.
What fits none of those, and what registers on the test runner, goes in a suite.
A suite is where the sorting ends, not a way around it.

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
