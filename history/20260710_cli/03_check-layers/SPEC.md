# Step 03 — check layers

First detector: the dependency matrix by layer, runtime imports only. Behavior
seeded from [research/violation-catalog.md](../research/violation-catalog.md) §
check layers (wording drafts stay research until the CLI step's golden tests
absorb them — this step ratifies semantics, not strings).

## Goal

Given the classified import graph, `checkLayers` returns exactly the matrix's
violations — rules 1, 4, 5, 6, 7 (with 8's exemption and 9's carve-out) — as
pure values, no IO, no formatting. The catalog's violation half all fires; its
non-violation half all stays silent.

Success looks like:

- Every forbidden matrix cell fires with the right rule citation(s); every
  deceptively suspicious shape from the catalog's non-violation list — legal by
  deliberate design, flagged only by naive tooling — stays green.
- The detector is a pure function: constructed graph in, violation set out — the
  chapter's tier-2 TDD sweet spot, red first.
- Our own repo's shape survives: `*.spec.ts` classified assembly by the flavor
  (the 2026-07-20 ruling), so colocated specs importing their service no longer
  collide with rule 6.
- The two ruled arch touches land (rule-4 practice-level purity line, rules-6/7
  enumeration gains blob).

Out of scope, explicitly: config loading (`pureLibs`/`typeOnlyExempt` arrive as
explicit inputs), CLI surface and message rendering, all other checks (private,
barrels, ports, dag), rule 3 as its own violation type (see Closed proposals).

## API

### Violation model (first instance of the cross-detector shape)

One structured value per finding — carries every fact the CLI step needs to
render the catalog's lines, no prose inside:

- `check` — `"layers"` here; the union grows one member per detector step.
- `ruleset` — the rulebook the numbers cite: `"arch"` (architecture.md §
  Summary) is the only member in v0; rule numbers mean nothing without their
  book, and the shape freezes once JSON/SARIF output ships — so the discriminant
  is baked while cheap. The SDD conventions behind `deblob docs` join only if
  that family ever shares this model. Ratified 2026-07-21 (rixo) with a
  rendering nuance: the field lives in the model; output may omit it while it
  stays single-valued.
- `rules` — the cited rule numbers within the ruleset (a finding may cite two:
  e.g. 6+8 when the hint is "import type is fine").
- `file` — the offending importer; `serviceRoot` — its grouping key (`null` =
  the `blob` bucket, per the ordering ruling).
- The edge facts: target (in-set path or external specifier), plus a
  discriminant naming the violation shape (matrix cell / unclassified-lib) so
  rendering never re-derives semantics.

### `checkLayers(graph, options)` (pure)

- Considers **runtime edges only** by default (rule 8); `typeOnlyExempt: false`
  in options pulls type edges into scope (the ruled strict opt-out — knobs may
  only tighten canon, never loosen it). _Amended 2026-07-21 by
  [06_rule8-scope](../06_rule8-scope/SPEC.md): the global type-edge skip
  over-read rule 8 — the exemption is per cell (targets owning a contract
  shape); type edges to blob and assembly bind._
- Options carry the concrete-classification inputs (the catalog's design note,
  three sources in order): the shipped builtin baseline (Node builtins concrete
  save a small curated pure set), `pureLibs` from the caller, default-concrete
  for the unlisted (the 2026-07-17 polarity ruling — the unclassified violation
  is the surfacing mechanism).
- Per-cell semantics (the matrix, closed union — exhaustive enumeration is
  correct here, six layers by definition):
  - model/ports importing service, adapters, or assembly → rule 1; model
    importing concrete/unclassified external → rules 1, 4 / rule 4.
  - service importing concrete → rule 4; unclassified external from
    model/service → rule 4 (escape-hatch citation).
  - non-assembly runtime-importing a `.service.ts` → rule 6; an adapter → rule 7
    (adapter→adapter included). **Blob binds as importer** (the 2026-07-17
    enumeration ruling — seals can't be dodged by staying unlabeled).
  - a labeled non-assembly layer (model, ports, service, adapters) importing
    blob → rule 5, reported under `layers` (see Closed proposals). Blob
    importing blob stays legal — blob binds as importer only under rules 6, 7,
    12, 14 (catalog non-violation list): the all-blob repo is the brownfield
    ground state and runs `check layers` clean. The why of rule 5 is chain
    purity (rule 3): a labeled layer importing blob blobifies its own guarantee;
    assembly alone is exempt, wiring-dirty by nature.
  - Own-service `private/` imports by service/adapters: legal (rule 9) — rule 12
    enforcement is the private step's, not here.
  - assembly row: everything legal.

### Flavor amendment — test files are assembly

The 2026-07-20 ruling lands here: `ts-suffixes-factories` classifies test files
(`*.spec.*` and `*.test.*`, same extension set as layer suffixes) as
**assembly** — rule 16 made spec-as-assembly arch canon, and the flavor is
precisely where opinions live. This amends step 01's "assembly is never inferred
from naming": that held for _source_ naming; test naming is the flavor's
opinion, the config `assembly` designation matcher still ORs on top (escape
hatch for exotic naming). `FlavorLayer` widens accordingly (no longer excludes
`assembly`).

Ruled out here (2026-07-21, rixo): extending the same mechanism to `.svelte`.
Framework-file classification is preset/fast-follow territory (the presets
ruling — framework knowledge stays out of the arch-style flavor), and the
eventual stance is genuinely open (entry-points-only assembly privilege,
possibly narrower). v0: `.svelte` classifies blob like any unsuffixed file;
accepted costs — blob-% inflation on component-heavy repos, rule 5 on a labeled
layer importing a `.svelte` — are the honest v0 read, not false positives. The
PLAN carried note's "assembly-privileged" stance is superseded.

## Testing

Tier 2 of the chapter strategy: constructed `ImportGraph` values in, violation
sets out — no disk, no engine. Red first; commits land green.

Case list (= catalog § check layers + the binding non-violations):

- Each violation shape: model→impure (1, 4), model/ports→outward (1),
  service→concrete (4), service→adapter (1), runtime service-import outside
  assembly (6 — importer variants: service, adapter, blob), adapter-import
  outside assembly (7 — incl. adapter→adapter), labeled non-assembly→blob (5 —
  importer variants: model, service), unclassified lib from a pure layer (4).
- Non-violations that must stay green: `import type` of service/adapter (rule 8,
  incl. the mixed-statement type specifier), blob→blob/model/ports, own-service
  `private/` from service/adapter (9), adapter→concrete, model→`pureLibs`-listed
  lib, cross-service model→model, assembly→anything.
- Options: `typeOnlyExempt: false` flips the rule-8 cases red; `pureLibs`
  membership flips the rule-4 case green.
- Flavor (adapter suite, extends step 01's): `*.spec.ts`/`*.test.ts` → assembly
  incl. inside grouping dirs; `.svelte` stays blob (the ruled-out rider); suffix
  census tripwire still holds (unknown suffix stays blob — test naming is a
  closed carve-out, not a new open set).
- Ground state: an all-blob graph — blob importing blob, model-free — yields
  zero violations (the brownfield adoption story, executable).
- Tripwire (open-set guard, external classification): a never-seen bare
  specifier from a pure layer must fire unclassified — the operation is
  "unlisted ⇒ concrete", never a census of known libs.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Pure evaluation per edge: (importer layer, target class) against the matrix +
  kind filter — one pass over `graph.edges`, no graph mutation, no ordering
  logic (grouping/sorting is the CLI step's).
- Placement per the arch cards (detector = pure domain logic): violation types
  and the detector land model-side under `src/lib/check/`; exact file set at
  implementation, reviewed against the placement card.
- Flavor amendment in the existing adapter + `FlavorLayer` widening in the graph
  model; step 01's port comment updated to the amended stance.
- Closed proposals (ratified 2026-07-21, rixo):
  - Rule-5 findings report under `layers` (matrix-shaped fact; no sixth check
    without a future card) — catalog open item settled here.
  - Rule 3 gets no own violation type in v0: every impure link already fires at
    its own edge; a transitive echo per downstream file is noise, not signal.
    Coverage table's "maybe" → "derived, not reported".
  - Test-file glob set: `*.spec.*` + `*.test.*` suffix forms only — suffix
    naming is the flavor's identity axis; `__tests__/` directory conventions
    stay to the config escape hatch.

## Docs

- `docs/architecture.md`, the two ruled touches: rule-4 prose gains the bounded
  practice-level line ("in practice, purity should be declared, not presumed" or
  similar — theory must not mandate the tool's default-concrete opinion); rules
  6/7 "not by …" enumerations gain blob. Third touch (ratified 2026-07-21,
  rixo): rule 5's "everything else importing from it" strictly reads as binding
  blob too — a parenthetical closes the same list-reading gap the 6/7 touch
  closes, worded on the claims invariant ("blob importing blob is fine — only a
  layer that makes a guarantee can break one; blob and assembly claim none").
- `packages/deblob/README.md`: untouched — still no runnable surface.
- Chapter PLAN: step queue — 03 opened; carried `.svelte` note marked superseded
  (classification parked to preset/fast-follow).
