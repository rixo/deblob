# Step 01 — the tech adapter: reading the outside kinds

Opened 2026-09-16 from the closed canon (step 00, `5ef92a3`). This step gives
the checker eyes for the outside kinds: it recognizes assembly, driver, boot and
test files, cuts a driver into its hooks, classifies every call by what its
callee is and where its result goes, and reads the declared config loads. It
judges nothing — the detectors, violations and explain cards are step 03's; what
a factory is, step 02's. Written against the proto API of
[03_outside-rules/SPEC.md](../03_outside-rules/SPEC.md); where this step changes
it, the change is listed at the end and 03 is amended in the same commit.

Canon is the contract:
[Assembly](../../../docs/architecture.md#assembly--the-composition-root),
[Driver](../../../docs/architecture.md#driver--the-outermost-layer),
[Boot](../../../docs/architecture.md#boot--the-entry), the test rule, and the
chapter PLAN's rulings. No canon edit in this step; the first legitimate ones
come from the reading's output on real code, in 03.

Three rulings taken at the draft's review, 2026-09-16: the keys are
`configLoads` (`loads` read as a verb and collided with module loading) and
`driverTech` (`tech` did not say whose — it is the driver's, and next to `pure`
it read as a project-wide package class); and the reader walks the parse tree
itself — no intermediate representation of the syntax, which would have been a
second type system to maintain for nothing the tree does not already say.

## Goal

After this step, `deblob` holds, for every covered file, the facts canon's
outside rules are stated over, in a form the detectors can read without parsing
anything:

- **Kind.** `Layer` names the nine kinds; the stock flavor recognizes
  `.assembly.ts`, `.driver.ts`, `.boot.ts` and test naming; config globs
  designate the rest (`boot`, `drivers`, `tests`, `assembly`). The dependency
  matrix is total over the union (the compiler forces it), so `check layers`
  already enforces the import half of the outside rules — drivers cannot import
  composition units, nothing imports a boot.
- **Calls, classified.** In an assembly, driver or boot file, every call is
  labelled by its callee — a service factory, an adapter factory, an assembly
  function, a sub-driver's wiring function, a use case on an instance, a
  declared load, the tech, the language, a model export, a blob export — with
  the kind of each argument and the destination of its result.
- **Hooks, cut.** A driver is split into its hooks and its wiring by the tech's
  reading; each hook lists its calls. What a tech does not cut is reported as
  the file's open part, never as a fact a rule can fire on.
- **Loads, read.** The `configLoads` declaration resolves against the assembly's
  calls: a declared load is a use-case call the assembly may make, and its
  result is a tech value from then on.
- **Exemptions, carried.** The test-runner tech exempts registration, the call
  count, services-only and definitions; the detectors will skip what a tech
  exempts without knowing why.
- **Primary use cases, labelled.** A use case reached from a hook is primary on
  that channel; the label is an annotation on the graph, never a violation.
- **Snapshot-shaped.** Everything the reading produces is JSON data on the graph
  node, so the viewer's fold projects it the way it projects modules today.

Out of scope: detectors, violations, explain (03); factory recognition (02); the
CLI's own restructure (05); slugs in code and skills (06); web driver internals
(research). The two `rule-content` failures on the `test-setup-assembly` rename
stay red until 06.

## API

### Kinds

`Layer` (`extraction/graph.model.ts`) becomes the closed union

```ts
type Layer =
  | "model"
  | "ports"
  | "service"
  | "adapters"
  | "assembly"
  | "driver"
  | "boot"
  | "test"
  | "blob"
```

`LAYERS` lists them in that order. Every `switch` and record over `Layer` grows
with it — the dependency matrix of `checkLayers` first: the Drivers, Boot and
Test rows of canon's matrix land here because the union forces totality, not
because this step enforces the outside rules. The rows are canon's letter:
drivers import assemblies, drivers and their tech, and type-import anything;
boot imports one driver; test imports anything. A driver importing a service or
an adapter fires `service-assembly-only` / `adapter-assembly-only` as the matrix
already says; `blob-quarantine` keeps assembly and test as blob's only
importers. `inward-deps` reads `… < assembly < driver < boot` for the matrix's
"cannot import" side.

**Recognition** is one operation over the coverage set, most specific claim
first:

1. **Test** — the flavor's test naming (`*.spec.*`, `*.test.*`) or a `tests`
   glob. A spec file is a spec file wherever it sits: a `drivers` glob catching
   `src/drivers/cli/main.spec.ts` does not make it a driver.
2. **Config designation** — `boot`, `drivers`, `assembly` globs, root-relative
   POSIX like today's `assembly`. Designation wins over the flavor's word, as it
   does today. One file matched by two designation keys is a loud error at
   extraction naming the file and both keys — the config asked for two kinds.
3. **The flavor's suffix** — `.assembly.ts`, `.driver.ts`, `.boot.ts` join the
   layer suffixes of the stock flavor (same extension set). `FlavorLayer` is
   `Layer`: source naming now yields `assembly` too, so the port comment saying
   it never does is rewritten.

A designated file the engine cannot parse (`+page.svelte` under `drivers`) is a
node of that kind with `parsed: false` and no reading: the web fence, recognized
and open. Without an extractor for the file kind its imports are not on the
graph, so canon's one web claim (a designated component may import an assembly)
is recognized here and checked nowhere yet — stated, not hidden.

### Config keys

The proto's five keys, ratified with these shapes (`config.service.ts`,
`KNOWN_KEYS`, one `ConfigError` per malformed value like every key today):

- `boot?: readonly string[]`, `drivers?: readonly string[]`,
  `tests?: readonly string[]` — designation globs. `tests` defaults to nothing:
  the flavor's test naming already covers `*.spec.*` / `*.test.*`; the key adds
  `__tests__/**` and friends. `ResolvedConfig` gains `isBoot`, `isDriver`,
  `isTest` next to `isAssembly`, compiled the same way.
- `configLoads?: string | readonly string[]` — `"<file>#<name>"`, file
  root-relative POSIX, name the use case's export-facing member. Normalized to a
  list; malformed entries (no `#`, empty side, a file outside coverage) fail
  loud.
- `driverTech?: readonly string[]` — specifier patterns (the two-wildcard
  grammar of `external`) naming packages a driver may import as tech beyond what
  the techs claim. Compiled to a matcher like `external`.

`DeblobConfig` documents each; `defineConfig` unchanged.

### The syntax at the port

Today the engine yields imports and top-level declarations. The reader needs
calls, bindings and control flow, so `FileExtraction` gains the parsed module:

```ts
type FileExtraction = {
  imports: readonly ImportRecord[]
  runtimeContent: readonly RuntimeEntry[]
  /**
   * The module's syntax tree: ESTree with TypeScript extensions, `start`/`end`
   * byte offsets on every node. `null` when the engine parsed no body.
   */
  program: Program | null
  source: string
}
```

`Program` is the ESTree shape, the one standard parsers share; the type comes
from `@oxc-project/types`, already a dependency and type-only. Engine shapes
(spans as napi objects, error records, module records) stay behind the port as
before; ESTree is not an engine shape. The oxc adapter already parses the whole
file (the `require` walk reads the AST); it returns the program it has and the
source it read, nothing more.

Nothing keeps the tree. The extraction service reads each file while its program
is in hand — the reading needs the file's own import targets, which the per-file
loop resolves anyway — stores the reading on the node, and drops the program.
The graph stays as small as today plus the reading, which matters for a server
that re-extracts on every save (viewer chapter, step 04).

### The reader

`extraction/reader.model.ts` — the tech-agnostic walk, pure over ESTree, total:
a node it does not know is walked through for the calls it contains and
otherwise ignored, never a throw. The reader reads a file with its tech, and the
result is the file's reading. What varies is the tech (recognition, claims,
exemptions — and a cut of its own, the day a tech needs one); the reader is what
every tech shares. It takes plain data, never the port type — which specifiers
are tech, which exemptions apply — so model imports no port; the extraction
service picks the tech for a file's kind and hands the reader that data, as it
already holds the flavor. Two helpers, both functions: a **lexical scope
resolver** (every identifier to its binding: import, declaration, parameter with
its destructuring path, `catch`; a name bound nowhere is a free global;
shadowing resolves innermost), and the **language lists** — ECMAScript's global
intrinsics and its prototype method names, closed sets defined by the
specification, held as values.

Rules of the walk:

- **Wrappers vanish.** `as`, `satisfies`, `!`, parentheses, `await` (recorded on
  the call) and type arguments do not change what a value is.
- **A call is a call.** `f()`, `new F()`, `` tag`…` ``, `a.b()`, `a?.b()` are
  calls; `import(…)` binds like an import (dynamic imports read as imports);
  `require(…)` likewise when its result is bound.
- **Every reference is a use** in a context — callee, argument of a call,
  returned, condition, record or array entry, assigned, reassigned, any other
  expression position — with the member chain read off it, so the reader answers
  "was this result branched on, member-accessed, passed whole, returned?" from
  the binding's uses alone.
- **Control is a statement** with its test and its arms; a conditional
  expression, `&&`, `||`, `??` inside an expression counts as control around the
  arms' calls, so nothing hides inside an operator.
- **Spans** are offsets plus the line and column computed from the source, so a
  violation attributes to a hook, a call or a statement with a clickable
  position and rendering never reopens the file.

### Callee and value kinds — the one operation

The reader classifies every reference by the binding it resolves to; one table
serves assembly, driver, boot and test files, and the detectors ask it, never
the tree. Kinds of a **value**:

| Value kind | Bound to                                                                                                                                                    |
| ---------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `literal`  | a literal, a record or array of allowed values, a template without holes                                                                                    |
| `tech`     | a tech import, a host global, a tech-held value (member of tech, result of a tech call), a declared load's result, a parameter bound tech at its call sites |
| `instance` | the result of a factory call, a member of an assembly's returned record, a parameter bound instance at its call sites                                       |
| `function` | a function definition or expression                                                                                                                         |
| `computed` | anything else: an operator, a language call's result, a member of a computed value, a `let` reassigned                                                      |
| `unknown`  | a parameter no call site binds, a `ref` to a free name no tech claims, a node the reader does not know                                                      |

Kinds of a **callee** — the root of the reference chain, then its members:

| Root resolves to                                                                         | Callee kind                                                                                                                  |
| ---------------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- |
| import → module of layer `service`, `adapters`, `assembly`, `blob`                       | `factory` (by file kind, canon's "factory by construction"), carrying the layer                                              |
| import → module of layer `driver`                                                        | `wiring` — the sub-driver's exported wiring function                                                                         |
| import → module of layer `model`                                                         | `model` — factory or function, the flavor tells them apart in 02                                                             |
| import → module of layer `boot`, `test`, `ports`                                         | `forbidden-import` (already a matrix violation; recorded for attribution)                                                    |
| import → external: claimed by the tech, matched by `driverTech`, or a concrete builtin   | `tech`                                                                                                                       |
| import → external: pure (config `pure` or the pure builtins)                             | `model` (canon: a pure library is model, red in a driver)                                                                    |
| import → external: none of the above                                                     | `unclaimed` — the `driverTech` declaration is the resolution                                                                 |
| a free global: ECMAScript intrinsic (`JSON`, `Object`, `Math`, `Promise`, `Date`, …)     | `language` — computation, read as a model call                                                                               |
| a free global: anything else (`process`, `document`, `console`, `fetch`, `Bun`, timers…) | `tech` — the host is the tech                                                                                                |
| a local `function` binding                                                               | `local` — a definition; whether it may exist is `driver-defines-hooks-only`'s question                                       |
| a binding of kind `instance`, member chain                                               | `use-case` — a member called on an instance                                                                                  |
| a binding of kind `tech`, member chain                                                   | `tech`; except a member named as an ECMAScript prototype method (`map`, `slice`, `then`, `toString`, …), which is `language` |
| a binding of kind `literal` or `computed`, members                                       | `language`                                                                                                                   |
| anything else (a call's result called inline, `this`, computed members)                  | `unknown` — listed in the open part, never judged                                                                            |

Everything a host adds is tech by complement, which is the operation, not a
census: `Deno`, `chrome`, `navigator` need no entry.

**Result flow** of a call is the list of contexts its result reaches: the uses
of the binding it is stored in, or the single context of an unbound result. An
`argument` context carries the callee kind it fed, so "flows to a factory
argument" is one lookup. "Passed on or returned, never branched on, computed
with, or member-accessed" is a predicate over that list.

**Parameters are bound at their call sites.** A function exported from an
assembly, driver or boot file has its parameters' kinds joined over every call
to it from another outside-kind file: `registerCheckCommands(cli, services)`
called with a tech-held value and an assembly result binds `cli` tech and
`services` instance in the sub-driver. Destructured parameters bind by key from
a record argument. A parameter with no call site, or with call sites that
disagree, is `unknown`. Root drivers take no arguments, so the only unknowns are
uncalled sub-drivers and group assemblies — and a call on an `unknown` is not
judged. This is the one pass over the whole graph; it runs at the end of
`extractGraph`, after every file is read.

### The tech port

Canon: each technology comes with a reading, and in the checker it is one
adapter per tech, as the flavor is one per naming convention. The port is named
for what varies, as the flavor is: a `Tech`. It carries the reading canon
describes; the reader applies it. Both are ports of extraction: the flavor
classifies paths, a tech classifies its calls.

```ts
// extraction/ports/tech.port.ts
interface Tech {
  readonly name: string
  /** The kinds this reading reads. */
  readonly kinds: readonly Layer[]
  /** The packages this tech is: external specifiers it claims as tech. */
  claims(specifier: string): boolean
  /** Driver rules the tech's shape exempts. */
  readonly exempts: readonly Exemption[]
}
type Exemption = "registration" | "call-count" | "services-only" | "definitions"
```

The cut is one rule for every tech this step ships, so it lives in the reader,
not the port: **a hook is a function value passed as an argument to a call whose
callee kind is `tech`**. That is `.action(cb)` on a parser held from `cac()`,
`createServer(cb)` from `node:http`, `test(name, cb)` from `vitest`,
`process.on("exit", cb)` on the host. A function passed to a `language` callee
(`files.map(cb)`, `promise.then(cb)`) is not a hook and is not judged; a
function passed to a `use-case`, `factory` or `unknown` callee is not a hook
either. Hooks nest: a callback handed to tech inside a hook is a hook of its
own, and each hook's calls are its own. A tech that needs another cut (a web
framework, later) adds an optional `cut` to the port then, with the case that
needs it.

Stock adapters, `extraction/adapters/`:

- `plain-ts-tech.adapter.ts` — kinds `assembly`, `driver`, `boot`; claims
  nothing beyond the operation (concrete builtins and host globals are tech by
  the table; third-party packages come from `driverTech`); exempts nothing. This
  is what canon calls the plain-TypeScript driver: any tech reached through
  imports and the host, no reading of its own.
- `test-runner-tech.adapter.ts` — kind `test`; claims the runners it knows
  (`vitest`, `jest`, `@jest/globals`, `node:test`, `bun:test`, `mocha`, `ava`,
  `uvu`, `tap`) — a census by necessity, with `driverTech` as the escape for the
  next runner; exempts all four. Globals-mode runners need no entry: `describe`
  and `test` as free names are tech by complement. Registration is a root call
  with a `tech` callee, so the exemption names the shape 03's
  `stateless-modules` detector skips.

`STOCK_TECHS` next to `STOCK_FLAVORS`, injected by the driver's wiring. The
extraction service chooses the tech by kind — the first tech whose `kinds`
contains the file's layer — and calls the reader with its claims and exemptions.
A parsed file of an outside kind no tech covers, or a designated file with no
program, is read as open: kind recorded, nothing cut, nothing classified.

### The reading on the graph

```ts
createExtraction({ engine, flavor, techs })

extractGraph({
  root, files, external, externalLayerOf,        // as today
  isAssembly, isBoot, isDriver, isTest,          // the designations
  configLoads, driverTech, pure,                       // what the reader resolves against
}): ImportGraph

type ModuleNode = { …, reading: FileReading | null }   // null = not parsed, or no tech
```

`FileReading` is JSON data — arrays, plain numbers, no maps, no functions — so a
snapshot carries it unchanged:

```ts
type FileReading = {
  tech: string // the tech adapter's name
  exempts: readonly Exemption[]
  /** Module root: every statement, calls classified. */
  root: readonly ReadStatement[]
  /**
   * Top-level function definitions — assembly functions, a driver's wiring
   * function(s), a test file's helpers — each with its calls classified and its
   * hooks cut.
   */
  functions: readonly ReadFunction[]
  /** Callbacks and callees the reading could not place — the open part. */
  open: readonly {
    span: Span
    why: "uncut-callback" | "unknown-callee" | "unbound-parameter"
  }[]
}

type ReadFunction = {
  name: string | null
  exported: boolean
  span: Span
  params: readonly { name: string; kind: ValueKind }[]
  /** Statements outside hooks, calls classified. */
  body: readonly ReadStatement[]
  /** Hooks cut from this function, in source order, nested hooks inside. */
  hooks: readonly ReadHook[]
}

type ReadHook = {
  span: Span
  /** The tech call this hook was handed to. */
  registeredBy: ReadCall
  body: readonly ReadStatement[]
  hooks: readonly ReadHook[]
}

type ReadStatement =
  | { kind: "call"; call: ReadCall }
  | {
      kind: "definition"
      name: string
      form: string
      exported: boolean
      span: Span
      value: ValueKind | "function"
    }
  | {
      kind: "control"
      test: ValueKind
      testOrigin: "parameter" | "load" | "instance" | "other"
      arms: readonly (readonly ReadStatement[])[]
      span: Span
    }
  | { kind: "return"; value: ValueKind | null; span: Span }
  | { kind: "other"; span: Span }

type ReadCall = {
  span: Span
  callee: CalleeKind // the table above, with its payload
  args: readonly ValueKind[]
  result: ResultFlow // the contexts the result reaches
  /** For `use-case`: the declared load it matches, if any. */
  load: { file: string; name: string } | null
}

type Span = { start: number; end: number; line: number; column: number }
```

A parsed file outside the four kinds gets a reading too — `root` only, for
`stateless-modules` (03 with 02): root calls and root `let` are visible
everywhere, `functions` and hooks are cut for the outside kinds only.

What each detector will read off it, so the shape is checked against its
consumers now:

- `assembly-builds-only` (03): every `ReadCall` in an assembly function — callee
  `factory` passes; `use-case` passes iff `load` is set; `model` passes iff its
  result flows to a factory argument (row 37, below); anything else fires. Every
  `control` with `testOrigin` `parameter` or `load` passes, `instance` fires.
  Every `definition` not a function fires. Root holds imports only.
- `wiring-outside-hooks`, `one-call-per-hook`, `driver-calls-services-only`,
  `driver-defines-hooks-only`, `driver-to-driver-wiring` (03): the wiring
  function's `body` (wiring: `factory` of layer assembly, `tech`, `wiring`),
  each hook's `body` (count of `use-case` calls, their `args` and `result`),
  `functions` beyond one, `wiring` calls outside `body`.
- `boot-one-call` (03): `root` of a boot file, plus the graph's edges.
- `stateless-modules` (03 with 02): every file's `root`.
- `test-is-assembly-and-driver`: `exempts` — the detectors skip the exempted
  shape without knowing the tech.

### The load declaration

`configLoads` entries name a file and a member. The reader marks a `use-case`
call as a load when the instance's factory file and the member name match an
entry. The factory file is known when the instance was built in the same file (a
`factory` call result) or bound at a call site (a group assembly receiving the
root's config service). When the instance is `unknown`, the call matches by
member name alone: the declaration is an honour mechanism (ruling of
2026-09-15), and a name match on an unresolved instance is the lenient side. A
matched load's result is `tech` from then on: it feeds factory arguments,
conditions with `testOrigin: "load"`, loops.

### Primary use cases

`useCaseLevels(graph)` (`extraction/levels.model.ts`) returns the primary set:
every `(service file, member)` reached by a `use-case` call from a hook of a
driver, with the driver's path. Resolution goes through the instance's origin: a
factory call in the same driver or its assembly, or an assembly's returned
record whose entries are factory results (`return { cli: createCliService(…) }`
→ `services.cli.check` is `check` on the CLI service). A use case whose instance
the reader cannot trace is listed unresolved. Test hooks never label (canon:
test edges never count for use-case level). Everything on a service's API not in
the primary set is instrumental by complement. Annotation only; the CLI shows
nothing of it this step. JSON-shaped like the reading, for the same fold.

### Row 37, decided

Canon says both "the flavor tells a factory from a function" and "a model call
whose result feeds a factory is the one shape the reader lets through". The
order: **result flow bounds model calls now; the flavor names factories in 02
and widens the pass**. This step reports `model` for every model callee with its
result flow; 03's assembly detector lets a `model` call through iff its result
is an argument of a `factory` call (or a member of a record that is). When 02
lands, a model callee the flavor names a factory is a `factory` regardless of
flow (a shared model instance returned in the record becomes legal by that
route), and one it names a function stays bound by flow. Nothing here tracks
adapter factory results beyond the generic result flow every call carries.

### What stays open, and says so

- The model-callee widening and the root-factory-call half of
  `stateless-modules` wait for 02; the reader's `model` kind and root statements
  are what 02 consumes.
- Web drivers: recognized by `drivers` globs, no program, whole file open.
- An outside kind no tech covers (a future tech's files) reads as open — the
  tripwire test below pins it.

### Reconciliation with the viewer branch

The viewer (`history/20260912_viewer/`, branch `viewer`) owns its JSON contract
and restates `LAYERS`; `deblob` conforms through one type-only import and a pure
fold. Ruled 2026-09-13, kept: no third package for a shared model until a third
consumer exists. What this step does for the merge:

- `FileReading` and the primary set are JSON on the node, so the fold projects
  them when the viewer asks — the viewer's product is services and their use
  cases, and this is the data.
- A mirror test in deblob's suite asserts `LAYERS` equals the viewer's copy
  (tests may import anything; deblob already depends on the viewer's model
  file), so the three new kinds fail at the merge, not on a screen. The viewer
  package does not exist on this branch, so the test is written at the merge, on
  whichever branch lands second.
- Merge order: the viewer's steps 03 and 04 before this chapter's step 05. Their
  `drivers/wiring.ts`, `serve` and `snapshot` drivers sit under the
  `src/drivers/**` assembly designation and become boot, driver and assembly
  files under 05's rules once, on main.

### Amendments to 03's proto

Carried into `03_outside-rules/SPEC.md` in this step's commit:

- The matrix rows for `driver`, `boot`, `test` land in 01 (compile totality),
  not 03.
- Detectors read `ModuleNode.reading` off the graph they already take; there is
  no separate reader output.
- `driverTech` (the proto's `tech`, renamed 2026-09-16 — tech of the driver):
  specifier patterns over packages; host globals are tech by construction and
  ECMAScript intrinsics are language; pure packages and pure builtins are model
  in a driver.
- `tests` defaults to no globs (the flavor's naming is the default), not the
  runner pattern.
- `configLoads` (the proto's `loads`, renamed 2026-09-16) matching as stated
  above: file and member when the instance is traced, member alone when it is
  not.
- `DriverViolation.hook` is a `ReadHook` span; `undeclared-load` carries the
  traced factory file when there is one.
- Exemptions arrive as tokens on `FileReading.exempts`; the proto's "the reading
  removes the exempt hooks before the detector runs" becomes "the detector skips
  what the file exempts".

## Testing

Contract tests through the public functions, fixtures under `__fixtures__/` with
invented names (`SOME_MADE_UP_TECH`), `test()` not `it()`.

- **Kinds** (`flavor` and `config` specs, `extraction.service.spec.ts`): each
  suffix classifies; each designation key designates; a spec file under a
  `drivers` glob stays `test`; a file under two designation keys throws with
  both keys named; an unparsed designated file is a node of its kind with
  `reading: null`; `LAYERS` order (the mirror test against the viewer's copy
  waits for the merge — no viewer package here); the matrix rows — a driver
  importing a service, an adapter, model, blob, a boot; a boot importing two
  files; a test importing blob (clean).
- **Config**: the five keys validate and normalize; each malformed shape has its
  teaching error; `configLoads` string and list forms; `driverTech` patterns
  compile to the `external` grammar.
- **Reader** (`reader.model.spec.ts`, programs from the oxc adapter on fixture
  files): one fixture per shape — literal and template forms, reference chains,
  calls in every result position, `new`, tagged template, optional call, dynamic
  `import()` bound and unbound, `require`, records with spread, arrays,
  functions with destructured and defaulted parameters, control in statement and
  expression position, shadowing, `catch`, TS wrappers vanishing, `export`
  marking. **Tripwire**: a program carrying a node type the reader has never
  seen (a synthetic `SomeMadeUpNode` injected into a parsed tree, wrapping a
  call) yields the call classified and nothing else, no throw.
- **Reading on the graph** (`extraction.service.spec.ts` over fixture projects):
  - a driver whose hooks are handed to a declared `driverTech` package and to a
    host global: hooks cut, nested hook cut inside a hook, a callback to `.map`
    and to `.then` not cut and listed open;
  - every callee kind of the table hit once: service factory through an assembly
    result, adapter import, model import, blob import, language global on a
    use-case result, tech member on a tech value, prototype-method name on a
    tech value read as language, unclaimed package, pure package read as model,
    sub-driver wiring;
  - result flow per context: bound then returned, bound then member-accessed,
    argument of a factory, argument of a tech call, condition, discarded;
  - a sub-driver bound at one call site (kinds land), at two agreeing sites, at
    two disagreeing sites (`unknown`), at none (`unbound-parameter` open);
  - an assembly with a declared load traced through its factory, a declared load
    on a parameter instance (name match), an undeclared use-case call
    (`load: null`), a control on a parameter, on a load result, on an instance
    member;
  - a boot's root statements;
  - a test file: registration at root as a `tech` call, hooks cut from `test()`
    and `beforeEach()`, all four exemptions carried, a globals-mode runner cut
    with no import;
  - a model file: `root` read, no `functions`;
  - **tripwire**: a node of an outside kind that no injected tech covers
    (extraction built with the test-runner tech only, over a driver file) is
    `reading: null`, no throw.
- **Primary use cases**: hooks in two drivers on one assembly record; a use case
  reached from a test hook not labelled; an untraceable instance listed
  unresolved.
- **Self-read**: `extractGraph` over deblob's own package with
  `drivers: ["src/drivers/**"]` and `boot: ["src/drivers/cli/bin.ts"]` in a
  test-side config runs without throwing and reads `main.ts` as a driver with
  zero hooks. The classified counts are not pinned: they are 03's first
  diagnostics on real code, and pinning them here would freeze what 04 exists to
  change.
- **Gate**: coverage as today; `pnpm typecheck` green (the union's totality is
  the compiler's test); the suite red only on the two `rule-content` slug
  assertions (06).

## Implementation

Contained checkpoints, each handed back for staging, all building toward one
commit (chapter method).

1. **Kinds and keys.** `Layer` + `LAYERS`; matrix rows in `layers.model.ts`; the
   stock flavor's three suffixes and `test` naming; `FlavorLayer` comment;
   config keys `boot`, `drivers`, `tests`, `configLoads`, `driverTech` with
   `ResolvedConfig` matchers; `extractGraph` takes the designations and the
   conflict error. No reader yet. The self-check stays green (nothing in
   deblob's tree carries a new suffix; its config designates nothing new).
2. **The reader.** `program` and `source` at the port, the oxc adapter returning
   them (`astType: "ts"`, offsets); `reader.model.ts` — the scope resolver, the
   language lists, the kinds table, the cut, result flow, the open part, over
   plain data; the tech port and the two stock techs; the service choosing the
   tech by kind; `ModuleNode.reading` filled per file in the extraction loop,
   program dropped.
3. **The graph pass.** Call-site parameter binding and `configLoads` matching at
   the end of `extractGraph`.
4. **Primary use cases.** `useCaseLevels`.

Not in this step: wiring the techs into `main.ts` beyond passing `STOCK_TECHS`
and the new options through (03 wires the detectors; until then the reading's
first real run on deblob's own tree is the self-read test).

### Landed — checkpoint 2, 2026-09-17

What the code settled against the sketch above:

- `FileReading` gained `hooks` at root (a spec file registers its hooks from
  module root) and reads `tech: null` for an inside kind: root statements only.
  An outside kind no tech covers reads `null` on the node.
- Callee payloads: `factory` carries `layer`, `path`, `name`; `wiring` and
  `model` carry `path`, `name`; `forbidden-import` carries `layer` and `path`;
  `tech` and `unclaimed` carry the package (`null` for a host global or a
  tech-held value); `use-case` carries the member path and the instance's
  origin, the factory call it came from; `local` carries the name.
- `ResultUse` is the list of contexts a result reaches: `argument` (with the
  callee it fed), `returned`, `condition`, `member`, `entry`, `reassigned`,
  `computed`, `discarded`; a destructured result reads `member`.
- Hook parameters are tech values (the tech hands them); a hook nested in a hook
  is cut with the inner call. Every other function expression handed to a call
  is open (`uncut-callback`); a parameter no call site binds is open
  (`unbound-parameter`, checkpoint 3 binds); a callee the table cannot place is
  open (`unknown-callee`).
- The language lists: the intrinsics are hand-listed from ECMA-262; the
  prototype method names are read off those intrinsics at load, in the engine
  that runs deblob — the language by definition, the host's globals never
  consulted.
- A `let` reassigned anywhere in its scope is computed from its declaration on
  (flow-insensitive, by a pre-scan of assignments).
- The two stock techs are handed to extraction by the driver's wiring as an
  array — no `STOCK_TECHS` registry, nothing in config selects a tech yet.
- `PURE_BUILTINS` and the purity trichotomy moved from the layers detector to
  `graph.model.ts` (`externalPurityOf`): the reader and the detector read one
  source.
- Extraction's error vocabulary landed in checkpoint 1 (`ExtractionError`,
  `designation-conflict`) and vitest excludes `__fixtures__` from its test glob:
  fixture projects carry spec files of their own.
- `@oxc-project/types` is declared `external` and `pure` in deblob's own config:
  a types-only package, nothing on disk for the resolver.

### Landed — checkpoint 3, 2026-09-17

- Arguments carry their origin: `ReadCall.args` is `ArgValue[]` (kind, the
  instance's origin, the member path from it), so a call site can bind a
  parameter to an instance the callee can trace. `InstanceOrigin` carries the
  factory file's kind: an origin in an assembly is a record the reader cannot
  see through.
- The graph pass binds by position over every call site of an assembly function
  or a sub-driver's wiring function from another outside-kind file; two sites
  disagreeing on a position leave it unknown. A destructured parameter takes the
  argument's kind and its own key path (the record's entries are not read per
  key — a record of tech values binds `{ cwd }` to tech, a record mixing kinds
  binds to the join). The bound files are parsed and read again, to a fixed
  point, one round per level of the call chain.
- `configLoads` matching is the reader's, at the call: by member name, and by
  file when the instance is traced to a factory that is not an assembly's record
  — an instance reaching an assembly through the root's returned record has the
  assembly as origin, and the file test would never match. A matched load's
  result is a tech value; a branch on it reads `load`. A load naming a file
  outside coverage is `ExtractionError` `load-file-not-covered`.

### Landed — checkpoint 4, 2026-09-17

- A `return` statement carries its record when what is returned is a record
  literal, entry by entry with each value's kind and origin: the assembly's
  returned record is what a driver's use cases trace through.
- `useCaseLevels(graph)` in `extraction/levels.model.ts` returns `primary`
  (service file, member, driver, span) and `unresolved` (driver, member, span).
  Tracing follows the origin: a service factory ends it; an assembly's origin
  looks up the exported function's single literal returned record by the
  member's first key and continues with the entry's origin; anything else — an
  origin in an adapter or blob, a record returned through a binding, an instance
  no call site bound — is unresolved. Only hooks of `driver` files count; the
  CLI shows nothing of it this step.

## Docs

- `lib/extraction/README.md`: the nine kinds, recognition precedence, the
  `program` at the port and why ESTree is not an engine shape, the reader, the
  tech port and the two stock techs, the cut rule, the kinds table in one line
  each, the open part, config loads, primary use cases.
- `lib/config/README.md`: the five keys.
- `lib/check/README.md`: the matrix's three new rows.
- `03_outside-rules/SPEC.md`: the amendments above, marked with this step's
  date.
- Chapter PLAN: step 01 entry closed with the landing sha; row 37 marked DONE
  pointing here; the viewer reconciliation note (merge order) on the board.
- `docs/architecture.md`: unchanged. Skill files: unchanged (06).
