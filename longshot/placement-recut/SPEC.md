# Placement recut — the check chain wired once

Longshot's take on driver-layer's `09_placement-debt-recut` (chapter PLAN):
placement-debt steps 02, 04, 05 re-cut. Written before the code, 2026-09-30; §
Implementation is the running record — each decision with its reason, for
whoever integrates longshot.

## Why

The chain every run needs — load the config, scan coverage, extract the graph,
run the checks — is wired three times: in the CLI's front service, in the shared
app assembly (`extractionFor`, the load sequence), and in the corpus runner's
assembly (`cases.assembly.ts`). The copies have already drifted: only the corpus
passes `configLoads` to extraction, so `deblob check` silently ignores a user's
`configLoads` key while the corpus rows honour it — the gate proves a behaviour
the product does not have. This holds on driver-layer too (its
`drivers/cli/main.ts` never passes it). Duplicated wiring is how a product and
its proof come apart; that is the bug class this step removes.

The copies live in assemblies because the extraction service takes
config-derived parts at construction (flavor, readers, a resolver built for the
tsconfig and aliases): every config needs a fresh chain, and building one per
config is logic, not assembly. The self-check says so ~50 times
(`assembly-builds-only`), and its advice — "the adapter owns it" — is the design
this step takes. The corpus assembly's own header already named the way out
("until the run service … is the port's proper adapter", 04 SPEC decision 5,
"laundering-adjacent on purpose, 09 removes the duplicate").

Order: this runs before the T1+T5 dossier (talked 2026-09-30) because the
dossier judges test bodies, and the corpus specs' shape follows from the runner
they drive — judging them before the recut judges snippets about to change.

## Goal

The chain exists once, as use cases in the units that own each step, built once
by assembly and called with the config as data:

- Loading a config is the config unit's use case (discover, exact root, named
  file), over a port the loader adapter implements.
- The extraction service is built once; what depends on the config arrives per
  call (the config itself), and what needs its own instance per config (a
  resolver for a tsconfig and aliases, the package-claims reader for a root) is
  built by an adapter behind a factory port.
- Judging a project — scan, extract, check — is one use case in `lib/check`,
  called by the CLI, the corpus runner and (as far as it fits) the snapshot.
- Assemblies only instantiate and pass whole: no load sequence, no per-config
  closure, no bag of functions read off built instances.

Not in scope: L3/L4 (talk-through items), the server composition (L5), the spec
roots and test bodies (T1/T5 — after the dossier).

## API

Contracts committed to, by unit. Names are proposals; the shapes are the
commitment.

- `config`:
  - `ports/config-files.port.ts` — `ConfigFiles`: `discoverConfig(dir)`,
    `configAt(root)`, `explicitConfigPath(cwd, path)` →
    `{ root, configPath, localPath }` (or `null`), and
    `importConfigDefault(path)`. Implemented by `loader.adapter.ts`, which also
    implements `ports/manifest.port.ts` — `Manifest`: `readPackageName`,
    `readPackageSurface`.
  - `ports/coverage.port.ts` — `Coverage`: `scanCoverage(config)`,
    `scanCoverageDirs(config)`, `statSizes(root, files)`. Implemented by
    `scan.adapter.ts`.
  - `config.service.ts` gains `createConfigService({ files, flavors, readers })`
    → `loadConfig(dir)`, `loadConfigAt(root)`, `loadConfigNamed(cwd, path)`,
    `resolve(raw, root)` (a config given as a value — the corpus rows). The pure
    `resolveConfig`/`overlayLocalConfig` stay as they are.
  - `PackageSurface` moves to `config.model.ts` (see the record).
- `extraction`:
  - `ports/resolver.port.ts` gains `Resolvers`:
    `resolverFor({ root, tsconfig, alias })` → `Promise<Resolver>` — the
    tsconfig's existence is the adapter's fs fact (moved from the loader), a
    declared one missing is an `ExtractionError` (`tsconfig-missing`).
  - `ports/package-claims.port.ts` — `PackageClaims`:
    `readerFor({ resolve, anchor })` → `{ layerOf(specifier) }`. Implemented by
    `package-meta.adapter.ts` (`createPackageClaims`).
  - `createExtraction({ engine, resolvers, packageClaims? })`;
    `extractGraph({ config, files })`, `config` an `ExtractionConfig` (a
    structural type the resolved config satisfies: root, flavor, readers,
    designations, external, externalLayers, pure, configLoads, tsconfig, alias).
  - `classifyStockEntry` and the suffix table move to `stock-flavor.model.ts`:
    pure naming knowledge, needed by `check` where an adapter file cannot be
    imported. `STOCK_FLAVORS` becomes `createStockFlavors()`.
- `check`: `check.service.ts` —
  `createJudge({ coverage, manifest, extraction })` → `judge(config, checks)` →
  `{ files, graph, surface, surfaceReport, violations }`. `surface` is the
  manifest claim (read once, reported with the run).
- Consumers: the CLI's front service takes `config`, `judge`, `coverage`,
  `manifest` (the `Project` port dissolves); the corpus runner takes `config`,
  `judge` and `root` instead of the `Check` port's assembly implementation; the
  snapshot service takes `config`, `coverage`, `manifest`, `readmes`, `clock`,
  `judge` instead of `ProjectSource` + `extractionFor`.
- `app.assembly.ts` exports builders, each returning one instance (no bag to
  read fields off).

## Testing

- The gate is unchanged in content: every corpus row, the CLI goldens, the
  snapshot and serve specs pass as they are. The recut moves wiring, not
  verdicts; a golden that changes is a finding to explain, not to update.
- The drift bug gets its proof at the product level: a CLI test where a
  `configLoads` declaration changes `deblob check`'s verdict (red before the
  recut, green after).
- Unit specs follow their code (extraction's call sites, the config service's
  new use cases, the judge). Coverage 100 holds.
- The self-check: every `assembly-builds-only` the recut targets gone, or its
  remaining reason written here.

## Implementation

Planned order, each phase green before the next:

1. Config: the two ports, the load use cases, `resolve(raw, root)`.
2. Extraction built once: resolvers and package-claims factories, the per-call
   config; tsconfig lookup moved into the resolvers adapter.
3. The judge; the CLI, the corpus runner and the snapshot on it; the builders.
4. Notes: this section, GUESSES, DELTA; the self-check count.

Record (decisions as they are taken, with their reason):

- **Red first on the drift.** `apps/cli/__fixtures__/config-loads` and its CLI
  test: an assembly awaiting a declared load. Before the recut `deblob check`
  said "declare it in configLoads" on a project that had — reproduced, then
  green by construction once the CLI ran the judge. Integrator: the chasing
  branch has the bug; this fixture and test carry over as its proof.
- **Loading is the config unit's use case** (`createConfigService`), not
  assembly's: the sequence (find, import, overlay, resolve, defaults) is logic,
  and three callers had three copies. `resolve(raw, root)` joined it for the
  corpus rows, a config with no file behind it.
- **`PackageSurface` lives in `config.model.ts`.** First put in the manifest
  port, it made `check`'s surface model import a port (`inward-deps`, rightly);
  in `check` it made a type-only cycle `check` ⇄ `config` (the manifest is the
  config unit's). The manifest's claim is config's data, a model.
- **The extraction service is built once;** the config arrives per call
  (`ExtractionConfig`, a structural slice the resolved config satisfies — no
  type import from config, which already imports extraction's types). What needs
  its own instance per config comes from factory ports: `Resolvers` (tsconfig +
  aliases) and `PackageClaims` (anchored at the root). That is the self-check's
  own advice, "the adapter owns it".
- **The tsconfig lookup moved from the loader to the resolvers adapter**
  (`createTsconfigLocator`): it is resolution's fs fact, and keeping both made
  the duplicate this step exists to remove. A declared-but-missing tsconfig is
  now an `ExtractionError` (`tsconfig-missing`), not a `ConfigError`: a
  `ConfigError` thrown from extraction's adapter made extraction import config,
  a cycle; `load-file-not-covered` is the precedent (a config mistake raised
  where extraction needs it). The CLI presents both the same (message, exit 2).
- **`classifyStockEntry` and the suffix table moved to
  `stock-flavor.model.ts`:** pure naming knowledge that `check` and the package
  claims need, and neither may import an adapter.
- **The judge reads the manifest only when `surface` runs.** Behaviour change:
  `deblob check layers` on a package with a malformed `deblob` field exited 2
  before, now judges layers. A claim nobody asked to check should not fail a
  run; the bare status still reports a malformed field on stderr.
- **`ProjectSource` dissolved.** One bag answering five questions (config,
  coverage, sizes, manifest name, READMEs, clock) — only an assembly reading
  five instances' fields could fill it. The snapshot service takes each by its
  port; in tests one memory object stands behind all of them (ports are
  structural). New ports: `ReadmeTexts`, `Clock` (+ `createSystemClock`).
- **The corpus runner runs the product's judge.** The `Check` port and its
  assembly implementation are gone: `createRunner({ config, judge, root })`
  resolves the row's config and judges, and the "case does not resolve" guard
  moved from the assembly into the runner service (it is the runner's rule). The
  corpus's reader fill (`node`, `hostDriver`) stays in the assembly, as an
  object literal of factory calls — still NOT THE PATTERN (T4).
- **Builders in `app.assembly.ts`:** `createConfigAssembly(fs)`,
  `createJudgeAssembly(fs)`, `createSnapshotsAssembly(fs)`, each building and
  returning one instance — an app's assembly calls the ones it needs, nothing
  read off a bag.
- **`STOCK_FLAVORS` became `createStockFlavors()`:** an assembly hands on what
  it builds; an imported constant of factory functions read as "a function
  handed". **`createMemoryFs(files, { root })`:** the corpus's path mapping
  (`join`, `Object.entries`) was the assembly computing; the adapter derives it.
  **`CASE_ROOT` → `markers.model.ts`:** a constant at an assembly's root is red;
  the case model owns it.
- **L3 was a reader limit, not design** (found here). `assembly.model.ts` says
  "a factory call builds, any layer's — an assembly's included", but a
  factory-named function of the same file reached the judge as `local` and fell
  to red. One line (`local` with `factory` → green) and two corpus rows in
  `cases/assembly.spec.ts`. A second row records the open part: a helper at an
  assembly's root not named as a factory reads green at its definition and red
  at its call — what makes a function an assembly's is unruled (GUESSES L7).

Result: self-check 269 → 239 (259 after the small fixes, then the recut);
`assembly-builds-only` from 48 to 27 groups. What stays, and why:

- `apps/serve/serve.assembly.ts` (≈22) and `cli.assembly.ts`'s
  `viewer: { serve }` — L5, the server composition, out of scope.
- `app.assembly.ts` — the spike feed: spike code is excluded from coverage, so
  its import reads unclaimed; quarantine by choice.
- `cases.assembly.ts` — two unknowns: `CASE_ROOT` imported, a constant the
  reader does not follow yet (E1's limit; the truth is a literal).
- The serve and snapshot drivers — L4, out of scope.

Suite 1401 green, coverage 100, viewer 55, `pnpm snapshot` runs.

## Docs

READMEs of `config`, `extraction`, `check`, `snapshot`, `cases/runner`,
`apps/cli`: the new use cases and ports, the load sequence's new home. The drift
bug: a line in DELTA ("owed to driver-layer: `configLoads` ignored by the CLI"),
since the chasing branch has it too.
