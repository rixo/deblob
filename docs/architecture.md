# Hexagonal Architecture — Theoretical Foundation

> _"Allow an application to equally be driven by users, programs, automated test
> or batch scripts, and to be developed and tested in isolation from its
> eventual run-time devices and databases."_ — Alistair Cockburn, _Hexagonal
> Architecture_ (2005)

An opinionated implementation of established principles. Cockburn's Hexagonal
Architecture, Palermo's Onion, Martin's Clean Architecture, Evans' DDD and SOLID
converge on one topology: domain logic at the center, dependencies pointing
inward, infrastructure outside. This document fills the gap toward a concrete,
enforceable guide for TypeScript / ESM / web. The principles are theirs; the
prescriptions are ours.

It is the **why**, the first of three levels. The implementation guide is the
**what**: file layouts, naming, platform patterns; several valid guides can rest
on one foundation _(separate document, not yet published)_. The flight manual is
the **how**: lookup rules for daily use by agents and developers _(planned)_.
Each level stands alone for its scope, and an outer level can be re-created from
the inner one.

The goal is an architecture with teeth. "Dependencies flow inward" is true and
does not tell you whether `manifest-source.adapter.ts` may import
`icons.service.ts`. This document does. Violations should be visible by shape,
not only by reasoning.

It is also retrofitable, methodically. You have a working prototype, all in a
blob. You make the cut: a facade service whose use cases are the entry's
commands, a port for what the legacy body does, an assembly that builds the
legacy code as blob behind that port, a driver plus boot that fire the facade.
Green from here. You separate concerns into services. Use cases surface into
`.service.ts`, types and pure functions into `.model.ts`. The extensionless
files left over are the blob: code no layer has been ruled for yet, owned as
debt, shrinking as extraction proceeds. The architecture reveals itself in
existing code under the pressure of testing.

Distilled from production practice, at varying degrees of maturity and
completeness: two brownfield codebases under months of daily use, a workbench
app adopting it as it grows toward a complete application, and this repo's own
CLI, which checks itself with it.

Naming conventions (`.model.ts`, `.service.ts`) are used for illustration. They
are one valid implementation; the final word on naming belongs to the
implementation guide.

---

## Terminology

**Hexagon** — the architectural shape from Cockburn (who later preferred "ports
& adapters"). A hexagon has an inside and an outside, connected through ports.
Any self-contained unit that isolates itself from its environment through
contracts is a hexagon. The term is used sparingly in this document, when the
inside/outside boundary and port connections are the point.

**Service** is the primary unit of this architecture. It sits at the
intersection of three independent concerns, each giving the word "service" a
different meaning, each with its own rules:

- **Isolation** (hexagonal) — a service package holds a hexagon: model, ports,
  service layer. Its adapters are filed alongside and sit outside it, connected
  through the ports they implement. Composition unit is a different axis:
  `.service.ts` and `.adapter.ts` files both declare "I am built by assembly" —
  one is a hexagon's inside, the other its outside.
- **Layering** — code is organized in layers: model, ports, service, adapters,
  assembly, drivers, boot. Dependencies point inward.
- **Packaging** — the service is the unit of ownership, visibility (`private/`),
  sharing (DAG participation, kernel extraction, anti-corruption boundaries).

Two distinct meanings depending on context:

- **Service** (the package) — the directory, the organizational unit, the DAG
  node. Contains a hexagon, its adapters, and layers.
- **`.service.ts`** (the composition unit) — declares "I am a hexagon's inside,
  built by assembly."

Context usually makes it obvious which meaning is intended; when it doesn't,
this document is explicit.

---

## Hexagonal architecture

This section presents the hexagonal architecture we're building on. The
terminology is already partly ours (notably "driver"), but the principles are
Cockburn's.

### Inside and outside

A hexagon has an inside and an outside. The inside is the core — the logic, the
domain, the reason the hexagon exists. The outside is everything else: external
systems, users, other hexagons, the runtime environment.

The inside doesn't know the outside exists. It defines what it needs and what it
offers through **ports** — contracts at the boundary. The outside connects
through those ports via **adapters** that translate between the port's shape and
the external world's shape.

This separation is the foundational guarantee: the inside can be developed,
tested, and reasoned about without any knowledge of what's on the other side of
its ports.

### Ports

Ports are contracts at the hexagon's boundary, **shaped to the inside's needs**
— not shaped around what the external system offers. This rules the domain's
ports. A service that exists to front a CLI, an HTTP API or a UI takes what that
CLI, API or UI sends — a `check(options)` that takes the parsed command —
because translating it is the service's job; the domain services it calls never
see the command (see [Driver](#driver--the-outermost-layer)).

- A port defines a shape: what the hexagon needs from the outside (outbound
  port) or what it offers to the outside (inbound port)
- The inside codes against ports, never against concrete external systems
- Port interfaces belong to the hexagon that defines them

**One port, one interface.** All adapters for a given port implement the same
interface and produce the same result shape. The inside should never know — or
need to know — which adapter it's talking to. If it does, the port hasn't
finished abstracting the outside away. Adapters absorb source-specific details
so the inside doesn't have to.

**Ports are types only** — no runtime code, no logic. Implementations live in
adapters; wiring lives in assembly.

### Adapters

Adapters implement ports for a specific technology — half the name of "ports &
adapters." Their job is to translate between the hexagon's language and the
external world's language, normalizing external-world specifics into the port's
common shape. Source-specific details (a design tool's API structure, a JSON
manifest's format, a REST endpoint's response shape) stay inside the adapter.
What comes out conforms to the port. This is what makes adapters replaceable —
not that they're "simple," but that they absorb specificity.

An adapter sits outside the hexagon it serves. It is a hexagon in its own right
— and a full service package: its own layers, its own packaging boundary, its
own DAG participation (see [Services](#services--our-interpretation) and
[Rules](#rules)). An adapter that talks to an external API has its own internal
logic, potentially its own model functions, its own external dependencies. The
hexagonal pattern is fractal — an adapter with an inside of its own has its own
ports and its own adapters. The same structural principles apply at every level
of nesting; what never changes is that the adapter is outside the hexagon it
serves.

**Fractal assembly.** Who composes a nested adapter's internals? The adapter's
own factory. A composition unit's factory function doubles as the composition
root for its internal hexagons: it instantiates its internal sub-adapters, which
live under its own `private/`, wires its internal ports, and returns the
assembled unit. From the outside, assembly sees one composition unit; the
fractal assembly inside is an implementation detail. Dependencies that are
genuinely external to the adapter (an HTTP client, a logger) are still injected
from outside — internal composition covers what the adapter owns, not what it
consumes.

This has a critical consequence: an adapter connects to the hexagon it serves
through the port it implements. It's a separate hexagon, and hexagons
interconnect through ports, not through direct access to each other's internals.
The specific dependency rules are detailed in [Rules](#rules), once layers are
introduced.

### Drivers

Drivers are the driving side — the mechanism by which the outside world triggers
the hexagon. A CLI command handler, an HTTP route, a unit test, a UI event
handler: each turns an external event into a call on the hexagon's inside. This
is Cockburn's driving side. What he calls the driving adapter is, here, two
things: the driver, which holds the tech and no inside, and a facade service,
which holds the translation (see
[Driver — the outermost layer](#driver--the-outermost-layer)). A driver is not
an adapter in this document's taxonomy: it implements no port and defines
nothing, so it is never a hexagon.

What distinguishes drivers semantically: where an outbound adapter is a means to
an end (the hexagon needs external data), a driver is a goal — it's the reason
the hexagon is accessible to the outside world. "We need a CLI" or "we need a
web interface" are driver-level decisions. Without drivers, nothing happens — no
trigger, no execution.

Who builds the hexagon and who fires it, and what a driver may hold, are this
document's rules, not Cockburn's — see
[Driver — the outermost layer](#driver--the-outermost-layer).

### Assembly

Before any driver can fire, someone has to instantiate adapters, wire them to
ports, create services. That is assembly: the composition root — Seemann's word
for it — written by hand. It is not an adapter: it translates nothing. It is not
a composition unit: it is called, never built. It builds the hexagon from what
the driver hands it — tech values such as a working directory or an environment
— and returns the built instances for the driver's hooks to call.

Cockburn does not say who builds the hexagon or who fires it. Keeping the two in
separate files, with one right each, is ours — see
[Assembly — the composition root](#assembly--the-composition-root) and
[Driver — the outermost layer](#driver--the-outermost-layer). A third file is
ours too: something has to execute when the runtime loads the program, and that
is the boot — one import, one call, nothing else — see
[Boot — the entry](#boot--the-entry).

---

## Services — our interpretation

Here we depart from Cockburn. He describes the shape: inside, outside, ports,
adapters. He does not say how to organize the inside, how hexagons share code,
who builds one or who fires it. We do.

Code is organized in **layers**, a dependency hierarchy over the whole program.
Each layer knows more of the system than the one before it. Dependencies point
inward; lateral dependencies are allowed.

Layers are not the hexagon. The hexagon is model, ports and service: ports its
boundary, model and service its inside, the thing that can be tested through its
ports in isolation. Adapters, assembly, drivers and boot are the outside. The
layer order says who may depend on whom, not who belongs to what. The folder is
a third axis: a service package files its adapters, and may file its own
assembly, next to its hexagon; filing together is not being inside. Constraints
do not thin outward: the inside is ruled by what it may depend on, the outside
by what it may do, and the widest import rights carry the narrowest verb lists.

Inside the hexagon, innermost first:

- **Model** (`.model.ts`) — domain knowledge. Abstract: no dependencies beyond
  model, no ambient environment access, stateless modules. The most constrained,
  the most valuable.
- **Ports** (`.port.ts`) — type-only contracts at the hexagonal boundary. No
  runtime code. Adapters implement them; service code depends on them.
- **Service** (`.service.ts`) — decisions. Orchestration, use cases, injected
  dependencies. Composition unit — must be composed by assembly.

Outside it, inward to outward:

- **Adapters** (`.adapter.ts`) — port implementations for a specific technology.
  Can depend on concrete external systems. Composition unit — must be composed
  by assembly.
- **Assembly** (`.assembly.ts`) — the composition root. Imports composition
  units, calls their factories, returns the instances. Imports everything, holds
  no tech, decides nothing but which factory to call. One right: build.
- **Drivers** (`.driver.ts`, framework entry points) — the driving side. Hold
  the tech and the hooks it fires; call assembly to get the hexagon, call one
  use case per hook. Started by a boot, imported only by a boot or drivers. One
  right: fire.
- **Boot** (`.boot.ts`) — the entry. Imports one driver and calls its wiring
  function once, at module root, with no arguments. The one module whose
  evaluation performs a call. Two rights: import one driver, call it.
- **Test** (files matched by the test globs) — assembly and driver in one, by
  the shape of the test tech. Imports anything, blob included; defines anything;
  imported by nothing (`test-is-assembly-and-driver`). Shared test code is not
  test kind: it is an adapter, an assembly, a model or a driver, by what it is.

Suffixless files are blob — no layer declaration, no layer guarantees.

**Composition rule:** public `.service.ts` and `.adapter.ts` can only be
imported by assembly. (Files under `private/` are not subject to this rule.
Type-only imports are also exempt — see `runtime-import`.)

Inside the hexagon, an outer layer may contain inner-layer code (model logic in
a `.service.ts` file is fine — it just inherits the stricter consumption
constraints of its host layer); the reverse is never acceptable. Adapters and
the outside kinds do not get this: an adapter holds what its port needs and
nothing of the hexagon's, and assembly, driver and boot define nothing at all
(their rules below).

### Model — knowledge

Types, pure functions, constants, self-contained factories, core business logic:
what the service _knows_. The most valuable code, independent of any
orchestration context.

The bar is abstractness, the opposite of `service-purity`'s "concrete", not of
"implemented". Model code lives in the domain of ideas; contact with the world —
I/O, time, randomness, platform — is what makes code concrete:

- Depends on nothing outside the model layer — no ports, no concrete imports
- No ambient environment access — time, randomness, `globalThis` are inputs
  passed by the caller, not discoveries
- Stateless modules (`stateless-modules`) — no module-level mutable state,
  exported or not: no top-level `let`, no unfrozen collections, nothing a
  closure could capture at module scope; state lives inside factories, and a
  module exports factories, never instances
- Factories with closure state are model when they depend on nothing — domain
  machines, entities, dependency-free reactive stores. The moment a factory
  takes a port or a service, it is a composition unit and belongs in the service
  layer

Model code from different services may depend on each other: that is
model-to-model, within the layer. What model cannot do is depend on any outer
layer. The constraint is about layers, not packaging.

**Pure third-party libraries count as model.** A date library, a parser, a
schema validator: acceptable as long as they are side-effect-free and
deterministic. Anything with I/O, ambient state or environment access is
concrete (`service-purity`) and belongs behind a port.

Model is testable in isolation with plain values, no mocks, no setup. Full unit
coverage is the expectation; these are the cheapest tests to write. A service
with only a model layer is valid: the architecture does not prescribe which
layers exist, only the rules for those present.

### Service layer — decisions

The service layer is what the service _does_: its use cases. Each function on
the returned API is one — `list`, `resolve`, `import`, `publish`. The service
exists because these use cases exist, and only as long as they do. If you cannot
name them, you have a utility bag, not a service.

Use cases have levels, Cockburn's. A **user goal** is what an actor comes for
(`check` a codebase); a **subfunction** is a step in its service (`scan` the
files); a **summary** bundles goals over time. All of a service's use cases are
visible on its export surface, and the surface alone does not say the level; the
driver does. A use case reached from a driver's hook is a user goal on that
channel — the same goal whether a CLI command or an HTTP route fires it; reached
only from services, a subfunction; from both, both. A test driver labels
nothing. The level is a map annotation, never a violation; where the label
disagrees with the author, the author is right. Our aliases: "primary use case"
for user goal, "instrumental use case" for subfunction. Avoid "secondary use
case": the hexagon already uses primary and secondary for adapters.

Where model is knowledge, the service layer is decisions: which model functions
to call, in what order, with what inputs, and how to combine results with data
from injected dependencies. It orchestrates; it does not compute.

- Module-level code must be stateless — state lives inside the factory closure
- Dependencies are injected through the factory's arguments (IoC)
- The returned API is the contract consumers depend on

```typescript
export function createMyService({
  config,
  otherService,
}: {
  config: MyServiceConfig
  otherService: OtherServiceAPI
}) {
  // State lives here, in the closure — injected, not imported
  const cache = new Map()

  function doThing(input: Input): Output {
    const processed = myModel.transform(input) // model knows
    const external = otherService.fetch(processed) // service layer decides
    return external
  }

  return { doThing }
}
```

A suffix is a declaration: `.model.ts` declares purity, `.service.ts` a
composition boundary, `.adapter.ts` a port implementation, `.port.ts` a boundary
contract. No suffix, no declaration, no guarantee: suffixless files are blob,
code not yet placed in a layer. Only assembly and test files may consume them
(`blob-quarantine`).

#### Inversion of Control

All dependencies are explicit; no defaults. The service declares what it needs,
[assembly](#assembly) provides it. Default parameter values for dependencies are
tempting and harmful: they create static imports from the service to its
adapters or config sources, violating the dependency rules, defeating code
splitting, and scattering assembly logic across service modules. Assembly is the
only place where dependencies are resolved. No exceptions.

How the instances assembly returns reach the hooks — a return value on a CLI, a
context on a component tree — is specific to the driver technology; see the
implementation guide.

### Assembly — the composition root

Assembly builds the graph. It imports concrete adapters and services, calls
their factories in dependency order, hands each instance to those that need it,
and returns what it built. It is the one place in the program that knows the
concrete graph; the services never know it exists.

A file that may import anything must be allowed to do almost nothing with it, or
it becomes the place where logic hides. So the layer with the widest import
right carries the narrowest rule. Three terms the assembly and driver rules use
in a fixed sense. A **tech value** is what the tech hands the program — argv,
env, a request, an event, a parsed option — or holds for it — a component's
state, props, context — plus what a declared load returned. A **literal** is a
constant written in place. A **definition** is any declaration — function,
class, variable, type — other than the hooks, wiring functions and assembly
functions the rules name. Assembly holds no tech and decides nothing but which
factory to call (anchors in the [Summary](#summary)):

- **`assembly-builds-only`** — every call in an assembly is there to build: a
  composition unit's factory, another assembly's, or a blob file's when a
  dependency not yet extracted is built here and injected behind the port that
  awaits it. A model call is allowed on the same terms as any other — its result
  is passed on or returned, and nothing in the assembly touches it, which is
  also how a dependency-free instance gets shared between services. Arguments
  are literals, tech values received as parameters (a working directory, an
  environment, a framework's context handle passed through and never called), or
  instances built or received here. It returns services — one, or a record of
  services and shared model instances — and no adapter unless a test is the
  caller. No use-case call: a use case whose result feeds a factory is a
  pipeline hiding in the wiring. By default config is wired as a dependency (the
  config service, the [ubiquitous port](#config--the-ubiquitous-port)) and
  loaded inside the use case that needs it. The exception is the **load**, a use
  case the graph itself depends on — the config service's, when the graph varies
  with a config file. Loads are declared, not inferred: nothing in the shape of
  a call tells a load from a use case run for its effect, so the project names
  the use cases its assemblies may await, one or several, and an undeclared call
  is a violation whose resolution is the declaration. A load's result counts as
  tech values from then on: it feeds factory arguments, conditions and loops,
  and nothing computes on it. A branch or loop is wiring when what it tests or
  iterates is a parameter or a loaded value, compared to a literal or for
  truthiness, and its arms are factory calls. A condition on an instance, or on
  a value computed from one, is a decision the map cannot show; it belongs to
  the service or adapter that owns it. Nothing but assembly functions is
  defined, as many per file as the author wants, and nothing sits at module root
  but imports (`stateless-modules`).
- **`assembly-driver-only`** — an assembly file is imported only by drivers and
  other assemblies, type imports included. An assembly has no contract of its
  own; its shape is the services it returns, and `runtime-import`'s exemption
  does not reach it. Consumers type against service APIs.

What an assembly imports: composition units, other assemblies, model — whatever
it calls there, the result is passed on or returned and never computed with —
and blob, the only layer that may. Blob enters the graph here and nowhere else,
as an instance behind a contract the service already holds (`blob-quarantine`).
Never a driver, never concrete tech: tech values arrive as parameters. A runtime
container library is tech and enters only by explicit configuration; without
that declaration the import is a violation. Deblob has no other opinion on
containers: a container imports what it weaves, so it is an assembly by imports,
and the same invariant holds — it constructs and never calls a use case.

Assemblies are fractal. A root assembly builds what is shared and passes it
down; a group assembly next to the driver that uses it builds its own graph from
what it received. Shared instances flow down, never sideways: an assembly that
wants a sibling's instance is asking for that instance to move up. Assembly
files are also where a bundler splits — they are the only files that import
composition units, so the chunk graph is the assembly graph, and a lazily loaded
feature is a lazily imported assembly.

An assembly does not return adapters, except when called by a test: a spec file
asserts on what its fakes recorded, so a test factory hands them back (see
[The test factory pattern](#the-test-factory-pattern)). The corollary is that an
assembly that returns adapters can only be called by tests.

How the checker reads it: by callee file kind and by result flow. A callee from
a service, adapter, assembly or blob file is a factory by construction; a call
result may only be passed on or returned, never branched on, computed with, or
member-accessed. A model call is read on the same terms — its result is passed
on or returned, and the assembly does nothing else with it — so whether that
model export builds an instance or computes a value is a question the checker
never has to ask, and never asks.

What the rules do not guarantee: that a stateful service is built once. Two
drivers calling the same assembly get two instances — valid, visible on the map
as fan-in, and the author's to decide. That is Seemann's lifestyle, chosen here
by which assembly builds what. One root per entry point is his rule too —
several entry points are several applications, a multi-page site included — and
a group assembly is his root, which he says may be split into functions.

### Driver — the outermost layer

The driver holds the tech and fires the hexagon. It imports its assembly and its
tech, reads what the tech gives, and hands the instances assembly returned to
its hooks. It is coupled to the runtime by nature and essentially untestable:
Meszaros's Humble Object, kept so thin that nothing in it needs a test.

**Only a driver listens to the tech.** The argument parser, the server, the test
runner's callbacks, the component the framework mounts: the driver is the one
place in the program that receives their events. An adapter may call into the
same tech on the outbound side, behind a port. The driver receives the hexagon
already built and fires its use cases from **hooks**, the callbacks the tech
invokes. It does not build the hexagon; that is
[assembly](#assembly--the-composition-root). Nothing but a boot or another
driver imports a driver. Node runs the boot, the test runner runs the spec file,
the framework mounts the component.

What "one hook" is depends on the tech: a `.command().action()` callback on a
CLI, a route handler, a `test()` body, an event handler in a component. So are
what counts as a call, a definition, or wiring. So each technology comes with a
**reading**: how its driver files are recognized, which packages are its tech,
how its files are cut into hooks, and which driver rules it exempts. The driver
rules are ascribed through that reading; in the checker it is one adapter per
tech, as the flavor is one per naming convention. The reading is also the limit
of the rules: a callback it does not cut — a middleware, a `beforeEach`, an
effect it does not know — is not a hook and is not judged. Lenient by default,
on purpose: a tech the checker half knows must not turn a codebase red for what
it does not understand. What a reading leaves uncut is that tech's open part,
stated in the reading, not a rule. Plain-TypeScript drivers carry the
`.driver.ts` suffix; a tech's own files are declared by glob — spec files by the
test globs, framework entry points by the framework's patterns. Web drivers are
open, research in progress; the one thing claimed for them is the recognition
rule: a component matching the declared driver globs may import an assembly, any
other component doing so is a violation. A file of an unruled tech matching no
driver glob is outside the graph until that tech is ruled — not blob: the suffix
rule reads `.ts` files.

The driver rules make thin the only legal shape:

- **`wiring-outside-hooks`** — outside its hooks, a driver only wires: assembly
  calls, tech setup (the parser, the server, the mount), sub-driver
  registration. Arguments are tech values, instances, literals. Wiring may also
  sit inside a hook — an assembly imported lazily on first event, cached in the
  wiring function's closure; the rule says what may sit outside them.
- **`one-call-per-hook`** — a hook may wire, and it makes exactly one use-case
  call. Two calls mean the sequence between them is a use case nobody owns: it
  gets a facade service, with a contract and a test, and the two become its
  subfunctions. Zero calls is a violation too: a hook with no use case is logic
  with no home. The call is unconditional, and the hook translates nothing
  around it: arguments are tech values, instances and literals, unchanged; the
  result is returned, or handed whole to the tech — a tech call, tech-held
  state. A default on the way in (`opts.cwd ?? process.cwd()`), a branch on the
  result (`if (result.ok) exit(0)`), a transform before handing
  (`JSON.stringify(result)`), an error mapped to an exit code: each is
  translation, and translation is the facade service's use case — the exit code
  is part of its result, the rendering its job through the io port. This is the
  rule that closes the loop; the others exist to make it unavoidable. Ruled for
  plain-TypeScript drivers; a web reading says where the line sits when the view
  model is the tech's.
- **`driver-calls-services-only`** — a driver calls use cases, assembly
  factories, sub-driver wiring functions, and its own tech. Never an adapter: an
  adapter call from a hook is an effect no contract covers. Never a model:
  parsing and rendering are use cases of a service. A driver's tech is what its
  reading claims, or what the project declares as tech for a technology no
  reading knows yet; an external import neither claims is a violation whose
  resolution is the declaration, and a pure library is model and red regardless.
- **`driver-defines-hooks-only`** — the only definitions in a driver are its
  hooks and at most one wiring function: a root driver's `main()`, which takes
  nothing and reads its tech itself, or a sub-driver's
  `registerCheckCommands(cli, services)`, which takes tech and instances from
  its parent. Anything else is residue: a local `parseFoo` is a model without a
  test, a table of lambdas a service without a contract.
- **`driver-to-driver-wiring`** — a driver imports another driver only to call
  its wiring function, during its own wiring, passing tech and instances. Never
  a hook, never data from the hexagon. This is how one entry point splits its
  hooks across files: a CLI whose command groups each live in their own driver,
  a server whose route files the main driver mounts, a spec file calling a
  shared `registerMatchers(expect)`. The sub-driver exports that one wiring
  function and no hook, so the only thing the root can do with the import is let
  it attach its callbacks. Calling a sub-driver from inside a hook, or handing
  it a use-case result, would let one hook chain two calls through one level of
  indirection. A parent component rendering a child in markup is not this rule;
  that is the tech mounting it.
- **`driver-not-imported`** — nothing but a boot or another driver imports a
  driver, type imports included.

**Assembly and driver are not blob.** Blob is unqualified code, owned as debt
until distillation places it. Assembly and driver are code ruled necessary for
building and firing the system, and for nothing else. The privilege to import
anything is not permission for anything to live here: a decision written in
either is blob hiding under a label. The closed verb lists forbid it: a declared
assembly or driver file cannot absorb a line of logic without turning red.
Genuinely unplaced code is owned as blob — suffixless, importable by assembly
and tests only — so the debt stays visible instead of laundered. A driver has no
legal use for a blob import, so a driver that still needs unplaced code is not
ready to be declared: it stays suffixless until the services it will call exist.

The retrofit path follows: a legacy entry file is blob importing blob, green
until something in it is declared, and the first cut installs the four outside
files at once (see [Progressive adoption](#progressive-adoption-for-humans),
Stage 1). The one red route is to extract a domain service before the cut: a
blob entry cannot import a composition unit, so the program has no green state
until the cut is made.

A CLI tool shows the shape. The CLI service (`src/lib/cli/`) exposes the
commands as use cases — `check(options)`, `status(options)` — orchestrates the
domain services through ports, renders, and writes through an io port; it is
tested through that contract. The assembly (`cli.assembly.ts`) builds the fs
adapter and the config service from a working directory and an environment,
awaits the declared config load, builds the domain services and the CLI service,
and returns the CLI service. The driver (`cli.driver.ts`) is what is left:
`main()` reads the process, calls the assembly, registers one command per hook
on the parser, and each hook makes its one call. The boot (`cli.boot.ts`) is the
shebang, one import and `main()`. Cockburn's driving adapter is, here, the
driver plus the CLI service: the translation between the channel's shape and the
domain's is ruled as a service so that it gets ports and contract tests instead
of living unruled. The domain services never see the command line; the CLI
service does, by design: its use cases take what the parser produced. It is also
where the logic that no longer fits a hook lands, with every light green: a
facade has full service rights, a contract and a test, and no rule looks at its
size. A large CLI splits its hooks across driver files by taste and its wiring
across assemblies by the shape of the graph; neither split can hold logic.

Where does the logic go when the rules force it out? Into a service, where the
service rules apply on arrival. The rules cannot stop a tasteless implementer
from stuffing domain logic into the CLI service; but that is a service with a
contract, and the contract will be argv in, text out — the tax that makes
extraction the easier path. Invisible debt becomes visible debt, on the map, in
the wrong box. The last mile is taste.

The port test — "can I meaningfully define a port for this?" — places outbound
code: yes, it is a service concern behind a port; no, it is an adapter. It says
nothing about inbound: every line of an assembly or a driver fails it by
construction. Their placement follows the rules above.

A driver technology is never a port, and never needs to be one. Inbound, the
hexagon's port is the service layer's export surface — Cockburn's driving port —
and each technology that fires it is one more driver written against that
surface: a CLI, a Svelte app, a React app and an HTTP server are four drivers on
one hexagon. Only drivers listen to the tech, so on the inbound side there is
nothing to abstract. Outbound is different. When a service needs something the
framework provides — routing, navigation, storage — it gets a port scoped to
that need, and a framework-side adapter implements it. Abstracting the framework
wholesale is the trap: indirection at every touchpoint while married to the one
implementation. Slice it to what the service asks for.

### Boot — the entry

Something must execute when the runtime loads the program. That is the boot
(`.boot.ts`, or a file declared by glob when a framework owns the name): the one
module whose evaluation performs a call. Two rights, nothing more:

- **`boot-one-call`** — a boot imports a single driver and calls its wiring
  function once, at module root, with no arguments. It imports nothing else,
  defines nothing, holds nothing, touches no tech: `process`, `document`, the
  parser are the driver's to read. Nothing imports a boot; a program has one per
  entry point — a bin, a server, an app.

The CLI's boot is `cli.boot.ts`. A single-page app's boot calls the driver's
`main()` that mounts the root component. A framework that loads route files
itself, or a test runner that loads spec files, is a boot outside the program,
so those drivers have none in the tree. The boot is the exemption
`stateless-modules` needs to hold everywhere else.

### Visibility: public by default, private by intention

Example:

```
icons/
  model.ts                     # public — any service's model can import this
  service.ts                   # public — assembly imports this
  legacy-helpers.ts            # blob — no layer; only assembly and tests may import (residue from retrofit)
  ports/
    icon-source.port.ts        # public — adapters import this to implement it
  manifest/                    # public — nested service, directly addressable
    model.ts
    adapter.ts
  private/
    scoring-heuristic.model.ts # private — only icons/ code can use this
```

> Naming note: a bare layer filename (`model.ts`, `service.ts`) is the suffix
> convention's degenerate case — the basename _is_ the layer declaration.
> `icons/model.ts` and `icons/icon-scoring.model.ts` declare the same layer; use
> the bare form when the service has one file per layer, the suffixed form when
> a layer spans several files.

Consumers import directly from the layer:

```
import { normalize } from '../icons/model'              # layer visible: model
import { createIconsService } from '../icons/service'    # composition unit: assembly only
import type { IconSourcePort } from '../icons/ports/icon-source.port'  # layer visible: ports
```

Everything not under `private/` is public. Everything under `private/` is
internal to its containing service. The layer is visible in the import path —
dependency violations are visible by shape.

#### The problem with index.ts

The conventional entry point — an `index.ts` re-exporting the public surface —
breaks the architecture. The dependency rules are defined per layer, and they
are enforceable only if the layer is visible at the import site. When `index.ts`
re-exports model and service indistinguishably, the consumer cannot tell which
layer it imports from, and the matrix becomes unenforceable — by tooling, by
review, by shape.

#### Layers as the API surface

**There is no `index.ts`.** Consumers import from the layer they need. Seeing
`import { ... } from '../icons/service'` in an adapter file is a red flag with
no file to open: the path tells you.

So everything exported from a layer is public by default. That is how the
language works — JS is public-by-default at every level — and how services are
in practice: most of a service's contents, model types, factories, port
contracts, are designed for external consumption.

#### The `private/` directory

What must be hidden from external consumers goes in a `private/` directory.
Visibility is explicit in listings and import paths; it applies fractally
(`private/model.ts`, `private/child-service/`, `private/ports/`); and
`import { x } from '../icons/private/helper'` in a review is an instant
violation. `private/` is a visibility axis, not a layer: a file under it
declares its layer by suffix like any other, and a suffixless private file is
blob — hidden blob, still importable by assembly and tests only
(`blob-quarantine`).

#### The tradeoff

Public-by-default is counter-intuitive and demands discipline: what you export
is visible, and internal-only code must be moved under `private/`. The
alternatives are worse. `index.ts` erases layer boundaries. A `public/`
directory — everything private, the API marked explicitly — taxes the many files
for the few that are internal; a valid choice with the opposite tradeoff, for
codebases where internal code dominates. Access-control tooling adds
infrastructure nobody maintains. `private/` pays awareness for layer boundaries
visible in every import path.

### Nesting

A service directory can contain other service directories. This is filing, not
architecture. Nested services follow the same rules as siblings: same DAG
participation, same `private/` boundary, same layer rules. Physical nesting
confers no privilege; a nested service cannot access its parent's `private/`.

**An adapter is a full service package** — even when nested under the service it
adapts for. It has its own layers, its own `private/`, its own DAG edges.
`icons/manifest/` is an independent service that happens to implement a port
from `icons`.

**Layer directories are not nested services.** `icons/model/`, `icons/ports/`,
`icons/service/` are internal structure of `icons` and can access
`icons/private/`.

**The direction law.** A nested adapter's edges point up: it type-imports the
port it implements and, at most, model code of the service it adapts for. The
parent stays import-blind to its public children — their instantiation and
injection are assembly's job, wherever assembly lives. Since the child already
points up, any parent import of the child's files closes a service-level cycle
(`no-service-cycle`). A nested child with no upward edges — a component the
parent composes — may be imported freely. The child's role picks the direction;
`no-service-cycle` enforces one direction per pair. The common trap is the
parent importing its own adapter's model or service-layer code: the adapter
already depends on the parent's port, so the parent depending back is a cycle.

### Distillation

Logic often starts in the service layer, inside a use case. Extracting it to
model is a commitment: this knowledge stands on its own, with value independent
of the use case it serves. In the service layer a function may use orchestration
context and injected dependencies; in model it is context-free, everything
arriving through its arguments or living in state it owns. The signal for
extraction: could this function serve a consumer who does not care about the use
case it was born in?

Premature extraction has costs. Private in the service layer (closure-scoped,
not exported), logic is an implementation detail: refactors are free, tests
cover it through the use cases, naming is contextual. Extracted, it grows a test
surface of its own, a public name that is now API, and an interface that is a
contract. The tradeoff tilts toward waiting: extract when the concept has
stabilized and could genuinely serve consumers beyond its current use case.
Until then, keeping it private is discipline, not laziness.

---

## Rules

Non-negotiable. These are the architectural constraints that, if violated, break
the guarantees the system provides. All hard rules are negative — they define
what is forbidden. They don't conflict with each other. Positive tensions (merge
vs split, extract now vs wait, shared kernel vs anti-corruption boundary) are
domain decisions: the architecture provides mechanisms, signals, and guidance,
but cannot resolve them — only someone who knows the actual domain can.

### The dependency matrix

Combined result of every rule stated at the import level — the layer rules, the
composition rules, and the rules of the outside kinds (assembly, driver, boot,
test) — all negative. The matrix is their intersection: a "can import" entry
means no rule forbids it.

| Layer        | Can import from                                   | Cannot import from                                         |
| ------------ | ------------------------------------------------- | ---------------------------------------------------------- |
| **Model**    | Model, pure third-party libs                      | Everything else, incl. concrete                            |
| **Ports**    | Model, ports                                      | Everything else, incl. concrete                            |
| **Service**  | Model, ports, `private/` of own service           | Adapters, assembly, drivers, other `.service.ts`, concrete |
| **Adapters** | Model, ports, `private/` of own service, concrete | Other adapters, assembly, drivers                          |
| **Assembly** | Model, ports, composition units, assemblies, blob | Drivers, concrete (a declared container library excepted)  |
| **Drivers**  | Assemblies, drivers, their own tech               | Composition units, model, blob, boot                       |
| **Boot**     | One driver                                        | Everything else, tech included                             |
| **Test**     | Anything, blob included                           | — (imported by nothing)                                    |

The matrix governs **runtime imports**. What assemblies, drivers and boots may
_call_ is narrower than what they may import — see their rules. Type-only
imports (`import type`) are exempt from composition rules (`runtime-import`).
Assembly, driver and boot are not composition units, so the exemption does not
reach them: nothing but a boot or a driver imports a driver, nothing but an
assembly or a driver imports an assembly, nothing imports a boot, type imports
included. In the other direction type imports are free: a driver or an assembly
may type-import from any layer, since a hook's options or a wiring function's
signature name shapes and call nothing — the driver row's prohibition is about
calls. "Concrete" means platform/IO code: `node:fs`, HTTP clients, database
drivers (`service-purity`). Pure, deterministic third-party libraries count as
model.

The matrix is about layers, not packaging — model in service A can import model
from service B. Packaging boundaries are `private/` and the sharing rules (see
[Sharing](#sharing)).

Blob sits outside the matrix: no layer, no guarantees, consumed by assembly and
test files only (`blob-quarantine`). The suffix absence is the declaration —
_not placed in a layer yet_ — and distillation extracts each piece into the
layer it belongs to.

### The acyclic dependency rule

No circular dependencies. Two levels, both enforced by tooling in CI.

**Service-package level (architectural).** Dependencies between services —
model-to-model included — form a directed acyclic graph. If any file in service
A imports any file in service B, that is an edge A → B; if any file in B also
imports any file in A, whatever the layers, that is a cycle, and neither service
can be extracted, moved or reasoned about alone. Every import kind counts here,
`import type` included: A referencing B's types means A cannot build without B's
sources. (The module level below is runtime-only; the asymmetry is deliberate.)
When a cycle threatens, the sharing progression applies (see
[Sharing](#sharing)). Wiring that would close a service cycle is misplaced:
composition belongs in an assembly outside the service tree or in the service's
own assembly, and in tests the fixtures are test-purpose adapters, not the real
nested ones.

**Module level (sanity).** Circular runtime dependencies between files, even
within one service, are forbidden. Circular imports in bundled ESM typically
work in dev and fail silently in production with opaque "undefined" errors in
minified code. The same tooling catches both levels. Type-only circular
references are not an ESM problem and are not covered.

Both are hard requirements. Relying on humans or agents to trace dependency
graphs by hand is writing JavaScript without a type checker and hoping.
File-level detectors (`madge`, `dpdm`) catch the module level; the service level
needs tooling that knows service boundaries.

### Summary

**Layer rules:**

- <a id="inward-deps"></a>`inward-deps` — **Dependencies point inward** —
  `model < ports < service, adapters < assembly < drivers < boot`. Lateral (same
  layer) OK. See dependency matrix for the combined result with composition
  rules.
- <a id="layer-in-path"></a>`layer-in-path` — **Layer is visible in the import
  path** — no `index.ts` indirection.
- <a id="chain-purity"></a>`chain-purity` — **Layer purity is a chain property**
  — a file is only as pure as its least-pure import. Layer labels are only valid
  if the full import chain honours the same constraints. Partial extraction
  produces false guarantees.
- <a id="service-purity"></a>`service-purity` — **Service cannot depend on
  concrete implementations** — `node:fs`, an HTTP client, a database driver
  belong in adapters; a service depending on concrete bypasses its ports and
  becomes untestable. Pure, deterministic third-party libraries are model;
  purity should be declared, not presumed.
- <a id="blob-quarantine"></a>`blob-quarantine` — **Only assembly and test files
  may import from blob** — anything else importing it contaminates a layer that
  had guarantees. Blob importing blob is fine: blob claims none. Assembly may
  take it because its rule bounds what it can do with it — build it and inject
  it behind a port. A test file may take it because unplaced code needs its
  characterization tests. A driver may not: its hooks call services, so a blob
  call there is already a violation. Type-only imports included — blob has no
  contract shape to depend on; `runtime-import`'s type exemption covers
  composition rules only.

**Composition rules:**

- <a id="service-assembly-only"></a>`service-assembly-only` — **`.service.ts`
  can only be imported by assembly** — not by model, ports, other service-layer
  code, adapters, drivers, or blob.
- <a id="adapter-assembly-only"></a>`adapter-assembly-only` — **`.adapter.ts`
  can only be imported by assembly** — not by model, ports, service, other
  adapters, drivers, or blob.
- <a id="runtime-import"></a>`runtime-import` — **Composition rules govern
  runtime imports — type-only imports are exempt.** Depending on a contract's
  shape is not depending on its implementation.
  `import type { IconsServiceAPI } from '../icons/service'` is legal anywhere;
  `import { createIconsService }` remains assembly-only. This also covers the
  `SomeService["method"]` shorthand (see
  [Port derivation](#port-derivation--the-dialect-trap)).
- <a id="public-unit"></a>`public-unit` — **Composition rules apply to public
  composition units only** — within `private/`, internal composition is
  unrestricted. `.service.ts` and `.adapter.ts` may freely import from
  `private/` files of their own service.
- <a id="ports-types-only"></a>`ports-types-only` — **Ports are types only** —
  no runtime code. Runtime code in a port file is a sign the adapter hasn't been
  extracted yet. (And no runtime edge touches a port in either direction:
  `typeof` works through `import type`, so a runtime import from — or of — a
  port file is always a runtime re-export, a side-effect import, or a missing
  `type` keyword.)
- <a id="unified-port"></a>`unified-port` — **One port, one interface** — if the
  service layer branches on which adapter it got, the port isn't unified.

**Packaging rules:**

- <a id="private-sealed"></a>`private-sealed` — **`private/` is the only
  visibility boundary** — nothing outside a service may import from its
  `private/` directory. (Type-only imports included — visibility is ownership,
  not implementation coupling; `runtime-import`'s type exemption covers
  composition rules only.)
- <a id="no-service-cycle"></a>`no-service-cycle` — **No circular dependencies
  between services** — DAG, enforced by tooling in CI. (Every import kind
  counts, type-only included — extraction independence holds for types;
  `no-runtime-cycle` is the runtime-only one.)
- <a id="no-runtime-cycle"></a>`no-runtime-cycle` — **No circular runtime
  dependencies between modules** — ESM circular imports silently fail in
  production. Type-only circular references are not covered by this rule.

**Testing rules:**

- <a id="test-through-contract"></a>`test-through-contract` — **Tests go through
  the contract** — input via public API, assertions on documented behavior, no
  implementation details.
- <a id="test-is-assembly-and-driver"></a>`test-is-assembly-and-driver` — **A
  test file is assembly and driver in one** — the setup builds units with
  fixtures (test-purpose adapters, same isolation rules), the test bodies are
  hooks, registered by calls at module root that the test tech owns
  (`stateless-modules` exempts the registration, not mutable state). Recognized
  by the configured test globs. It imports anything, blob included; it defines
  anything; the hook count and services-only do not apply; nothing imports it.
  Shared test code gets none of this and is placed by what it is: a fake or
  in-memory implementation is an adapter, a test factory an assembly function, a
  data builder model, and a matcher, fixture or shared hook registered on the
  runner a driver whose wiring function the spec file calls with the tech. Test
  edges count for rights and coverage, never for use-case level. End-to-end
  tests are neither: users of the shipped drivers, outside the graph.

**Assembly rules** (detail in
[Assembly — the composition root](#assembly--the-composition-root)):

- <a id="assembly-builds-only"></a>`assembly-builds-only` — **Every call in an
  assembly builds, and nothing there touches what was built** — arguments are
  literals, tech values received as parameters, or instances; a call result is
  passed on or returned, never computed with or member-accessed, whatever layer
  it came from; it returns services and shared model instances, and adapters
  only when called by a test; no use-case call but the loads the project
  declares, whose results count as tech values; a branch or loop on parameters
  or loaded values with factory arms is wiring, none on an instance's output;
  nothing at module root but imports.
- <a id="assembly-driver-only"></a>`assembly-driver-only` — **An assembly is
  imported only by drivers and assemblies** — type imports included; an assembly
  has no contract to depend on.

**Driver rules** (detail in
[Driver — the outermost layer](#driver--the-outermost-layer)):

- <a id="wiring-outside-hooks"></a>`wiring-outside-hooks` — **Outside its hooks,
  a driver only wires** — assembly calls, tech setup, sub-driver registration;
  arguments are tech values, instances, literals.
- <a id="one-call-per-hook"></a>`one-call-per-hook` — **Each hook makes exactly
  one use-case call, unconditional, with tech values, instances and literals as
  arguments and its result returned or handed whole to the tech** — a second
  call means a facade service is missing; zero means logic with no home; a
  translation around the call is the facade's use case. Hooks are cut by the
  tech's reading; the test tech exempts the count.
- <a id="driver-calls-services-only"></a>`driver-calls-services-only` — **A
  driver calls services, assembly, sub-driver wiring and its own tech, nothing
  else** — never an adapter, never a model.
- <a id="driver-defines-hooks-only"></a>`driver-defines-hooks-only` — **A driver
  defines nothing but its hooks and one wiring function** — any other definition
  is residue.
- <a id="driver-to-driver-wiring"></a>`driver-to-driver-wiring` — **A driver
  imports another driver only to call its wiring function** — passing tech and
  instances; never a hook, never hexagon data.
- <a id="driver-not-imported"></a>`driver-not-imported` — **Nothing but a boot
  or another driver imports a driver** — type imports included; the boot starts
  the root driver, drivers import drivers only to call their wiring functions.

**Boot rule** (detail in [Boot — the entry](#boot--the-entry)):

- <a id="boot-one-call"></a>`boot-one-call` — **A boot imports one driver and
  calls its wiring function once, at module root, with no arguments** — nothing
  else imported, defined, held or called; nothing imports a boot.

**Module discipline:**

- <a id="stateless-modules"></a>`stateless-modules` — **Modules are stateless**
  — a module's evaluation creates no mutable state and performs no side effect,
  so that importing a file does nothing and the file can be tested in its own
  right. State lives in factory closures: a factory is a function, it does
  nothing until called, and an instance exists only where it was called, reached
  by argument and never by import. What is red at module root follows from that
  sentence, and the shapes below are the known ones, not a closed list — a shape
  nobody has written down yet is judged by the rule, not waved through for being
  absent here. A binding whose immutability the syntax does not prove — proof
  being a primitive type, `as const`, a readonly array, record, map or set, or
  `Object.freeze` over a literal, each proven to its depth: `as const` is deep,
  `Readonly<…>` is one level, a named type the reader cannot resolve proves
  nothing (`Readonly<Store>`), and `Readonly<Map<…>>` does not even remove the
  mutators. A readonly map or set is proof over the binding, not over the value:
  `Object.freeze` cannot lock a Map, so a codebase without the types has no way
  to write one — and such a codebase turns this check off in config anyway. And
  a call that reaches the tech, runs a use case, or goes into a local function
  of a file whose layer may touch the tech — an adapter's, a blob's — where the
  reader cannot rule the side effect out. And a root statement that is neither
  of those and still does something when the module is evaluated: an assignment,
  a `delete`, a `throw`, and their like — whatever sits at root runs on import,
  so a statement that only makes sense at run time is a side effect at load
  time. Root calls are the lane the first two targets use to get around the
  rule, not the crime: a factory call at root is not itself the violation, what
  it binds is, when that binding is not provably immutable. Exemptions, by
  contrast, are a closed list, since an open set of escapes is a hole: two
  shapes are exempt by kind, the boot's one call and a spec file's registration
  calls into the runner. Assembly and driver need no exception — each builds
  inside its function.

---

## Testing

The architecture has direct consequences for how tests are structured. Three
principles, all non-negotiable.

### Testing through the contract

Tests go through the public API, end to end: input via the API, assertions on
documented behavior. This is structural, not stylistic. Tests prove that the
contract holds: given these inputs, this is the guaranteed output or effect.
They touch no implementation detail, not in how they call, not in what they
assert; if the behavior is not part of the contract, it is not tested, and if it
changes without breaking the contract, no test should break. Factory closures
make this physical: you cannot reach into the closure, only exercise the
returned API. Established practice — Parnas, Meyer, Beck — made enforceable by
structure.

### Tests are written for the reviewer

Tests are optimized for reading, not writing. The reviewer reads the suite as
the behavioral specification (see [sdd](./sdd.md), the test gate), which only
stays cheap if each test is legible as a behavior statement: _given X, when I do
Y with Z, I expect A, B and C_, visible in the test, not reconstructed from
helpers; the unit under test identifiable at a glance; fixture and assertion
close enough to compare by eye. A suite optimized for writing — clever helpers,
data-driven indirection, DRY-ed setup that hides the scenario — can hit full
coverage and still defeat the review gate. The test factory pattern (below)
serves this: assembly noise leaves the test body, and what remains is the
scenario.

### Architectural seams are not test instructions

The architecture creates internal seams — ports between sub-services, private
adapters, fractal nesting. They are refactoring affordances, places where the
implementation can move without disturbing the rest. They are not an instruction
to test at every seam.

Default posture: **at the hexagon boundary**. Contract tests against the public
port; internals are exercised through it. Internal unit tests are the exception,
justified only when one of these holds: **(a)** the function has a closed input
set and pure logic that can be exhaustively tested alone (a path parser, a small
algorithmic helper); **(b)** reaching the case through the contract would need
an absurd fixture, and the unit gives meaningfully better diagnostics.

Outside those, unit tests at internal seams cost three ways: the test surface
explodes while the contract stays under-tested; refactoring a seam means
rewriting tests that were never about the contract, pinning in place what the
architecture freed to move; and a failing unit test says what implementation
moved, where a failing contract test says what behavior changed. "Ports all the
way down" does not mean "test surfaces all the way down". Tests live at the
boundary that defines the contract.

### Test isolation

A test file is assembly and driver in one (`test-is-assembly-and-driver`). The
setup half is assembly: the test creates a service instance by calling the
factory with test-purpose dependencies, then exercises it from its hooks.

**Fixtures are adapters.** A fixture that provides canned data implements a port
with deterministic data instead of an external system. Production adapters are
fair game too when their side effects are controlled and the test stays
deterministic. What matters is isolation and determinism, not provenance.

**Each test assembles its own instance.** Each factory call produces an
independent instance with its own closure state. No shared mutable state between
tests: isolation is structural, the factory closure guarantees it.

**Production config has no place in tests.** Config is an adapter; tests inject
test config. Prod config couples the test to an environment.

**Shared fixtures follow sharing rules.** A test-purpose adapter reused across
test files is a shared adapter: owned by one test, extracted to a shared
location when several need it.

### The test factory pattern

Tests grow unwieldy when each one does the full assembly itself: the boilerplate
dominates and the intent drowns. The fix is a **test factory**, typically one
per test module, that centralizes the assembly. It calls the service factory
with sensible defaults — real adapters with fixture data, nominal config, mock
ports — and each test overrides only what its scenario requires. A test factory
shared across test modules is an assembly function in an assembly file, as its
shape says; the fakes it wires are adapters, and it may return them alongside
the service because a test is its caller, which then is the only caller it may
have (see [Assembly](#assembly--the-composition-root)). A matcher or shared hook
registered on the runner is a driver the spec file calls. No shared test code is
blob or test kind.

Default argument values, harmful in production factories (see
[Inversion of Control](#inversion-of-control)), are right here: test bundles
need no code splitting, and the defaults give the nominal case.

The pattern applies wherever construction is worth centralizing: factories with
dependencies foremost, but a factory taking many plain arguments benefits the
same way. A plain function is tested directly. Agents are strongly encouraged to
use the pattern systematically, even in small files: each test then shows only
what it customizes, which says what it intends to test, and the returns compound
past a handful of tests.

---

## Lifecycle

The architecture describes structure at rest. This section describes how a
codebase moves. You **decompose** to manage complexity, which creates distance;
some of what is now apart still needs to talk, so you **reconnect**
deliberately, under rules that preserve the isolation you just made. Split, then
share.

### Decomposition

Decomposition draws a boundary where there was none, because complexity demands
it, at every scale: domain separation ("users and payments are different
services"), service splitting ("manifest and themes want out of icons"), layer
extraction ("this computation is tangled in orchestration"). Extract into the
layer the concept belongs to — `.model.ts` for pure knowledge, its own
`.service.ts` for a separate composition unit — or keep it private in the
closure if it has not earned independence (see [Distillation](#distillation)).

#### Signals for decomposition

- **Test pressure** — the most mechanical signal. Five pure computations times
  three orchestration paths is fifteen cases through the service API, when five
  on model plus three through the service would do. Extract first.
- **Naming pressure** — long qualifiers to disambiguate mean too many concerns.
- **Cognitive load** — reading the service requires holding too much at once.

When layer extraction is not enough, split the service; the fractal architecture
supports this at any depth.

### Sharing

Decomposition creates the need for sharing: separate services still need common
types, functions or contracts. The sharing rules keep reconnection from undoing
the isolation. The same progression applies to all shared code — model types,
pure functions, and ports alike (a `LoggerPort`, an `FsPort`).

#### The progression

**1. One consumer — no sharing needed.** The service owns everything.

**2. Multiple consumers, shared concept — direct import.** Service A imports
from service B's model or ports. Fine while one-directional: B does not know A
exists.

**3. DAG cycle threatened — extract to a shared kernel.** When two services both
need the same types or functions and the dependency would otherwise be mutual,
extract the shared code into its own service.

```
# BAD — creates a cycle risk
icons/model.ts    →  import { Provider } from '../tokens/model'
tokens/model.ts   →  import { IconFamily } from '../icons/model'

# GOOD — shared concept extracted
providers/
  model.ts        →  export type Provider = { ... }
                      export function resolveProviderChain() { ... }

icons/model.ts    →  import { Provider } from '../providers/model'
tokens/model.ts   →  import { Provider } from '../providers/model'
```

The DAG is now `providers ← icons`, `providers ← tokens`. No cycle; each can
move independently.

An alternative to extraction: **merge the services.** Two services that want to
depend on each other are sometimes one service with two concerns. If the shared
surface is large and growing, one service with nested sub-concerns may beat two
with a kernel between them.

**4. Shared kernel grows consumer-specific concerns — red alert.** A kernel
holds only concepts that make sense to all its consumers independently. The
litmus: delete one consumer entirely; does the shared type still make sense
as-is? If removing B would make you want to delete fields, those fields are B's
concerns leaking upstream. The smell is optional fields or union branches that
serve one consumer: `iconRoot?: string` on `Provider` because `icons` needs it.
The kernel is looking downstream and violates the DAG in spirit, even if not in
import direction.

**The fix: anti-corruption boundary.** Each service reclaims its own concept in
its own model — `IconProvider` in `icons`, `TokenProvider` in `tokens` — and
they interoperate through a port + adapter: icons defines a port for the token
data it needs, an adapter translates. DDD's anti-corruption layer — we say
boundary, to avoid colliding with our layers; here, just a port + adapter.

**5. Mutual operational dependency — a slicing error.** When service A needs to
call service B and B needs to call A, no wiring fixes it: two services that need
each other at runtime are one service with two concerns, or both need a third.
Merge them (above), or extract the use case both need into a service upstream of
both — step 3 with behavior instead of types. Port + adapter is the
one-directional move of step 4; it does not remove a mutual need, it relabels
one edge of it.

The full progression: own it → share directly → extract kernel → split with
anti-corruption boundary. No special mechanisms needed at any stage — the
architecture already supports every transition.

#### Port derivation — the dialect trap

"Ports speak the service's language" and DRY pull against each other. Taken
alone, inside-out design has every service write its own interface for the same
external concern. `Fs` is the poster child: every service needs a slice of the
filesystem, every service writes its own `FsPort`, the dialects diverge, and
every dialect needs its own adapter. The solution: extract the shared interface
once, scope with `Pick`.

```ts
export interface FsPort {
  readFile: (path: string) => Promise<string>
  writeFile: (path: string, content: string) => Promise<void>
  exists: (path: string) => Promise<boolean>
}

// consumer takes only what it uses — one adapter serves all
port: Pick<FsPort, "readFile">
```

SOLID's ISP makes the same point. A properly defined shared interface _is_ the
service's language for that concern.

**When the interface isn't extracted yet**, `FsService["readFile"]` is valid
shorthand: a type-only reference to the port the service implements, legal under
`runtime-import`. Extract when a cycle or cross-package sharing demands it. The
smell is restating a signature that already exists elsewhere.

---

## Patterns

Every service follows the same rules, but services play different roles, and
naming the role is part of the architecture: it says what the service is for and
what belongs in it (Evans' ubiquitous language). The patterns below are not
exhaustive and add no structural category; a pattern may add rules of its own,
which belong to the pattern, not to the core.

### Config — the ubiquitous port

Config is a port & adapter in disguise. It emerges from inside the service, then
needs hydrating from outside — environments, consumers, tests — and is a port.
The config port (the shape) lives in the service, which defines what
configuration it needs; the config adapter (the values) lives outside, in
environment files, CLI args, a config service; config is injected like any other
dependency. It is singled out for ubiquity, not difference: every service needs
it, and ubiquity breeds conventions. Config is often its own hexagon at the
application level, a service that reads external sources and provides values to
the others; its cross-cutting knowledge is its nature, not a violation.

### Store — reactive state

A unit whose state is reactive. Consumers observe state changes rather than
polling. Classification follows dependencies, not reactivity: a store wired to
ports or services is a service; a dependency-free reactive store is model — a
domain machine like any other self-contained factory. Relevant in web apps where
UI needs to reflect changing data. See companion implementation guide for
conventions (context resolution, `useMyService` / `getMyServiceContext`
patterns).

### Kernel

A service holding shared domain concepts, typically extracted to prevent
dependency cycles between consumers. See [Sharing](#sharing) for governance. A
kernel may hold platform concepts (`util/vite.ts`, `util/path.ts`) as well as
business ones (`Provider`, `Theme`); the domain has to be coherent, not
business, and the same governance applies: `removeInline()` can diverge across
consumers as much as `Provider` can.

#### Where do shared utilities go?

A kernel, grouped by meaningful domain, never by "misc". `util/vite.ts`,
`util/path.ts`, `util/node.ts`, each around one concept, is clean shared code; a
grab-bag `utils/index.ts` is a junk drawer. The fix is domain decomposition
within the kernel, not a new category. A mixed-bag utilities service is a
tradeoff some codebases accept; agents should always default to clean
decomposition.

### Progressive adoption (for humans)

> **NOT FOR AGENTS**: An agent should always produce the full architecture
> (model + service layer + ports & adapters where external deps exist, and the
> necessary boilerplates: assembly, driver and boot).

The architecture supports incremental adoption. The hard rules are few and
clear; everything else is a gradient that natural pressures (testing, reuse,
scaling) push toward the clean state over time.

**Stage 1** — The cut. Install the necessary boilerplates first: a facade
service whose use cases are the entry's commands, a port for what the legacy
body does, an assembly that builds the legacy code as blob behind that port, a
driver plus boot that fire the facade. The program is green from here. This
stage comes first because it has to: a blob entry cannot import a composition
unit, so a service extracted before the cut has no green state (see
[Driver — the outermost layer](#driver--the-outermost-layer)).

**Stage 2** — Service boundaries. Services pulled out of the blob one port at a
time, each a service factory with IoC and clear layer files. Already useful.

**Stage 3** — Extract to model. Pure functions move out. Testability improves
dramatically. But don't rush — see [Distillation](#distillation) on premature
extraction risks.

**Stage 4** — Ports & adapters. External dependencies isolated behind contracts.

**Stage 5** — Nested hexagons. When an adapter or sub-concern grows complex
enough, it becomes its own hexagon with its own internal structure.

---

## Inspirations

- **Hexagonal Architecture** (Cockburn, 2005) — ports & adapters, inside vs
  outside, symmetry between the driving and driven sides. Everything here
  derives from it; the contribution is making it prescriptive for one tech
  context.
- **Clean Architecture** (Martin) — the inward dependency rule and the
  model/service layering inside the hexagon. Martin's Main, outside every ring,
  is our boot, driver and assembly in three files; Seemann's composition root is
  our assembly. Where we depart: they have the root call the driving adapters,
  we have the driver call the root, so the file the runtime starts is the same
  kind on a CLI and on a component tree.
- **Domain-Driven Design** (Evans) — organize by domain concern, not by
  technical type; shared kernel and anti-corruption layer (we say "boundary" to
  avoid collision with our layer terminology); ubiquitous language. Strategic
  patterns only: entities are self-contained factories in model, invariants
  types and pure functions, repositories ports.
- **Functional domain modeling** (Wlaschin; Bernhardt's functional core /
  imperative shell) — behavior as functions over domain types, I/O at the edges.
  Model relaxes strict purity to admit self-contained state: the bar is
  abstractness, not referential transparency.
- **SOLID** — Single Responsibility (one service, one capability) and Dependency
  Inversion (depend on abstractions, not concretions) in particular.
- **Onion Architecture** (Palermo) — concentric rings, domain at the core.

---

## See also

- [Spec-Driven Development](./sdd.md) — methodology that uses this architecture
  as its structural foundation
- Retrofit guide — applying the architecture a posteriori to existing code
  _(planned)_
