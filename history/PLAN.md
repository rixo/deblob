# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../docs/sdd.md) §3): scratch where the
> next chapters stage. Consolidates continuously — items shed into chapters and
> living docs as they crystallize. Absorbed the former "operation manual" (which
> was this file, misnamed).

## Staged next

- **Scaffold** — chapter `history/20260707_scaffold/` implemented; remaining:
  manual plugin-load gate (rixo). npm publish + GitHub remote: done
  (2026-07-08).
- **Skills** — chapter in flight: `history/20260708_skills/` (GOAL carries the
  four-skill set and method; **chapter PLAN carries the step queue and status —
  read it first when resuming**). Done: 00 `deblob` skill, 01 knowledge cards
  (`skills/*/knowledge/`), 02 guide cards (`implem/`), 03 assembly-is-not-blob,
  04 `deblob-commit` skill, 05 `deblob-review` skill (checklist absorbed +
  deleted). Next in queue: the sdd skill. Outstanding gates: local plugin load +
  spot-runs (manual, rixo).
- **Pressure-test harness** — downscoped (2026-07-07): scenario _docs_ ride with
  each skill; runs start as manual spot-checks; the automation below only if
  wording iteration demands it (real cost: ~30 subagent runs per wording
  iteration per skill, plus transcript judging). Full shape if/when automated:
  `tests/<skill>/<scenario>.md` = task prompt + pressures applied (time / sunk
  cost / authority / exhaustion) + forbidden behaviors + required behaviors.
  Runner: one fresh subagent per scenario, always paired with a no-skill
  control; verbatim transcripts kept; every violation's rationalization
  harvested into the skill's table. Pass bar: all scenarios compliant with-skill
  AND baseline failure demonstrated without (a scenario the baseline already
  passes tests nothing). Start: 3 scenarios for `deblob` (matrix violation under
  time pressure; defensive catch under sunk cost; export-for-test under
  authority).
- **CLI v0** — service DAG, module cycles, dependency matrix by suffix,
  composition rules, `private/` boundary, barrel detection. Dogfood against a
  production codebase. **Opens with a research move**: boundary-detection
  approach, config shape, ts-morph vs madge/dpdm, output format — no design
  exists yet. Also: **derived-view staleness check** — diff `docs/` sections
  against the `source:` frontmatter stamps in `skills/*/knowledge/` and
  `skills/*/references/` (stamps standardized in the skills chapter, step 02);
  needs the stamp-text ↔ heading matching rule spec'd.
- **Architecture doc touches** — `XxxService` (not `XxxServiceAPI`) in examples;
  Store pattern reality check (zero `.store.ts` in practice — role, not file
  kind); **nesting DAG implications spelled out** — direction law
  (nested-adapter edges point up via the port; parent stays import-blind to its
  children; only the cycle trap is documented today). (Rule 10 stands as
  written: ports are types only — an earlier softening idea was a misreading,
  since reverted in the guide.) Port-type examples (`FsPort`, `LoggerPort`,
  `IconSourcePort`) predate the guide's name-by-role ruling (2026-07-08, skills
  chapter step 02: bare role names, qualify only to disambiguate) — rename at
  the next arch pass, then propagate to the arch cards mirroring them
  (layer-ports, crossing-services ref).

## Parked / awaiting material

- **RESEARCH: the packaging dimension of nesting** — the arch states layers and
  composition well; packaging (the dimension the DAG is anchored into) is
  under-articulated. Mental model to develop: any service must be splittable
  into a real package at any time — impossible with DAG violations or services
  picking into each other without clear public surfaces. Strong suspicion: "a
  service _contains_ child services" has unexplored implications in this model —
  probably hard, negative rules not yet discovered. Research move when picked
  up; feeds architecture Packaging + Nesting sections.
- **Skill-trigger hook** — plugin hook injecting "deblob rules apply" on
  layer-suffix path hits; deterministic mid-task trigger. Build only if
  spot-runs show description-based recall failing (sdd §6: escalate when
  discipline fails).
- **Flavor naming** — the implementation guide's flavor has no settled name; the
  guide title says "factory-injection" provisionally, the knowledge cards
  deliberately say "this flavor" (skills chapter step 02). Rule a name (or bless
  the provisional one) before the second flavor guide makes the ambiguity
  expensive.

- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Svench flavor guide** — second implementation guide (context-composition
  flavor: bare layer filenames, `use*` hooks, context-tree assembly); proves
  "several valid guides, one foundation" with a real second data point. After
  the factory-injection guide stabilizes.
- **README/living-doc structure** (sdd open question) — next normalization
  target after the above.
