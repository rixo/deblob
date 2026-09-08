# config

`deblob.config.ts` as data: discovered, loaded, validated loudly, and resolved
into everything a run consumes. Resolution is pure; loading and scanning are
adapters over the platform; assembly owns the load → resolve sequence.

## API

- `DeblobConfig` (`config.service.ts`) — the authoring contract, all keys
  optional: `flavor`, `assembly`, `include`, `exclude`, `pure`,
  `typeOnlyExempt`, `tsconfig`, `alias`, `external`, `externalLayers`, `build`.
  `defineConfig` is the identity that types a config file. Both are the
  package's public surface.
- `resolveConfig(raw, { root, configPath, flavors })` → `ResolvedConfig`. Takes
  the raw exported value and the stock flavor registry, validates every key with
  a teaching `ConfigError`, and returns the resolved run: the live
  `FlavorResolver`, the assembly matcher, the coverage globs, the resolver
  aliases, the declared-external matcher, the `externalLayers` lookup, the build
  mirror. This is a service, not a model, because it holds a port shape.
- `config.model.ts` — `ConfigError` and `asConfigError`, the coverage constants
  (`DEFAULT_INCLUDE`, the non-removable `EXCLUDE_BASELINE`,
  `COVERAGE_EXTENSIONS`), the config-import error message.

## Adapters

- `adapters/loader.adapter.ts` — the platform as the one concrete tech:
  `discoverConfig(cwd)` walks upward for `deblob.config.{ts,js,mjs}`,
  `explicitConfigPath` honors `-c`, `importConfigDefault` loads the file through
  native `import()` (Node strips types; erasable syntax only), `tsconfigPathOf`
  finds the tsconfig feeding resolution, `readPackageSurface(root)` reads the
  package's own `deblob` field and exports map for the surface check — a key
  this version cannot honor, a malformed `blob`, or a field without an exports
  map fail loud there.
- `adapters/scan.adapter.ts` — `scanCoverage(config)` globs the governed subtree
  under the full-scan model (every covered file is a graph node, orphans
  included, hidden paths never); `statSizes` feeds the size-weighted blob
  percentage.

Not behind a port on purpose: config crosses into the core as data, and reading
it is assembly's job. The adapters never see the resolution.

## What it does not do

No merging, no inheritance: the nearest config wins and its directory is the
root. No defaults that widen: knobs only tighten canon, and the exclude baseline
cannot be removed. No flavor imports: a flavor is an adapter of `extraction`;
the registry arrives injected.
