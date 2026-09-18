---
captured: 2026-09-18
from: driver-layer step 04, checkpoint 2
status:
  a GOTCHA, not a recipe — "when you catch yourself thinking…" material (rixo,
  2026-09-18); the chapter may be a practical guide holding more than recipes
---

# Two verdicts in one test

**Problem.** A test judges a tool that itself judges something: a linter's test
asserts what the linter reports, a validator's test asserts what the validator
rejects. Two verdicts live in one test, the tool's on the subject (red, invalid)
and the test's on the tool (right, wrong), and the vocabulary fuses them. The
passing outcome gets called "green" or "ok" while the subject under it is
deliberately red, and a reader asks the question this recipe exists for: "so it
returns green when the case is red?"

**The move.** Name the test's verdict for what it compares, never for a color.
The subject's verdict is written in the case (the marked lines, the expected
rejections); the test's verdict is whether the tool's report equals that, and
its name says so: `AS_MARKED`, `AS_EXPECTED`. Name the two ways the tool can be
wrong as two lists, what was claimed and not reported, what was reported and not
claimed, so a failure reads as a diff of claims.

**Why it is right.** A method that proves a judging tool rests on keeping the
tool's verdict and the subject's verdict apart. Words that fuse them undo it at
the point where the reviewer reads.

**The instance in deblob.** The empty match was first exported as `GREEN`.

```ts
// before
expect(await runCase(tree)).toMatchObject(GREEN) // "green" — with three red lines marked

// after
export type VerdictMatch = { missing: string[]; unexpected: string[] }
export const AS_MARKED: VerdictMatch = { missing: [], unexpected: [] }
expect(await judge(row)).toEqual(AS_MARKED)
// a failure:
//   missing:    src/b.model.ts:1 inward-deps       marked, not reported
//   unexpected: src/a.model.ts inward-deps          reported, not marked
```

A tree with no marker claims green everywhere, and that sentence is written down
as such.

**Where.** `lib/cases/runner/markers.model.ts`.
