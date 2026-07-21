# Chapter PLAN — cli

Chapter scratch. Opened from the 2026-07-10 evening session (decisions + engine
research below), recovered from stash and formally opened 2026-07-17, folded
with that day's blind re-draft. Refines into step SPECs as steps open. Chapter
GOAL: [GOAL.md](./GOAL.md). Dir name ruled `cli` (2026-07-17, rixo — the date
prefix is distinction enough; versions are release semantics, not chapter
identity).

## Decisions (2026-07-10, pre-opening — ratified in session unless noted)

- **Command surface**: `deblob check <what>` composite — `check dag`,
  `check layers`, `check private`, `check barrels`, `check ports`; bare `check`
  = all. Detectors are pure functions over one shared import graph.
- **No autofix, ever** — a value-prop boundary, not a v0 deferral. The CLI
  detects; moving code into layers is judgment, and judgment is userland
  (agent/human). No overselling = no flying close to the sun.
- **Config day 1, flavor-first**: `deblob.config.ts` (TS strongly preferred),
  project-level — root or per package both fine, prettier/eslint precedent
  (amended 2026-07-17, rixo: strict "repo-wide only" was over-tight). Adopting
  deblob is a commitment for the governed subtree — tolerant of non-compliant
  code (blob is legal, unsuffixed), intolerant of pretending. One config per run
  governs its subtree; no inheritance machinery — configs never merge, no
  extends. Flavor axes: naming scheme (suffix vs directory-based), type-only
  exemption stance — default exempt per rule 8, config opt-out for stricter
  flavors (config knobs may only tighten canon, never loosen it; 2026-07-17,
  rixo). Concrete-lib classification rides along. Stock flavor name:
  **`ts-suffixes-factories`** (ruled 2026-07-17, rixo — replaces provisional
  `prime`, which carried status but zero information: name states the two
  identity axes, suffix naming + factory injection, prefixed `ts-` because
  flavor vocabulary is program-wide — guides are per-flavor and the GOAL's own
  phrasing is "TypeScript/ESM factory-injection"; plurals deliberate, they kill
  the adjective misreading). And **one name: flavor** (2026-07-17, rixo):
  "preset" dropped, it was a second name for the same concept; the config key is
  `flavor: 'ts-suffixes-factories'`, and a custom flavor is the same key fed a
  FlavorResolver implementation instead of a name. The config key teaches the
  flagship term, same logic as the `blob` bucket. Also ratified (2026-07-17,
  rixo): `include`/`exclude` keys + the full-scan coverage model (no discovery
  roots — see `research/config-options.md`); exact default lists still open. And
  `typeOnlyExempt` as the top-level opt-out key (2026-07-17, rixo). Follow-up
  ruling (2026-07-17, rixo): the freed "preset" name gets its real job —
  **presets = framework convention bundles** (sveltekit, astro, …), combinable,
  orthogonal to flavor (arch style, one and exclusive): a preset contributes
  framework defaults — assembly globs, generated-tree excludes, later filetype
  extractors. Future, not v0; the `presets` key name is reserved. Resolves the
  "FlavorResolver assembly() hook" open question: no — presets are the third
  concept.
- **Rule-4 polarity: default-concrete** (2026-07-17, rixo — safe by default): an
  unlisted third-party imported from a pure layer fires the unclassified
  violation ("declare it in `pureLibs` if it qualifies"). A false positive costs
  one config line; the false negative of default-pure is a silent hole in the
  exact guarantee the tool exists to close. Rider for the layers detector step:
  architecture.md's prose reads permissive ("pure libs count as model code") —
  one-line clarification touch rides with that step. Wording bounded
  (2026-07-20, rixo): practice-level, not canon — "in practice, purity should be
  declared, not presumed" or similar; the arch stays theory, default-concrete is
  the tool's implementation opinion, and the doc must not overreach into
  mandating it.
- **v0 output**: exit code + readable violations, each citing rule number + a
  resolvable why (error message as teaching channel — the fixing agent gets the
  why at failure point). JSON/SARIF = staged refinement, not v0.
- **`deblob explain <rule|check>` carries the why** (2026-07-17, rixo; amends
  the doc-anchor part of the output decision): repo-relative doc paths don't
  exist in consumer repos, and skill pointers assume an agent-runtime-specific
  install — both break. Instead, rustc-style (`rustc --explain E0308`): teaching
  content (doc excerpts + the relevant knowledge cards) ships inside the npm
  package, the CLI prints it. Version-matched, offline, agent-agnostic — a
  no-skill CI agent gets the card-grade crash course by running the command.
  Refined 2026-07-17 (rixo): violation lines cite the rule number only — no
  per-line pointer; one footer hint (`deblob explain <rule>`) after the summary.
  Plus batch flags on check: `--explain` appends the explanation of every rule
  that fired after the results (one run = violations + all crash courses — no
  round-trips), `--explain-only` prints only those explanations, no violation
  listing. Canonical GitHub URL lives in the explain output.
- **Command inventory** (2026-07-17, rixo): v0 = bare `deblob` (status),
  `deblob check`, `deblob explain`. Staged families, already ruled, not v0:
  `deblob docs` (staleness + wherever the SDD-enforcement rider lands),
  `deblob status` (rich inventory/ratchet, CLI↔agent hop). Rejected:
  `deblob init` (four-line typed config; generator = ceremony). Anything else
  earns its place through a future card first.
- **Docs-staleness checks** (`source:` stamp diffing) = separate command family
  (`deblob docs`), not `check` — keeps `check` pitchable to non-SDD users.
- **Parked, future hop** (after the fully-mechanical base is stable): the
  CLI↔agent split — CLI does deterministic grunt work and structured storage,
  surfaces raw/suspicious collections to the host agent, agent classifies,
  results flow back. No shaky heuristics inside the tool. `deblob status` (blob
  inventory / % in layers / ratchet-baseline mode) lives there.
- **Bare `deblob` = status + discovery** (2026-07-17, rixo): not help, not an
  implicit `check` — a project inventory plus pointers to `check` and `--help`.
  Refined twice same day (rixo): first **detectors never** (once bare runs any
  diagnosis there is no principled line short of duplicating `check`), then
  **scan only, no parsing either** — edges require parsing every file, low value
  for an inventory; path classification via the Flavor port already yields
  everything bare shows: file count, **blob %** (the flagship metric, front and
  center — `1,872 files · 78% blob`), and service count = distinct service-root
  directories (a service is a dir, never a `.service.ts` file count; path-only
  decidable; printed as plain `3 services` — "labeled" was redundant residue, a
  service is labeled by definition). Bare runs at glob speed. Always exit 0:
  informational, so the gate stays `check` and a stray bare run can never fail
  CI. Seeds the fuller `deblob status` inventory parked in the future hop below.
- **Violation ordering: by service, then file** (2026-07-17, rixo): one
  service's problems in one place (serves agents fixing a service end to end);
  the check name tags each violation line. Findings that belong to no single
  service group in their own buckets — ruled 2026-07-17 (rixo): findings on
  unlabeled files bucket under **`blob`** (flagship vocabulary — the output
  teaches the term on first contact), labeled-service cycles under
  `cross-service`.
- **CLI runner: `node:util` parseArgs + hand-rolled dispatch** (2026-07-17,
  rixo): no framework — 3 commands and a handful of flags don't earn a dep, and
  the help screens are fully bespoke by design (the fiction becomes literal
  string templates, golden-testable against `research/help-screens.md` —
  README-driven docs can't drift from the binary). Hand-rolling is agent-cheap
  now (rixo: pre-agents this would've been cac). Revisit only if the surface
  outgrows the ruled command inventory — which the future-card-first rule
  already gates. Bonus: the thinnest possible `drivers/cli/` exhibit for the
  arch's own driver-layer example.
- **Color/TTY: standard practice, no invention** (2026-07-17, rixo): TTY
  detection, `--no-color`, `NO_COLOR` honored; vitest as the reference
  implementation when a call is ambiguous.
- **Flavor behind a port** (2026-07-17, rixo — `FlavorResolver` or similar, name
  at spec time): the naming-scheme axis materializes as an interface — given a
  path (+ file info as needed), yield layer classification
  (model/ports/service/adapters/assembly/blob) and service-root discovery.
  Detectors consume the classified graph only, never raw naming conventions —
  `ports/renderer.ts` (ts-suffixes-factories) vs `renderer.port.ts` (another
  suffix scheme) is a flavor-implementation detail, invisible to every detector.
  `ts-suffixes-factories` = stock implementation; TS config pays again: a custom
  flavor is a user-supplied implementation exported from `deblob.config.ts`, no
  CLI release needed. Second internal port next to the engine-extraction port —
  the CLI dogfooding its own ports rule. Interface details at step-spec time,
  not here.
- **Engine (R1) — RULED 2026-07-17 (rixo): oxc-parser + oxc-resolver, extraction
  behind a port.** Bench + five-agent research
  (`research/engine-capability-matrix.md`): dominant on every dimension benched
  — speed (261ms/10k files), resolution fidelity (100%), per-specifier `isType`
  (rule 8's data model, native), install size — and the only surveyed engine
  that survives TS 7 (no programmatic compiler API;
  ts-morph/tsc/dependency-cruiser stranded on a 5.x pin). knip v6 = production
  precedent, same stack. The port isn't just oxc-churn insurance — it's the
  arch's own answer to the TS 7 rupture: parsing/resolution engines are
  adapters, swappable behind a stable extraction contract (2026-07-10, rixo).
  Caveats carried into step 01's spec: pre-1.0 churn (exact pin,
  `@oxc-project/types` lockstep), CJS `require()` absent from the module record
  forever (regex prefilter + AST walk).
- **`*.spec.ts` = assembly, classified by the flavor** (2026-07-20, rixo —
  "flavor is precisely intended to have opinions"): rule 16 makes
  spec-as-assembly arch canon ("test setup is assembly, same isolation rules
  apply"), so the classification lives in `ts-suffixes-factories`, not config or
  detector exemption. Specs get assembly's rights (importing services — rule 6
  stays quiet) and its obligations (`private/` still fires). Config `assembly`
  globs remain the escape hatch for exotic test naming; detector exemption
  rejected (contradicts rule 16, hides specs from rule 15's later tier). Exact
  glob set (`*.spec.ts` only vs + `*.test.ts` vs `__tests__/`) decided at the
  layers step spec.

## Closed questions

- R2 config surface: closed by the config decision above.
- R3 output: closed by the v0-output decision above.
- "What's a service" (boundary detection): answered by the arch; residual is the
  mechanical path→service mapping (nearest ancestor service root + config
  override). One real dependency: **nesting DAG edge attribution** needs the
  "nesting DAG implications" arch touch, tracked in `future/arch-pass/` — blocks
  `check dag` only.

## Step queue (provisional)

- `00_engine-research` — dissolved into 01's SPEC (2026-07-17): the ruling +
  rationale already live in the engine decision above and
  `research/engine-capability-matrix.md`; a separate record added nothing.
- `01_extraction-core` — **landed 2026-07-17**, spec:
  [01_extraction-core/SPEC.md](./01_extraction-core/SPEC.md). Summary as queued:
  package scaffold made real (`packages/deblob` is currently the
  name-reservation stub: no tsconfig, no vitest, no build — scaffold = tsconfig,
  vitest + v8 coverage wired to the 100%-through-the- public-API bar,
  exact-pinned oxc deps, CI job running `test` + `deblob check` on itself once
  it exists) + import-graph extraction: type-only tagged edges, resolution,
  `require()` prefilter walk; nodes classified through the Flavor port at graph
  build (see the flavor decision). First red-green target (testing strategy
  above). The CLI's own code dogfoods the quintet.
- `02_rule-number-resolution` — **landed 2026-07-20**, spec:
  [02_rule-number-resolution/SPEC.md](./02_rule-number-resolution/SPEC.md);
  detail dissolved there (anchors, INDEX rule-range column, shipped content +
  mapping, sync story).
- `03_check-layers` — **landed 2026-07-21**, spec:
  [03_check-layers/SPEC.md](./03_check-layers/SPEC.md); the matrix detector
  (rules 1, 4, 5, 6, 7 with 8/9), violation model's first instance, the
  spec-as-assembly flavor amendment, the three ruled arch touches (rule-4
  practice line, 6/7 enumerations gain blob, rule-5 blob→blob parenthetical).
- `04_check-private` — **opened 2026-07-21**, spec:
  [04_check-private/SPEC.md](./04_check-private/SPEC.md); rule 12 as boundary
  operation over `private` path segments (owner = nearest service root, fractal,
  outermost-violated reported), type-only imports bind (packaging rule — rule 8
  exempts composition rules only), ownerless `private/` inert, proposed rule-12
  arch parenthetical.
- Then the remaining detectors, each its own step: barrels, ports, cycles/dag —
  `dag` last if the nesting arch touch lags. Carried into the ports step
  (2026-07-21, at 03 review): a **runtime import edge from a port file is always
  a defect** — types never need runtime bindings (`typeof` works through
  `import type`), so the edge is a runtime re-export (rule 10), a side-effect
  import, or a missing `type` keyword. `check layers` stays matrix-only (fires
  ports→concrete/outward/blob, silent on ports→model/ports/pure-lib runtime);
  rule the flat import-side firing and its citation at the ports step SPEC.

README-driven UX fiction banked (2026-07-17):
[research/help-screens.md](./research/help-screens.md) (intended `--help` +
violation output),
[research/usage-walkthrough.md](./research/usage-walkthrough.md) (brownfield
adoption story), and
[research/violation-catalog.md](./research/violation-catalog.md) (every
violation type per check, illustrated + explicit non-violations — message
wording drafts, detector-SPEC behavior seeds, test-fixture shopping list), and
[research/config-options.md](./research/config-options.md) (full config surface
annotated ratified-vs-proposal; entry globs incl. framework apps — SvelteKit
multi-root; `check --filter` reporting-scope proposal — scope-vs-source,
coverage always whole-repo). Research material: grounded in the decisions above,
proposals flagged inline, contract only once absorbed by a step SPEC. Each ends
with an "Open" section — sweep those into the relevant step SPECs (notably:
monorepo/single-config tension, rule-12 × type-only, cycle double-reporting).

## Implementation strategy (settled 2026-07-17, rixo + Fable)

- Fresh session per step; this PLAN is the resume point. Skills auto-load via
  the committed symlink rig (`.claude/skills → .agents/skills → skills/`).
- Main thread owns the load-bearing work: step SPECs, the two port contracts
  (extraction, FlavorResolver), 01_extraction-core, integration, arbitration.
- Fan-out subagents for the parallel-by-design work: the fixture fleet from the
  violation catalog (~15 violations + 8 non-violations, one agent each), then
  the detectors (pure functions over the classified graph, one agent per
  detector, prompt = step SPEC + its catalog section + the relevant knowledge
  cards — cards as crash courses, per the skills-chapter GOAL).
- Fixtures land before detectors: red-first structurally — catalog → failing
  fixtures → detector turns them green.
- Review: fresh adversarial agent passes (cards in prompt) + rixo's diff gate
  per commit, unchanged.
- **Testing: real red-green TDD** (2026-07-17, rixo — project choice; the
  methodology stays tactics-agnostic, this repo doesn't). Vitest. Three tiers,
  all through the contract (the arch's own rules 15–16, dogfooded):
  1. **Extraction core** — on-disk fixture mini-repos (tsconfig paths,
     `.js`→`.ts`, mixed `{ mk, type T }` statements, `export type from`, dynamic
     import, `require()`, exports subpaths — the matrix's verified forms are the
     case list) → assert edge sets via the extraction port.
  2. **Detectors** — pure functions: constructed classified-graph values in,
     violation sets out; no IO, fast, the TDD sweet spot. Case list = the
     violation catalog, non-violations included (must-stay-green half).
  3. **CLI end-to-end** — run the binary on fixture repos; golden-file stdout
     against the help-screens/output fiction + exit codes. The README-driven
     docs become executable truth. Red-green flow: each step SPEC's Testing
     section enumerates cases → tests written failing first → implementation
     turns them green; rixo's per-commit gate is the tight supervision sdd says
     agent-TDD needs. Commits land green (standalone-commit ruling: full
     functional repo state) — red lives in the working tree, not the log.
     Coverage bar: 100% through the public API, per the arch's testing rule.

## Rule coverage (folded 2026-07-17; numbers = architecture.md rule summary)

Detector ↔ rule mapping, so v0's claim is explicit about what it does and
doesn't check:

| Rules         | Mechanical?                                        | v0                     |
| ------------- | -------------------------------------------------- | ---------------------- |
| 1, 6, 7, 8, 9 | fully — import matrix + kind (`check layers`)      | yes                    |
| 2             | fully — path shape (`check barrels`)               | yes                    |
| 12            | fully — path rule (`check private`)                | yes                    |
| 13, 14        | fully — graph (`check dag`)                        | yes                    |
| 10            | yes — port files export no runtime (`check ports`) | yes                    |
| 5             | yes, once assembly is identifiable                 | yes                    |
| 4             | partial — concrete-lib classification via config   | yes, with escape hatch |
| 3             | derived — transitive closure of the above          | maybe                  |
| 15            | partial — tests import public surface only         | later                  |
| 17            | hard — top-level mutable state heuristics          | later                  |
| 11, 16        | judgment — never (see GOAL: no-autofix boundary)   | no                     |

## Open questions

- **Dogfood target** — which production codebase, and what "clean" means there
  on day one. Structural note: blob being legal means a brownfield run isn't a
  wall of red — cycles are the only rules firing on unlabeled code;
  ratchet/inventory is parked with `deblob status` (future hop above).
- **SDD enforcement rider** — gathered into
  [future/docs-family/](./future/docs-family/) (2026-07-17): staleness seed +
  candidate list (bijection, step numbering, 5-docs/PLAN hygiene,
  explain-content sync). Ruling deferred to that item's graduation, post-v0 —
  don't drift into it from `check` work.
- Assembly identification mechanics — Rule 5 is undecidable until assembly is
  identifiable; answered as proposal in `research/config-options.md`: the
  `assembly` config key (renamed from `entry` — designation, not discovery;
  privilege per-edge, never transitive). Ratify at config step spec.
- **Type-only scope per rule family** (2026-07-17, surfaced by the exemption
  opt-out ruling): the arch reads asymmetric — the matrix "governs runtime
  imports" (type-only exempt, rule 8), rule 14 is explicitly runtime-only, but
  rule 13's service-DAG wording ("any file imports from any file") names no
  exemption — type-only cross-service edges may count for the DAG
  (extraction-independence reasoning holds for types). Confirm intended
  asymmetry at `check dag` spec time; decide whether the flavor axis touches
  only the matrix or the DAG too — possibly an arch clarification touch. Rule
  12's stance settled at the 04 spec (2026-07-21): packaging rule, binds every
  edge kind — residual here is 13 vs 14 only.

## Future

### Ideas

- **Preset/flavor classification boundary** (2026-07-21, at the 03 spec's
  `.svelte` park) — a sveltekit preset saying `.svelte = assembly` IS
  classification, i.e. flavor turf ("the preset will have flavor itself"): the
  flavor-exclusive / presets-combinable orthogonality may not survive two
  presets holding classification opinions. Renegotiate the boundary when presets
  graduate — e.g. presets contribute classification hooks the flavor arbitrates.
- **Version-pinned rule URLs** (2026-07-20) — `canonicalRuleUrl` targets
  `blob/main`; once published, a release's URLs should pin its own tag
  (`blob/vX.Y.Z`) so shipped citations survive main drift. Wire at release step:
  version from package.json, anchor-stability check per tag.
- **Vite plugin driver** — dev-time violations, second driver validating the
  extraction port → [future/vite-plugin-driver/](./future/vite-plugin-driver/) —
  blocked: mechanical base + incremental/JSON refinements first.
- **`deblob docs` family** — SDD checks gathered into one unborn home (staleness
  seed + candidate list: board↔future bijection, step numbering, explain-content
  sync, 5-docs/PLAN hygiene) → [future/docs-family/](./future/docs-family/) —
  blocked: post-v0; candidate list ruled in/out at graduation.

## Carried notes

- **Non-TS filetypes** (2026-07-11): `.jsx`/`.tsx` free (oxc parses natively).
  `.svelte`/`.vue` = per-filetype script _extractor_ in front of the parser port
  (file → script sources), Vite-transform-shaped, third-party-extensible;
  fast-follow, not v0. Original v0 stance (`.svelte` = assembly-privileged for
  layer rules) **superseded 2026-07-21** (rixo, at the 03 spec): framework-file
  classification is preset/fast-follow territory, and the eventual stance is
  open (entry-points-only privilege, possibly narrower) — v0 classifies
  `.svelte` blob like any unsuffixed file; still a node in DAG/module-cycle
  graphs. Template-level auto-imports (Nuxt etc.) = documented blind spot, not
  chased. UI-zone taxonomy + F1–F3 arch findings: see board (arch-pass +
  svench-flavor payloads, 2026-07-11).
- Config schema published so agents can author `deblob.config.ts`.
- oxc risk mitigations (exact version pin, `@oxc-project/types` lockstep,
  conditionNames/extensionAlias always set, wasm fallback reachable + Alpine
  smoke test in CI — musl is natively supported, the known failures are
  package-manager optional-deps artifacts, see matrix): fold into step 01 SPEC.
- Flavor-naming parked item on the board — largely resolved (2026-07-17, rixo):
  stock flavor ruled `ts-suffixes-factories` (see decisions; replaces
  provisional `prime`). Strong candidate to also become the guide's ratified
  title (it mirrors the GOAL's "TypeScript/ESM factory-injection" phrasing);
  blessing the guide title is the residual board ruling — cheap now.
