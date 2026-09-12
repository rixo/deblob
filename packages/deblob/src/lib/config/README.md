# config

`deblob.config.ts` as data: discovered, loaded, validated loudly, and resolved
into everything a run consumes. Resolution is pure; loading and scanning are
adapters over the platform; assembly owns the load → resolve sequence.

## API

- `DeblobConfig` (`config.service.ts`) — the authoring contract, all keys
  optional: `flavor`, the three designations `assembly`, `drivers`, `boot`
  (globs for the kinds a framework names itself — the stock flavor reads
  `.assembly.ts`, `.driver.ts`, `.boot.ts` regardless), `readers` (reader name →
  globs, a stock reader bound to more files than its builtin naming, config's
  binding first; a test file is one the test reader's binding names, so
  `{ "good-enough-tests": ["e2e/**"] }` is how other test paths are declared —
  the `tests` key of the unreleased step 01 is gone and says so), `configLoads`
  (the use cases an assembly may await, `"<file>#<name>"`, one or a list),
  `driverTech` (specifier patterns over packages a driver may import as its
  tech), `include`, `exclude`, `pure`, `typeOnlyExempt`, `mutableModuleState`
  (`true` lets module-level bindings be mutable-typed — the opt-out of
  `stable-root`' readonly half for a codebase without the types; default
  `false`, the check on), `tsconfig`, `alias`, `external`, `externalLayers`,
  `build`, `view`. `defineConfig` is the identity that types a config file. Both
  are the package's public surface.
- `resolveConfig(raw, { root, configPath, localPath, flavors, readers })` →
  `ResolvedConfig`. Takes the raw exported value and the stock flavor and reader
  registries, validates every key with a teaching `ConfigError`, and returns the
  resolved run: the live `FlavorResolver`, the three designation matchers, the
  readers in precedence order (each configured binding as the named stock reader
  over the config's globs, then every stock reader as shipped), the coverage
  gate `covers` (a script extension, or a designation match, or a reader binding
  match), the normalized config loads, the `driverTech` matcher, the coverage
  globs, the resolver aliases, the declared-external matcher, the
  `externalLayers` lookup, the build mirror, the viewer's projects as absolute
  paths, and both provenance paths. A `configLoads` entry is validated for shape
  only; whether its file is covered is extraction's to say. This is a service,
  not a model, because it holds port shapes.
- `overlayLocalConfig(base, local, localPath)` → the raw value for
  `resolveConfig`: `deblob.local.json` merged over the config, per top-level
  key, local winning, arrays and objects replacing. A non-object or an unknown
  key in the local file fails naming that file — after the merge the source of a
  key is gone, so this is the one place that message can come from.
- `config.model.ts` — `ConfigError`, its duck-typed guard `isConfigError` (by
  name; `instanceof` breaks across realms) and `asConfigError`, the coverage
  constants (`DEFAULT_INCLUDE`, the non-removable `EXCLUDE_BASELINE`,
  `COVERAGE_EXTENSIONS` — the script extensions; another extension enters
  coverage only named by a designation or a reader binding), the config-import
  error message.

## Adapters

- `adapters/loader.adapter.ts` — `createConfigLoader({ fs })` over the fs port
  (`lib/fs/`), promise-only: `discoverConfig(cwd)` walks upward to the nearest
  directory holding a `deblob.config.{ts,mts,js,mjs}` or a `deblob.local.json`
  and reports the root and both paths (either may be absent, never both),
  `explicitConfigPath` honors `-c` and looks the overlay up beside the explicit
  file, `readLocalConfig` parses the overlay's JSON (unparseable, or gone since
  discovery, fails naming it), `tsconfigPathOf` finds the tsconfig feeding
  resolution, `readPackageSurface(root)` reads the package's own `deblob` field
  and exports map for the surface check — a key this version cannot honor, a
  malformed `blob`, or a field without an exports map fail loud there. Outside
  the factory, `importConfigDefault` loads the file through native `import()`
  (Node strips types; erasable syntax only): a platform call no port reads.
- `adapters/scan.adapter.ts` — `createCoverageScan({ fs })`:
  `scanCoverage(config)` globs the governed subtree through the port under the
  full-scan model (every covered file is a graph node, orphans included, hidden
  paths never) and gates it on the config's `covers`; `statSizes` feeds the
  size-weighted blob percentage, loud on a covered file gone since the scan.

Assembly owns the load → resolve sequence and never hands the adapters the
resolution; the disk they read is the fs port's, so a run over a tree of strings
(the memory adapter) loads and scans exactly as one over the disk.

## What it does not do

No merging, no inheritance across directories: the nearest config wins and its
directory is the root. The one overlay lives in that same directory:
`deblob.local.json`, the machine-local part of the config, same keys as JSON,
winning per key. No defaults that widen: knobs only tighten canon, and the
exclude baseline cannot be removed. No flavor imports: a flavor is an adapter of
`extraction`; the registry arrives injected.
