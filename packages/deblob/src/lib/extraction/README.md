# extraction

Turns a coverage set of files into the classified import graph — the one value
every check reads. Parsing and resolution sit behind a port; naming rules sit
behind another; the service in the middle knows neither engine nor flavor.

## What it produces

`ImportGraph` (`graph.model.ts`): modules keyed by root-relative POSIX path,
each carrying its layer (`model`, `ports`, `service`, `adapters`, `assembly`,
`blob`), its service root, its `private/` status, and its non-erasable runtime
content; edges from a module to a target with an import kind (`runtime`/`type`),
a form (`static`/`dynamic`/`require`), and a re-export flag; and the list of
imports that did not resolve. A target is either a covered module or an external
leaf — a package, a builtin, a declared external, a file outside coverage — that
is never parsed through. An external leaf may carry a layer when the other side
declared one; absent, it is unlabeled.

## API

- `createExtraction({ engine, flavor })` → `{ extractGraph }`.
  `extractGraph({ root, files, isAssembly?, external?, externalLayerOf? })`
  classifies the files through the flavor, parses each through the engine,
  resolves every specifier, and returns the graph. Assembly designation ORs on
  top of the flavor's word; `external` names specifiers the environment provides
  (a hit is a leaf, never resolved); `externalLayerOf` answers the layer an
  external leaf carries, composed by assembly from the consumer's
  `externalLayers` and producer `deblob` fields.
- `graph.model.ts` — the graph vocabulary, `LAYERS`, `packageNameOf`, and the
  two-wildcard specifier pattern grammar (`specifierPattern`,
  `specifierMatcher`) shared by `external`, `externalLayers`, and `blob`
  disclosures.
- `exports-map.model.ts` — Node's exports map as pure knowledge:
  `exportsSubpathsOf` flattens a map to subpath → targets, `exportsKeyFor`
  routes a concrete subpath to the key Node would pick (literal wins, longest
  base, longest key, `null` off the surface). Three readers share it: the config
  loader, the surface check, the package meta reader.
- `stock-flavor.model.ts` — the stock flavor's name, owned here so config and
  the adapter both import it without reaching into each other.

## Ports

- `ports/extraction.port.ts` — `ExtractionEngine`: `extract(absolutePath)`
  yields import occurrences and runtime content, or `null` when the engine has
  no extractor for that file kind; `resolve(from, specifier)` yields a file, a
  builtin, or an unresolved reason. Engine shapes never leak through it.
- `ports/flavor.port.ts` — `FlavorResolver`: `classify(files)` maps the whole
  coverage set to layer, service root, and privacy at once (path-only,
  set-based); optional `classifyEntry(subpath)` is the naming rule read across
  package boundaries; optional `typeOnlyExempt` is the flavor's
  `type-only-exempt` stance.

## Adapters

- `adapters/oxc-extraction.adapter.ts` — the engine over `oxc-parser` and
  `oxc-resolver`: ESM records plus an AST walk for `require(...)`, resolution
  through the project's tsconfig `paths` and config aliases.
- `adapters/ts-suffixes-factories-flavor.adapter.ts` — the stock flavor: layer
  from the file suffix, service roots from where suffixed files sit, grouping
  directories collapsed to their nearest real service; `classifyStockEntry` is
  the same rule over a specifier tail. `STOCK_FLAVORS` is the registry assembly
  injects into config resolution.
- `adapters/package-meta.adapter.ts` — the cross-package reader: resolves a bare
  specifier to its owning package.json, reads the `deblob` field and the exports
  map, answers the layer a subpath claims. Anything short of a readable claim
  reads as no claim; a stranger's manifest never breaks the run. Cached per
  package once a manifest was reached.

## What it does not do

No judgment: the graph carries facts, the checks carry rules. No parsing through
a package boundary — externals are leaves. No file contents in classification —
a flavor decides from paths alone.
