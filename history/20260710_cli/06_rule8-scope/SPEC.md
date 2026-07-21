# Step 06 — rule-8 scope amendment

Amendment to landed step 03. `check layers` ratified "runtime edges only by
default (rule 8)" — a global type-edge skip. Rule 8's own words scope the
exemption to composition rules ("depending on a contract's shape is not
depending on its implementation"), and canon already says so explicitly
elsewhere: the rule-12 parenthetical reads "rule 8's exemption covers
composition rules only". Blob has no contract — its shape is its implementation
— so the global skip over-exempts: a model exporting types built on blob types
launders unratified shapes into a guaranteed layer at zero cost (rule 3: partial
extraction produces false guarantees). Surfaced 2026-07-21 at the 05 review (the
barrel type-channel discussion).

## Goal

`checkLayers` applies rule 8 per cell, not as a kind gate: type edges are
evaluated, and the exemption covers exactly the targets that own a contract
shape. Success looks like:

- A layered file type-importing blob fires rule 5 — the laundering channel
  closes.
- `import type { IconsServiceAPI } from '../icons/service'` stays legal anywhere
  — rule 8's example, verbatim, unchanged.
- `typeOnlyExempt: false` (strict) behavior is untouched: everything binds.
- The 05 SPEC's overlap bullet and the catalog's rule-8 asides match the new
  scope.

Out of scope: all other detectors (rules 2 and 12 are already kind-blind by
their own reasoning; barrels/private untouched), config surface, rendering.

## API

### Settled proposals (ratify at review)

- **The exemption operation** (not a cell census): under default rule 8, a type
  edge is exempt iff its target owns a contract shape —
  - in-set: **service and adapters targets** (the composition units; their API
    types are the contract rule 8 names). Model/ports targets are legal in every
    layered cell anyway.
  - external: **builtins and packages** (published types are the package's
    contract; rule 4's own rationale — bypassing ports, untestability — is
    runtime-only). `pureLibs` classification is irrelevant to type edges.
  - **blob and assembly targets bind**: blob has no contract (its shape is its
    implementation — the laundering channel), and assembly is wiring, exporting
    no contract anyone should depend on. Layer is a closed union, so the
    enumeration above is complete by definition, not by survey.
- **Rule-8 hint generalizes**: while the exemption is active, every runtime
  finding whose type-only variant would be exempt cites 8 alongside its rule —
  the existing `[6, 8]` service seal extends to `[7, 8]` (adapters), `[1, 8]`
  (model/ports reaching composition units), `[4, 8]` / `[1, 4, 8]` (concrete
  externals from pure layers), and the unclassified-lib shape (`[4, 8]` — the
  hint offers both escapes: declare in `pureLibs`, or `import type`). Cells
  whose type variant also binds (blob, assembly targets) keep their plain
  citation — no false "import type is fine" hint.
- **Strict mode unchanged**: `typeOnlyExempt: false` binds type edges
  everywhere, exactly as today; the knob stays tighten-only.
- **Arch touch, proposed**: rule-5 parenthetical mirroring rule 12's — "(type
  -only imports included — blob has no contract shape to depend on; rule 8's
  exemption covers composition rules only)". Same practice-level register as the
  ruled rule-4 wording; flag at review.

### `checkLayers(graph, options)` — signature unchanged

No new options. The global type-edge skip is replaced by the per-target
operation inside cell evaluation; external classification for type edges
short-circuits to exempt.

## Testing

Tier 2, constructed graphs, red first; commits land green. Existing cases stay
except hint citations, updated where the proposal above adds an 8.

- Fires: service → blob type edge (`[5]`); model → blob type edge (`[5]`); model
  → assembly type edge (`[1]`, no hint).
- Stays green (default): model → service type, service → service type, adapters
  → adapters type, service → concrete external type, model → unclassified
  external type.
- Hint citations: runtime model → service `[1, 8]`; runtime adapters → adapters
  `[7, 8]`; runtime model → concrete `[1, 4, 8]`; unclassified-lib `[4, 8]`;
  strict mode drops every 8.
- Strict (`typeOnlyExempt: false`): the new green cases above go red with their
  plain citations — pinned.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage.

## Implementation

- `layers.model.ts` only: drop the top-of-loop `continue`; module cells take the
  edge kind — type edges to service/adapters (and legal cells) yield null, type
  edges to blob/assembly evaluate as runtime does; external evaluation returns
  early for type edges under the exemption. Hint arrays extend per the proposal.
- No graph or port changes; no other detector touched.

## Docs

- `docs/architecture.md`: the proposed rule-5 parenthetical (above) — only if
  ratified.
- `research/violation-catalog.md`: § check layers rule-5 entry gains the
  type-only note; the rule-6 aside "`import type` is legal (rule 8)" is already
  true under the new scope (service target = composition unit) — no change
  needed there.
- `03_check-layers/SPEC.md`: dated amendment note under the rule-8 bullet
  pointing here — history stays append-only, the note marks supersession.
- `05_check-barrels/SPEC.md`: overlap bullet's residue claim corrected in place
  (type-only index imports now fire 5 too; remaining rule-2 residue =
  model/ports barrels, remedy divergence, root-cause attribution).
- Chapter PLAN: queued amendment bullet dissolves into this step.
