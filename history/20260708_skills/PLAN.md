# Chapter PLAN — skills

Consolidated 2026-07-24: all steps landed (00–07, status below), carried notes
resolved (dispositions below). The chapter's remaining life is two rixo-manual
gates, deferred standing (2026-07-17, rixo) and tracked on the outermost board:
local plugin load (`claude --plugin-dir <repo>`) and per-skill spot-runs
(with-skill vs no-skill baseline on RED-list scenarios). Public install path
validated 2026-07-17: `npx skills add rixo/deblob` from another project.

## Status

- `00_deblob` — implemented (2026-07-08): SKILL.md + 5 cards + scenarios.
  Deviation note: L2b why-cards not materialized at first — then step 01
  materialized the layer corpus-wide as `skills/*/knowledge/` (supersedes the
  on-demand trigger). Remaining gates — deferred (2026-07-17, rixo): local
  plugin load (manual); spot-runs S1–S3 (no-skill control vs with-skill).
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

- `07_arc-recursion` — implemented (2026-07-17): the arc landed in sdd §4 +
  deblob-commit/commits/chapters surfaces; two gate corrections folded (face
  mostly knowable at opening; no-squash binds landed history only). Same-day
  follow-up ruling: standalone commits — each commit strives for a full,
  functional repo state, docs in sync. See its SPEC. Dogfood gate pending: the
  next real multi-commit arc runs the grammar end to end.

## Carried notes — resolved at consolidation (2026-07-24)

- **Measured-count mirror** (2026-07-09, step 06 review; recommended, unruled —
  ratified at the consolidation review): the defined-vs-measured exemption
  sentence (closed union → exhaustive enumeration is correct) mirrored into sdd
  §1 and the operation-over-cases card, which carried only the word "measured".
- **Deterministic-trigger line** (2026-07-09, reverses the step-00 "installation
  prescription" ruling — skill bodies stay authoritative-practice-only and
  agent-agnostic): landed in the README at consolidation, agent-agnostic
  phrasing (CLAUDE.md / AGENTS.md / equivalent), alongside the validated install
  path.
- **Enforcement design for `5-docs` / PLAN hygiene**: dissolved 2026-07-17 into
  the CLI chapter's `future/docs-family/` payload (staleness seed + candidate
  list); ruling at that item's graduation, post-v0.
- **Per-skill spot-run exit**: the deferred manual gate in the header — outlives
  consolidation, tracked on the outermost board.
