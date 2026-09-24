# extraction

Turns a coverage set of files into the classified import graph — the one value
every check reads. Parsing sits behind a port, resolution behind another, naming
rules behind a third; the service in the middle knows neither engine nor
resolver nor flavor.

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
root statements — calls classified, definitions with their value kind and their
`immutability`: readonly where the syntax proves it (code, a primitive-valued
initializer, `as const`, `Object.freeze` over a literal, a `Readonly*`,
`readonly T[]`, a primitive or literal annotation), mutable where it proves the
opposite (`let`/`var`, a record or array literal, a mutable collection, a member
not readonly) with the form that proves it, unknown otherwise with the
`UnknownCondition` naming what the reader could not see (a type name — no alias
resolution yet — a type form, a call's result, a value it does not follow), or
broken where it cannot read the line at all (a readonly wrapper without its type
arguments, a freeze of nothing) — never mutable by default; a module's own
location (`import.meta.url`, `__dirname`) is not a read of the machine, the rest
of `import.meta` is; a statement it does not recognise is `unread`), branches
with what their test reads off, assignments with their target root's kind — and,
for the outside kinds, its top-level functions with their hooks cut (a
non-exported function only ever called directly in its file is a tracked local:
not a function of the file but read at each site as the site's own text, the
site's arguments its parameters, its hooks the site's, its return the call's —
its body's own names still resolve where it was written, so a local or a
parameter at the site never takes one over) and the open part: what the reader
genuinely could not place (a callee of kind unknown — an import the resolver
could not land, `this`, a binding through itself — and a parameter no production
site binds), never a fence over a tree it has. A callback handed to anything but
a tech callee is read inline where it sits, its calls the enclosing body's, its
returns the callee's; a call's result called inline is classified by its value.
An outside-kind file no tech covers, or an unparsed one, has none: recognized
and open.

## API

- `createExtraction({ engine, resolver, flavor, readers? })` →
  `{ extractGraph }`.
  `extractGraph({ root, files, isAssembly?, isDriver?, isBoot?, external?, externalLayerOf?, pure?, driverTech?, configLoads? })`
  classifies the files through the flavor, parses each through the engine,
  resolves every specifier, and resolves to the graph — async since the engine
  reads through the fs port; `externalLayerOf` may answer with a promise (the
  package-meta reader does). The three designation matchers are the config's
  globs for the kinds a framework names itself; recognition
  (`recognition.model.ts`, shared with the bare status) takes the most specific
  claim first — a reader of one kind designates it by binding (the test runner's
  naming makes a test file wherever it sits), then one designation wins over the
  flavor's word, and two designations on one file throw with the file and both
  keys named. `external` names specifiers the environment provides (a hit is a
  leaf, never resolved); `externalLayerOf` answers the layer an external leaf
  carries, composed by assembly from the consumer's `externalLayers` and
  producer `deblob` fields. `readers` are the readers in precedence order
  (config's bindings first, then the stock ones): the first whose binding
  matches a file and whose kinds hold its kind reads it; `pure` and `driverTech`
  are what the reading resolves a driver's externals against; `configLoads` are
  the declared loads, each naming a covered file or the run fails loud
  (`load-file-not-covered`). After every file is read, the graph pass binds
  parameters at their call sites, one world per site: an assembly function or a
  sub-driver's wiring function called from another outside-kind file has one
  world per distinct argument vector its production sites hand it (a site in a
  test file opens none — a test hands fakes; a site in its own file none
  either), and the file is read once per world, that function bound from that
  site — `ModuleNode.readings`, each with its `World` (function, inducing site,
  arguments); `ModuleNode.reading` binds every function from its first world. A
  rule judges the function in every world as if that site were the only caller
  and carries the site; sites disagreeing is no violation. The pass runs to a
  fixed point, since a binding can make the next site's argument known. A
  function nothing calls across files has no world: one reading, its parameters
  unknown and open.
- `graph.model.ts` — the graph vocabulary, `LAYERS`, `packageNameOf`, the
  two-wildcard specifier pattern grammar (`specifierPattern`,
  `specifierMatcher`) shared by `external`, `externalLayers`, and `blob`
  disclosures, and the failure vocabulary: `ExtractionError` with a `code`
  (`designation-conflict`, `load-file-not-covered`) and the duck-typed
  `isExtractionError` guard the driver presents on. A file that does not parse
  is not an error: the graph lists it in `broken` (`BrokenSite`, `line: null`),
  with every root definition the reader reads broken — places deblob cannot
  read, which the run reports and declines to certify.
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
- `recognition.model.ts` —
  `createRecognition({ readers, isAssembly?, isDriver?, isBoot? })`: the kind of
  a covered file (`kindOf`) and the reader that reads it (`readerOf`), one
  operation for extraction and the bare status. Plain data in — a reader's
  binding and kinds — never the port.
- `reading.model.ts` — the reading: the tech-agnostic walk over a file's tree,
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
  handed to anything else is read inline where it sits. Takes plain data, never
  the port: the service chooses the tech.

## Ports

- `ports/extraction.port.ts` — `ExtractionEngine`: `extract(absolutePath)`
  resolves to import occurrences, runtime content, and the parsed program with
  its source — ESTree with TypeScript nodes, the standard shape, not the
  engine's — or `null` when the engine has no extractor for that file kind.
  Engine shapes never leak through it; the tree is read per file and dropped.
- `ports/resolver.port.ts` — `Resolver`: `resolve(from, specifier)` resolves to
  a file, a builtin under its `node:` name, or an unresolved reason. Split off
  the engine because parsing reads a string and resolution reads a tree: the
  node run's tree is the disk, a case's is the fs port's.
- `ports/flavor.port.ts` — `FlavorResolver`: `classify(files)` maps the whole
  coverage set to layer, service root, and privacy at once (path-only,
  set-based); optional `classifyEntry(subpath)` is the naming rule read across
  package boundaries; optional `isFactory(name)` is the naming rule over an
  export name — what tells a model factory from a model function, the stock rule
  being `create` followed by a capital; optional `typeOnlyExempt` is the
  flavor's type-only stance (`runtime-import`).
- `ports/reader.port.ts` — `Reader`: canon's reading of a technology, one reader
  per tech as the flavor is one per naming convention. A reader is its binding
  (root-relative globs, the builtin one; config binds more, first), the kinds it
  reads among the files it binds (one kind = the binding designates it), the
  packages it claims as tech, and the driver rules it exempts; the cut is the
  reading's, so a tech that needs a cut of its own adds it here with the case
  that needs it — as will the first reader whose files the default engine cannot
  parse, with its engine.

## Adapters

- `adapters/oxc-extraction.adapter.ts` — `createOxcEngine({ fs })`, the parser
  over `oxc-parser`: the source read through the fs port (a covered file not
  there is loud, never a parse result), ESM records plus an AST walk for
  `require(...)`.
- `adapters/oxc-resolver.adapter.ts` —
  `createOxcResolver({ tsconfigPath?, alias? })`, the resolver over
  `oxc-resolver` for the node run: the project's tsconfig `paths` and config
  aliases, exports maps, symlinks. It reads the disk itself and cannot be handed
  the fs port.
- `adapters/fs-resolver.adapter.ts` — `createFsResolver({ fs })`, the resolver
  over the fs port for a case's tree of strings — deliberately the smaller one:
  relative and absolute specifiers with the script extensions, the `.js` → `.ts`
  aliases and `index`; a builtin under its `node:` name; a bare specifier by the
  nearest `node_modules` in the tree (its manifest's `main`, else `index`). No
  tsconfig paths, no exports maps, no symlinks. The port ships its own suite,
  `resolver-test-suite.service.ts` (a conformance kit over the `test` unit's
  `TestingApi` port): each adapter's spec materializes `RESOLVER_TREE` where its
  adapter reads and runs the kit under its own name.
- `adapters/ts-suffixes-factories-flavor.adapter.ts` — the stock flavor: kind
  from the file suffix (`.model`, `.port`, `.service`, `.adapter`, `.assembly`,
  `.driver`, `.boot`; test naming is not the flavor's, see the test runner),
  service roots from where the hexagon's own suffixed files sit — an
  outside-kind file marks none — grouping directories collapsed to their nearest
  real service; `classifyStockEntry` is the same rule over a specifier tail.
  `STOCK_FLAVORS` is the registry assembly injects into config resolution.
- `adapters/plain-ts-reader.adapter.ts` — the plain-TypeScript reader: binds
  every script file, reads the assembly, driver and boot ones among them; claims
  nothing (builtins and host globals are tech by the reading's table,
  third-party packages by `driverTech`); exempts nothing.
- `adapters/test-runner-reader.adapter.ts` — the test reader: binds the test
  naming (`*.spec.*`, `*.test.*`, `__tests__/`) and reads the test kind only, so
  its binding is what makes a file a test file — canon's "spec files by the test
  globs"; claims the runners it knows (a census, `driverTech` for the next one);
  exempts registration, the call count, services-only and definitions.
- `adapters/package-meta.adapter.ts` — the cross-package reader,
  `createPackageMetaReader({ fs, resolve, anchor, classifyEntry })`: resolves a
  bare specifier to its owning package.json, reads the `deblob` field and the
  exports map through the fs port, answers (async) the layer a subpath claims.
  Anything short of a readable claim reads as no claim; a stranger's manifest
  never breaks the run. Cached per package once a manifest was reached.

## What it does not do

No judgment: the graph carries facts, the checks carry rules. No parsing through
a package boundary — externals are leaves. No file contents in classification —
a flavor decides from paths alone.
