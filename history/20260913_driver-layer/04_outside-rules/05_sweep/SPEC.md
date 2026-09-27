# Sweep — loose ends caught before building on them

Added to the step queue 2026-09-25: the detectors went fast, one commit a
checkpoint for days, then the lens re-read them all. Before type-name depth or
the test rules build on top, a reviewer that wrote none of it reads everything
since `02_rows-first` closed, and the loose ends it finds are fixed in batches.

**Drafted 2026-09-27.** Nothing below is run until "go".

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
     mutation-table line that counted the old red is corrected.
   - The test reader's `Role` constants, `as const`: deblob's own check loses
     its five `stable-root` unknowns.
   - `it` where the title is a behavior sentence, `test` elsewhere — row by row,
     never a blind rename.
   - Typed builders for `render.model.spec.ts`'s `as …Violation` casts.
3. **Close.** The table's rulings all applied or carded; the PLAN's queue moves
   to `04/06_test-rules`.

**Reviewer: Fable 5.1** (ruled 2026-09-27). The review is meant to push back,
and a different model's blind spots are the point.

## Docs

The findings table and its rulings, in § Findings of this SPEC; the PLAN's step
queue.

## Findings

Empty until checkpoint 1. READMEs and canon only where a ruled finding says they
lie.
