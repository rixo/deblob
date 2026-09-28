# Sweep — loose ends caught before building on them

Added to the step queue 2026-09-25: the detectors went fast, one commit a
checkpoint for days, then the lens re-read them all. Before type-name depth or
the test rules build on top, a reviewer that wrote none of it reads everything
since `02_rows-first` closed, and the loose ends it finds are fixed in batches.

**Drafted 2026-09-27. Closed 2026-09-28** in four checkpoints: the review, the
rulings applied in four batches plus the parked cleanups, the title audit in
four batches, the close.

## Goal

After this step:

- **Every finding is on one table** — what the code, the units, the rows, the
  READMEs and the SPEC notes say, set against each other and against canon — and
  every row of the table is ruled by rixo: fix, confess, or keep.
- **The rulings are applied**, one commit per batch, each batch green, covered,
  and its changed clauses falsified.
- **What was parked for the sweep is closed**: the two owed cleanups, the two
  findings of detectors checkpoint 7, and grouping's worth measured.

Out of scope: new rules, new detectors, type-name depth, the test rules
(`04/06_test-rules`), skill and card edits (step 07). A finding that needs one
of those is carded on the PLAN board, not fixed here.

## API

None: this step adds no surface. It produces a findings table and the fixes rixo
rules from it. The reviewer gets this section verbatim and nothing else.

**Under review**: the work of the 15 commits `7774069..57d328b`. That is the
detectors step from its first checkpoint to its last, plus the lens step and the
roles commit in between. It covers the code, the unit tests, the corpus rows,
the READMEs of `check/`, `extraction/` and `cases/`, and the SPECs of
`04_outside-rules/03_detectors` and `04_outside-rules/04_lens`.

**Judged against**: canon (`docs/architecture.md`, § The outside and the
Summary's outside rules), the chapter PLAN
(`history/20260913_driver-layer/PLAN.md`), and the work itself, one part against
another.

**What it looks for**: seven kinds of finding.

1. **Says vs does** — a README, a docstring, a SPEC "built" note or a canon
   sentence that states something the code does not do, or the reverse.
2. **Rows** — a row whose name, comment or marker `why` is stale or lies; a red
   with no way out; a canon citation that does not say what the row claims.
3. **Units** — a unit that pins a verdict a row should own, or that contradicts
   a row; a unit whose "no case can reach" claim is false; a unit no longer
   testing anything.
4. **Known failures** — every `false` and `missed` marker left: is the reader
   limit it names still the reason?
5. **Messages** — a way out that canon no longer offers, or that the lens
   closed.
6. **Our own laundering** — logic parked in assembly, in `cases/runner`, in a
   spec helper, past what canon lets there.
7. **"To be measured"** — every such note in the range's SPECs: measured, or
   still owed.

**What it returns, the findings table**: one row per finding. Columns: kind
(1–7), `path:line`, the claim in one sentence, the evidence (the contradicting
lines, quoted), and a proposed fix. A finding without quoted evidence is not a
finding. After verification, the table lands in § Findings below, with a column
added for rixo's ruling.

## Testing

A finding is a claim, and the reviewer can be wrong. Each one is verified before
rixo sees it: the quoted lines re-read in the tree, the behaviour checked by a
run where the claim is about behaviour. A finding that does not survive is
dropped, and the count of dropped ones is said. Every fix batch passes the usual
gates: the rows, coverage 100, one mutation per changed clause.

## Implementation

Checkpoints, one commit each, one go each:

1. **The review.** A fresh Fable 5.1 agent, given § API verbatim and nothing of
   this conversation, returns the findings table. I verify each row, then bring
   rixo the surviving table. Measured in the same pass: grouping's worth — on
   deblob's own check, how many groups carry a rider, how many riders in all.
2. **The rulings, applied**, in batches rixo sets from the table. The parked
   items go in whichever batch fits:
   - `void x` read as a use: the reader reads `void` as dropping the value; a
     hook's `void cli.check(opts)` goes green (canon lets a hook drop it), a
     boot's `void main()` is judged as the one call; the plumbing SPEC's
     mutation-table line that counted the old red is corrected. Found while
     fixing: the boot already read `void main()` as its one call, a second one
     red — a row now pins it; only the hook was wrong.
   - The test reader's `Role` constants, `as const`: deblob's own check loses
     its five `stable-root` unknowns.
   - `it` where the title is a behavior sentence, `test` elsewhere — row by row,
     never a blind rename.
   - Typed builders for `render.model.spec.ts`'s `as …Violation` casts.
3. **The title audit** (added 2026-09-28, ruled at the sweep's self-review). The
   it/test pass judged each title against its unit, never against its body:
   about 280 titles kept as they were, and about 370 rewritten, were never read
   beside the assertions under them. Fresh Fable 5.1 agents, with no part in the
   pass, four in parallel over a split of the 42 spec files, read every `it` and
   `test` in `packages/deblob/src` (785, fixtures excluded; a corpus row's title
   is its `name`, its body the marked tree) against its body and return one row
   per finding: `path:line`, the title, what the body asserts (quoted), and the
   mismatch — the title claims more than the body checks, less, or something
   else; or the title is true but hard to read. The rule they judge by, given
   verbatim: `it` when the title describes the subject its `describe` names,
   `test` when it is only related to it (a corpus row, a relation between two
   subjects, a parity check); one test describing two subjects is split. I
   verify each row against the tree and bring rixo the survivors; fixes land in
   batches, one go each.
4. **Close.** The table's rulings all applied or carded; the PLAN's queue moves
   to `04/07_driver-readers` (canon first), then `04/06_test-rules`.

**Reviewer: Fable 5.1** (ruled 2026-09-27). The review is meant to push back,
and a different model's blind spots are the point.

## Docs

The findings table and its rulings, in § Findings of this SPEC; the PLAN's step
queue. READMEs and canon only where a ruled finding says they lie.

## Findings

Checkpoint 1, 2026-09-27. The Fable 5.1 reviewer returned 24 findings (its own
tally said 23: kind 1 has 12 rows, not 11). Each was verified in the tree: its
quoted lines re-read, and a probe run (a scratch tree through `deblob check`)
wherever the claim is about behaviour. **All 24 survive, 0 dropped.** Probes are
marked _probed_. Code paths are under `packages/deblob/src/lib/` (the golden
under `packages/deblob/src/`). Ruling: fix, confess, or keep.

### Says vs does

| `path:line`                                                             | Claim                                                                                                                                                                      | Evidence                                                                                                                                                                                                                                                                                    | Proposed fix                                                                                                                                                                        | Ruling                                                                                                                                                                                                                                              |
| ----------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `check/layers.model.ts:51-54, 62-68, 81-86`                             | Three docstrings say the outside kinds' import cells are not built; the same file builds them                                                                              | "whose import cell no detector judges yet"; "the 'imported by nothing' rule waits for its detector"; "those cells read legal here until then" — vs `IMPORTED` / `outsideImportRules` at `:135-171`                                                                                          | Rewrite the three to describe `outsideImportRules`                                                                                                                                  | **Fix as proposed**                                                                                                                                                                                                                                 |
| `cases/README.md:12-13`                                                 | Says the boot check does not exist                                                                                                                                         | "every red a `missed red` naming the check it waits for (`boot.spec.ts` today)" — vs `boot.spec.ts:16-17` "the boot check reports them since the detectors step, checkpoint 7"                                                                                                              | Drop "(`boot.spec.ts` today)"                                                                                                                                                       | **Fix as proposed**                                                                                                                                                                                                                                 |
| `check/boot.model.ts:3-4`, `cases/boot.spec.ts:8-9`                     | Both quote a canon sentence the lens replaced                                                                                                                              | "Two rights, nothing more" — canon `docs/architecture.md:677-678` now "One thing, nothing more — it starts the program"                                                                                                                                                                     | Re-quote canon's current sentence                                                                                                                                                   | **Fix as proposed**                                                                                                                                                                                                                                 |
| `check/boot.model.ts:97-103`, `cli/render.model.ts:324`                 | `unstarted` fires for a driver the boot does start; its message says the opposite                                                                                          | _probed_: boot `main(); work()` → "imports src/worker.driver.ts and never starts it", beside the call's own red. `started` is only the first wiring call                                                                                                                                    | Report `unstarted` only for a driver no root call starts; the second call is already red                                                                                            | **Fix as proposed**                                                                                                                                                                                                                                 |
| `check/layers.model.ts:283-296`, `check/README.md:30-31`                | A driver's runtime import of any builtin (`node:fs`, `node:child_process`) is green, no claim, no declaration; canon names only host globals and declared packages as tech | _probed_: both imported and called in `main` → 0 violations. Canon `:539-540` "the host's globals (`process`, `document`) and the packages declared as tech being the tech"; `:590-592` "an external import neither claims is a violation"                                                  | **Canon question.** Either canon names builtins as every driver's tech (say it in § Driver), or an undeclared builtin is red like a package (`driverTech: ["node:fs"]` the way out) | **Red unless declared** (canon's letter; `import process from "node:process"` needs it too) — **moved to `04/07_driver-readers`** (2026-09-28): built here, unshipped; its way out, `driverTech`, is ruled out, a builtin becoming a reader's claim |
| `check/driver.model.ts:61-70`, `check/README.md:101-103`                | A call in a hook to a forbidden import (a spec's export, say) draws no driver red, so a hook makes two calls unflagged                                                     | _probed_: hook `{ helper(opts); return cli.check(opts) }`, `helper` from `helpers.spec.ts` → only `test-is-outside` on the import. `isDriversCall` lets `forbidden-import` through ("an import the layer rules judge"); lens SPEC `:366-367` "Every call that is not the use case's is red" | Red the call too (two facts, two violations), or state the exemption in README and canon                                                                                            | **Red the call too**, under `driver-calls-services` (hook or wiring, as the model case already is); the `forbidden-import` pass-through goes; a row; the message names where the callee comes from                                                  |
| `check/driver.model.ts:367-372`                                         | A test returns before `driverValues` is judged, so a spec handing a sub-driver's hook as a value is never red                                                              | `if (node.layer === "test") return violations` precedes the `sub-driver-wiring` loop. Detectors SPEC `:671-672` "`sub-driver-wiring` still applies"                                                                                                                                         | Move the loop above the test return; add the row                                                                                                                                    | **Fix as proposed**                                                                                                                                                                                                                                 |
| `extraction/README.md:236-237`, `extraction/graph.model.ts:191`         | The test reader declares a `definitions` exemption no check reads                                                                                                          | `exempts: [..., "definitions"]` in `good-enough-tests-reader.adapter.ts:81`; the check skips a test's definitions by `node.layer === "test"`, never by `exempts.has("definitions")`                                                                                                         | Read it where `:367` returns, or drop it from the type and the adapter                                                                                                              | **Fix as proposed**                                                                                                                                                                                                                                 |
| `../drivers/cli/__fixtures__/goldens/check-violating.txt:44`            | The detectors SPEC's gate says the golden gains a block per new check; the boot check has none                                                                             | Detectors SPEC `:203-204` "the CLI golden gains one block per new check"; golden: "1 assembly, 1 driver", no boot; no `.boot.ts` in `violating/`                                                                                                                                            | Add a boot file to `violating/`, regenerate                                                                                                                                         | **Fix as proposed**                                                                                                                                                                                                                                 |
| `docs/architecture.md:984-985, 1021` vs `check/driver.model.ts:250-264` | Canon exempts only the hook count for tests; the code exempts all of `hook-one-call`. Confessed in code and SPEC, not in canon                                             | Canon "the hook count and services-only do not apply"; code "PROVISIONAL … read as `hook-one-call` whole"                                                                                                                                                                                   | Already owed to `04/06_test-rules`: keep, or one canon sentence marking it provisional                                                                                              | **Keep** until `04/06_test-rules`                                                                                                                                                                                                                   |
| `check/driver.model.ts:393-407`                                         | A type-only import makes a root driver count as a sub-driver, so its `main(argv)` escapes "takes nothing"                                                                  | _probed_: `import type { main }` from another driver → the `main` parameter red disappears; without it, red. The edge kind is not checked                                                                                                                                                   | Count runtime edges only                                                                                                                                                            | **Fix as proposed**                                                                                                                                                                                                                                 |
| `extraction/README.md:146-148`                                          | One sentence leaves out the boot; another in the same README includes it                                                                                                   | "In an assembly or a driver a local function is not read inline" vs `:40-41` "in an assembly, a driver or a boot"                                                                                                                                                                           | Add the boot                                                                                                                                                                        | **Fix as proposed**                                                                                                                                                                                                                                 |

### Rows

| `path:line`                                                   | Claim                                                                            | Evidence                                                                                                                                                         | Proposed fix                                                                | Ruling                                      |
| ------------------------------------------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------- | ------------------------------------------- |
| `cases/assembly.spec.ts:85-87`                                | The row cites a canon sentence the lens deleted                                  | "A model call is allowed on the same terms as any other" — canon `:438-441` now "A model factory is one of them … A model function that computes a value is not" | Re-cite the factory sentence; the fixture (`createLimits(10)`) already fits | **Fix as proposed**                         |
| `cases/driver.spec.ts:149-150`                                | The row's paraphrase still allows what the lens closed                           | "a write that is not the result handed whole to the tech is translation" — canon `:573-575` "never used: not read, written, handed on or logged"                 | "a write in a hook is translation"                                          | **Fix as proposed**                         |
| `cases/assembly.spec.ts:18`, `cases/driver.spec.ts:19-20`     | File docstrings say two reds still wait on checkpoint 7; both rows are plain red | "the import of concrete tech waits on its `layers` cell"; "a sub-driver's hook imported waits on checkpoint 7's import cells"                                    | Drop both "waits on" clauses                                                | **Fix as proposed**                         |
| `cases/driver.spec.ts:123, 147`, `cases/assembly.spec.ts:171` | Three rows still carry UNSTAMPED                                                 | "UNSTAMPED — added at the detectors step, checkpoint 6" (×2), "as the row above"                                                                                 | **rixo reads the three**: stamp, or re-mark                                 | **Stamped**, all three; the markers removed |
| `cases/driver.spec.ts:419-420`                                | Points at checkpoint 6 for the types ruling; the SPEC rules it at checkpoint 4   | "re-ruled at the detectors step, checkpoint 6: types are no definitions" — detectors SPEC `:419-425`, under checkpoint 4                                         | Say checkpoint 4                                                            | **Fix as proposed**                         |

### Units

| `path:line`                                                    | Claim                                                                                     | Evidence                                                                                                  | Proposed fix                                                                               | Ruling                                                                                                             |
| -------------------------------------------------------------- | ----------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------ |
| `check/driver.model.spec.ts:11-18`                             | "No case can reach" an unknown argument; `this` reaches it                                | _probed_: hook `function (opts) { return cli.check(this) }` → `hook-one-call`, 1 unknown                  | A driver row (`cli.check(this)`, unknown); cut the unit's hook half                        | **Fix as proposed**                                                                                                |
| `check/modules.model.spec.ts:12-15`, detectors SPEC `:263-265` | "The one such callee at root is an import that did not resolve"; `this.run()` is another  | _probed_: model with `this.run()` at root → `stable-root` unknown callee                                  | A `modules` row; keep the unit for the "leads no fix" half only                            | **Fix as proposed**                                                                                                |
| `check/assembly.model.spec.ts:137`                             | Pins in a unit a verdict a row can own: a forbidden import's call is green in an assembly | _probed_: assembly calling `helper(1)` from `helpers.spec.ts` → only `test-is-outside`, no `assembly` red | A row, its verdict ruled with the driver-side forbidden-import finding above; cut the unit | **Red the call too**, under `assembly-builds-only` (as the driver finding above); the row owns it, the unit is cut |

### Known failures

| `path:line`                     | Claim                                                                                | Evidence                                                                                                                                      | Proposed fix                                                   | Ruling                                                            |
| ------------------------------- | ------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------- | ----------------------------------------------------------------- |
| `check/driver.model.ts:296-306` | `void cli.check(opts)` in a hook is a false red; confessed in SPEC prose, in no row  | _probed_: → "uses a use case's result" (`hook-one-call`). Canon `:573-575` "returned … or dropped". Already parked here: `void` read as a use | The parked fix (reader reads `void` as dropping), with its row | **Fix as proposed**                                               |
| `check/boot.model.ts:56-75`     | `main() + 1` at a boot's root passes every check; confessed in SPEC prose, in no row | _probed_: → 0 violations. Canon `:1036-1038` "nothing else imported, defined, held or called"                                                 | A `missed red` boot row, or judge the use                      | **A `missed red` row**; judging the use is new work, out of scope |

### Messages

| `path:line`               | Claim                                                                                            | Evidence                                                                                                                   | Proposed fix                                                                                                | Ruling              |
| ------------------------- | ------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ------------------- |
| `cli/render.model.ts:357` | A driver's constant is offered "a model export" as its way out; canon forbids a driver the model | "the literal in place, or a model export" — canon `:589` "Never a model"; `layers.spec.ts:415` "a driver imports no model" | "the literal in place, or the service that needs it owns it"; keep "a model export" in the assembly message | **Fix as proposed** |

### "To be measured"

| `path:line`               | Claim                                                                            | Evidence                                                                                             | Proposed fix                          | Ruling              |
| ------------------------- | -------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------- | ------------------------------------- | ------------------- |
| detectors SPEC `:390-392` | The one "to be measured" in the range was measured; the sentence still says owed | "Self-check effect to be measured." — checkpoint 4 built note `:401-402` "Self-check unchanged, 140" | "measured at build: none (140 → 140)" | **Fix as proposed** |

### Found while fixing

| `path:line`                      | Claim                                                                                                              | Evidence                                                                                                                                                                                                                             | Proposed fix                                                                                                            | Ruling                                                            |
| -------------------------------- | ------------------------------------------------------------------------------------------------------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------- |
| `check/modules.model.ts:101-103` | A module-root call to a test file's export draws no `stable-root` red; the same call to an adapter's function does | _probed_: service `export const PRICES = seedPrices()`, `seedPrices` from `fixtures.spec.ts` → only the import's two reds and the binding's unknown; `loadPrices()` from an adapter → "a function of a file that may touch the tech" | Red the call as a function of a file that may touch the tech; the `forbidden-import` pass-through goes; a `modules` row | **Red the call too**, as the driver and assembly checks (batch 3) |

Laundering: none found. The runner assembly's parked logic is already reported
by the self-check (`cases.assembly.ts`, 14 groups). Every other `false` and
`missed` marker in the range was re-read by the reviewer; its reader limit still
holds.

### Grouping's worth

On deblob's own check (479 violations): **56 groups carry a rider, 76 riders in
all.** One lead in nine brings riders along, and riders add a sixth to what the
reader sees. **Kept** (ruled 2026-09-27): the riders are the entries that look
like separate problems and are not.

### Title audit

Checkpoint 3, 2026-09-28. Four Fable 5.1 agents returned 113 findings over the
spec files: `lib/check` 21, `lib/extraction` 29, the CLI, config, explain and
driver specs 38, `lib/cases` 25. Four verifiers re-read each one in the tree:
106 hold as stated, 6 in part, 1 refuted and dropped (the layers check does
report an assembly's concrete import, under `assembly-builds-only`). Ruled: a
title that claims more than its body is trimmed when it overgeneralizes, pinned
when it names a behavior worth protecting. Applied in four batches, one per
split.

Each trim was checked before it landed: a claim dropped from a title must be
asserted elsewhere, or it is a behavior the suite no longer names. Three were
not, and are pinned instead; with them, two assertions that could not fail. Each
pin is shown live by breaking the code for one run:

- A use case on an adapter's or a model factory's instance is not primary. The
  prescribed `not.toContain("group.store.has")`, and the standing
  `not.toContain("registry.get")`, could not fail: a traced member is the path
  left after the instance, so a wrong trace reads `"has"` or `"get"`. Both are
  pinned by driver and line.
- A chain of grouping dirs collapses to the service dir (the collapse's `while`
  as an `if` went unseen).
- An empty binding pattern defines nothing and its initializer is still read
  (skipping it went unseen).
- A specifier pattern keeps every regex character literal (only `.` and `$` were
  exercised; dropping `|` from the escape list needs a half of the pattern
  matched alone to show).

The flavor's `classifyEntry` and `isFactory` now assert identity with the stock
functions, the wiring they state. The blob-control row's model side declares
what it writes to as the blob side does (`STATE: { n: number }`), so it compiles
and is red twice.

Beyond titles, three findings, confirmed by runs: `process.cwd()` behind `??` in
a hook draws no red, and a hook on a parameter no caller binds is not judged —
both confessed as `missed red`, the fixes carded on the PLAN for
`04/07_driver-readers`; and the type-name rows read as landed where every one is
a confession — their header and `describe` now say so.

Left over, carded on the PLAN: the fixture tours split one concern per test;
four root describes that name no unit; the two contract suites, never audited.
