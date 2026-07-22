# Step 09 — cli-runner

The package becomes runnable. Everything the runner needs already exists — four
detectors, the shared extraction, resolved config (08), shipped explain content
(02); this step wires them behind the ruled command surface and makes the banked
UX fiction executable truth. Contract sources: the chapter PLAN's ratified
decisions (command inventory, bare = status + discovery, v0 output, explain
machinery, parseArgs + hand-rolled dispatch, color/TTY, violation ordering) +
[research/help-screens.md](../research/help-screens.md) (the fiction this step
turns into golden files) +
[research/violation-catalog.md](../research/violation-catalog.md) (message
wording drafts). `check dag` stays queued last (nesting arch touch still open);
the runner ships without it.

## Goal

`npx deblob` works. Three commands on stock Node, no build step for the consumer
beyond the published `dist`:

- `deblob` — status + discovery: provenance line, `N files · X% blob`,
  `M services`, pointers. Scan speed, exit 0 always.
- `deblob check [what...]` — the gate: shared graph, all (or named) detectors,
  violations grouped by service then file, rule numbers cited, one footer hint
  to `explain`. Exit 1 on findings, 0 clean.
- `deblob explain <topic>` — the teaching channel: rule summary excerpt +
  shipped knowledge card(s) + canonical URL, offline, version-matched.

Success looks like:

- The help screens, bare output, violation listing, and explain output are
  golden-tested — the README-driven fiction can no longer drift from the binary.
- CI runs `deblob check` on the repo itself and it gates green — the 01 scaffold
  promise ("once it exists") lands.
- A no-config first-contact repo gets a true answer from both `deblob` and
  `deblob check` (08's zero-config resolution, now reachable).
- The fixing agent's loop closes: `check` fails → footer names the rules →
  `explain` (or `check --explain` in one run) delivers the card-grade why.

Out of scope, explicitly: `check dag` (last step), `--json`/`--sarif` (staged
refinement), `--filter`/`--from` (stays banked proposal; exit-code semantics
already sketched in config-options.md for when it graduates), `--quiet`
(rejected — full output always, the log is the teaching channel; the
usage-walkthrough lean, ratified here), `deblob docs`/`deblob status` families,
presets, `deblob init` (rejected in PLAN).

## API

### Settled proposals (ratify at review)

- **Exit codes ratified as the fiction proposes**: `0` clean, `1` violations
  found, `2` usage or config error. CI must distinguish "arch broken" from "tool
  misconfigured"; every `ConfigError` and every usage error (unknown command,
  unknown check, unknown explain topic, bad flag) is a `2` with a teaching
  message on stderr. Violations never ride stderr; they are the product, on
  stdout.
- **Check names v0: `layers`, `private`, `barrels`, `ports`** — `dag` absent
  from help, goldens, and the dispatch table until its step lands (docs that
  can't drift means help lists only what runs; `deblob check dag` today is a
  usage error naming the known set, exit 2). The fiction's help screens are
  amended accordingly when goldens land; the dag lines return with the dag step.
- **`-c, --config <path>` kept** (fiction line, ratified): explicit config file,
  discovery walk skipped, path missing or unloadable = exit 2 teaching error.
  Standard practice (eslint/vitest precedent), and the flag can only point at a
  config — it changes which commitment governs, never loosens one. `loadConfig`
  grows an optional `configPath` input; everything after the load is identical.
- **Bare `deblob` stays exit 0 absolutely** — including under a broken config:
  the teaching error prints to stderr, the status lines that need the config are
  skipped, exit stays 0. The ruled contract is "a stray bare run can never fail
  CI", and a rationale-derived exception ("but surely a config error…") is
  exactly the kind of hole the absolutism exists to close. The gate is `check`,
  which fails loud on the same config.
- **Blob % is size-based, wired here** (metric ruled 2026-07-21, PLAN Future →
  lands with the bare command): blob-classified bytes over total covered bytes,
  integer percent, sizes via `stat` on the coverage set — no content reads, bare
  stays scan-speed. Service count = distinct non-null `serviceRoot` values from
  the flavor classification. Provenance line = version + config path relative to
  cwd (or `no config (defaults)`) + flavor name. The headline carries the total
  covered size (`38 files · 215kb · 0% blob` — ruled at review, 2026-07-22):
  showing the mass makes the percent visibly size-computed, not a file count.
- **Explain topics: `rule-N`, bare `N`, and check names.** The check footer says
  `deblob explain <rule> (4, 12)` — so `deblob explain 4` must work; `rule-4` is
  the canonical spelling both accept. A check name resolves to the rules that
  check cites (a new model constant `CHECK_RULES`, the detector↔rule map from
  the PLAN coverage table made code: `layers: 1, 4–9`, `private: 12`,
  `barrels: 2`, `ports: 10`) and prints each rule's explanation. Output per
  rule: the rule's line(s) from the shipped `rules-summary.md` excerpt as
  heading matter, the mapped card(s) verbatim (`RULE_CARDS`), the canonical URL.
  Unknown topic = exit 2 naming the valid forms.
- **`check --explain` / `--explain-only` as ruled**: `--explain` appends the
  explanation of every distinct rule that fired, after the results;
  `--explain-only` prints only those explanations. Both flags on a clean run
  print nothing extra (no rules fired). Explanations deduplicate — a rule cited
  by ten violations explains once.
- **Violation rendering: the fiction's shape, deterministic order.** Grouped
  service → file → violation lines, check name tagging each line, `blob` bucket
  for `serviceRoot: null` findings (`cross-service` arrives with dag). Order:
  service roots ascending (`blob` bucket last), files ascending within, within a
  file by check name then rendered message — full determinism so goldens and CI
  diffs are stable. Message wording per violation shape from the
  violation-catalog drafts; every line = offending edge + rule citation
  `(rule N)` / `(rules N, M)`; no per-line doc pointers (ruled). Summary line
  `N violations (a layers, b private, …) · F files · E edges` — the stats
  trailer ratified (cheap trust signal, fiction proposal); timing still omitted.
  Footer: `why: deblob explain <rule> (…) · or rerun with --explain`. A clean
  run prints the summary line only (`0 violations · F files · E edges`), exit 0
  — silence would leave "did it even run" open, one line answers it.
- **Runner stays assembly — no runner service, question closed as 08 left it**:
  `main` is the composition root calling adapters (load → scan → extract →
  detect → render → write) and the sequence needs no test seam beyond function
  extraction, because `main` itself is testable: it takes
  `{ argv, cwd, stdout, stderr, env }` and returns the exit code (the exported
  function is literally `main`). The bin shim (`process.argv`/`process.exitCode`
  glue) is the only line untestable in-process, covered by the e2e tier instead.
  This is the "thinnest possible `drivers/cli/` exhibit" the PLAN wants.
- **Color: minimal, standard, golden-safe.** TTY detection + `--no-color` +
  `NO_COLOR`/`FORCE_COLOR` honored, vitest the reference when ambiguous. Styling
  is a thin palette injected into the pure renderers (identity functions when
  disabled); goldens run color-disabled so escape codes never enter them. Exact
  styling (what's bold, what's dim) is implementation freedom within the
  fiction's plain-text layout.
- **`--version` reads package.json** at runtime (import attribute against the
  packaged file — one source of truth, no stamp step).

### Shapes

Pure model (`src/lib/cli/` — rendering and dispatch data are logic, not IO):

- `render.model.ts` — `renderViolations(violations, graphStats, colors)`,
  `renderBareStatus(…)`, `renderExplain(…)`, plus the help-screen literal
  templates (`HELP`, `CHECK_HELP`) — the fiction as string constants,
  golden-tested end to end.
- `cli.model.ts` — `parseCli(argv)` (parseArgs config + dispatch decision:
  command, check names, flags — pure; usage errors as values), `CHECK_RULES`,
  the known-checks set.

Adapters:

- `content.adapter.ts` (explain) — reads the packaged `content/` files
  (rules-summary excerpt, cards) for the explain renderers.
- `stat` sizing for blob % — inside the existing scan adapter or alongside it
  (implementation detail; the model receives `{ path, size }` values).

Driver/assembly:

- `src/drivers/cli/main.ts` —
  `main({ argv, cwd, stdout, stderr, env }) → Promise<number>`: wires config
  load, coverage scan, `extractGraph`, the four detectors, renderers, exit code.
  Assembly-designated in the dogfood config.
- `src/drivers/cli/bin.ts` — the shim; `package.json` gains
  `"bin": { "deblob": "./dist/drivers/cli/bin.js" }`.

Public `exports`/index: unchanged — the CLI is a bin, not a library surface.

## Testing

Tier 2 (pure renderers + parse) and tier 3 (e2e, first instance) — the e2e tier
the strategy has been waiting on. Red first; commits land green.

Model cases:

- `parseCli`: each command form from the fiction; unknown command / unknown
  check / unknown flag / unknown explain topic → usage-error values naming the
  valid set; flag combinations (`--explain` + `--explain-only` together = usage
  error — contradictory).
- Renderers: constructed violation values from every detector's shape → exact
  fiction lines; grouping and ordering pinned (two services + blob bucket,
  interleaved input order, deterministic output); summary-line counts per check;
  clean-run single line; footer lists distinct fired rules ascending.
- `CHECK_RULES` consistency: every rule a v0 detector can cite appears under its
  check (cross-checked against the violation model's possible citations), all
  rules within `1–RULE_COUNT`.
- Explain rendering: `rule-4`, `4`, and a check name resolve to the same
  machinery; per-rule output = summary matter + card(s) + URL; a multi-rule
  check deduplicates shared cards.
- Bare status: blob % arithmetic (size-weighted, integer), service count,
  provenance variants (config found / `no config (defaults)` / broken config →
  stderr message, lines skipped).

E2e cases (run `main` in-process for coverage; the built bin smoke-tested once
via child process for the shim + exit-code plumbing):

- Golden stdout: `--help`, `check --help`, bare on a fixture repo, `check` on a
  violating fixture repo (one violation per detector — the catalog's fixtures
  reused or extended), `check` clean, `check layers` (subset), `check --explain`
  / `--explain-only`, `explain rule-4`, `--version`.
- Exit codes: clean 0, violations 1, unknown check 2, broken config 2 on
  `check`, broken config 0 on bare.
- Dogfood: CI job gains `deblob check` on this repo (root workflow), green.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract (now including `main`; the bin shim is the ruled
e2e-only exception, excluded from the instrumented set with a comment saying
why).

## Implementation

- Placement: `src/lib/cli/render.model.ts` + `cli.model.ts` (+ specs),
  `src/lib/explain/adapters/content.adapter.ts` (+ spec),
  `src/drivers/cli/main.ts` + `bin.ts`. The dogfood `deblob.config.ts` gains
  `assembly: ["src/drivers/**"]` — the config's first real assembly designation,
  exercised by the self-check.
- parseArgs (`node:util`) with `strict: true`, `allowPositionals`; two-level
  dispatch by hand — the PLAN ruling, no framework dep.
- Help templates live in the model as literals; the fiction file's screens are
  updated to match what ships (dag lines out) in the same commit — research
  annotations flip, per house pattern.
- Explain content path resolution: relative to the module
  (`import.meta.url`-anchored), so the packaged layout and the repo layout both
  resolve (02's `content/` mirror is already built for this).
- Color plumbing: a `Colors` record of string-transform functions; the disabled
  palette is identities. No color dep unless implementation finds a real need
  (lean: hand-rolled SGR, three styles max).

### Landed deltas — the first self-check earned its keep

The dogfood run (`deblob check` on this package) fired twice on real defects,
both fixed before landing:

- **Layers detector ignored `pureLibs` for builtin specifiers.** The ratified
  contract (08) says `pureLibs` takes "package names and builtin specifiers",
  but `classifyExternal` short-circuited every `node:` specifier to the curated
  baseline only — `pureLibs: ["node:util"]` had no effect. Fixed: a declared
  builtin is pure; undeclared builtins stay default-concrete (enumerable, never
  "unclassified"). The dogfood config declares `node:util` (parseArgs) and
  `picomatch` — the escape hatch exercised for real.
- **08's `config.model.ts` imported the flavor port — rule 1, our own
  violation.** `ResolvedConfig` holds a live `FlavorResolver`; a model file may
  not know a port shape, and the matrix said so the first time it could see us.
  Resolution split out as `config.service.ts` (service may import ports;
  `.service.ts` stays assembly-only importable — main and the specs, both
  assembly, are its only importers; adapters reach its types type-only, rule-8
  exempt). `loadConfig` dissolved with it: the loader adapter now exposes
  `discoverConfig` / `explicitConfigPath` / `importConfigDefault`, and
  **assembly (main) owns the load → resolve sequence** — arch §Assembly ("read
  config, instantiate adapters, wire them"), now literal in our own code. The 08
  spec's "config-as-data, the port question reopens at the runner step only if
  needed" resolved itself the other way: not a port, a service.
- Minor: the `contentRoot` test seam on `main` proved unnecessary — the content
  root anchors at the package root (`../../../dist/content` from the module),
  the same hop compiled and source-run; tests build `dist/content` first, like
  prepack does. `ResolvedConfig` also grew `flavorName` (bare's provenance line
  needed it).

## Docs

- `packages/deblob/README.md`: the real one lands — install, the three commands,
  config authoring prose (`defineConfig` + the six keys — the prose half
  promised at 08), the no-autofix boundary stated. Source of truth for wording:
  the fiction files, now goldens.
- `research/help-screens.md`: annotations flip — proposals ratified here (exit
  codes, stats trailer, no-autofix footer), dag lines marked as landing with the
  dag step.
- Chapter PLAN: step queue gains 09; command-inventory bullet gains the SPEC
  pointer; the blob-% Future idea and the "config schema published" prose
  residual close.
- `docs/architecture.md`: untouched — runner is tool surface.
