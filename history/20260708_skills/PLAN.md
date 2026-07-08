# Chapter PLAN — skills

Scratch: the step queue and each future step's input material. Refines into step
SPECs; cleaned at chapter consolidation.

## Status

- `00_deblob` — implemented (2026-07-08): SKILL.md + 5 cards + scenarios.
  Deviation note: L2b why-cards not materialized — the layer is conditional by
  spec ("where 3–5 lines don't suffice") and no judgment block crossed the
  threshold. Trigger to birth the first one: usage shows a block
  under-motivating an agent (likeliest: crossing-services kernel-cracking).
  Remaining gates: local plugin load (manual, rixo); spot-runs S1–S3 (no-skill
  control vs with-skill).

## Step queue (each dissolves into its step's SPEC when spec'd)

- `01_deblob-commit` — RED material: NOTABLE over-flagging (~6% observed base
  rate is the calibration), body-less commits, squash instinct.
- `02_deblob-review` — RED material: self-review-checklist "honest limits"
  section verbatim (tests-green→done pattern-match). Absorbs
  `docs/self-review-checklist.md`, then tombstones it. Honest scope +
  adversarial-subagent direction: see chapter GOAL.
- `03_deblob-sdd` — RED material: section drift, PLAN sprawl, scratch wedged
  into step numbering, case-enumeration instead of domain operation.

## Carried notes

- Enforcement design for `5-docs` and PLAN hygiene lands somewhere in this
  chapter and/or the CLI (prescriptions already in sdd).
- Exit per skill: with-skill spot-runs pass on scenarios drawn from its RED list
  where the no-skill baseline fails (harness item in root PLAN — downscoped to
  manual).
