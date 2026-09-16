# extraction

Turns a coverage set of files into the classified import graph — the one value
every check reads. Parsing and resolution sit behind a port; naming rules sit
behind another; the service in the middle knows neither engine nor flavor.

## What it produces

`ImportGraph` (`graph.model.ts`): modules keyed by root-relative POSIX path,
each carrying its kind — the hexagon's `model`, `ports`, `service`, its
`adapters`, the outside kinds `assembly`, `driver`, `boot`, the `test` kind, and
`blob` — its service root, its `private/` status, and its non-erasable runtime
content; edges from a module to a target with an import kind (`runtime`/`type`),
a form (`static`/`dynamic`/`require`), and a re-export flag; and the list of
imports that did not resolve. A target is either a covered module or an external
leaf — a package, a builtin, a declared external, a file outside coverage — that
is never parsed through. An external leaf may carry a layer when the other side
declared one; absent, it is unlabeled.

Every parsed module also carries its **reading** (`FileReading`, JSON data): its
root statements — calls classified, definitions with their value kind and
whether they are readonly where the syntax shows it (code, a primitive-valued
initializer, `as const`, `Object.freeze`, a `Readonly*`, `readonly T[]`,
primitive or literal annotation; no alias resolution, no inference — an alias
reads `false`), branches with what their test reads off — and, for the outside
kinds, its top-level functions with their hooks cut and the open part the reader
could not place. An outside-kind file no tech covers, or an unparsed one, has
none: recognized and open.

## API

- `createExtraction({ engine, flavor, techs? })` → `{ extractGraph }`.
  `extractGraph({ root, files, isAssembly?, isDriver?, isBoot?, isTest?, external?, externalLayerOf?, pure?, driverTech?, configLoads? })`
  classifies the files through the flavor, parses each through the engine,
  resolves every specifier, and returns the graph. The four designation matchers
  are the config's globs for the kinds a framework names itself; recognition
  takes the most specific claim first — test naming or `isTest` makes a test
  file wherever it sits, then one designation wins over the flavor's word, and
  two designations on one file throw with the file and both keys named.
  `external` names specifiers the environment provides (a hit is a leaf, never
  resolved); `externalLayerOf` answers the layer an external leaf carries,
  composed by assembly from the consumer's `externalLayers` and producer
  `deblob` fields. `techs` are the tech adapters, the first whose kinds hold a
  file's reads it; `pure` and `driverTech` are what the reader resolves a
  driver's externals against; `configLoads` are the declared loads, each naming
  a covered file or the run fails loud (`load-file-not-covered`). After every
  file is read, the graph pass binds parameters at their call sites: an assembly
  function or a sub-driver's wiring function called from another outside-kind
  file takes each parameter's kind from the arguments, joined over every site
  (`null`, unknown, where sites disagree; a site in a test file does not bind —
  a test hands fakes), and the file is read again with them — to a fixed point,
  since a binding can make the next site's argument known.
- `graph.model.ts` — the graph vocabulary, `LAYERS`, `packageNameOf`, the
  two-wildcard specifier pattern grammar (`specifierPattern`,
  `specifierMatcher`) shared by `external`, `externalLayers`, and `blob`
  disclosures, and the failure vocabulary: `ExtractionError` with a `code`
  (`designation-conflict`, `load-file-not-covered`) and the duck-typed
  `isExtractionError` guard the driver presents on. A parse failure still throws
  bare — a bug until it gets its own code.
- `exports-map.model.ts` — Node's exports map as pure knowledge:
  `exportsSubpathsOf` flattens a map to subpath → targets, `exportsKeyFor`
  routes a concrete subpath to the key Node would pick (literal wins, longest
  base, longest key, `null` off the surface). Three readers share it: the config
  loader, the surface check, the package meta reader.
- `stock-flavor.model.ts` — the stock flavor's name, owned here so config and
  the adapter both import it without reaching into each other.
- `levels.model.ts` — `useCaseLevels(graph)`: the primary use cases, an
  annotation never a violation — every use case a driver's hook calls, traced to
  its service through the instance's origin: a service factory directly, or an
  assembly's returned record entry by entry while the records are literal; the
  rest listed unresolved. Test hooks never label. Instrumental is the
  complement.
- `reader.model.ts` — the reader: the tech-agnostic walk over a file's tree,
  pure over ESTree and total (a node it does not know is walked for its calls).
  Lexical scope, then one kinds table: a callee is what the binding at the root
  of its chain is — an import's target by layer (a service, adapter, assembly or
  blob export is a factory; a driver export the sub-driver's wiring; a model
  export a factory of layer `model` when the flavor names it and model, bound by
  result flow, otherwise; a ports, boot or test file a forbidden import), an
  external by claim (a tech's, `driverTech`, or a concrete builtin), by purity
  (pure is model, the flavor's word applying as for a model file) or unclaimed;
  a free global is the language when ECMAScript defines it and the host's tech
  otherwise; a local function a local, carrying the flavor's word as `factory`
  (a local factory's instance has no origin); a member called on an instance is
  a use case, on a tech value the tech unless the name is an intrinsic prototype
  method's. Every call carries its arguments (kind, and for an instance where it
  came from) and where its result reaches; a use case that matches a declared
  load by member name — and by file when the instance is traced to a factory
  that is not an assembly's record — is marked, its result a tech value. The
  cut: a function handed to a tech callee is a hook, nested hooks included; one
  handed to anything else is open. Takes plain data, never the port: the service
  chooses the tech.

## Ports

- `ports/extraction.port.ts` — `ExtractionEngine`: `extract(absolutePath)`
  yields import occurrences, runtime content, and the parsed program with its
  source — ESTree with TypeScript nodes, the standard shape, not the engine's —
  or `null` when the engine has no extractor for that file kind;
  `resolve(from, specifier)` yields a file, a builtin, or an unresolved reason.
  Engine shapes never leak through it; the tree is read per file and dropped.
- `ports/flavor.port.ts` — `FlavorResolver`: `classify(files)` maps the whole
  coverage set to layer, service root, and privacy at once (path-only,
  set-based); optional `classifyEntry(subpath)` is the naming rule read across
  package boundaries; optional `isFactory(name)` is the naming rule over an
  export name — what tells a model factory from a model function, the stock rule
  being `create` followed by a capital; optional `typeOnlyExempt` is the
  flavor's type-only stance (`runtime-import`).
- `ports/tech.port.ts` — `Tech`: canon's reading of a technology, one adapter
  per tech as the flavor is one per naming convention. A tech is the kinds it
  reads, the packages it claims as tech, and the driver rules it exempts;
  recognition is the config's and the cut is the reader's, so a tech that needs
  a cut of its own adds it here with the case that needs it.

## Adapters

- `adapters/oxc-extraction.adapter.ts` — the engine over `oxc-parser` and
  `oxc-resolver`: ESM records plus an AST walk for `require(...)`, resolution
  through the project's tsconfig `paths` and config aliases.
- `adapters/ts-suffixes-factories-flavor.adapter.ts` — the stock flavor: kind
  from the file suffix (`.model`, `.port`, `.service`, `.adapter`, `.assembly`,
  `.driver`, `.boot`; `.spec` and `.test` are the test kind), service roots from
  where the hexagon's own suffixed files sit — an outside-kind file marks none —
  grouping directories collapsed to their nearest real service;
  `classifyStockEntry` is the same rule over a specifier tail. `STOCK_FLAVORS`
  is the registry assembly injects into config resolution.
- `adapters/plain-ts-tech.adapter.ts` — the plain-TypeScript tech: assembly,
  driver and boot files; claims nothing (builtins and host globals are tech by
  the reader's table, third-party packages by `driverTech`); exempts nothing.
- `adapters/test-runner-tech.adapter.ts` — the test tech: spec files; claims the
  runners it knows (a census, `driverTech` for the next one); exempts
  registration, the call count, services-only and definitions.
- `adapters/package-meta.adapter.ts` — the cross-package reader: resolves a bare
  specifier to its owning package.json, reads the `deblob` field and the exports
  map, answers the layer a subpath claims. Anything short of a readable claim
  reads as no claim; a stranger's manifest never breaks the run. Cached per
  package once a manifest was reached.

## What it does not do

No judgment: the graph carries facts, the checks carry rules. No parsing through
a package boundary — externals are leaves. No file contents in classification —
a flavor decides from paths alone.
