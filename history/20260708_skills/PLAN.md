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

- `05_deblob-review` — implemented (2026-07-09): SKILL.md + scenarios; checklist
  absorbed, `docs/self-review-checklist.md` deleted (tombstone considered, ruled
  against — SPEC §5), three referrers rewired (guide, README, handling-failure).
  See its SPEC.

- `06_deblob-sdd` — implemented (2026-07-09): SKILL.md + scenarios; four-skill
  set complete, manifest bumped 0.1.0; INDEX header note and README skills row
  updated. See its SPEC.

## Step queue (each dissolves into its step's SPEC when spec'd)

- `07_arc-recursion` — spec'd (2026-07-16), awaiting spec gate (rixo): see
  `07_arc-recursion/SPEC.md`. Folds in the GitLab first-commit correction
  (2026-07-16, reverses the 2026-07-09 last-commit belief — the MR facade is the
  opening commit's job).

## Carried notes

- **Open micro-question** (2026-07-09, step 06 review): the deblob-sdd skill
  unpacks "measured count" into defined-vs-measured (closed union → exhaustive
  enumeration is correct); sdd §1 + operation-over-cases card carry only the
  word "measured". Mirror the exemption sentence into both? (recommended,
  unruled — rixo).
- **Install sections removed from SKILL.md bodies** (2026-07-09, reverses the
  step-00 "installation prescription" ruling): skill bodies follow authoritative
  skill-authoring practice (frontmatter trigger + task instructions, nothing
  else) and stay agent-agnostic — no CLAUDE.md mentions in shipping content. The
  deterministic-trigger line ("load the skill before X") still wants a home in
  README/plugin docs, phrased agent-agnostic (CLAUDE.md / AGENTS.md /
  equivalent) — pending, chapter exit.
- Enforcement design for `5-docs` and PLAN hygiene lands somewhere in this
  chapter and/or the CLI (prescriptions already in sdd).
- Exit per skill: with-skill spot-runs pass on scenarios drawn from its RED list
  where the no-skill baseline fails (harness item in root PLAN — downscoped to
  manual).
