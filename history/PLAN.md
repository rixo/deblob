# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../docs/sdd.md) §3): scratch where the
> next chapters stage, and the project board — `## Future` body = staged queue
> (ordered, position is priority), `### Ideas` = zero-cost capture pool,
> payloads in `future/`. Absorbed the former "operation manual" (which was this
> file, misnamed).

## Future

- **Skills** — chapter in flight: `history/20260708_skills/` (**chapter PLAN
  carries the step queue and status — read it first when resuming**). Steps
  00–07 landed; remaining: chapter consolidation + carried notes. Gates —
  deferred (2026-07-17, rixo): local plugin load (`claude --plugin-dir <repo>`)
  and spot-runs (manual). Public install path validated (2026-07-17, rixo):
  `npx skills add rixo/deblob` succeeded from another project — "skills
  installable from the repo alone" evidenced.
- **CLI v0** — chapter in flight: `history/20260710_cli/` (chapter PLAN carries
  decisions, step queue, engine research — read it first when resuming). Engine
  ruled (oxc, 2026-07-17); next: step 01 extraction-core. Companion, ruled to
  the `deblob docs` command family: derived-view staleness check — diff `docs/`
  sections against `source:` stamps in `skills/*/knowledge|references/`;
  stamp-text ↔ heading matching rule to spec.
- **Review-slicing skill** — dogfooded 2026-07-23 on step-10's own diff, verdict
  positive (better, more engaging review — rixo). Graduation next, a fresh
  session: chapter in the skills lineage; first ruling = name (the
  `deblob-review` collision). Payload: `future/review-slicing/` (card with
  graduation agenda + run log). Kin ruling at open: pause-for-review canon
  candidate (Ideas below).
- **Scaffold** — chapter `history/20260707_scaffold/` implemented; remaining:
  manual plugin-load gate — deferred (2026-07-17, rixo).
- **Arch pass** — UI-zone formal holes (F1–F3) + accumulated doc touches →
  `future/arch-pass/` — blocked: svench taxonomy feeds the F1–F3 resolution.
- **README/living-doc structure** — next normalization target (sdd open
  question).

### Ideas

- **Sales speech — old pots, new balances** (2026-07-23) — the pitch precised:
  principles constant (nature/physics unchanged — old pots credited), balances
  moved, hence different decisions in accord with old principles for new
  objectives; pillars as decision guides (attention economics: the 100%-bar
  decoded as code-fully-represented-in-tests → reviewing tests ≈ reviewing
  code, + review slicing; locality: the graph navigator — name candidate
  archonaute) → `future/sales-speech/`.
- **deblob-sdd trigger touch** (2026-07-23) — hook the skill on "future idea" /
  "capture idea" phrasing (description trigger line); rides with the skills
  chapter's remaining consolidation.
- **Graph-as-product — the certified skeleton as leverage** (2026-07-23) — the
  reframe: the arch was adopted to fight mess (defer decisions); the
  organization built to fight the mess is itself an asset — the enforcement
  tool's exhaust is a certified, queryable architecture database (roles with
  guaranteed properties, typed edges, user names attached; the map cannot lie —
  CI-checked against the territory). Discovery + work organization, agent food;
  type-system precedent (act 2 = language server for architecture). Idea +
  honest ledger banked → `future/graph-as-product/` — blocked: mechanical base
  first (JSON output, `deblob status` are the substrate).
- **Svench flavor guide** — second implementation guide, proves "several valid
  guides, one foundation"; taxonomy sketch banked → `future/svench-flavor/` —
  blocked: factory-injection guide stabilizes first.
- **Pressure-test harness automation** — full design banked →
  `future/pressure-test-harness/` — blocked: only if skill-wording iteration
  demands it (manual spot-checks first).
- **Pause-for-review-before-commit — canon candidate** (2026-07-16): agent
  presents diff + proposed message, waits for go; git index untouched (the
  reviewer's reviewed-files tracker). Personal workflow but SDD spirit — the
  gates exist to make humans actually review. Rule canon vs opt-in (and how)
  eventually.
- **RESEARCH: the packaging dimension of nesting** — **done 2026-07-22** (live
  discussion, cli step 10 era); note banked →
  `future/arch-pass/research/nesting-packaging.md`. Verdict: dir-semantics +
  explicit sinks is the unique sound point (containment variants proven
  unsound); dissolves into arch-pass.
- **Redaction audit — Diátaxis pass over the docs corpus** (2026-07-22) — map
  `docs/` + README + explain cards to the four quadrants
  (tutorial/how-to/reference/explanation), fix worst mode-mixing
  (architecture.md fuses explanation+reference); how-to genre hosts the future
  patterns doc. Scope edge: `history/` excluded (decision-record genre, sdd.md
  governs); machine-optimized skills/cards keep their form. Authorities:
  diataxis.fr, Google dev-docs style guide, Write the Docs.
- **Skill-trigger hook** — plugin hook injecting "deblob rules apply" on
  layer-suffix path hits — blocked: only if spot-runs show description-based
  recall failing (sdd §6: escalate when discipline fails).
- **Flavor naming** — rule a name for the factory-injection flavor (or bless the
  provisional one) before the second flavor guide makes ambiguity expensive.
- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Flat `history/` at scale** — 250+ entries strain a flat dir; mechanical fix
  (year subdirs / index) when the pain lands.
