# Step 07 — check ports

Fourth detector: rule 10, ports are types only. Behavior seeded from
[research/violation-catalog.md](../research/violation-catalog.md) § check ports
plus the carried ruling from the 03 review (chapter PLAN, step queue): a runtime
import edge from a port file is always a defect. Second detector needing a fact
the graph doesn't carry — a file's runtime content — so an extraction-core
extension rides along, behind the existing port (05 precedent).

## Goal

Given the classified import graph, `checkPorts` returns exactly the rule-10
violations — runtime content in port files (the catalog's shape), runtime import
edges out of port files (the carried ruling), and runtime import edges into port
files (ruled at this spec, 2026-07-21) — as pure values, no IO, no formatting.

Success looks like:

- A port file exporting `const DEFAULT_DPI` fires, citing rule 10 with the
  declaration named — the catalog line, verbatim.
- A port file with a runtime import edge fires, whatever the target — including
  matrix-legal ones (`ports → model`): types never need runtime bindings, so the
  edge is always one of three defects (runtime re-export, side-effect import,
  missing `type` keyword), and the finding teaches all three.
- `import noTypeKw from './some.port.ts'` fires at the importer, whoever it is —
  a types-only file can never supply a runtime binding, so the edge is a missing
  `type` keyword or an upstream expectation of runtime the port must not hold.
- A pure port — type-only imports in, interfaces and type aliases out — is
  green, as is runtime content anywhere that isn't a ports file.
- The extraction extension stays engine-shaped: the runtime-content fact crosses
  the port as data; no oxc types leak.

Out of scope, explicitly: rule 11 (one port, one interface — judgment, never
mechanical; coverage table), config loading, CLI surface and rendering, all
other checks.

## API

### Settled proposals (ratify at review)

- **Three shapes, one rule** — rule 10 read whole: ports are inert, so a runtime
  edge _incident_ to a port file — either end — is a defect. `runtime-export` —
  the port file itself contains runtime code (the catalog's shape).
  `runtime-import` — the port file has a runtime import edge (the carried
  ruling). `runtime-import-of-port` — a runtime edge into a port file,
  attributed at the importer (ruled 2026-07-21, rixo, at this spec — the
  question "will the tool fire on `import noTypeKw from 'some.port.ts'`" exposed
  the one-directional hole: matrix letter legalizes runtime `service → ports`,
  so layers is silent and nothing fired). All cite `[10]`; the shapes diverge on
  remedy and attribution side, so they stay distinct findings — barrels'
  two-shape attribution pattern, one more member.
- **What counts as runtime content**: the erasable forms are `import type` /
  `export type`, interface declarations, type aliases, and ambient `declare`
  declarations; every other top-level statement in a port file is runtime
  content and fires. Decided per AST node kind on the one parse extraction
  already does — no tsc, no type checking. Listing the erasable side rather than
  the runtime side is deliberate: erasure is defined by the language grammar, so
  that list can't grow behind our back, and new or exotic syntax fires instead
  of slipping through — same safe-default direction as the rule-4
  default-concrete ruling. Pinned: `enum` (and `const enum`) is a value binding
  and fires — a port expresses finite choice as a union type; non-ambient
  `namespace` emits an object and fires; `export default interface` is erasable
  and green.
- **Import and re-export statements are edge facts, not content facts** — they
  never appear in the runtime-content list. The edge shapes own them, one
  finding per runtime edge (static, dynamic, `require`, side-effect, re-export —
  form-blind), so the shapes partition rule 10 without double-firing inside the
  check. One shape per edge: `runtime-import` when the importer is a port (the
  actor is guilty; covers `port → port` alone), `runtime-import-of-port`
  otherwise. The indirect re-export (`import { x } …; export { x }`) is already
  an edge by the 05 module-record ruling; the bare local `export { x }` of a
  locally-declared binding is covered by the declaration itself being runtime
  content.
- **`runtime-import` is target-blind — flat** (the carried ruling, ratified
  here): `typeof` works through `import type`, so no port ever needs a runtime
  binding. Fires even where the matrix is silent (`ports → model`,
  `ports → ports`, pure-lib externals). Citation `[10]` plain — the remedy hint
  enumerates the three diagnoses (runtime re-export out of the port; side-effect
  import; missing `type` keyword) rather than citing 8: rule 8 exempts
  composition rules, and this is rule 10's own reasoning. Type edges from ports
  never fire this check, under either `typeOnlyExempt` stance — rule 10 bans
  runtime, strictness about type edges elsewhere doesn't create runtime here.
  Relationship to `verbatimModuleSyntax` (2026-07-21, at spec): TS1484 covers
  only the type-entity half, only in repos that enable the flag — values used in
  type position (`typeof`, class-as-type), side-effect imports, and runtime
  re-exports pass TS silently, and default-elision repos get no error at all.
  The detector is tsconfig-independent and covers that residue; the graph is
  source-level truth (05 ruling — no symbol analysis, the line is what's
  written), so an elidable-but-unwritten-`type` import still fires and the
  remedy is to make the source honest.
- **`runtime-import-of-port` is importer-blind — no exemptions** (ruled
  2026-07-21, rixo): fires for every non-port importer of a runtime edge into a
  ports-layer file. Blob binds — the blob-binding list (6, 7, 12, 14) grows a
  10-as-target entry by the list's own logic: blob is outlaw about itself, not
  above others' seals, and port inertness is the port's seal (any file could
  dodge it by staying unlabeled). Assembly binds — wiring takes values from
  composition units and types from ports; `import type` suffices for assembly
  too, and the damaged guarantee (a live edge into an inert file — spurious
  rule-14 cycle material under `verbatimModuleSyntax`, a source lie under
  elision) belongs to the port, not the importer. Citation `[10]` plain; the
  remedy hint offers both reads: add the `type` keyword, or the importer expects
  runtime a port must not hold (extract it — the port-side `runtime-export`
  finding marks the other half where it exists).
- **Overlap with `check layers` accepted, not deduplicated** (04/05 precedent):
  `ports → concrete/blob` runtime edges also fire the matrix, and
  `model → ports` runtime fires rule 1 there alongside the into-side shape here.
  Same three reasons as 05 — detector totality, remedy divergence (the matrix
  says "wrong target", rule 10 says "no runtime touches a port, period"), and
  folding is a presentation concern.
- **No options.** Rule 10 has no exemption axis and no canon-minimum looser
  reading to return to; `checkPorts(graph)`. A loosening knob was weighed and
  rejected (2026-07-21, rixo): opting out of `runtime-export` goes below canon's
  letter (knob polarity), and the narrow flat-import opt-out — legal by the
  `tolerateBlobReexport` shape — has no constituency: port files don't pre-exist
  adoption, so no brownfield tail, and the remedy costs one `type` keyword.
  Every "contract runtime" pressure case (constants, error classes, schemas) is
  model code by the arch's own lines.
- **Arch touch, proposed**: rule-10 parenthetical, practice register — "(and no
  runtime edge touches a port in either direction: `typeof` works through
  `import type`, so a runtime import from — or of — a port file is always a
  runtime re-export, a side-effect import, or a missing `type` keyword)". Flag
  at review.

### Extraction extension — the runtime-content fact

- `FileExtraction` gains `runtimeContent: readonly RuntimeEntry[]` —
  `RuntimeEntry = { form: string; name: string | null; exported: boolean }`.
  `form` is the declaration keyword as written (`const`, `function`, `class`,
  `enum`, `namespace`, …), `"default"` for `export default` expressions,
  `"statement"` for any other non-erasable top-level entry; `name` null where
  the grammar gives none. The adapter maps known declaration forms and lets
  everything else fall to `"statement"` — the open remainder stays covered by
  construction.
- `ModuleNode` gains the same `runtimeContent` list — empty for `parsed: false`
  nodes (no claim either way; an unparseable port contributes no content
  findings, its edges — none — nothing; noted, not chased).

### `checkPorts(graph)` (pure)

One pass over `graph.modules` for `runtime-export` (ports-layer nodes with
non-empty `runtimeContent`, one finding per entry), one pass over `graph.edges`
for the edge shapes (runtime edges with a ports-layer node on either end —
`runtime-import` when `from` is ports, `runtime-import-of-port` when only the
target is). Same loud `moduleOf` contract as the other detectors.

### Violation model — fourth union member

`PortsViolation`: `check: "ports"`, `ruleset: "arch"`, `rules: [10]`, `file`
(the attribution side: the port for `runtime-export` / `runtime-import`, the
importer for `runtime-import-of-port`) + `serviceRoot` (of `file`), and the
discriminant: `shape: "runtime-export"` carrying `form` / `name` / `exported`
(the message channel: "exports const DEFAULT_DPI"), `shape: "runtime-import"`
carrying `target` (the edge target, in-set or external),
`shape: "runtime-import-of-port"` carrying `target` (the port module).

## Testing

Tier 2 (constructed graphs) plus a tier-1 slice for the extraction extension.
Red first; commits land green.

Tier-1 cases (extraction fixtures, through the extraction port):

- `export const` / `export function` / `export class` / `export enum` /
  `export default <expr>` → one entry each, keyword form, `exported: true`,
  names carried (`null` for the anonymous default).
- Non-exported top-level `const` and a bare expression statement → entries
  (`exported: false`; `"statement"` with `name: null`).
- Non-ambient `namespace` → entry; `declare` ambient (const, namespace, enum) →
  no entry.
- Types-only file — `import type`, interface, type alias, `export type`,
  `export type { T } from`, `export default interface` → `runtimeContent` empty.
- Import / re-export statements (`import { x } from`, `export { x } from`,
  side-effect import) → no content entries — the partition pinned.

Tier-2 case list (= catalog § check ports + the settled proposals):

- `runtime-export` fires: ports node with a `const` entry (the catalog's
  `DEFAULT_DPI` line — name and form surface in the finding); one finding per
  entry when several; non-exported entry fires too.
- `runtime-export` stays green: empty `runtimeContent` port; runtime entries on
  model / service / adapters / blob / assembly nodes.
- `runtime-import` fires: port → model runtime (flat — matrix-legal target);
  port → ports runtime; port → external runtime (builtin, package, pure-lib
  classification irrelevant); port → blob runtime; dynamic and `require` forms;
  re-export edge (`export { x } from './x.adapter.ts'`); side-effect import.
- `runtime-import` stays green: type edges from ports to anything; runtime edges
  from every non-ports layer to non-ports targets.
- `runtime-import-of-port` fires: service → port runtime (the matrix-legal cell
  — the question's case, default-import form); adapters, assembly, and blob
  importers (importer-blind pinned); model → port runtime; dynamic and `require`
  forms. Attribution: `file` = the importer, `target` = the port.
- `runtime-import-of-port` stays green: `import type` of a port from anywhere;
  runtime imports of non-port targets.
- One shape per edge: port → port runtime → exactly one finding,
  `runtime-import` (the partition pinned).
- Shapes compose: a port with a runtime const and a runtime import → two
  findings, distinct shapes.
- Overlap pins: port → blob runtime fires here (`[10]`) and in `check layers`;
  model → port runtime fires here and rule 1 there — both present on the
  combined output of the two detectors.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Pure per-node + per-edge evaluation; no graph mutation, no ordering logic.
- Placement: `src/lib/check/ports.model.ts` + spec, next to the other detectors;
  `violation.model.ts` union grows its fourth member.
- Extraction: `runtimeContent` through `extraction.port.ts` → oxc adapter
  (top-level statement walk over the already-parsed AST — no second parse) →
  `extraction.service.ts` node build → `graph.model.ts`; existing tier-1 fixture
  repo (`__fixtures__/forms`) grows the content forms.

## Docs

- `docs/architecture.md`: the proposed rule-10 parenthetical (above) — only if
  ratified.
- `research/violation-catalog.md`: § check ports gains both edge shapes (the
  carried ruling and the into-side ruling land where the catalog reader looks);
  the "explicit non-violations" list's blob-binding aside gains the 10-as-target
  note.
- `packages/deblob/README.md`: untouched — still no runnable surface.
- Chapter PLAN: step queue — 07 opened; the carried ports note dissolves into
  this SPEC.
