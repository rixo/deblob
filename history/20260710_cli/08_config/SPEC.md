# Step 08 — config

First non-detector step since extraction. Sequencing: `check dag` stays queued
last while the nesting arch touch lags (chapter PLAN, step queue); config is the
next unblocked block, and the CLI-runner step needs every value it produces.
Contract source: the ratified config decisions (chapter PLAN) +
[research/config-options.md](../research/config-options.md) — this SPEC absorbs
its ratified keys and rules on its open items; the research file's annotations
flip when this step lands.

## Goal

Given a working directory, deblob resolves its configuration into exactly the
values the existing core consumes — a coverage file set for `extractGraph`, a
`FlavorResolver`, an assembly designation matcher, `pureLibs` and
`typeOnlyExempt` for the detectors — with the config file optional, TS-first,
loaded natively, and validated loudly. Pure model + thin adapters; no CLI
surface, no rendering, no exit codes.

Success looks like:

- The four ratified-core lines of `deblob.config.ts` load on stock Node — no
  loader dependency, no build step, no config compilation.
- No config file at all still resolves: stock flavor, default coverage, empty
  knobs — the ratified zero-config aim, so a bare `npx deblob check` has
  something true to say on a first contact repo.
- A typo'd key fails loud with a teaching message naming the key and the valid
  set — never silently ignored (same safe-default polarity as rule-4
  default-concrete: a silent hole beats a one-line fix never).
- A custom `FlavorResolver` implementation exported from the config slots in
  with no CLI release — the "TS config pays again" promise made mechanical.
- The coverage scan turns `include`/`exclude` into the graph's file set under
  the ratified full-scan model: every covered file a node, orphans included,
  generated trees never entering.

Out of scope, explicitly: CLI surface and rendering, `--filter`/`--from`
(reporting flags — CLI step), presets (name reserved, future), the `pureLibs`
granular `{ import, from }` form (stays banked proposal, deferral ruled free),
`check dag`.

## API

### Settled proposals (ratify at review)

- **The v0 key set is closed**: `flavor`, `assembly`, `include`, `exclude`,
  `pureLibs`, `typeOnlyExempt` — all optional, defaults below. `defineConfig`
  ratified as proposed: identity function, typing channel only, zero runtime.
  The exported `DeblobConfig` type is the published config schema — the PLAN's
  "config schema published so agents can author `deblob.config.ts`" idea lands
  here as types (prose docs ride the CLI step with the runnable surface).
  Unknown keys are a hard error listing the valid set; wrong-typed values are a
  hard error naming the key and expected shape. Config failures are
  `ConfigError` values with teaching messages — never violations, never
  warnings.
- **Loading: native `import()`, no loader dependency** — the package declares
  `engines.node >= 22.18` (type stripping on by default from there; we develop
  on 24). Erasable-syntax-only is Node's constraint on `.ts` configs — a config
  has no business containing an `enum`, and the loader wraps Node's
  `ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX` in a teaching message for the repo that
  tries. File search order per directory: `deblob.config.ts`,
  `deblob.config.js`, `deblob.config.mjs`; more than one present is a hard
  error, not a precedence rule (intolerant of ambiguity, same register as
  intolerant of pretending). A default export is required; its absence is a
  teaching error.
- **Discovery: nearest wins, upward walk, no merge** — from cwd toward the
  filesystem root, first directory containing a config file wins and becomes the
  project root (graph root; all globs resolve against it). No config found:
  every default applies and the root is cwd, `configPath: null` — the loader
  reports provenance so the runner step can surface which config (or none)
  governed a run. This is placement freedom (root or per package, ratified) with
  the no-inheritance ban intact: the walk finds one config, never stacks two.
- **Default coverage: `include: ["**"]`** — proposed at this spec, superseding
  the research example's `src/**` lean. Same polarity argument as rule 4:
  under-coverage is a silent hole (source outside `src/` invisibly ungoverned, a
  repo green by omission), over-coverage is visible noise at worst — and blob
  being legal makes the noise cheap (stray scripts classify blob, which is
  true). `src/**` remains the typical first tightening, shown in examples.
  Coverage is additionally gated to the extensions the graph can meaningfully
  node — `.ts .tsx .mts .cts .js .jsx .mjs .cjs .svelte .vue` (the last two as
  `parsed: false` nodes, per the carried non-TS-filetypes note) — a constant,
  not a config key; presets are the future home of extending it. Hidden paths
  (dot-segments) never enter coverage — the globber's default, kept and stated:
  generated trees are overwhelmingly dot-dirs, and source under one is a shape
  we don't chase in v0.
- **Exclude baseline, non-removable**: `node_modules`, `.git`, `dist`, `build`,
  `coverage`, `.svelte-kit`, `.next`, `.nuxt` (dot-dir members already dead via
  the hidden rule; listed for explicitness) — user `exclude` appends to the
  baseline, never replaces it (knobs tighten, never loosen: re-including
  `node_modules` in the graph is not a flavor). The baseline is a measured list,
  honestly open: a generator not on it enters coverage until excluded by hand —
  presets are the eventual fix, one `exclude` line the interim one.
- **tsconfig interplay: independent** — deblob coverage never mirrors tsconfig
  `include`/`files`: they answer "what does tsc compile", coverage answers "what
  does the commitment govern", and the two drift legitimately (tests, scripts,
  fixtures). tsconfig still feeds resolution — `paths` aliases via oxc-resolver
  — which is its only role in the pipeline.
- **`assembly` ratified — the name and the mechanism**: designation, not
  discovery; globs matched against root-relative POSIX paths; matches OR onto
  the flavor's classification through the existing `isAssembly` hook on
  `extractGraph` — no new mechanism, this step just feeds the hook from config.
  Per-edge privilege semantics unchanged (ratified in the research file,
  restated here as contract: designation grants a file its matrix row as
  importer; it grants its imports nothing). **Default: `[]` — no designation,
  the flavor's word final** (proposed at this spec). Designation is a privilege
  grant, so any default glob (`src/main.ts`) would loosen by default — the one
  direction knobs never take. Consequence owned: on a zero-config repo the entry
  point classifies blob and its service imports fire rule 6 (blob binds as
  importer, the 03 ruling); the remedy is one config line, and the finding is
  true — an undeclared composition root IS unruled code. Privilege is declared,
  not presumed — the rule-4 polarity, third instance. Only test naming earns
  assembly configless (rule 16, via the flavor).
- **`typeOnlyExempt` precedence**: the flavor carries the default —
  `FlavorResolver` grows an optional readonly `typeOnlyExempt?: boolean` (absent
  = `true`; the type-only stance is a flavor axis by the ratified decision, so
  the interface is where it lives); the config key overrides either way. The
  floor is canon: canon's letter is exempt-by-default (rule 8), so a config
  returning a strict flavor's repo to `true` lands on canon, never below it —
  the tighten-only rule is not violated by the override.
- **`pureLibs` v0: `readonly string[]`, package names and builtin specifiers**,
  passed through to `checkLayers` untouched. The granular `{ import, from }`
  form stays a banked proposal (deferral ruled free — string entries valid
  forever). The `packageNameOf` subpath collapse (`lodash/fp` blessed by
  `"lodash"`) stays an open hole, carried, graduating on first dogfood hit.
- **Monorepo residuals ruled**: a cross-package workspace import is an external
  leaf in the importing package's run, classified via `pureLibs` like any
  package — no sibling-deblob-project special treatment in v0 (a distinct
  treatment needs evidence a real workspace demands it). Workspace-root
  ergonomics (one invocation running N package configs) → chapter board,
  post-v0.
- **Config crosses the boundary as data — no config port**: the arch's own
  §Assembly says it literally ("someone has to: read config, instantiate
  adapters, wire them"). The loader and the coverage scanner are adapters the
  assembly (CLI main, next step) calls; the core consumes `ResolvedConfig` and
  the file list as plain values. The port question reopens at the CLI-runner
  step only if a runner service materializes that must own the load→scan
  sequence behind test seams — not preempted here.
- **Dependencies: `tinyglobby` (scan) + `picomatch` (designation matching)** —
  one glob dialect for both jobs (tinyglobby is picomatch-based). Node's native
  `fs.glob` / `path.matchesGlob` rejected while experimental: glob semantics are
  load-bearing for a coverage commitment, and the two natives don't guarantee a
  shared dialect. Caret ranges — stable, boring libs; the exact-pin treatment
  stays an oxc-churn measure, not house style.
- **Public surface starts here**: the package gains an `exports` map and an
  index exporting `defineConfig` + the authoring types (`DeblobConfig`,
  `FlavorResolver`, `FlavorClassification`, `FlavorLayer`). Curate the exact
  list at review — the index is the 100%-coverage contract boundary, so it grows
  deliberately.

### Shapes

`config.model.ts` (pure):

- `DeblobConfig` — the six optional keys; `flavor: string | FlavorResolver`.
- `defineConfig(config: DeblobConfig): DeblobConfig` — identity.
- `resolveConfig(raw, { root, configPath, flavors }) → ResolvedConfig` —
  validation (unknown keys, shapes, flavor name against the injected registry,
  duck-check of a custom resolver's `classify`), defaults, flavor instantiation,
  `typeOnlyExempt` precedence. Throws `ConfigError` with teaching messages.
  `flavors: FlavorRegistry` is assembly-injected — see Implementation.
- `ResolvedConfig` — `root`, `configPath: string | null`,
  `flavor: FlavorResolver`, `isAssembly: (path: string) => boolean`,
  `include`/`exclude` (readonly string[], baseline merged),
  `pureLibs: readonly string[]`, `typeOnlyExempt: boolean`.

Adapters:

- `loadConfig({ cwd, flavors }) → Promise<ResolvedConfig>` — discovery walk +
  native import + default-export check; hands the raw default export to
  `resolveConfig` (root = the config's directory, or cwd configless) and returns
  its output. `discoverConfig(cwd)` exported alongside — the walk alone, for the
  bare command's provenance line.
- `scanCoverage(resolved) → readonly string[]` — tinyglobby walk from `root`
  honoring include/exclude/extension gate; root-relative POSIX paths, sorted —
  `extractGraph`'s `files` input, ready.

## Testing

Tier 2 (pure model) + tier 1 (on-disk fixture mini-repos for discovery, loading,
and scanning). Red first; commits land green.

Model cases:

- Empty config and absent config resolve to every default; the resolved values
  are the documented defaults, pinned.
- Unknown key rejected with the valid set in the message — tripwire form: a key
  that never existed (`SOME_MADE_UP_KEY`) fires the same path as a plausible
  typo (`pureLib`), because the operation is "not in the schema", not a typo
  list.
- Wrong-typed values rejected per key (string where array expected, etc.).
- `flavor: "ts-suffixes-factories"` → stock instance; unknown flavor name →
  teaching error naming known flavors; custom object with `classify` → used
  as-is; object without `classify` → teaching error.
- `typeOnlyExempt` precedence matrix: flavor absent-field/true/false × key
  unset/true/false → documented winner each cell.
- `assembly` matcher: `+*` extensionless route files match, directory globs
  match descendants, non-matches stay non-matches, paths matched root-relative.
- `exclude` appends: user list present → baseline entries still excluded.

Loader cases (fixture repos):

- Config in cwd; config in an ancestor found from a nested cwd; config in both →
  nearest wins, ancestor untouched (no merge).
- `.ts` config imports `defineConfig` and loads natively; `.js` and `.mjs` forms
  load; two config files in one directory → hard error.
- Missing default export → teaching error; erasable-syntax violation in a `.ts`
  config → wrapped teaching error.
- No config anywhere up the walk → defaults, `root = cwd`, `configPath: null`.
- Custom flavor exported from config classifies a file (end-to-end through
  `resolveConfig`).

Scan cases (fixture tree):

- Coverage set matches include ∩ extension gate minus excludes; `node_modules`
  and `dist` content absent with no user config; user exclude removes more;
  `.svelte` present, non-source extensions absent; dot-dir source absent (hidden
  rule pinned); output root-relative POSIX, sorted.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Placement: `src/lib/config/config.model.ts` (+ spec) — types, defaults,
  constants (extension gate, exclude baseline), `resolveConfig`, `ConfigError`;
  `src/lib/config/adapters/loader.adapter.ts` and `scan.adapter.ts` (+ specs).
  `FlavorResolver.typeOnlyExempt` lands in `flavor.port.ts`.
- **The stock registry is injected, not owned by the model** (found at
  implementation — the matrix forced it): a flavor is an adapter, and neither
  the model nor another adapter may import one, so `resolveConfig` takes a
  `FlavorRegistry` (name → factory) and only assembly — the CLI main next step,
  test setup today — wires the real one. `STOCK_FLAVORS` exports from the flavor
  adapter file (one entry; a second stock flavor gets its own adapter file and
  the map moves to whoever may import them both); `STOCK_FLAVOR_NAME` stays
  model vocabulary so the default and its wiring-bug error are pure. The tool's
  own rules shaped its API — the dogfood paying rent.
- `configImportErrorMessage` is a pure model function (loader's catch stays a
  one-liner): the Node erasable-syntax branch is testable with a constructed
  error value, where the adapter path can't reach it under vitest's transform
  (esbuild strips an `enum` that native Node rejects). The adapter's catch
  itself is covered by an evaluation-throw fixture.
- Package: `exports` map + `src/index.ts` (assembly-designated once the dogfood
  config lands — an entry index is the packaging boundary, legal by designation
  per 05) + `src/index.spec.ts`; `engines.node: ">=22.18"`; `tinyglobby` +
  `picomatch` dependencies (caret).
- Fixture repos under `src/lib/config/__fixtures__/` (loader walk / ambiguity /
  error cases, scan tree), same pattern as extraction's; the configless case
  uses a temp dir — a fixture directory can't guarantee no ancestor config
  forever.

## Docs

- `research/config-options.md`: annotations flip on landing — `assembly`,
  `defineConfig`, defaults ratified with their values; the Open section's swept
  items point here.
- Chapter PLAN: step queue gains 08; the config decision bullet gains the SPEC
  pointer; the "Config schema published" idea notes the types half landed here;
  the assembly-identification open question dissolves.
- `packages/deblob/README.md`: untouched — `defineConfig` exports, but the
  documented story lands with the runnable surface (CLI step); publishing config
  prose for a binary that can't run yet invites use we can't honor.
- `docs/architecture.md`: untouched — config is tool surface, not arch.
