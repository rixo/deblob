# Research/discussion steps are a different *nature* of step

Raw consideration — a gap in the method, to fold into sdd.md later. Not "our
approach is wrong"; the method lacks a slot for something legit.

## The gap

The history axis (sdd.md §3) gives steps one shape — the spec quintet
(Goal → API → Tests → Implementation → Docs), a mini-spec that runs *spec → code*
under the systematic guardrails. That shape fits **implementation steps**. It
does **not** fit a step whose job is exploration.

## The discovery

A whole **research & discussion step** can legitimately exist *before* an
implementation step. Properties:

- Different nature from an implementation step — free-form, not a mini-spec.
- Deserves its own **chronological step ordering** (a real numbered step in the
  chapter, not a side-note).
- **Not (safely, with quality gates) directly implementable.** Its job is to turn
  open ground into an actionable plan for a *later* implementation step.

## Two-sided constraint (don't overcorrect)

- Methodology shouldn't **force** the spec quintet onto research steps — wrong
  structure for the nature of the work.
- But it shouldn't **relax the systematic guardrails for implementation steps**
  either, just because exploration is allowed to be loose. The looseness is
  scoped to the research step; the impl step it feeds stays under full gates.

## What to do with it

Lands in sdd.md §3 (step nature/shape) + the §153 open-questions list. Candidate:
a step *kind* dimension orthogonal to the level ladder — research-step vs
implementation-step, each with its own expectations.
