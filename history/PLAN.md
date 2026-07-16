# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../docs/sdd.md) §3): scratch where the
> next chapters stage, and the project board — `## Future` body = staged queue
> (ordered, position is priority), `### Ideas` = zero-cost capture pool,
> payloads in `future/`. Absorbed the former "operation manual" (which was this
> file, misnamed).

## Future

- **Skills** — chapter in flight: `history/20260708_skills/` (**chapter PLAN
  carries the step queue and status — read it first when resuming**). Remaining:
  07 consolidation-commit ruling (candidate); gates: local plugin load
  (`claude --plugin-dir <repo>`) + spot-runs (manual, rixo).
- **CLI v0** — service DAG, module cycles, dependency matrix by suffix,
  composition rules, `private/` boundary, barrel detection; dogfood against a
  production codebase. Opens with a research move (boundary-detection approach,
  config shape, ts-morph vs madge/dpdm, output format — no design yet).
  Companion: derived-view staleness check — diff `docs/` sections against
  `source:` stamps in `skills/*/knowledge|references/`; stamp-text ↔ heading
  matching rule to spec.
- **Scaffold** — chapter `history/20260707_scaffold/` implemented; remaining:
  manual plugin-load gate (rixo).
- **Arch pass** — UI-zone formal holes (F1–F3) + accumulated doc touches →
  `future/arch-pass/` — blocked: svench taxonomy feeds the F1–F3 resolution.
- **README/living-doc structure** — next normalization target (sdd open
  question).

### Ideas

- **Svench flavor guide** — second implementation guide, proves "several valid
  guides, one foundation"; taxonomy sketch banked → `future/svench-flavor/` —
  blocked: factory-injection guide stabilizes first.
- **Pressure-test harness automation** — full design banked →
  `future/pressure-test-harness/` — blocked: only if skill-wording iteration
  demands it (manual spot-checks first).
- **GitLab MR defaults — first commit, not last** (2026-07-16, corrects an
  earlier belief): GitLab prefills MR title + description from the branch's
  _first_ commit → opening commits deserve special care (goal-stating title +
  description); later commits contribute additive detail only. Candidate:
  commit-guidance touch (docs/skills).
- **Pause-for-review-before-commit — canon candidate** (2026-07-16): agent
  presents diff + proposed message, waits for go; git index untouched (the
  reviewer's reviewed-files tracker). Personal workflow but SDD spirit — the
  gates exist to make humans actually review. Rule canon vs opt-in (and how)
  eventually.
- **RESEARCH: the packaging dimension of nesting** — any service must be
  splittable into a real package at any time; "a service _contains_ child
  services" has unexplored implications, probably hard negative rules. Research
  move when picked up; feeds architecture Packaging + Nesting.
- **Skill-trigger hook** — plugin hook injecting "deblob rules apply" on
  layer-suffix path hits — blocked: only if spot-runs show description-based
  recall failing (sdd §6: escalate when discipline fails).
- **Flavor naming** — rule a name for the factory-injection flavor (or bless the
  provisional one) before the second flavor guide makes ambiguity expensive.
- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Flat `history/` at scale** — 250+ entries strain a flat dir; mechanical fix
  (year subdirs / index) when the pain lands.
