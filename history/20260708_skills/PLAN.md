# Chapter PLAN — skills

Scratch: the step queue and each future step's input material. Refines into step
SPECs; cleaned at chapter consolidation.

## Status

- `00_deblob` — implemented (2026-07-08): SKILL.md + 5 cards + scenarios.
  Deviation note: L2b why-cards not materialized at first — then step 01
  materialized the layer corpus-wide as `skills/*/knowledge/` (supersedes the
  on-demand trigger). Remaining gates: local plugin load (manual, rixo);
  spot-runs S1–S3 (no-skill control vs with-skill).
- `01_knowledge-cards-adoption` — implemented (2026-07-08): opened with a
  contained research move (36 cards + INDEX), then adoption — the skills
  knowledge layer born (`skills/{deblob,deblob-sdd}/knowledge/`), frontmatter
  provenance, Deeper rewiring. See its SPEC's Decisions and META.

## Step queue (each dissolves into its step's SPEC when spec'd)

- `02_guide-cards-research` — slice `docs/implementation-guide.md` into
  `skills/deblob/knowledge/implem/` (flat — one flavor, mirrors docs/), same
  authoring contract (step-00 SPEC §2 register + passes); then rewire the guide
  links left in `references/{placement,handling-failure,writing-tests}.md`
  Deeper sections.
- `03_deblob-commit` — RED material: NOTABLE over-flagging (~6% observed base
  rate is the calibration), body-less commits, squash instinct. The 13
  `deblob-sdd/knowledge/` cards are reference material pre-written for this and
  the sdd skill.
- `04_deblob-review` — RED material: self-review-checklist "honest limits"
  section verbatim (tests-green→done pattern-match). Absorbs
  `docs/self-review-checklist.md`, then tombstones it. Honest scope +
  adversarial-subagent direction: see chapter GOAL.
- `05_deblob-sdd` — RED material: section drift, PLAN sprawl, scratch wedged
  into step numbering, case-enumeration instead of domain operation.

## Carried notes

- Enforcement design for `5-docs` and PLAN hygiene lands somewhere in this
  chapter and/or the CLI (prescriptions already in sdd).
- Exit per skill: with-skill spot-runs pass on scenarios drawn from its RED list
  where the no-skill baseline fails (harness item in root PLAN — downscoped to
  manual).
