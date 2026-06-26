# Hexagonal Architecture — Theoretical Foundation

_Author: rixo_

> _"Allow an application to equally be driven by users, programs, automated test or batch scripts, and to be developed and tested in isolation from its eventual run-time devices and databases."_
> — Alistair Cockburn, _Hexagonal Architecture_ (2005)

An opinionated implementation of established principles — Cockburn's Hexagonal Architecture, Palermo's Onion Architecture, Martin's Clean Architecture, Evans' DDD, and SOLID all converge on the same topology: domain logic at the center, dependencies pointing inward, infrastructure at the outside. This document fills the gap toward a concrete, enforceable guide for TypeScript / ESM / web tech. The contribution is making the principles prescriptive and implementable, not the principles themselves.

This document is the theoretical foundation — the **why**. It is the first of three levels, following a why → what → how progression. Each level is standalone for its scope; outer levels can be fully re-created from inner ones (creation involves decisions, but the inner level scopes and validates them).

1. **Theoretical foundation** (this document) — **why**: architecture, rules, and the reasoning behind them. The core. Everything else derives from this.
2. **Implementation guide** — **what**: concrete file layouts, naming conventions, platform-specific patterns, worked examples. Derives a complete picture of what to build, even if it loses part of the why. Depends on technology and implementation choices (file layout, naming conventions, etc.); there can be several valid guides built on the same foundation. _(Separate document, not yet published here.)_
3. **Flight manual** — **how**: hard & fast rules for daily use by agents and developers. Must allow taking all correct decisions on the ground, without requiring a complete vision of the architecture or understanding of the rationale. Lookup, not reading. One per implementation guide flavor. _(Planned.)_

The goal is an architecture spec with teeth — prescriptive rules, not just principles. "Dependencies flow inward" is true but doesn't tell you whether `manifest-source.adapter.ts` can import from `icons.service.ts`. This document answers that. Violations should be visible by shape, not only by reasoning.

One of this architecture's practical benefits: it is methodically retrofitable. The story goes like this — you have a working prototype — rough, messy code, all in a blob. You separate concerns into services (packaging, interdependencies). Then from each service, use cases surface into `.service.ts`, types and pure functions into `.model.ts`. The extensionless files left over? That's the blob — assembly before it's been organised. It shrinks as extraction proceeds. The architecture doesn't require a greenfield start; it reveals itself in existing code under the pressure of testing.

In use across several production codebases — design-system packages, web apps, CLI tooling — at varying degrees of maturity and completeness.

This document uses naming conventions (e.g., `.model.ts`, `.service.ts` suffixes) for illustration. These conventions are one valid implementation of the architectural principles; the final word on specific naming belongs in the implementation guide.

---

## Terminology

**Hexagon** — the architectural shape from Cockburn (who later preferred "ports & adapters"). A hexagon has an inside and an outside, connected through ports. Any self-contained unit that isolates itself from its environment through contracts is a hexagon. The term is used sparingly in this document, when the inside/outside boundary and port connections are the point.

**Service** is the primary unit of this architecture. It sits at the intersection of three independent concerns — three bounded contexts in DDD terms, each giving the word "service" a different meaning, each with its own rules:

- **Isolation** (hexagonal) — a service contains one or more hexagons (composition units, adapters). Each hexagon has inside/outside, ports, composition by assembly. `.service.ts` and `.adapter.ts` files declare composition units — they signal "I need to be composed by assembly."
- **Layering** — code is organized in concentric layers: model, ports, service, adapters, assembly. Dependencies point inward.
- **Packaging** — the service is the unit of ownership, visibility (`private/`), sharing (DAG participation, kernel extraction, anti-corruption boundaries).

Two distinct meanings depending on context:

- **Service** (the package) — the directory, the organizational unit, the DAG node. Contains hexagons and layers.
- **`.service.ts`** (the composition unit) — declares "I am a hexagon, I expect to be composed by assembly."

Context usually makes it obvious which meaning is intended; when it doesn't, this document is explicit.

---

## Hexagonal architecture

This section presents the hexagonal architecture we're building on. The terminology is already partly ours (notably "driver"), but the principles are Cockburn's.

### Inside and outside

A hexagon has an inside and an outside. The inside is the core — the logic, the domain, the reason the hexagon exists. The outside is everything else: external systems, users, other hexagons, the runtime environment.

The inside doesn't know the outside exists. It defines what it needs and what it offers through **ports** — contracts at the boundary. The outside connects through those ports via **adapters** that translate between the port's shape and the external world's shape.

This separation is the foundational guarantee: the inside can be developed, tested, and reasoned about without any knowledge of what's on the other side of its ports.

### Ports

Ports are contracts at the hexagon's boundary, **shaped to the inside's needs** — not shaped around what the external system offers.

- A port defines a shape: what the hexagon needs from the outside (outbound port) or what it offers to the outside (inbound port)
- The inside codes against ports, never against concrete external systems
- Port interfaces belong to the hexagon that defines them

**One port, one interface.** All adapters for a given port implement the same interface and produce the same result shape. The inside should never know — or need to know — which adapter it's talking to. If it does, the port hasn't finished abstracting the outside away. Adapters absorb source-specific details so the inside doesn't have to.

**Ports are types only** — no runtime code, no logic. Implementations live in adapters; wiring lives in assembly.

### Adapters

Adapters implement ports for a specific technology — half the name of "ports & adapters." Their job is to translate between the hexagon's language and the external world's language, normalizing external-world specifics into the port's common shape. Source-specific details (a design tool's API structure, a JSON manifest's format, a REST endpoint's response shape) stay inside the adapter. What comes out conforms to the port. This is what makes adapters replaceable — not that they're "simple," but that they absorb specificity.

Adapters are themselves hexagons — and, by extension, full service packages: they have their own layers, their own packaging boundary, their own DAG participation (see [Services](#services--our-interpretation) and [Rules](#rules)). An adapter that talks to an external API has its own internal logic, potentially its own model functions, its own external dependencies. The hexagonal pattern is fractal — since adapters are hexagons, they can have their own inside, their own ports, their own adapters. The same structural principles apply at every level of nesting.

**Fractal assembly.** Who composes a nested adapter's internals? The adapter's own factory. A composition unit's factory function doubles as the composition root for its internal hexagons: it instantiates its internal sub-adapters, wires its internal ports, and returns the assembled unit. From the outside, assembly sees one composition unit; the fractal assembly inside is an implementation detail. Dependencies that are genuinely external to the adapter (an HTTP client, a logger) are still injected from outside — internal composition covers what the adapter owns, not what it consumes.

This has a critical consequence: an adapter connects to the hexagon it serves through the port it implements. It's a separate hexagon, and hexagons interconnect through ports, not through direct access to each other's internals. The specific dependency rules are detailed in [Rules](#rules), once layers are introduced.

### Drivers

Drivers are inbound adapters — the mechanism by which the outside world triggers the hexagon. A CLI command handler, an HTTP route, a UI event handler: each translates an external trigger into a call on the hexagon's inside.

A driver is an adapter like any other — it sits outside the hexagon, translates between two interfaces. The asymmetry with outbound adapters is minor: a driver's "port" is the hexagon's public API itself, so it doesn't need a separate port definition. The contract already exists.

What distinguishes drivers semantically: where an outbound adapter is a means to an end (the hexagon needs external data), a driver is a goal — it's the reason the hexagon is accessible to the outside world. "We need a CLI" or "we need a web interface" are driver-level decisions. Without drivers, nothing happens — no trigger, no execution.

In Cockburn's terminology these are "driving" or "primary" adapters.

### Assembly

Before any adapter can translate anything, someone has to: read config, instantiate adapters, wire them to ports, create hexagons, make them available. This is **not an adapter.** It doesn't translate between interfaces. It _builds the system._

Assembly is the only code with the privilege of importing composition units and binding them to abstract ports. It is the outermost layer — see [Assembly — the necessary evil](#assembly--the-necessary-evil) for its role in the layer hierarchy.

Assembly can take many forms:

- A CLI entry point (`main.ts`) — eager, single composition root
- A DI container (Angular) — eager, declarative, global
- Svelte context providers (`useMyService` in `+layout.svelte`) — lazy, hierarchical, code-split-friendly
- A test setup function — wires a hexagon with real or test-purpose adapters for a specific test context
- A simple factory call at the top of a script

These are different implementations with different tradeoffs. The architectural role is the same: wire adapters to ports, create services, make them available to consumers.

**In simple apps** (CLI tools), assembly and the driver often share a file. The CLI entry point both wires the system AND handles commands. This is fine — but recognize the two hats. When it gets complex, separate them.

**In web apps**, components naturally blend roles: driving (user events), assembly (context providers), and rendering. A web app also has multiple entry points (each route is a `main`), so assembly is distributed across the component tree. The separation is conceptual, enforced by convention, not always by file structure.

---

## Services — our interpretation

This is where we depart from Cockburn and bring in our own opinions. Cockburn describes the hexagonal shape — inside, outside, ports, adapters. He doesn't prescribe how to organize the inside, how hexagons share code, or how assembly is structured as a layer. We do.

Code is organized in **layers** — a concentric dependency hierarchy. Each layer wraps the previous, has progressively more knowledge of the system, and progressively fewer structural constraints. Dependencies point inward; lateral dependencies (same layer) are allowed.

Layers, from innermost to outermost:

- **Model** (`.model.ts`) — domain knowledge. Pure, stateless, no dependencies beyond model. The most constrained, the most valuable.
- **Ports** (`.port.ts`) — type-only contracts at the hexagonal boundary. No runtime code. Adapters implement them; service code depends on them.
- **Service** (`.service.ts`) — decisions. Orchestration, use cases, closure state. Composition unit — must be composed by assembly.
- **Adapters** (`.adapter.ts`) — port implementations for a specific technology. Can depend on concrete external systems. Composition unit — must be composed by assembly.
- **Assembly** — system composition. The necessary evil. Cross-cuts all domains, depends on everything. The dirtiest layer — the thinner, the better.

Suffixless files are blob — no layer declaration, no layer guarantees.

**Composition rule:** public `.service.ts` and `.adapter.ts` can only be imported by assembly. (Files under `private/` are not subject to this rule. Type-only imports are also exempt — see Rule 8.)

Outer layers are allowed to contain inner-layer code (model logic in a `.service.ts` file is fine — it just inherits the stricter consumption constraints of its host layer). The reverse is never acceptable.

### Model — knowledge

Types, pure functions, constants, core business logic. **The most valuable code.** The model layer is _what the service knows_ — computations, transformations, validations, domain types. Pure expertise, independent of any orchestration context.

- Stateless — no side effects, no closures over mutable state
- Depends on nothing outside the model layer (see [dependency rules](#rules))
- Everything else is plumbing you can rewire; model is the investment you protect

Model code from different services can depend on each other — that's model-to-model, staying within the layer. What model code cannot do is depend on any outer layer: not service layer, not assembly. The constraint is about layers, not about service packaging.

**Pure third-party libraries count as model-layer code.** A date library, a parsing utility, a schema validator — acceptable model dependencies as long as they are side-effect-free and deterministic. Anything with I/O, ambient state, or environment access is concrete (Rule 4) and belongs behind a port.

Model code is all pure functions with no dependencies — so easy to test that it would be a shame not to have 100% unit test coverage, especially in the AI era where generating tests for pure functions is essentially free.

A service with only a model layer is valid. No service layer, no ports, no adapters — just types and pure functions. The architecture doesn't prescribe which layers must exist, only the rules that apply to whichever layers are present.

### Service layer — decisions

The service layer is _what the service does_ — the use cases it offers. Each function on the returned API is a use case: `list`, `resolve`, `import`, `publish`. The service exists _because_ these use cases exist, and it exists _only as long as_ they do. If you can't name the use cases, you don't have a service — you have a utility bag.

Where model is knowledge, the service layer is decisions: it decides which model functions to call, in what order, with what inputs, and how to combine results with data from injected dependencies. It orchestrates; it doesn't compute.

- **Module-level code must be stateless** — state lives inside the factory closure
- Dependencies injected via factory function arguments (IoC)
- The returned API communicates what the service provides — the contract consumers depend on

```typescript
export function createMyService({
  config,
  otherService,
}: {
  config: MyServiceConfig;
  otherService: OtherServiceAPI;
}) {
  // State lives here, in the closure — injected, not imported
  const cache = new Map();

  function doThing(input: Input): Output {
    const processed = myModel.transform(input); // model knows
    const external = otherService.fetch(processed); // service layer decides
    return external;
  }

  return { doThing };
}
```

A suffix is a declaration: `.model.ts` declares purity, `.service.ts` declares a composition boundary, `.adapter.ts` declares a port implementation, `.port.ts` declares a boundary contract. **No suffix means no declaration** — and _no declaration means no guarantees_. Suffixless files are blob: pre-architectural code that hasn't been placed in a layer yet. Only assembly may consume them (Rule 5).

#### Inversion of Control

All dependencies are explicit — no defaults. The service declares what it needs; [assembly](#assembly) provides it. This preserves testability (inject mocks), reusability (same service, different contexts), and flexibility (compose differently per environment). Default parameter values for dependencies are tempting (the nominal case works out of the box!) but harmful: they create static imports from the service to its adapters or config sources, violating dependency rules, defeating code splitting, and scattering assembly logic across service modules. When multiple call sites each pull their own default, you lose central control — duplicated resolution, duplicated side effects, no single place to see what's wired to what. Assembly is the only place where dependencies are resolved. No exceptions.

The concrete assembly mechanism — how factories are called, how services are made available to consumers — is platform-specific. See the companion implementation guide for patterns (CLI entry points, Svelte context resolution, test setup).

### Assembly — the necessary evil

The outermost layer. Assembly wires composition units (`.service.ts`, `.adapter.ts`) together: it imports concrete adapters, reads config, calls factories, and makes services available to consumers. It cross-cuts all domains and depends on everything — including concrete, platform-specific code. This makes it the dirtiest layer: fragile, coupled to the runtime environment, essentially untestable. It's a necessary evil — the infamous "glue code," and the only layer where that label is justified.

The discipline is to keep it as thin as possible. Every line of logic in assembly is a line that can't be tested in isolation. The practical mechanism: push as much as possible into the service layer.

A CLI tool illustrates this well. A CLI service (`src/lib/cli/`) can expose use cases cleanly, receive a `LoggerPort`, be tested in isolation — that's service layer. The part that imports the CLI framework (`cac`, `commander`), parses `process.argv`, and wires the actual commands — that's irreducibly assembly. The boundary test: can I meaningfully define a port for this? If yes, it belongs in the service layer behind a port. If no — if abstracting the whole driver would just add a massive layer of indirection married to the single real implementation — it's assembly glue.

Trying to make a complex driver (React, SvelteKit, Astro) a port is a trap: you end up adding indirection to every touchpoint while remaining permanently married to the actual implementation. Abstracting _parts_ of these systems from a service's scoped perspective (e.g., a routing port, a navigation port) is the right move. Abstracting the whole thing is hopeless.

See [Hexagonal architecture — Assembly](#assembly) for the architectural role. See the companion implementation guide for platform-specific assembly patterns.

### Visibility: public by default, private by intention

Example:

```
icons/
  model.ts                     # public — any service's model can import this
  service.ts                   # public — assembly imports this
  legacy-helpers.ts            # blob — no layer; only assembly may import (residue from retrofit)
  ports/
    icon-source.port.ts        # public — adapters import this to implement it
  manifest/                    # public — nested service, directly addressable
    model.ts
    adapter.ts
  private/
    scoring-heuristic.ts       # private — only icons/ code can use this
```

> Naming note: a bare layer filename (`model.ts`, `service.ts`) is the suffix convention's degenerate case — the basename _is_ the layer declaration. `icons/model.ts` and `icons/icon-scoring.model.ts` declare the same layer; use the bare form when the service has one file per layer, the suffixed form when a layer spans several files.

Consumers import directly from the layer:

```
import { normalize } from '../icons/model'              # layer visible: model
import { createIconsService } from '../icons/service'    # composition unit: assembly only
import type { IconSourcePort } from '../icons/ports/icon-source.port'  # layer visible: ports
```

Everything not under `private/` is public. Everything under `private/` is internal to its containing service. The layer is visible in the import path — dependency violations are visible by shape.

#### The problem with index.ts

The conventional approach is a single entry point — an `index.ts` that re-exports the service's public surface. Everything consumers need goes through that file; everything it doesn't re-export is implicitly private.

This breaks the architecture.

The dependency rules in this document are defined at the **layer** level: each layer can only depend inward. These rules are only enforceable if the layer is visible at the import site. When `index.ts` re-exports from model and service layer indistinguishably, the consumer cannot tell which layer they're importing from. The dependency matrix becomes unenforceable — by tooling, by code review, by shape.

#### Layers as the API surface

**There is no `index.ts`.** Consumers import directly from the layer they need (as shown in the example above). The layer is visible in the import path. Dependency violations are visible by shape: seeing `import { ... } from '../icons/service'` in an adapter file is an immediate red flag — no need to open the file, no need to reason about the architecture, the path tells you.

This means **everything exported from a layer is public by default.** This aligns with how the language itself works — JS is public-by-default at every level: object properties are public and writable, module exports are accessible, nothing is hidden unless you explicitly opt in (`Object.freeze`, `#private` fields, etc.). It also aligns with practical reality: in experience, 90%+ of a service's contents are public. Model types, service factories, port contracts, adapter factories — all are designed for external consumption.

#### The `private/` directory

When something genuinely needs to be hidden from external consumers, it goes in a `private/` directory (as shown in the example above).

The `private/` convention:

- Makes visibility **explicit and obvious** — in directory listings and in import paths
- Applies fractally — `private/model.ts`, `private/child-service/`, `private/ports/` all work by the same principle
- Seeing `import { x } from '../icons/private/helper'` in a code review is an instant, unambiguous violation

This is one rule, applied uniformly: everything not under `private/` is public. Everything under `private/` is internal to its containing service.

#### The tradeoff

Public-by-default is counter-intuitive. Most developers expect private-by-default with explicit exports. The tradeoff is real: it demands awareness that what you export is visible, and it requires active discipline to put internal-only code under `private/`.

But the alternatives are worse:

- **`index.ts`** erases layer boundaries, making the entire dependency system unenforceable
- **A `public/` directory** (the inverse approach — everything is private, explicit `public/` marks the API) adds syntactic weight to 90%+ of files for the benefit of protecting the 10% that are truly internal. This is a valid alternative with the opposite tradeoff; it may suit codebases where internal code dominates, or team contexts where explicit enforcement is preferred over convention-based discipline.
- **Complex access-control systems** (linting rules, custom tooling) add infrastructure that nobody will maintain

The `private/` approach pays a small price (awareness) for a large gain (layer boundaries visible in every import path, enforceable by shape).

### Nesting

A service directory can contain other service directories. This is semantic grouping — filing, not architecture. Nested services follow the exact same rules as siblings: same DAG participation, same `private/` boundary, same layer rules. Physical nesting confers no privilege. A nested service cannot access its parent's `private/`.

**An adapter is a full service package** — even when physically nested under the service it adapts for. It has its own layers, its own `private/`, its own DAG edges. `icons/manifest/` is an independent service that happens to implement a port from `icons`.

**Layer directories are not nested services.** `icons/model/`, `icons/ports/`, `icons/service/` are internal structure of the `icons` service, not independent services. They are part of `icons` and can access `icons/private/`.

**Common trap:** importing from your own adapter's model or service-layer code. Since the adapter depends on the parent service (it implements the parent's port), the parent depending back on the adapter — even on its model — creates a DAG cycle. The existing rules already forbid this, but it's worth calling out because developers stumble on it.

### Distillation

Logic often starts in the service layer, embedded in a use case. When you extract it to model, you make a commitment: this knowledge stands on its own, it has value independent of the use case it currently serves. In the service layer, a function can use closure state and orchestration context. In model, it becomes context-free: pure input, pure output, independently testable, independently reusable. Not everything should be extracted — the signal is: could this function be useful to a consumer who doesn't care about the use case it was born in?

The corollary: premature extraction has costs. As long as logic lives private in the service layer (closure-scoped, not exported), it's an implementation detail — refactors are free, tests cover it implicitly through the service's use cases, naming is contextual. Extracting to model changes all of that:

- **Test surface grows** — every exported model function gets its own tests. More tests to maintain when requirements evolve. More surface for bad tests (especially with agents: overly specific assertions, fixtures that don't represent real usage).
- **Naming becomes a commitment** — a private closure function can be called `score` because context is obvious. A public model function needs `scoreIconRelevance` — and that name is now part of the API.
- **API surface grows** — the function's interface is now a contract. Changing it means updating all consumers and their tests. For internal services this is bounded (same repo, one commit), but it's still friction.

The tradeoff tilts toward waiting: extract when the concept has stabilized and could genuinely serve consumers beyond its current use case. Until then, keeping it private in the service layer is discipline, not laziness.

---

## Rules

Non-negotiable. These are the architectural constraints that, if violated, break the guarantees the system provides. All hard rules are negative — they define what is forbidden. They don't conflict with each other. Positive tensions (merge vs split, extract now vs wait, shared kernel vs anti-corruption boundary) are domain decisions: the architecture provides mechanisms, signals, and guidance, but cannot resolve them — only someone who knows the actual domain can.

### The dependency matrix

Combined result of layer rules and composition rules — both negative, both enforceable at the import level. The matrix is their intersection: a "can import" entry means neither rule forbids it.

| Layer        | Can import from                                       | Cannot import from                                 |
| ------------ | ----------------------------------------------------- | --------------------------------------------------- |
| **Model**    | Model, pure third-party libs                           | Everything else, incl. concrete                     |
| **Ports**    | Model, ports                                           | Everything else, incl. concrete                     |
| **Service**  | Model, ports                                           | Adapters, assembly, other `.service.ts`, concrete   |
| **Adapters** | Model, ports, `private/` of own service, concrete      | Other adapters, assembly                             |
| **Assembly** | Anything                                               | —                                                    |

The matrix governs **runtime imports**. Type-only imports (`import type`) are exempt from composition rules — see Rule 8. "Concrete" means platform/IO code: `node:fs`, HTTP clients, database drivers (Rule 4). Pure, deterministic third-party libraries count as model-layer code.

The matrix is about layers, not service packaging — model in service A can import model from service B. Packaging boundaries are enforced by `private/` and sharing rules (see [Sharing](#sharing)).

Unextracted code (blob) sits outside the matrix: it has no layer, makes no guarantees, and only assembly may consume it (Rule 5). The suffix absence is itself the declaration — _this code hasn't been placed in a layer yet_. Distillation eventually extracts each piece into the layer it belongs to.

### The acyclic dependency rule

No circular dependencies. Two levels, both enforced by tooling in CI:

**Service-package level (architectural).** Dependencies between services — including model-to-model — must form a directed acyclic graph (DAG). If any file in service A imports from any file in service B, that's an edge from A to B. If any file in B also imports from any file in A — regardless of which layers are involved — that's a cycle. The fact that A.model → B.model and B.service → A.model touch different layers doesn't matter: services A and B are mutually dependent, and neither can be extracted, moved, or reasoned about independently. When a cycle threatens, the sharing progression applies (see [Sharing](#sharing)).

**Module level (sanity).** Circular runtime dependencies between files — even within the same service — are forbidden. They're not architecturally significant in the same way, but they're practically vicious: circular imports in bundled ESM typically work in dev and silently fail in production, producing opaque "undefined" errors in minified code. Extremely hard to trace. The tooling to catch them is the same tooling already deployed for service-level DAG enforcement — enforcing both is free. Note: this rule covers runtime imports only. Type-only circular references (`import type`) are not an ESM problem and are not covered.

**Both must be enforced by tooling in CI.** Relying on humans or agents to manually trace dependency graphs is wishful thinking — like writing JavaScript without a type checker and hoping for the best. Standard circular dependency detectors (e.g., `madge`, `dpdm`) work at file level, catching module-level cycles directly. Service-level DAG enforcement requires tooling that understands service boundaries — whether through configuration, post-processing, or custom tooling. Both are hard requirements.

### Summary

**Layer rules:**

1. **Dependencies point inward** — `model < ports < service, adapters < assembly`. Lateral (same layer) OK. See dependency matrix for the combined result with composition rules.
2. **Layer is visible in the import path** — no `index.ts` indirection.
3. **Layer purity is a chain property** — a file is only as pure as its least-pure import. Layer labels are only valid if the full import chain honours the same constraints. Partial extraction produces false guarantees.
4. **Service cannot depend on concrete implementations** — `node:fs`, an HTTP client, a database driver belong in adapters. A service depending on concrete bypasses its ports and becomes untestable. (Pure, deterministic third-party libraries are not "concrete" in this sense — they qualify as model-layer code.)
5. **Only assembly may import from blob** — blob has no layer constraint. Everything else importing from it contaminates a layer that was supposed to have guarantees.

**Composition rules:**

6. **`.service.ts` can only be imported by assembly** — not by model, ports, other service-layer code, or adapters.
7. **`.adapter.ts` can only be imported by assembly** — not by model, ports, service, or other adapters.
8. **Composition rules govern runtime imports — type-only imports are exempt.** Depending on a contract's shape is not depending on its implementation. `import type { IconsServiceAPI } from '../icons/service'` is legal anywhere; `import { createIconsService }` remains assembly-only. This also covers the `SomeService["method"]` shorthand (see [Port derivation](#port-derivation--the-dialect-trap)).
9. **Composition rules apply to public composition units only** — within `private/`, internal composition is unrestricted. `.service.ts` and `.adapter.ts` may freely import from `private/` files of their own service.
10. **Ports are types only** — no runtime code. Runtime code in a port file is a sign the adapter hasn't been extracted yet.
11. **One port, one interface** — if the service layer branches on which adapter it got, the port isn't unified.

**Packaging rules:**

12. **`private/` is the only visibility boundary** — nothing outside a service may import from its `private/` directory.
13. **No circular dependencies between services** — DAG, enforced by tooling in CI.
14. **No circular runtime dependencies between modules** — ESM circular imports silently fail in production. Type-only circular references are not covered by this rule.

**Testing rules:**

15. **Tests go through the contract** — input via public API, assertions on documented behavior, no implementation details.
16. **Test setup is assembly** — same isolation rules apply, fixtures are test-purpose adapters.

**Service discipline:**

17. **Service modules are stateless** — state lives in factory closures only.

---

## Testing

The architecture has direct consequences for how tests are structured. Three principles, all non-negotiable.

### Testing through the contract

Tests go through the public API — end to end. Input via the public API, assertions on documented behavior. This is structural, not stylistic. Tests prove that the contract holds: given these inputs, this is the guaranteed output or effect. They don't touch implementation details — not in how they call, not in what they assert. If the behavior isn't part of the public contract, it's not tested; if it changes without breaking the contract, no test should break. With factory closures, the architecture physically reinforces this: you can't reach into the closure, you can only exercise the returned API.

This is not an invention — it's established testing practice (Parnas on information hiding, Meyer on Design by Contract, Beck on TDD: refactoring must not break tests). The architecture just makes it enforceable by structure rather than by discipline alone.

### Architectural seams are not test instructions

The architecture creates internal seams — ports between sub-services, private adapters, fractal nesting. These exist as **refactoring affordances**: places where the implementation can move, swap, or be replaced without disturbing the rest. They are _not_ an instruction to add a test surface at every seam.

Default test posture: **at the hexagon boundary**. Contract tests against the public port. Internals — extractors, dispatchers, private helpers — are exercised through the public contract, not directly.

Internal unit tests are the **exception**, justified only when one of these holds:

- **(a)** The function has a closed input set and pure logic that can be exhaustively tested in isolation (e.g. a path parser, a small algorithmic helper).
- **(b)** Reaching the case through the contract would require an absurdly large or contrived fixture, and the unit gives meaningfully better diagnostic locality.

Outside these exceptions, unit tests at internal seams produce three concrete harms:

1. **Test surface explosion.** Symmetrically-shaped internals invite symmetrical test files; coverage goes up while the contract surface stays under-tested.
2. **Refactor friction.** Internal tests couple to implementation; refactoring a seam means rewriting tests that were never about the contract. The architecture's whole point — that internals are free to move — gets neutralised by tests that pin them in place.
3. **Diagnostic noise during change.** A failing unit test tells you what _implementation_ moved. A failing contract test tells you what _behaviour_ changed. The first is noise during refactor; the second is signal.

The natural misreading: "ports all the way down" reads as "test surfaces all the way down." It is not. Hexagonal/Clean's actual point is the **opposite** — tests live at the boundary that defines the contract, not at the joints inside.

### Test isolation

Test setup is assembly. The same architectural rules apply: the test creates a service instance by calling the factory with test-purpose dependencies. This has direct consequences:

**Fixtures are adapters.** A test fixture that provides canned data is, architecturally, an adapter — it implements a port with deterministic data instead of calling an external system. Production adapters are fair game in tests too, as long as you can control their side effects and keep the test deterministic (e.g., a real `createManifestSource` with fixture data). What matters is isolation and determinism, not the provenance of the adapter.

**Each test assembles its own instance.** Each call to `createMyService(...)` produces an independent instance with its own closure state. No shared mutable state between tests. Isolation is structural — the factory closure guarantees it.

**Production config has no place in tests.** Config is an adapter. Tests inject test config, not prod config. Using prod config in a test couples it to a specific environment and makes it fragile, non-deterministic, or slow.

**Shared fixtures follow sharing rules.** If a test-purpose adapter is reused across multiple test files, it's a shared adapter. It follows the same sharing progression as any other shared code: owned by one test → extracted to a shared location when multiple tests need it.

### The test factory pattern

Tests for services in this architecture tend to grow unwieldy when each test does the full assembly itself — calling the service factory directly, creating mocks for every dependency, wiring adapters inline. The boilerplate dominates; the test intent drowns.

The fix: a **test factory** — typically one per test module — that centralizes the assembly. It calls the service factory with sensible defaults (real adapters with fixture data, nominal config, mock ports). Individual tests call the test factory and override only what their specific scenario requires. Test factories can also be shared across test modules via test utility files when needed.

Default argument values — harmful in production service factories (see [Inversion of Control](#inversion-of-control)) — are perfectly appropriate here. Test bundles don't need code splitting, and the defaults provide the nominal case out of the box.

The test factory pattern applies to any factory that takes dependencies. Pure model functions don't need a test factory — they take arguments and return values, test them directly.

Agents are strongly encouraged to use this pattern systematically, even when the test file seems small enough not to need it:

- **Consistency** — uniform testing approach across the codebase
- **Readability** — each test is focused on its specificities. The arguments the test does customize give a strong hint about what it intends to test.
- **Separation** — the assembly has to live somewhere. Outside the test is better than inside for readability.
- **Compounding returns** — as soon as you have more than a handful of tests, the benefits in LOC and maintainability compound on top of readability.

---

## Lifecycle

The architecture describes structure at rest. This section describes how a codebase moves — how services are born, grow, split, and reconnect over time.

The movement follows a cause-and-effect cycle: you **decompose** to manage complexity (drawing boundaries, separating concerns, splitting services). Decomposition creates distance — things that were together are now apart. Some still need to talk to each other, share types, depend on common concepts. So you **reconnect** deliberately, following rules that preserve the isolation you just created.

Split, then share. That's the lifecycle.

### Decomposition

Decomposition is the primary act: drawing a boundary where there wasn't one, because complexity demands it. It operates at every scale:

- **Domain separation** — "users and payments are different concerns, they should be different services." The initial cut.
- **Service splitting** — "this icons service has too many use cases, manifest and themes want to be separate." Same principle, within an existing service.
- **Layer extraction** — "this computation is tangled in orchestration, it should be extracted." Same principle, smallest scale. Extract into the layer the concept actually belongs to: `.model.ts` for pure domain knowledge, its own `.service.ts` for a separate composition unit, or keep it private in the closure if it hasn't earned independence. See [Distillation](#distillation).

The scale varies (domain → service → layer), the mechanism varies (new service → nested service → layer extraction), but the motivation is always the same: isolation for manageability.

#### Signals for decomposition

- **Test pressure** — the most mechanical signal. Test explosion happens when computation logic and orchestration logic are tangled: 5 pure computations x 3 orchestration paths = 15 cases through the service API, when you could test 5 on model + 3 through the service. Extract first — it's cheaper and often sufficient.
- **Naming pressure** — when tests or functions require long qualifiers to disambiguate, the service is juggling too many concerns.
- **Cognitive load** — when reading the service requires holding too many concerns in your head at once.

When layer extraction isn't enough, split the service. The fractal architecture supports this at any depth.

### Sharing

Decomposition creates the need for sharing. Things that were together now live in separate services but still need common types, functions, or contracts. The sharing rules exist to prevent reconnection from undoing the isolation.

The same progression applies to all shared code: model types, port types, pure functions. Ports follow the same rules as model — when multiple services need the same external contract (a `LoggerPort`, a `FileSystemPort`, an `HttpClientPort`), the progression below applies identically.

#### The progression

**1. One consumer — no sharing needed.** The service owns everything. Types, functions, port definitions — all internal.

**2. Multiple consumers, shared concept — direct import.** Service A imports from service B's model or ports. Fine, as long as the dependency is one-directional (A depends on B, not the reverse). B doesn't know or care that A exists.

**3. DAG cycle threatened — extract to a shared kernel.** When two services both need the same types or functions and the dependency would otherwise be mutual, extract the shared code into its own service — model and/or service-layer code, no composition units.

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

The DAG is now: `providers` ← `icons`, `providers` ← `tokens`. No cycle. Each can be moved independently.

An alternative to extraction: **merge the services.** Sometimes two services that want to depend on each other are really one service with two concerns. If the shared surface is large and growing, a single service with internal sub-concerns (using fractal nesting) may be simpler than two services with a shared kernel.

**4. Shared kernel grows consumer-specific concerns — red alert.** This is the critical signal. A shared kernel must only contain concepts that make sense to **all** its consumers independently. The litmus test: if you deleted one consumer entirely, would the shared type still make sense as-is? If removing consumer B would make you want to delete fields from the shared type, those fields are B's concerns leaking into shared space.

The smell: **optional fields or union branches that exist to serve specific consumers.** The kernel is supposed to be upstream in the DAG — it shouldn't know its consumers exist. When it starts accumulating `iconRoot?: string` because `icons` needs it, the kernel is looking downstream. It violates the DAG in spirit even if not in import direction.

Continuing the example: `providers/model.ts` defines `Provider`. Over time, `icons` needs `Provider` to mean "the thing that supplies icon files" — it wants `iconRoot`, `spriteConfig`. Meanwhile, `tokens` needs `Provider` to mean "the thing that supplies token values" — it wants `tokenConfig`, `designTokenSchema`. The shared type accumulates optional fields that only one consumer uses. The kernel is cracking.

**The fix: anti-corruption boundary.** Each service reclaims its own concept in its own model. `icons` defines `IconProvider`, `tokens` defines `TokenProvider`. If they need to interoperate, they do so through a port + adapter — icons defines a port for "give me token data in this shape," an adapter translates `TokenProvider` into what icons needs. This is what DDD calls an **anti-corruption boundary**: it prevents one service's model from being corrupted by another's evolving semantics. In our architecture, it's just a port + adapter — the mechanism we already have.

**5. Operational cross-dependency — port + adapter.** When the dependency is operational (service A needs to _call_ service B and vice versa), at least one direction must go through a port + adapter. Service A defines a port for what it needs from B; an adapter wraps B's API to satisfy that port. Assembly wires them. No direct import.

The full progression: own it → share directly → extract kernel → split with anti-corruption boundary. No special mechanisms needed at any stage — the architecture already supports every transition.

#### Port derivation — the dialect trap

"Ports speak the service's language" and DRY are both right — and they pull against each other. Taken in isolation, inside-out design leads every service to define its own interface for the same external concern. `Fs` is the poster child: every service needs a slice of the filesystem, every service writes its own `FsPort`. The interfaces diverge silently — and worse, every dialect needs its own adapter. Reusability dies.

**The solution**: extract the shared interface once, scope with `Pick`.

```ts
export interface FsPort {
  readFile: (path: string) => Promise<string>;
  writeFile: (path: string, content: string) => Promise<void>;
  exists: (path: string) => Promise<boolean>;
}

// consumer takes only what it uses — one adapter serves all
port: Pick<FsPort, "readFile">;
```

SOLID's ISP makes the same point: don't force consumers to depend on what they don't use. A properly defined shared interface _is_ the service's language for that concern.

**When the interface isn't extracted yet**: `FsService["readFile"]` is valid shorthand. You are not coupling to a service — you are referencing the port it implements, currently co-located with its type. This is a type-only reference, legal under Rule 8. Extract when needed (circular dependency, cross-package sharing).

**The smell**: restating a signature that already exists elsewhere. Every dialect needs its own adapter.

---

## Patterns

The architecture is structurally uniform — every service follows the same rules. But services play different roles, and naming those roles is part of the architecture. Semantic labels convey intent, guide decisions, and prevent misuse: putting utility functions in something called a "kernel" is structurally sound but semantically wrong, like storing fruits in a variable called `animal`. The vocabulary matters (Evans' ubiquitous language).

The following patterns are not exhaustive — more may emerge. They don't introduce new structural categories but they communicate _what role the service plays_ and _why it exists_, which constrains how it should be used and what belongs in it. Patterns may also add structural rules of their own — those rules belong to the pattern, not to the core architecture.

### Config — the ubiquitous port

Config is a port & adapter in disguise. It doesn't feel like one at first because it organically emerges from _inside_ the service — it looks like it belongs there. Then you realize you need to hydrate it from _outside_ (different environments, different consumers, testing), and suddenly it's a port.

- Config **port** (types, shape) lives inside the service — the service defines what configuration it needs
- Config **adapter** (actual values) lives outside — in environment files, CLI args, a config service
- Config is injected into services like any other dependency

Config is singled out not because it's architecturally different from other ports, but because it's _ubiquitous_ — every service needs configuration. Like the verb "to be" is special in every language not because of grammar, but because of frequency. Ubiquity breeds specific conventions.

Config is often its own hexagon at the application level — a config service that reads external sources, normalizes them, and provides values to other services. It has cross-cutting knowledge of the services it configures. That's not a violation; it's its nature.

### Store — reactive state

A service whose state is reactive. Consumers observe state changes rather than polling. Relevant in web apps where UI needs to reflect changing data. See companion implementation guide for conventions (context resolution, `useMyService` / `getMyServiceContext` patterns).

### Kernel

A service holding shared domain concepts, typically extracted to prevent dependency cycles between consumers. Pure model, or service layer without composition units. (Once a shared service has composition units, it's no longer a kernel — it's a full service, possibly serving an anti-corruption role.) See [Sharing](#sharing) for governance concerns (divergence, anti-corruption boundaries).

Kernels can hold business domain concepts (`Provider`, `Theme`, `IconFamily`) or platform/technical domain concepts (`util/vite.ts`, `util/path.ts`, `util/node.ts`). The domain doesn't have to be "business" — it has to be coherent. The same governance rules apply: `removeInline()` (Vite module ID handling) can diverge across consumers just as much as `Provider` can.

#### Where do shared utilities go?

A kernel. Group by meaningful domain, not by "misc." A kernel organized as `util/vite.ts`, `util/path.ts`, `util/node.ts` — each file grouping functions around a coherent concept — is clean shared code. A grab-bag `utils/index.ts` mixing path manipulation, date formatting, and Vite helpers is a junk drawer. The fix isn't a different architectural category; it's domain decomposition discipline within the kernel.

A mixed-bag utilities service is an alternative for codebases that accept the tradeoff. Agents should always default to clean domain decomposition.

### Progressive adoption (for humans)

> **NOT FOR AGENTS**: An agent should always produce the full architecture (model + service layer + ports & adapters where external deps exist).

The architecture supports incremental adoption. The hard rules are few and clear; everything else is a gradient that natural pressures (testing, reuse, scaling) push toward the clean state over time.

**Stage 1** — Service boundaries only. Service factory with IoC, clear layer files. Already useful.

**Stage 2** — Extract to model. Pure functions move out. Testability improves dramatically. But don't rush — see [Distillation](#distillation) on premature extraction risks.

**Stage 3** — Ports & adapters. External dependencies isolated behind contracts. Full architecture.

**Stage 4** — Nested hexagons. When an adapter or sub-concern grows complex enough, it becomes its own hexagon with its own internal structure.

---

## Inspirations

- **Hexagonal Architecture** (Cockburn, 2005) — the foundational insight: ports & adapters, inside vs outside, symmetry between inbound and outbound sides. This document derives everything from his principles; the contribution is making them concrete and prescriptive for a specific tech context.
- **Clean Architecture** (Martin) — the inward dependency rule and concentric layer model. Cockburn doesn't prescribe internal hexagon structure; the model/service/assembly layering comes from here.
- **Domain-Driven Design** (Evans) — organize by domain concern, not by technical type. Shared kernel and anti-corruption layer (we say "boundary" to avoid collision with our layer terminology) concepts for managing cross-service model dependencies. Ubiquitous language as a constraint mechanism.
- **SOLID** — especially Single Responsibility (one service, one capability) and Dependency Inversion (depend on abstractions, not concretions).
- **Onion Architecture** (Palermo) — concentric dependency rings, domain at the core, infrastructure at the outside.

---

## See also

- [Spec-Driven Development](./sdd.md) — methodology that uses this architecture as its structural foundation
- Retrofit guide — applying the architecture a posteriori to existing code _(planned)_
