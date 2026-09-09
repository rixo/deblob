---
captured: 2026-07-11
---

# Arch pass — UI-zone formal holes + accumulated touches

## UI zone formal holes

(2026-07-11, Fable review of §Drivers/§Assembly, discussed with rixo.)

- **(F1) Drivers are missing from the dependency matrix** — "a driver is an
  adapter like any other" + the Adapters row (no adapter→adapter imports) makes
  every component tree a matrix violation; drivers need their own row or the
  equivalence is false.
- **(F2) "Separation is conceptual, enforced by convention" presents a gap as
  settled** — the arch's one overselling spot; needs an honest-gaps note (sdd.md
  has the pattern, arch doesn't).
- **(F3) Distributed assembly** (context providers mid-tree) breaks assembly's
  "outermost" slot — non-assembly code imports assembly nodes; formalism lacks
  interleaved/nested-assembly placement. Field sighting (2026-09-09): a frontend
  library's context module instantiates singletons at load (a default value, a
  dev-only warner bound to `console`, a marker from `import.meta.url`), reads
  ambient context (the framework's `getContext`, request-local storage on the
  server, a DOM script tag on the client) and hands the result to whatever asks
  — no injection point, the public API is a no-argument accessor. Not a service
  (impure, nothing injected), not an adapter (no port behind it), not assembly
  (library code imports it). The repo writes `.context.ts` as intent; the tool
  prints it under blob, which is the honest verdict today and costs nothing. The
  resolution here decides whether that is a named row or blob with a documentary
  suffix. Smaller, same family: `.assembly` / `.driver` filenames are
  intent-only too — designation is config, never suffix, by design — worth one
  sentence in the docs so nobody expects the suffix to act.

Inward protection stands solid (nothing inner imports UI; UI wiring services =
assembly hat) — the holes are all about the UI zone's internal structure.
Resolution material: `future/svench-flavor/` (taxonomy sketch).

## Nesting-packaging patterns commentary

Banked 2026-07-22 →
[research/nesting-packaging.md](research/nesting-packaging.md) (replete by
design — pre-written docs; sorting is this chapter's job). Executes the
outermost-PLAN idea "packaging dimension of nesting". Carries: legal patterns
progression, the sink invariant (kernel = role), facades split by effect, the
containment-semantics refutation (super-root collapse, ancestor-hub laundering,
kernel-re-derivation), Martin/Lakos reconciliation, §Nesting wording nits, and
one open flavor question (`private/`-merger as opt-in containment). Feeds
§Nesting + a future patterns doc (how-to genre — see the Diátaxis-audit idea on
the outermost board).

## Model bar: abstractness, not purity

**Landed 2026-07-24** as its own one-commit chapter →
[20260724_model-abstractness/SPEC.md](../../20260724_model-abstractness/SPEC.md)
(ruling, landed wording, swept ripples, pre-commit tribunal). Residue extracted
here as the two Ideas below.

### Ideas (from the model-abstractness landing)

- **`check state` detector** — `stateless-modules` is now AST-decidable:
  top-level `let`/`var`, module-root mutable collections (write-detection, or
  `const` + `ReadonlyMap`/`Readonly` annotation — `Object.freeze` is a no-op on
  Map/Set internals), exported live instances; ambient access (`Date.now`,
  `Math.random`, `globalThis`) is callable-name detectable, no import to see.
  Earns its place through its own future card. First field sighting
  (2026-09-09): a `.service.ts` holding a `let cache` at module scope and
  serving ambient context passed every lane — the matrix sees edges, nothing
  reads a module's top level — and was caught only because a runtime cycle
  happened to pass through it; its counterpart, same shape and unsuffixed,
  printed under blob and said nothing wrong. The narrow first cut (top-level
  `let`/`var` in model, service and port files) would have fired on it.
- **`.pure.ts` strict-flavor sublayer** — a flavor could add a
  referentially-transparent row below model with a tighter matrix line (knobs
  only tighten canon — legal without touching anything). Repairs the lost "model
  = RT" reviewer shortcut for teams that want it. Idea only, not pursued.

## Rule-why touches — `no-service-cycle` and the assembly-only seals

(2026-07-22/23, from the `no-service-cycle` raison-d'être discussion — material
and the full-read audit behind it in
[research/nesting-packaging.md](research/nesting-packaging.md) §15–16. Scope
deliberately narrow: the sweep judged the other rules' one-line whys
proportionate — `layer-in-path` / `private-sealed`'s full sections exist because
those rules are counter-intuitive house choices, not a bar for the rest. No
doc-wide rationale mandate. Both touches are _connections_ of rationale canon
already states — zero new claims.)

- **`no-service-cycle` (§acyclic)**: canon states the value level elsewhere,
  unconnected — "the architecture's whole point — that internals are free to
  move" (§ internal-seam testing) and "each can be moved independently"
  (§Sharing). Connect it at the rule: `no-service-cycle` is that whole-point
  sentence at package scale — refactorability is evolvability, a DAG-clean graph
  keeps every move's blast radius bounded; cycle = symptom of a misplaced fact,
  repair = move it to its owner. Extraction framing stays; §15 is source
  material, not copy; wording judged at touch time, rixo gates.
- **`service-assembly-only` / `adapter-assembly-only`**: justified circularly on
  the page ("composition unit — must be composed by assembly"). The rationale is
  substantial one section away (§IoC: central control, visible wiring, code
  splitting, testability) — attach with a cross-ref sentence, not new argument.

## Accumulated doc touches

- `XxxService` (not `XxxServiceAPI`) in examples.
- Store pattern reality check — zero `.store.ts` in practice: role, not file
  kind.
- **Landed 2026-07-22** (cli chapter, step 10_check-dag: direction law in
  §Nesting; kind asymmetry + wiring-placement line in the acyclic section):
  Nesting DAG implications spelled out — direction law (nested-adapter edges
  point up via the port; parent stays import-blind to its children; only the
  cycle trap is documented today). `ports-types-only` stands as written: ports
  are types only — an earlier softening idea was a misreading, since reverted in
  the guide.
- Port-type examples (`FsPort`, `LoggerPort`, `IconSourcePort`) predate the
  name-by-role ruling (2026-07-08, skills chapter step 02: bare role names,
  qualify only to disambiguate) — rename, then propagate to the arch cards
  mirroring them (layer-ports, crossing-services ref).
- **Owned by the cli chapter, listed here for inventory completeness** (both
  land with the cli layers detector step, 2026-07-17 rulings — see
  `20260710_cli/` PLAN + violation catalog): (a) `service-purity`
  purity-is-declared clarification — prose reads permissive, ruled
  default-concrete; (b) `service-assembly-only` / `adapter-assembly-only`
  enumeration gains blob — "only assembly" covers it, the "not by …" list omits
  it; ruled: composition/privacy seals bind blob as importer.
