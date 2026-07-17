# Step 01 — extraction core

Package scaffold made real + import-graph extraction behind a port. First
red-green target of the chapter. Absorbs `00_engine-research`'s record: the
ruling (oxc-parser + oxc-resolver, extraction behind a port) and its rationale
live in the chapter [PLAN](../PLAN.md) engine decision and
[research/engine-capability-matrix.md](../research/engine-capability-matrix.md)
— a separate step record would duplicate them, so the queue's provisional `00`
dissolves here (per its own escape clause).

## Goal

`packages/deblob` stops being a name-reservation stub: real tsconfig, vitest +
v8 coverage at the 100%-through-the-public-contract bar, exact-pinned oxc deps,
CI running it — and the first real capability: given a set of files, produce the
classified import graph every detector will consume.

Success looks like:

- The extraction contract, exercised on fixture mini-repos, returns exactly the
  expected edge sets for every verified form in the capability matrix — kinds
  (`runtime`/`type`) correct per specifier, resolution correct through tsconfig
  `paths`, `.js`→`.ts`, and package `exports` subpaths.
- Nodes come out classified through the Flavor port (layer, service root,
  `private/` membership) — detectors in later steps never see raw naming
  conventions.
- The package's own code dogfoods the architecture: ports as type-only
  contracts, the oxc engine as an adapter, orchestration as a service, pure
  graph types as model.
- CI is green on glibc and musl (wasm-fallback reachability proven by an Alpine
  smoke job).

Out of scope, explicitly: config file loading (`deblob.config.ts` parsing is a
later step — extraction takes explicit inputs), any detector, any CLI surface.
Assembly designation is an input (a matcher), not read from config here.

## API

Load-bearing contracts — exact signatures at implementation time, shapes ruled
here.

### The graph (model)

The one value detectors consume. Pure types, no behavior surprises:

- **Node** — a file in the coverage set: path, layer classification, owning
  service root (or none), `private/` membership. Layer is
  `model | ports | service | adapters | assembly | blob`. `assembly` is never
  inferred from naming in v0 — it is granted by the caller-supplied designation
  matcher (the future `assembly` config key); everything else comes from the
  flavor.
- **External leaf** — an edge target resolving outside the coverage set
  (package, builtin): specifier + package name, never parsed, never expanded
  (full-scan model, no discovery roots — see
  [research/config-options.md](../research/config-options.md)).
- **Edge** — importer → importee, deduped per `(from, to)`, with
  `kind: runtime | type` (runtime wins when a mixed statement carries both) and
  `form: static | dynamic | require` (`require` is always runtime).
- **Unresolved** — a specifier that fails resolution is surfaced as a diagnostic
  on the graph, never silently dropped (no defensive swallow).
- **Unparsed node** — a coverage-set file the engine has no extractor for
  (`.svelte`, `.vue` — the chapter's carried note): a node with no outgoing
  edges, still an edge _target_, still classified by the flavor. Per-filetype
  script extractors are the fast-follow, not v0; what assembly-privilege means
  for such files is the detector steps' concern, not extraction's.

### Extraction port (`extraction.port.ts`)

The engine contract — the arch's answer to the TS 7 rupture: parsing/resolution
engines are adapters. Given a file (path + source), yield its module record:
imports/re-exports with per-specifier type-only flags, dynamic imports,
`require()` calls; plus resolution: (specifier, importing file) → in-set path,
external, or unresolved. The oxc adapter is the stock implementation; the
contract must not leak oxc shapes (spans, napi types).

### Flavor port (`flavor.port.ts` — `FlavorResolver`)

The naming-scheme axis as an interface: given a path, yield layer
classification, service-root attribution, `private/` membership. Path-only
decidable — no file contents. Stock implementation: `ts-suffixes-factories`.

Stock classification rules (interpreting architecture.md — flag at review if any
reading is off):

- Layer from suffix: `*.model.ts` → model, `*.port.ts` → ports, `*.service.ts` →
  service, `*.adapter.ts` → adapters; anything unsuffixed → blob. The operation
  is total over paths: any path classifies, unknown shapes land in blob — never
  an error, never a skip.
- A directory is a **service root** iff it directly contains at least one
  layer-suffixed file, except conventional layer/grouping directories (`model`,
  `ports`, `service`, `adapters`, `private`), which attribute to their nearest
  qualifying ancestor (arch § Nesting: layer directories are not nested
  services). A file's service = nearest ancestor service root. Nested service
  dirs — including under `private/` — are their own roots.
- `private/` membership: any path segment `private/` marks the node private to
  the service owning that segment.

A custom flavor is a user-supplied implementation of this port (later wired via
`deblob.config.ts`) — nothing in this step may assume the stock flavor beyond
the assembly that instantiates it.

### Graph build (service)

Orchestration consuming both ports: coverage set in → parse every file → resolve
every edge → classify every node → graph out. No IO decisions of its own beyond
reading the files it is given.

## Testing

Tier 1 of the chapter strategy: on-disk fixture mini-repos under the package's
test tree, edge sets asserted through the extraction contract. Real red-green —
tests written failing first, commits land green.

Case list (= the matrix's verified forms + classification):

- `import type` statement; inline mixed `{ mk, type T }` (runtime edge,
  specifier kinds preserved); `export type {} from`; `export * from`; dynamic
  `import()`; `require()` — including a file with no `require` at all (prefilter
  negative path).
- Resolution: tsconfig `paths` alias, `.js`→`.ts` via `extensionAlias`, package
  `exports` subpaths, `.mts`/`.cts` files, unresolvable specifier surfaced as
  diagnostic.
- Classification: each suffix → its layer; unsuffixed → blob; `private/`
  membership; service-root discovery incl. a nested service and a layer dir that
  must not count as a root; assembly granted by matcher, not naming.
- Tripwire (open-set guard): a path shape absent from today's census — e.g. an
  unknown suffix (`*.helper.ts`) and an unexpected extension — must classify
  (blob) and extract without a special case; code built as a branch-per-known-
  case fails this mechanically.
- External leaves: node builtin (`node:path`) and npm package both become
  leaves, never expanded.
- Unparsed node: a `.svelte` file in the coverage set is a node and an edge
  target, contributes no outgoing edges, classifies via flavor.

Gates: vitest + v8, 100% coverage through the public contract (ports + factories
— no internal "for tests" exports); CI green on ubuntu + the Alpine container
smoke job (proves the musl/wasm fallback path loads and extracts correctly).

## Implementation

- **Scaffold**: `packages/deblob` gains tsconfig (strict, ESM, NodeNext), vitest
  config with v8 coverage thresholds at 100%, `test` + `typecheck` scripts;
  workspace already pnpm. No build/publish pipeline yet — that rides with the
  CLI step that ships a `bin`.
- **CI**: new `.github/workflows/` job — pnpm install, root `lint`, package
  `typecheck` + `test`; second job in an Alpine (musl) container running the
  extraction tests (wasm fallback reachable; known downstream failures are
  package-manager artifacts, see matrix). `deblob check` self-run joins CI once
  the binary exists (later step).
- **oxc pins**: exact versions (no ranges) for `oxc-parser`, `oxc-resolver`;
  `@oxc-project/types` in lockstep. Renovate/bump hygiene is manual until churn
  proves otherwise.
- **Engine specifics** (from the matrix's risk list, all land here):
  - `require()`: regex prefilter (`require(`) then AST walk only on matching
    files — never full-AST on every file; `experimentalRawTransfer` off (Windows
    address-space OOM).
  - Resolver options always set `conditionNames` + `extensionAlias` — JS-
    oriented defaults silently misresolve TS otherwise.
  - `dynamicImports.moduleRequest` is a span — slice the source.
- **Layout** (dogfooding, placement per the arch cards): graph types in model,
  the two ports type-only, oxc behind an adapter, graph build as a service, test
  assembly instantiating the lot. Exact file set at implementation, reviewed
  against the placement card.

## Docs

- `packages/deblob/README.md`: stub prose updated honestly — what exists after
  this step (extraction core, no CLI yet), engine named, no overselling.
- `docs/architecture.md`: untouched this step (the rule-4 "purity is declared"
  clarification rides with the layers-detector step, per PLAN).
- Chapter PLAN: step queue updated — `00` dissolved here, `01` opened.
