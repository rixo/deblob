# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../docs/sdd.md) §3): scratch where the
> next chapters stage, and the project board — `## Future` body = staged queue
> (ordered, position is priority), `### Ideas` = zero-cost capture pool,
> payloads in `future/`. Absorbed the former "operation manual" (which was this
> file, misnamed).

## Future

- **Skills gates** — chapter `history/20260708_skills/` consolidated
  (2026-07-24); what remains is the two deferred manual gates (2026-07-17,
  rixo): local plugin load (`claude --plugin-dir <repo>`) and per-skill
  spot-runs (with-skill vs no-skill baseline on RED-list scenarios). Public
  install path validated (2026-07-17, rixo): `npx skills add rixo/deblob`
  succeeded from another project — "skills installable from the repo alone"
  evidenced.
- **CLI 0.0.x** — chapter in flight: `history/20260710_cli/` (chapter PLAN
  carries decisions, status, the standing release roadmap — read it first when
  resuming). Steps 01–14 landed (v0 check surface, resolution integrity,
  declared externals, cross-package layers, the `pure` key rename); rule names
  landed as their own chapter (`history/20260908_rule-names/`, 2026-09-09: slugs
  as the rule identity, numbers gone, rule URLs pinned to the release tag) — the
  `pure` rename and the slugs are 0.0.6's headline, one migration (0.0.5 was
  tagged 2026-09-09 and never published: the canary's read of its tarball
  renamed two slugs first); 0.0.6 published 2026-09-10, 0.0.4 on 2026-09-08
  (0.0.2 on 2026-07-24, 0.0.3 on 2026-09-02); version stance: 0.0.x until
  maturity or adoption pressure, 0.1.0 = the channel switch (minor = breaking
  thereafter). Storefront pass and package LICENSE closed 2026-07-25. Kin,
  unblocked by the slugs: the adapters-implement-ports rule (Ideas, CLI chapter
  board). Companion, ruled to the `deblob docs` command family: derived-view
  staleness check — diff `docs/` sections against `source:` stamps in
  `skills/*/knowledge|references/`; stamp-text ↔ heading matching rule to spec.
- **Driver layer** — chapter opened 2026-09-13: `history/20260913_driver-layer/`
  (GOAL, PLAN with the rulings and the closed review board, research). Canon
  first draft bb4bb3c, review closed 8cf50cc (2026-09-15): assembly builds,
  driver fires, boot starts, test kind, declared loads and tech, per-tech
  readings. Second consistency read closed 2026-09-15 (rows 33–52: rules that
  solved no observed problem cut back or dropped). Step queue 01–07 on the
  chapter PLAN; next: step 01 (the reader). Absorbs placement-debt steps 02–05
  as its step 07.
- **Placement debt** — chapter opened 2026-09-10 (its steps 02–05 now re-cut
  under the driver-layer chapter, above): `history/20260910_placement-debt/`
  (GOAL, PLAN, step 01 spec drafted; rulings pending at the seam). Born from a
  service-cutting audit of the package: green checks, two placement defects the
  checker cannot see — shared knowledge filed under its first consumer (the
  manifest claim, the check registry) and a run with no service (orchestration
  in `main.ts`, no fs port, sync by contagion, three port-less adapters).
  Sequenced before the adapters-implement-ports rule (CLI board, Ideas): the
  rule is born over a dogfood that passes it. Carries the laundering finding
  (agents routing logic into assembly past the verdict) with levers to rule.
  Terrain confirmed the class 2026-09-11 (the partner CLI, nine steps green,
  verbs sequenced in the driver — "a trigger with no owning use case"): a fifth
  step carries the gate questions — trigger → use-case table at the spec gate,
  owning suites read per trigger at the test gate, "the driver sequences
  nothing" in the guide.
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
- **"Unit" for the packaging thing** (rixo, 2026-09-18) — end the synonymy
  between service the layer and service the directory: the directory, its root,
  the DAG's nodes, the README requirement all say **unit**; the layer keeps
  "service". One move, not a drip: canon and the guides (every "service" meaning
  the directory, "service anatomy", "service root"); the slug `no-service-cycle`
  → `no-unit-cycle` (`service-purity` stays, it is the layer) — breaking, rides
  the driver-layer chapter's 07 slug migration so users migrate once; code and
  output (the flavor's `serviceRoot`, the graph vocabulary, the CLI's "N
  services" line and its goldens, the READMEs); the skills' placement cards and
  the memory notes. Prose lands everywhere in the same step as the slug.

### Ideas

- **Readonly laundered away after the root** (rixo, 2026-09-23, to discuss
  calmly and decide) — `stable-root`'s readonly half proves what a root
  binding's syntax allows, and TypeScript refuses direct writes through it
  (reassign a member, add a property, `delete`: TS2540, TS2339, TS2704). It does
  not refuse three ways around it, checked under `strict` on TypeScript 7.0.2:
  `Object.assign(BOXED, { value: 3 })`; assigning the value to a mutable type,
  `const alias: { value: number } = BOXED`, then writing through the alias; the
  same over an `as const` object. So a green root binding can still change at
  run time, through code elsewhere. Catching it would be a rule on how values
  are used, not on how bindings are declared: a readonly value handed to a
  mutable type or to a mutating call. To weigh: what it buys (the guarantee
  `stable-root` implies but does not give) against how much it needs (types
  across calls — the TypeScript engine's ground, see
  `20260913_driver-layer/04_outside-rules/01_type-names/SPEC.md`), and whether
  it is deblob's concern at all or a lint's. `Object.freeze` is the only runtime
  proof, one level deep. **Discussed 2026-09-24, stashed, low priority:**
  catching the write itself is tsc's or a linter's ground. deblob's stake is not
  the laundering but its own guarantee: green on `stable-root` should mean the
  root is stable, full stop. The way there is an opt-in strict rule under which
  that holds — banning outright what would break it (a readonly value handed to
  a mutable type or to `Object.assign`) — and it needs types to detect those.
  Owed meanwhile, on its own: one sentence where `stable-root` is documented
  (canon, `rule-content.model.ts`) saying what it proves (the binding as
  declared) and what it does not (`readonly` can be assigned away; only a freeze
  holds at run time).
- **Global kernels are born day 0, not at the second consumer** (rixo,
  2026-09-18) — canon's kernel sentences read as "extract when two consumers
  collide": § Kernel ("typically extracted to prevent dependency cycles between
  consumers"), Sharing step 3 ("when two services both need the same types or
  functions and the dependency would otherwise be mutual"), and Distillation's
  "a consumer beyond the birth use case" — and agents throw them back when told
  fs should obviously be a kernel (deblob itself skipped the fs kernel for two
  months on that reading: six port-less sync readers). The nuance to write: some
  concepts are shared _language_, not shared domain — the filesystem, logging,
  time, the test runner as a port — and waiting for a second consumer is
  counter-productive on every level: filing them under the first consumer's unit
  is semantically wrong (fs is nobody's domain), it hides them from plain view
  so the next session does not find them and writes an almost-identical twin,
  and the "second consumer" was never in doubt. Rule shape: a concept that is
  obviously platform-wide is a kernel on its first use; the second-consumer test
  governs _domain_ concepts only. One paragraph in § Kernel and a line in
  Distillation; the placement card's "forcing signal is a second consumer" gets
  the same nuance; the `fs-kernel-baseline` memory is the field record.
- **Recipe book — hard situations, elegant deblob moves** (2026-09-18; maybe a
  practical guide holding recipes, gotchas and worked examples, ruled at
  graduation) — the skill's progressive-disclosure slot: a "when stuck" index in
  the deblob SKILL's Deeper section, one line per hardship pointing at a
  knowledge card (situation → tension → the move → why → where). Guidance, not
  canon; the human-first source ruled at graduation. Recipes collected as they
  happen in `future/recipe-book/recipes/`, one file each, dated, problem stated
  generic-first with the deblob instance as the worked example (rixo: a recipe
  whose problem needs our situation is no recipe; a house opinion deblob has no
  verdict on is no recipe either — async-first was cut on that ground) — five
  banked from the driver-layer step 04 review night (the port ships its suite as
  a conformance kit; a harness is service + assembly front with the trigger in
  the test; shared test code closing a cycle between units — not ratified, kept
  for a fresh-eye assessment; two verdicts in one test, named apart — a gotcha,
  "when you catch yourself thinking…" material, not a recipe; tests pin verdicts
  not shapes — not a recipe but THE `deblob-test` story, kept as illustration
  material for that chapter) → `future/recipe-book/`.
- **`deblob-test` skill — no test pins an internal shape** (2026-09-17) — the
  guidance the testing area lacks. Illustration material with real examples:
  `future/recipe-book/recipes/tests-pin-verdicts-not-shapes.md`. "Test public
  API and behavior" did not transfer: agents anchor "public" on the `export`
  keyword and pin a reader's return shape (hook line numbers, kind lists, bound
  callees). The rule restated with the audience named: an expectation is a
  sentence the reviewer would sign without opening the code. For the
  reading-to-rules chain that is a verdict: minimal repro snippet → red / green
  / why (ESLint's RuleTester and rustc's UI tests are the precedent — source
  plus expected diagnostics, no AST-level units); for config or slugs it is
  "this input yields these readers". Coverage stays at 100 from those tests
  alone, so coverage becomes a pruning tool: a branch no compiling snippet
  reaches is dead. The type checker is the floor for "fake" code; a contrived
  compiling snippet is a legitimate case (never "nobody writes that"). Verdict
  cases are cheap to write before the code exists and stay red until the chain
  is right — red-first without unit-level design first, the reason TDD-via-agent
  was given up and may now be tried again. Open at graduation: the case shape
  for multi-file snippets (a driver's reading depends on what it imports;
  in-memory files fit the fs kernel baseline); how the Behavior panel links a
  verdict case to its rule (`describe` named after the rule, cases nested); what
  happens to the reading spec once the driver rule's verdict cases exist (step
  03 checkpoint 3 is the first natural rewrite). Ruled 2026-09-17 on the way:
  proper `it` form — a verb-first behavior sentence about the unit, `test` for
  corpus rows and tripwires, Jasmine nesting — the cheap end of BDD as the habit
  to build first. Later, possibly `deblob-bdd`: rixo's argument is
  capitalisation, not ceremony: a scenario layer makes a chunk reviewable
  without reading its code, and a step validated once is a trusted brick reused
  with confidence, so review cost falls with reuse instead of growing with the
  suite; no hands-on data yet, an experiment to run after `deblob-test` has
  served one chapter.
- **Service README check** (2026-09-15) — every service directory carries a
  `README.md`: the implementation guide demands it (the service's living doc),
  the graph already knows every service root, and the terrain shows it is the
  thing most easily overlooked. A packaging-family rule with its own slug; open
  at graduation: whether nested services and adapter-only directories count, and
  whether a missing README is a violation or the first warning-level finding.
- **Arc delimiters in commit subjects — `chapter(...)` / `close(...)`**
  (2026-07-24) — mark an arc's first and last commits with paired subject
  markers; ties to the first-commit-becomes-MR-description rule (the opening
  commit already authors the arc's public face — the marker makes the role
  mechanical); nestable like parentheses, so walking a git log exposes arcs
  within arcs as balanced delimiters. Open at graduation: fit with the
  Conventional Commits `type(scope)` grammar the log already speaks.
- **Sales speech — old pots, new balances** (2026-07-23) — the pitch precised:
  principles constant (nature/physics unchanged — old pots credited), balances
  moved, hence different decisions in accord with old principles for new
  objectives; pillars as decision guides (attention economics: the 100%-bar
  decoded as code-fully-represented-in-tests → reviewing tests ≈ reviewing
  code, + review slicing; locality: the graph navigator — name candidate
  archonaute) → `future/sales-speech/`.
- **Graph-as-product — the certified skeleton as leverage** (2026-07-23) — the
  reframe: the arch was adopted to fight mess (defer decisions); the
  organization built to fight the mess is itself an asset — the enforcement
  tool's exhaust is a certified, queryable architecture database (roles with
  guaranteed properties, typed edges, user names attached; the map cannot lie —
  CI-checked against the territory). Discovery + work organization, agent food;
  type-system precedent (act 2 = language server for architecture). Idea +
  honest ledger banked → `future/graph-as-product/` — blocked: mechanical base
  first (JSON output, `deblob status` are the substrate). Spike 2026-09-11
  (`spike/graph-viz`, throwaway worktree, deblob on itself): tests legibility
  and a plan overlay before the bricks are promoted; the day's dots with their
  standing → `future/graph-as-product/research/dots-2026-09-11.md`. 2026-09-12
  the spike turned on the product: rixo's brief for trigger adapters and the
  driver layer it implies (config-declared drivers, assembly reduced to
  initialize / wire / trigger-by-calling, trigger → primary use case as a
  relation the checker can see) →
  `future/graph-as-product/research/driver-extraction-2026-09-12.md`; feeds
  arch-pass F1 and the placement-debt chapter.
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
- **Flavor naming** — closed 2026-07-25 (rixo): `ts-suffixes-factories` (ruled
  2026-07-17, cli chapter) blessed as the guide's title; guide intro, root
  README and the flavor card now carry the name. A `ts-su-fa` compression was
  rejected — the name's job is stating the two identity axes, truncation would
  regress it to `prime`-grade opacity.
- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Flat `history/` at scale** — 250+ entries strain a flat dir; mechanical fix
  (year subdirs / index) when the pain lands.
- **Mutation tool, manual, per file** (rixo, 2026-09-21; wait until the
  `stable-root` rows are all green) — StrykerJS with its Vitest runner, run by
  hand on the file under review (`--mutate <file>`), never across the whole
  codebase. Why: the test rows only protect what they notice breaking, and
  hand-picked breaks come from whoever wrote the code, so they share its blind
  spots. A tool generates them mechanically. First manual run on
  `packages/deblob/src/lib/check/modules.model.ts`: 9 hand-made breaks, 7
  caught, both misses in reading inside a top-level `if`. Costs: Stryker refuses
  to start when a test already fails, so it needs either a green suite or a way
  to skip the rows that are red on purpose; and its survivors include mutants
  that change nothing observable, which a human sorts by hand — cheap on a
  60-line file, a long list on `reading.model.ts`. What it does not buy: it says
  whether the rows notice breakage, not whether they ask the right questions.
