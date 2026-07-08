# Implementation Guide — TypeScript / ESM, factory-injection flavor

**Status**: draft, distilled from production practice (two brownfield codebases,
~7 months of daily use). Conventions below are observed-and-settled unless
marked **[prescribed]** (rule adopted, practice still catching up).

A note on altitude: the [architecture](./architecture.md) states principles and
deliberately leaves room for several valid materializations. This guide is where
opinions get introduced — it picks one. Where it says "always", that is _this
flavor's_ choice, not a claim that the theory forbids the alternatives. What the
guide doesn't regulate is out of its scope on purpose: do as you see fit, the
architectural rules still apply.

This is level 2 of the three-level progression defined in
[architecture](./architecture.md) — the **what**: concrete file layouts, naming
conventions, platform patterns for one flavor. The **why** lives in the
architecture doc; this guide assumes it. Other flavors of the same foundation
exist (e.g. a Svelte-context-composition flavor where files are named
`service.ts`/`context.ts` and the directory supplies the domain name, and
composition happens through the component tree); this document describes the
**factory-injection** flavor: suffixed filenames, `create*` factories, explicit
composition roots. Node CLIs, build tooling, libraries — anywhere assembly is a
program, not a component tree.

---

## 1. File naming

**The suffix is load-bearing. Always suffix.**

| Suffix         | Layer    | Declares                                       |
| -------------- | -------- | ---------------------------------------------- |
| `*.model.ts`   | model    | pure — no side effects, no outer-layer imports |
| `*.port.ts`    | ports    | types only, boundary contract                  |
| `*.service.ts` | service  | composition unit — assembly-only import        |
| `*.adapter.ts` | adapters | port implementation — assembly-only import     |
| `*.context.ts` | assembly | context wiring (web/UI runtimes)               |
| `*.spec.ts`    | test     | unit test, colocated with its subject          |
| `*.e2e.ts`     | test     | end-to-end test, lives outside `src/`          |

- The theory allows the bare layer filename (`icons/model.ts`) as a degenerate
  case; this flavor opts not to use it — the suffixed form even when a service
  has one file per layer (`icons/icons.model.ts`). One form, zero ambiguity,
  greps for `.model.ts` sweep everything. (Another flavor could legally go the
  other way — bare filenames, layer dirs, whatever — as long as the layer stays
  visible in the import path.)
- A file without a layer suffix inside a service directory is **blob** —
  pre-architectural residue awaiting distillation, consumable by assembly only.
  In a mature service there are none. (Small type-only or constant helpers get a
  real home: fold them into the model file they serve.)
- `.test.ts` is not used. One unit-test suffix, not two.
- There is no `.store.ts` in this flavor. Reactive-state concerns materialize as
  ports and adapters like everything else (`*-store.port.ts`,
  `fs-*-store.adapter.ts`); the Store _pattern_ is a role, not a file kind.

## 2. Service directory anatomy

Canonical full-shape service:

```
icons/
  icons.model.ts              # pure domain: types, computation
  icons.model.spec.ts
  icons.service.ts            # use cases; factory createIconsService
  icons.service.spec.ts
  ports/
    icon-source.port.ts       # boundary contracts (types only)
    icon-store.port.ts
  adapters/
    manifest-source.adapter.ts   (+ .spec.ts)
    fs-icon-store.adapter.ts     (+ .spec.ts)
  private/
    scoring.model.ts          # internal to icons/ — invisible outside
  README.md                   # the service's living doc
```

- **Grouping dirs (`ports/`, `adapters/`) are filing, not architecture — out of
  the guide's scope.** The suffix carries the layer; directories are yours. A
  single-port service may keep `icon-source.port.ts` at the root; a service with
  five adapters probably wants an `adapters/` dir. The import path shows the
  layer either way, via the suffix.
- **`private/`** as defined by the architecture doc: the only visibility
  boundary. Holds internal models and private services the public service
  composes but does not export.
- **`drivers/`** — inbound-adapter/entrypoint code that belongs to the package
  (e.g. `drivers/cli/`): the thin layer translating an external trigger into
  service calls, plus its assembly.
- **An adapter with its own ports** is normal (adapters are hexagons): a
  directory adapter carrying `ports/` of its own nests exactly like a service.
- **`README.md` per service** — the living doc (see [sdd](./sdd.md) §2): what it
  is _now_, its API, its layer map. History stays in `history/`.
- **When to split**: not a file-count threshold — the decomposition signals from
  [architecture](./architecture.md), Lifecycle: test pressure (case explosion),
  naming pressure (long disambiguating qualifiers), cognitive load. Extract to
  model first; split the service when that's not enough.

## 3. Naming in code

- **Factories: `create<Name><Kind>`** — `createIconsService`,
  `createManifestSourceAdapter`, `createNodeFs`. One factory per composition
  unit, named export, no default export.
- **Assembly entrypoints: `init<Name>`** — `initThemes`, `initThemeContext`.
  `create*` builds one unit; `init*` wires a subsystem.
- **Dependencies: one destructured object parameter, typed with port types.**

  ```ts
  export function createIconsService({
    source,
    store,
  }: {
    source: IconSource;
    store: IconStore;
  }): IconsService { ... }
  ```

  A single-dependency factory may take it positionally.

- **Types: name by role, qualify to disambiguate.** A port type is its role —
  `Logger`, `IconSource` — with no mandatory `Port` suffix: the layer is already
  declared where the flavor puts it, in the file path (`.port.ts`). Add the kind
  qualifier when the bare name is taken by domain vocabulary — which is why the
  returned service API is `<Name>Service` in practice (`Icons` is the data;
  `IconsService` operates on it; not `ServiceAPI`, not `IService`), while ports
  rarely collide and stay bare.

  Why not mandatory kind suffixes: a naming rule that fights the pull of the
  cleaner form loses. `{ logger: Logger }` reads right;
  `{ loggerService: LoggerPort }` begs to be shortened — and once the rule is
  "suffix always", the idiomatic short form everyone (humans and agents alike)
  instinctively writes becomes a violation. Don't legislate against instinct
  unless a stronger formalism demands it; here none does — readability is a
  value in this flavor.

- **`<Name>Config` / `Input<Name>Config` keep their suffix** — the thing _is_
  config; the name is the role. The Input/resolved split is a real boundary:
  user config is an adapter concern, resolved config is what services receive.
- **Defining the service type**: an explicit `type IconsService = {...}` and an
  inferred `type IconsService = ReturnType<typeof createIconsService>` are both
  fine. The architecture's extraction pressures decide when the explicit form
  earns its keep (a port needs deriving from it, consumers need the contract
  without the factory) — don't hand-write shapes inference already gives you.
- **Adapter filename grammar**: `<qualifier>-<port-name>.adapter.ts` — the
  qualifier says which technology/strategy, the rest names the port served:
  `fs-icon-store.adapter.ts`, `in-memory-fs.adapter.ts`,
  `manifest-source.adapter.ts`.

## 4. Layer contents in practice

The questions every implementer hits in the first week, answered from the
[architecture](./architecture.md)'s rules:

- **Pure third-party libraries are model-layer code.** A schema validator, a
  date library, a parsing utility — legal model dependencies as long as they are
  side-effect-free and deterministic. Anything with I/O, ambient state, or
  environment access is concrete and belongs behind a port.
- **A `.port.ts` file contains the contract — and nothing that isn't the
  contract.** Its raison d'être is the port itself (`IconSource`); supporting
  types may accompany it _only because they are part of the contract_ (a
  parameter shape, a result shape). A type that stands on its own — domain
  vocabulary, not contract piece — belongs in the model, and gets ejected there
  the moment it does. The reverse flows freely: ports use model types at will
  (`model < ports`). And no runtime code, ever — no constants, no enums, no
  functions, no defaults: runtime in a port file means a model or adapter
  extraction is pending (Rule 10). Runtime companions (discriminant constants,
  type guards) are model code.
- **Type-only imports are exempt from composition rules — not from packaging
  rules.** `import type { IconsService } from "../icons/icons.service"` is legal
  anywhere; so is the `IconsService["list"]` shorthand, and `Pick` to scope a
  port to what a consumer uses (the dialect-trap solution). But the exemption
  covers _runtime coupling_ only: a type import is still a dependency edge — the
  service DAG must stay acyclic, and `private/` stays sealed to type imports
  like everything else.
- **Logging is an effect.** It goes through an injected `Logger` port like any
  other effect. No `console.*` below drivers/assembly.

## 5. No barrels — and what packaging does instead

**Within the codebase: there is no `index.ts`. No exceptions.** (Architecture
Rule 2: the layer must be visible in the import path; a barrel erases it.) A
feature barrel re-exporting model + service + adapters is tech debt to be
deblob'd, not a convenience.

At the **package boundary**, the intent is the same — named subpaths keep the
layer visible at package scale:

```jsonc
// package.json
"exports": {
  "./model":   "...",
  "./service": "...",
  "./vite":    "..."
}
```

`import { createIconsService } from "@org/icons/service"` reads exactly like the
in-repo `../icons/icons.service.ts` import — and the composition rule (assembly
only) applies identically.

**Honestly unresolved: what a subpath points at.** Two shapes exist in practice:
the subpath resolving directly to the layer file, and dedicated entry files
(`index.assembly.ts`-style) that curate what a subpath exposes — index files,
i.e. barrels at the boundary. Whether the no-barrel rule extends that far, and
what the sanctioned entry-file shape is, is not settled. Owned as an open point
rather than papered over; see Open below.

## 6. Assembly patterns

### CLI / program composition root

One `cli.ts` (or `main.ts`) owns the wiring:

- Per-subsystem `build<Name>Service()` helpers that instantiate concrete
  adapters and pass them to service factories. The helper is assembly code — it
  may import anything.
- **A shared composition unit (`.service.ts` / `.adapter.ts`) is instantiated
  once** at the root and threaded down: one `const fs = createNodeFs()` passed
  to every disk-touching adapter — never one instance per consumer. Central
  control of side-effect surfaces is the point of assembly.
- Driver glue (arg parsing, command registration) and assembly share the file in
  simple programs — two hats, same place, fine until it grows (see
  [architecture](./architecture.md), Assembly).

### Config hydration

Config is a port ([architecture](./architecture.md), Patterns). The pattern:

- a config service created with injected I/O capabilities
  (`createConfigService({ fileExists, importModule, ... })`);
- a **lazy, cached** `getConfig()` in the composition root — loaded on first
  use, from the conventional file (`<tool>.config.ts` at project root), merged
  with environment;
- services receive resolved `<Name>Config` slices via their factories. No
  service imports config; no config access outside assembly.

### Web/UI runtimes

Where the runtime composes through a component tree, assembly distributes:
`*.context.ts` files own the context key and expose `init<Name>Context()` /
accessor pairs. Same architectural role, different mechanism — the context
provider is the composition root for its subtree.

### Build-tool plugins

A plugin factory is a driver + assembly pair: the factory body wires services
(assembly), the hook implementations translate the tool's lifecycle into service
calls (driver). Keep the services extractable — plugin-framework types must not
leak below the driver.

## 7. Error management

Nothing exotic — classical clean error discipline. Spelled out because it is
_not_ the instinct of the average JS codebase:

- **Exceptions are the mechanism.** They break loudly by default when forgotten
  — that's the feature. No error-value plumbing as the default idiom.
- **Discriminate with `err.code`** (JS reality: `instanceof` breaks across
  package boundaries and realms; a `code` field + a duck-typed guard
  (`isIconsError(err)`) travels).
- **Error classes and guards live in the model.** `IconsError` + `isIconsError`
  belong in `icons.model.ts` — failure modes are domain vocabulary, and every
  layer (service, adapters, drivers) needs to reference them.
- **Catch only what you know how to handle.** In practice that means
  orchestrator/driver code almost exclusively. A local `catch` is legitimate for
  exactly two things: a genuine, known recovery at that site, or **enrichment**
  — wrap with context and rethrow
  (`throw new Error("loading icon manifest", { cause: err })`).
- **Catch what you expect, rethrow the rest.** A `catch` block starts by
  checking the discriminant; unexpected errors propagate.
- **Absolutely no defensive catch.** No catch-just-in-case, no
  catch-log-continue, no `catch {}`. Swallowing a real failure is the worst
  outcome available (see silent-failure class in the
  [self-review checklist](./self-review-checklist.md)).
- **Never lose the stack.** Wrap-and-rethrow uses `new Error(msg, { cause })`;
  the original error rides along.
- **Report at the edge.** The driver decides presentation: expected,
  user-actionable errors become a clean message (and exit code / HTTP status);
  unexpected errors are logged with full stack and fail loudly.
- **Degraded results are a domain decision, not an error-handling default.**
  Returning `[]`/`null` because extraction failed is lying to the caller. If a
  domain genuinely has partial-success semantics, model them explicitly (a
  discriminated result type naming _how_ it degraded and what recovery applies)
  — an exceptional, deliberate design, not a habit.

## 8. Testing

Consequences of [architecture](./architecture.md) Testing, materialized:

- **Write for the reviewer** (architecture: tests ARE the reviewed behavioral
  spec). Concretely:
  - each test reads _given X, when I do Y with Z, expect A, B, C_ — the scenario
    visible in the test body, not reconstructed from helpers;
  - the unit under test is identifiable at a glance — name it in the
    `describe`/test title and keep the exercised call prominent in the body;
  - fixture and assertion sit close enough to compare by eye — inline the values
    that the assertion is about; the test factory absorbs everything the
    scenario is _not_ about;
  - resist write-time DRY that hides scenarios (data-driven loops, layered
    helpers): duplication between tests is cheaper than illegibility at the
    gate.
- **Unit tests (`*.spec.ts`) colocate with their subject.**
  `icons.service.spec.ts` next to `icons.service.ts`. Unit tests exercise the
  codebase from inside — they live inside it.
- **E2e tests (`*.e2e.ts`) live outside `src/`** (root `tests/` per package).
  E2e exercises the system from outside — it lives outside. The in/out placement
  mirrors the in/out semantics.
- **Fixtures**: unit fixtures colocate (`__fixtures__/` next to the specs); e2e
  fixtures live with the e2e tests. Fixtures are test-purpose adapters — shared
  ones follow the normal sharing progression.
- **Shared test utils** live in `test/` directories that are ordinary services:
  `src/lib/test/` for the codebase-wide kernel, `src/lib/<domain>/test/` for
  domain-scoped sharing. Named layers, usual packaging rules (`private/` etc.).
  Not `__tests__/` — test runners execute what's in there, and the name promises
  "tests that run" to anyone from the Jest crowd; don't overload it.
- **Test utils are NOT coverage-excluded.** They get no dedicated tests (that
  goes circular) but must reach 100% transitively, through the tests that use
  them. A util below 100% is dead weight or hiding something — justify
  case-by-case or rip it.
- **No exporting internals "for tests".** Wiring a unit test into a
  previously-internal function by exporting it = violation (tests go through the
  contract). Promoting it to genuine public API — kept exported regardless of
  tests — is fine. Litmus: would the export survive deleting the tests?
- **Test factory pattern [prescribed]** — one per test module, wrapping service
  assembly with sensible defaults; tests override only what they mean to test
  (full rationale in [architecture](./architecture.md), Testing). Inline
  per-test assembly is the debt shape.
- **Coverage: the goal is 100% of the coverable layers** (model, service, pure
  helpers — everything testable through contracts). **Every exclusion must be
  motivated by a comment** at the exclusion site: type-only files (`ports/`),
  generated code, thin platform glue covered by e2e. An unmotivated exclude list
  is debt — it hides exactly the code most likely to be hiding something.

## 9. Reading a real codebase against this guide

Brownfield reality: codebases adopting this flavor carry residue. When
inspecting one, these are **debt, not variant conventions** — do not imitate:

- `index.ts` barrels inside the codebase — §5. (Package-boundary entry files are
  the unresolved case; in-codebase barrels are always debt.)
- Unmotivated coverage excludes / per-package divergent exclude lists — §8.
- Suffixless helper files inside service dirs — blob awaiting distillation, §1.
- Inline per-test assembly where a test factory should be — §8.
- A defensive `catch` — §7. Always debt. No exception to grandfather.

The suffix conventions, factory naming, and no-barrel rule are the load-bearing
surface: they are what makes violations visible by shape. Grouping directories,
util file layout, and other filing choices are yours.

---

## Open / unsettled

- **Package-boundary exports** (§5): direct-to-layer-file subpaths vs curated
  entry files — where exactly the no-barrel rule stops. Needs a ruling once the
  packaging practice has produced enough evidence.

---

## See also

- [Hexagonal Architecture — Theoretical Foundation](./architecture.md) — the why
- [Spec-Driven Development](./sdd.md) — the methodology this flavor serves
- Flight manual — the how, lookup-grade rules for daily use _(planned; derives
  from this guide)_
