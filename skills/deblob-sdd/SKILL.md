---
name: deblob-sdd
description:
  Use when planning, structuring, or recording work — writing or amending
  SPEC/GOAL/PLAN files, opening a chapter or step — in a repository with a
  history/ directory of dated chapters and quintet-section specs
  (Goal/API/Testing/Implementation/Docs).
---

# deblob-sdd — specs and the history axis

Ordering is the mechanism: the right questions answered in the right order force
good architecture, the way tests-first forces decoupling. Skip a question and
everything downstream loses its constraint.

## The quintet — answer in order

Goals → API → Testing → Implementation → Docs.

- **Goals** — state success before touching anything.
- **API** — the contracts you commit to, at every layer that has one: ports, the
  purity split, the home of each domain decision. Load-bearing contracts only —
  never every signature.
- **Testing** — how it's proven: strategy and completion gates, before the
  approach locks.
- **Implementation** — part plan, mostly post-hoc record of what the code does.
- **Docs** — the living-doc impact, planned upfront.

**Depth is discretionary; the answer is not.** A section's minimum is the
high-level answer to its question — never a word count.

## Two axes — never mix

- **`history/`** — append-only, indexed by time; answers _why / how did we get
  here_. Never read a frozen chapter as present truth: past plans are not canon;
  their forward-looking parts died on contact with reality.
- **Living docs** (READMEs) — always current; answer _what is it now_.
- Canon = living docs + the latest plans (outermost PLAN, active spec) only.

## Form — pick the ladder rung

Level 0 commit body (contained detour found mid-task — grammar in the
`deblob-commit` skill) → 1 directory + `SPEC.md` → 2 split section files → 3
directory of steps. **When unsure: level 1.** From level 1 up, a move IS a
directory. Nest where a concern begins, not where a count is reached.

Scratch has named homes — `PLAN.md`, `META.md`, `research/` — never a step
number. A step directory invented to file notes breaks the fractal readers rely
on.

## PLAN hygiene

A PLAN is scratch that consolidates continuously; every item is mortal: work
begins → a chapter is born → the item dissolves into it. Spec-grade detail
piling up in a PLAN item means a chapter wants to be born — open it.

## Spec the operation, not the cases

When correctness depends on generality, don't spec by inventorying the cases you
can see — state the rule that covers them all:

- Name the domain and state the operation over the whole of it ("for _every_
  file kind, resolve via X") in the spec clause nearest the implementation — not
  only in the preamble.
- Ask how the count is known. Five by _definition_ (a closed union — the
  compiler owns the set): exhaustive enumeration is correct. Five by
  _measurement_ (a survey found five in the wild): the set is open — members
  arrive unannounced; code against "any", never against the census.
- For an open set, write one tripwire test: an input carrying a case absent from
  today's list (a synthetic sixth kind). Code stating the operation passes it
  for free; code built as five branches fails it mechanically — no need to guess
  which case gets forgotten.

Calling out meaningful cases stays welcome — examples, edge pins, detail on
tricky members — on top of the stated operation, never in place of it.

## When you catch yourself thinking…

| Excuse                                   | Reality                                                                                        |
| ---------------------------------------- | ---------------------------------------------------------------------------------------------- |
| "this section sort of covers it"         | Each section answers ITS question. A drifted answer unconstrains the next step.                |
| "the roadmap should carry this detail"   | Spec-grade detail in a PLAN item = a chapter wants to be born. Open it; the item dissolves.    |
| "I'll add a step dir for these notes"    | Scratch has named homes (PLAN, META, research/). A fake step breaks learn-the-shape-once.      |
| "list the cases — clearer than abstract" | Enumeration IN PLACE of the rule fails the unseen case. State the operation; cases illustrate. |
| "spec's written; order was guidance"     | The order IS the mechanism. An unanswered upstream question = unconstrained downstream work.   |
| "the old chapter says X, so X holds"     | Frozen ≠ current. History answers why; the present lives in living docs and the latest plans.  |

## Deeper

Per judgment — the why behind each rule, in [knowledge/](knowledge/INDEX.md):

- [forcing-function](knowledge/forcing-function.md) — why this order
- [ladder](knowledge/ladder.md) / [chapters](knowledge/chapters.md) — forms,
  recursion, the outermost chapter
- [two-axes](knowledge/two-axes.md) — why mixing rots both
- [operation-over-cases](knowledge/operation-over-cases.md) — the enumeration
  failure mechanism
