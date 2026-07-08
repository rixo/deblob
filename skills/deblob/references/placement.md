---
source:
  docs/architecture.md (Services, Rules, Distillation, Lifecycle, Nesting) and
  docs/implementation-guide.md (§1–§4)
---

# Placement — where code goes

Two entry points, same rules. **New service**: pick the owning domain, create
the directory, lay the layers out below. **Extending a service**: place each new
piece in its layer — identical decision.

## The decision, per piece of code

1. Pure computation, types, domain constants → **model**.
2. A decision — which functions to call, in what order, combining injected data
   → a **service** use case.
3. Talking to one concrete technology (fs, HTTP, DB, external API) →
   **adapter**, behind a port.
4. The shape of what the service needs or offers at a boundary → **port**.
5. Instantiating and wiring → **assembly** (composition root, context provider,
   test setup).

Not worth extracting yet? Keep it private inside the service closure — see
Distillation below.

## Service anatomy

```
icons/
  icons.model.ts                     # pure domain
  icons.model.spec.ts
  icons.service.ts                   # use cases; createIconsService
  ports/icon-source.port.ts          # boundary contract (types only)
  adapters/manifest-source.adapter.ts
  private/scoring.model.ts           # internal — invisible outside
  README.md                          # the service's living doc
```

- Suffix always, even with one file per layer (`icons.model.ts`, never
  `model.ts`).
- Grouping dirs (`ports/`, `adapters/`) are filing — your choice; the suffix
  carries the layer.
- Adapter filename grammar: `<qualifier>-<port-name>.adapter.ts` —
  `fs-icon-store.adapter.ts`, `in-memory-fs.adapter.ts`.

## Rules by layer

**model** — pure, stateless, deterministic. Imports: model (see
crossing-services for other services' model) and pure third-party libraries (a
schema validator, a date lib). Anything with I/O, ambient state, or environment
access is NOT a model dependency — it's concrete, behind a port.

**ports** — type declarations, nothing else. No constants, no enums, no
functions, no defaults: runtime code in a port file means a model or adapter
extraction is pending. Supporting types ride along only as parts of the
contract; standalone domain types belong in model (ports may reference model
types freely).

**service** — factory `createIconsService({ source, store }: {...})`: one
destructured object typed with port types. ALL dependencies injected, **no
default values ever** — a default statically wires an adapter and defeats
assembly. Module level stays stateless; state lives in the closure. Imports:
model, ports. Never: adapters, other `.service.ts`, concrete I/O.

**adapters** — implement one port for one technology; absorb the source's
specifics so output conforms to the port shape (the service must never know
which adapter it got). Imports: model, ports, own service's `private/`, concrete
tech. Never: other adapters.

**assembly** — may import anything; keep it thin — every line of logic here is
untestable. Shared instances (one `createNodeFs()`) are created once at the root
and threaded down, never one per consumer.

## Config

Config is a port. The service declares the resolved shape it needs
(`IconsConfig`) and receives it injected. `InputIconsConfig` is the
pre-hydration user-facing shape — resolving it is assembly/adapter work. No
service reads config files or environment.

## Driver vs assembly

A driver (CLI command handler, HTTP route) translates an external trigger into
service calls. Litmus: "can I meaningfully define a port for this?" — yes →
service code behind the port; no (a whole framework) → assembly glue. Never try
to port-ify an entire framework.

## Purity chain

A file is only as pure as its least-pure import. A "model" file importing a
service is not model — the label lies, and every guarantee downstream of it is
false.

## `private/`

The only visibility boundary; everything else is public by default. Genuinely
internal code goes under `private/`. Sealed absolutely: nothing outside the
service imports from it — types included.

## Distillation — when to extract to model

Logic is born in the service closure. Extract when the concept has stabilized
AND could serve consumers beyond its birth use case. Extraction costs are real:
own tests, a committed name, API surface. Keeping it private is discipline, not
laziness.

## Decomposition — when to split a service

Signals: test explosion (computations × orchestration paths multiply), naming
pressure (long disambiguating qualifiers), cognitive load. Extract to model
first — often sufficient. Split when it isn't.

## Nesting

A service directory may contain child services — semantic filing, zero
privilege: a child cannot touch its parent's `private/`; every normal rule
applies. A nested adapter is a full service that points UP (it imports the
parent's port) — therefore the parent must never import from its own adapters,
not even their model: that's an instant cycle. (The general direction law is a
derived rule, staged for arch clarification — see root PLAN.)

## When judgment is needed

- **Extract vs keep private**: premature extraction pins tests, naming, and API
  onto an unstable concept; waiting is cheap. The forcing signal is a second
  consumer needing the same knowledge.
- **Split vs grow**: splitting creates distance that must be re-bridged (ports,
  kernels). Split on the three signals, never on file count.
- **The packaging heuristic**: any service should be splittable into a real
  package at any time. If that feels impossible — tangled imports, no clear
  public surface — placement debt exists even while every check is green.

## Deeper

Per judgment — not required for implementation.

- Layer semantics: [model](../knowledge/layer-model.md),
  [ports](../knowledge/layer-ports.md),
  [service](../knowledge/layer-service.md),
  [adapters](../knowledge/layer-adapters.md),
  [assembly](../knowledge/layer-assembly.md);
  [what "service" means](../knowledge/service-three-meanings.md)
- [distillation](../knowledge/distillation.md) — when to extract, costs
- [decomposition](../knowledge/decomposition.md) — signals, scales
- [nesting](../knowledge/nesting.md) — no privilege, the direction law
- `docs/implementation-guide.md` — §2 anatomy, §3 naming, §4 layer contents
- [rules](rules.md) — the dependency matrix
