# Step 05 — check barrels

Third detector: rule 2, layer visibility in the import path. Behavior seeded
from [research/violation-catalog.md](../research/violation-catalog.md) § check
barrels. First detector needing a fact the graph doesn't carry yet — the
import/re-export distinction — so a small extraction-core extension rides along,
behind the existing port.

## Goal

Given the classified import graph, `checkBarrels` returns exactly the rule-2
violations — both catalog shapes — as pure values, no IO, no formatting.

Success looks like:

- A barrel — an index file re-exporting layered files — fires at the index;
  importing through an index fires at the importer. Both shapes, separately
  attributable, matching the catalog's two example lines.
- The brownfield ground state stays clean: blob index files, blob-only
  re-exports, and blob importers of index files are all green — rule 2 binds
  guarantees, and the catalog's blob-binding list (6, 7, 12, 14) excludes it.
- The extraction extension stays engine-shaped: the re-export fact crosses the
  port as data; no oxc types leak.

Out of scope, explicitly: config loading, CLI surface and rendering, all other
checks; any `exports`-map / package-entry analysis (the packaging boundary is
config's `assembly` designation, see below).

## API

### Settled proposals (ratify at review)

- **Rule 2 is kind- and form-blind**, same reasoning as rule 12 at step 04: rule
  8 scopes its exemption to composition rules by its own words; a type-only
  barrel (`export type { X } from './x.model.ts'`) erases layer visibility
  exactly as a runtime one.
- **Index file** = basename `index` + the parseable extension set (the
  resolver's own list, closed by definition — same set the flavor's suffix
  regexes use). `index.model.ts` is not an index: the resolver never lands on it
  for a directory import, and its layer is visible.
- **`barrel-file` shape** — fires at the index file, one finding per re-export
  edge to a layered target (model/ports/service/adapters — closed union).
  Re-exporting blob only is green (no guarantee erased — brownfield barrels stay
  legal). An **assembly-classified index is exempt**: a package entry
  re-exporting its public surface is the npm packaging boundary, deliberate by
  designation, and assembly claims nothing (rule-5 reasoning). Re-exports from a
  non-index file are green — the layer stays visible in that file's own import
  path; rule 2 bans index indirection, not re-export.
- **Re-export is a module-record fact, syntax-blind** (2026-07-21, at review):
  `import { x } from './x.model.ts'; export { x }` is the same live indirect
  binding as `export { x } from` — ESM's own ExportEntries semantics, which the
  engine's module record already normalizes (the local export entry carries the
  import's source). No symbol analysis in the tool; the language draws the line.
  `export const y = x` is a new binding — blob code, green, priced by the blob
  metric.
- **`tolerateBlobReexport` opt-out, default off (fires)** (2026-07-21, at
  review): silences the `barrel-file` shape; `index-import` is untouched —
  claimants stay bound. Rationale: rule 2's explicit words and the blob-binding
  list don't name blob re-export — the index is blob doing blob things, shamed
  by the metric like the rest — so default-on is the tool's opinionated reading
  (a fresh barrel over already-extracted layers is almost certainly a mistake)
  and the opt-out returns to the letter of canon, never below it (knob-polarity
  ruling upheld: canon-minimum, not loosened past it). The first-run tolerance
  claim is unaffected either way: a virgin brownfield has no layered files, so
  `barrel-file` cannot fire there.
- **`index-import` shape** — fires at the importer, one finding per edge from a
  labeled non-assembly module (model/ports/service/adapters) to an in-set index
  module, whatever the specifier spelling: `../invoice` and
  `../invoice/index.ts` land on the same file and hide the layer the same way,
  so the resolved target decides and the raw specifier is never needed. Blob
  importers exempt (the blob-binding list), assembly importers exempt (claims
  nothing; the barrel itself already fires where one exists). External targets
  never fire — a bare specifier is the package's API, not path indirection.
- **Overlap with `check layers` accepted, not deduplicated** (step-04
  precedent). The overlap is real and larger than one edge: a labeled layer
  importing a blob index also fires rule 5 there, and a barrel's re-export edge
  to service/adapters also fires rule 6/7 (blob binds as importer). Kept anyway,
  deliberately:
  - Each detector stays total for its own rule. Narrowing rule 2 to "where
    layers is blind" would couple its output to the layers check being enabled
    and to rule-8 config — relaxing either would silently open a hole here.
    Overlap is the price of composability; a fix that clears one edge clears
    both findings, linter-style.
  - The remedies diverge: rule 5 says "extract from blob", which is wrong for
    barreled code (already extracted) — rule 2's "import the layered file
    directly" is the fix that applies. Suppressing either side sometimes leaves
    the wrong guidance standing alone.
  - Rule 2 keeps residue layers never sees: barrels over model/ports (blob may
    import those) and, under default rule 8, type-only index imports. _Corrected
    2026-07-21 by [06_rule8-scope](../06_rule8-scope/SPEC.md): type-only index
    imports now fire rule 5 too (blob target binds); the remaining rule-2
    residue is model/ports barrels, remedy divergence, and root-cause
    attribution at the index._
  - If duplicate findings ever hurt, folding is a presentation concern — the
    renderer may group findings per edge; detectors stay pure and complete.
- **Dogfood consequence, noted not implemented**: when `packages/deblob` grows
  its real entry, the entry file gets the config `assembly` designation in our
  own config — the exemption above is the designed path, not a loophole.

### Extraction extension — the re-export fact

- `ImportRecord` gains `reExport: boolean`; the oxc adapter sets it `true` for
  module-record static-export entries with a source (`export { x } from`,
  `export * from`, `export * as ns from`, `export type ... from` — and the
  indirect form `import { x } …; export { x }`, which the module record
  normalizes to an entry with the same source), `false` everywhere else
  (static/dynamic/require imports).
- `ImportEdge` gains `reExport: boolean` — `true` iff any contributing
  occurrence is a re-export (OR under the one-edge-per-(from, target) merge,
  independent of the runtime-wins kind merge).

### `checkBarrels(graph, options)` (pure)

Kind- and form-blind. One option: `tolerateBlobReexport` (default `false`)
silences the `barrel-file` shape, `index-import` unaffected — see the settled
proposal above. One pass over `graph.edges`, in-set (`module`) targets only.
Same loud `moduleOf` contract as the other detectors.

### Violation model — third union member

`BarrelsViolation`: `check: "barrels"`, `ruleset: "arch"`, `rules: [2]`,
`file` + `serviceRoot` (attribution side: the index for `barrel-file`, the
importer for `index-import`), `target` (the re-exported layered file / the index
module), and the `shape` discriminant (`"barrel-file"` / `"index-import"`) —
second use of the `LayersViolation` discriminant pattern.

## Testing

Tier 2 (constructed graphs) plus a tier-1 slice for the extraction extension.
Red first; commits land green.

Tier-1 cases (extraction fixtures, through the extraction port):

- `export { x } from`, `export * from`, `export * as ns from`,
  `export type { T } from` → edges carry `reExport: true` (the type form also
  `kind: "type"`).
- Indirect form `import { x } …; export { x }` → `reExport: true` (pins the
  module-record normalization).
- Plain static/dynamic/`require` imports → `reExport: false`.
- Same-target import + re-export in one file → single edge, `reExport: true`.

Tier-2 case list (= catalog § check barrels + the settled proposals):

- `barrel-file` fires: index re-exporting a `.service.ts` (the catalog line) and
  a `.model.ts`; type-only re-export fires; extension variants (`index.tsx`,
  `index.mjs`).
- `barrel-file` stays green: index re-exporting blob only; index that only
  imports (no re-export edge); assembly-classified index re-exporting layered
  files (the entry exemption); a non-index file re-exporting layered files.
- `index-import` fires: service → in-set index (the catalog's directory import);
  model → index; type-only and dynamic edges fire.
- `index-import` stays green: blob importer; assembly importer; external target
  (bare specifier resolving into a package).
- Both shapes at once: service imports an index that re-exports a service file →
  two findings, one per attribution side.
- `tolerateBlobReexport: true`: `barrel-file` cases go green; `index-import`
  still fires on the same graph.
- Ground state: all-blob graph with `utils/index.ts` and directory imports into
  it runs clean.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Pure per-edge evaluation; no graph mutation, no ordering logic.
- Placement: `src/lib/check/barrels.model.ts` + spec, next to the other
  detectors; `violation.model.ts` union grows its third member.
- Extraction: `reExport` through `extraction.port.ts` → oxc adapter →
  `extraction.service.ts` edge merge → `graph.model.ts`; existing tier-1 fixture
  repo (`__fixtures__/forms`) grows the re-export forms.
- Index-basename test shares its extension set with the flavor's — one constant
  if placement allows without coupling detector to flavor; decided at
  implementation.

## Docs

- `docs/architecture.md`: no touch expected — rule 2 prose already carries the
  why (§ The problem with index.ts); the assembly-entry exemption is tool stance
  riding on designation, not new canon. Flag at review if rixo wants a
  parenthetical anyway.
- `packages/deblob/README.md`: untouched — still no runnable surface.
- Chapter PLAN: step queue — 05 opened.
