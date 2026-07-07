# SDD field reconciliation

## 1. Goals

Align `docs/sdd.md` with what seven months of field practice actually
validated, per the rulings recorded during the 2026-07-07 practice audit
(source material in the private research capture; its handoff queue is this
chapter's input). Theory claims the practice contradicts either get corrected
(the claim was wrong) or get flagged for enforcement (the claim stands, the
gap is compliance). Done = the doc a newcomer reads matches the practice we
actually want, with no known silent divergence.

## 2. API

The prescription changes — the methodology's contract surface:

- **Quintet step 3 is `Testing`** (not `Tests`): the section answers *how do
  we prove this works as intended?* — the verification strategy, including
  completion criteria and gates; not necessarily a catalog of tests.
- **Depth is discretionary; the answer is not** (all sections): the
  high-level answer is the minimum requirement; more detail as complexity
  warrants or the author desires.
- **Level-0 grammar named**: `Goal:` / `API:` / `Testing:` /
  `Implementation:` / `Docs:` compressed sections, empty ones drop. The
  field-practiced `Changes:` is not a new section kind — it is the
  Implementation record.
- **`NOTABLE:` split from `META:`** — attention flag vs knowledge log.
  NOTABLE calibration in the doc: salience relative to the reviewer's queue,
  not the agent's task; low base rate; litmus question.
- **Named support trailers**: Decisions log, Open questions / Out of scope,
  Commits trailer.
- **`5-docs` is upfront homework**: answered at spec time, reviewed at the
  spec gate, before implementation.
- **The outermost PLAN is mortal per item**: an item dissolves into its
  chapter the moment work begins; items stay thin; a never-dissolving PLAN
  would be a standing bypass of the whole system.

## 3. Testing

Prove by sweep: no stale `Tests` / `3-tests` references anywhere in `docs/`;
cross-references between sdd.md and the implementation guide still resolve;
grep for the old commit-label claims (`Changes` as a section kind, `META:`
without `NOTABLE:`) comes back clean.

## 4. Implementation

All in `docs/sdd.md`: §1 step table + TDD paragraph (Testing rename); §1
`5-docs` section (upfront-homework paragraph); §3 support docs (named
trailers); §3 outermost chapter (per-item PLAN mortality); §4 commits
section (level-0 grammar + NOTABLE/META split). `history/PLAN.md` slims in
the same movement — this chapter absorbs its item 1.

## 5. Docs

`docs/sdd.md` is itself the living doc affected — the change IS the doc
update. Implementation guide and README verified unaffected.

## Decisions

- **Branch policy**: `main` is the working branch (solo repo; micro-commits
  and chapters carry the structure); feature branches optional for risky or
  parallel work. Canonical home for this ruling: the README/contributing
  material when its structure lands (parked PLAN item); recorded here until
  then.
- **PLAN mortality model (b) ratified**: same mortal object at every scale;
  the outermost chapter merely lacks a terminal event, so dissolution is
  per-item at chapter birth.

## Out of scope

- The `> **What this is.**` doc-header ruling — pending.
- Enforcement *mechanism* for `5-docs` and PLAN hygiene (this chapter lands
  the prescriptions; the mechanism belongs with the skills/CLI work — staged
  in PLAN).
