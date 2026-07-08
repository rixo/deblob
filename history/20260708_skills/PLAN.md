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

- `02_guide-cards-adoption` — implemented (2026-07-08): 9 implem cards
  (`skills/deblob/knowledge/implem/`), INDEX section, last guide Deeper links
  rewired. See its SPEC.
- `03_assembly-is-not-blob` — implemented (2026-07-08): the blob-vs-assembly
  ruling landed in arch + guide §6, propagated to 5 derived views; SKILL.md
  gains the "it's just wiring" rationalization row. See its SPEC.
- `04_deblob-commit` — implemented (2026-07-09): SKILL.md + scenarios; Deeper
  cross-links into `deblob-sdd/knowledge/` (first use). Seven commit-message
  rulings landed docs-first in sdd.md §4 (subject grammar, size, signal line,
  defer-to-spec, trailers, breaking≠NOTABLE, trivial-body litmus). See its SPEC.

## Step queue (each dissolves into its step's SPEC when spec'd)

- `05_deblob-review` — RED material: self-review-checklist "honest limits"
  section verbatim (tests-green→done pattern-match). Absorbs
  `docs/self-review-checklist.md`, then tombstones it. Honest scope +
  adversarial-subagent direction: see chapter GOAL.
- `06_deblob-sdd` — RED material: section drift, PLAN sprawl, scratch wedged
  into step numbering, case-enumeration instead of domain operation.

## Carried notes

- Enforcement design for `5-docs` and PLAN hygiene lands somewhere in this
  chapter and/or the CLI (prescriptions already in sdd).
- Exit per skill: with-skill spot-runs pass on scenarios drawn from its RED list
  where the no-skill baseline fails (harness item in root PLAN — downscoped to
  manual).
