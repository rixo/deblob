# Step 10 — check dag

Fifth and last v0 detector: rules 13 (service DAG) and 14 (module runtime
cycles). Behavior seeded from
[research/violation-catalog.md](../research/violation-catalog.md) § check dag
and the output fiction (help-screens § sample run — the `cross-service` bucket).
The step was gated on the "nesting DAG implications" arch touch
(`history/future/arch-pass/`): that touch rides here (03 precedent — ruled
touches land with the step that needs them). First detector since 03 needing no
extraction extension — the graph already carries every fact (edges with kind,
`serviceRoot` by nearest-ancestor attribution, layers).

## Goal

Given the classified import graph, `checkDag` returns exactly the rule-13 and
rule-14 violations — service cycles over every import kind, module cycles over
runtime edges — as pure values, no IO, no formatting.

Success looks like:

- The nesting trap fires: a nested adapter type-imports its parent's port
  (pointing up, as designed) and the parent's `.service.ts` imports the
  adapter's model at runtime — matrix-legal on both edges, yet a rule-13 cycle,
  exactly as §Nesting's trap paragraph promises.
- Well-placed wiring never fires; misplaced wiring does. The root `main.ts` sits
  outside every service, so its imports create no service edges — and nothing
  imports it, so it can never sit on a cycle. A `*.spec.ts` inside a service
  (assembly, rule 16) that wires a test-purpose fixture adapter from its own
  service tree is green — same service root, no edge. The same spec importing
  the _real_ nested adapter fires: the adapter's type edge up to the parent's
  port closes the cycle, and the finding is a true positive — fixtures are
  test-purpose adapters (rule 16), and integration wiring that spans services
  belongs outside the service tree, like `main.ts`.
- An N-node service cycle is one finding carrying the full path — not N 2-node
  reports misdirecting the fix.
- A runtime `⇄` between two blob files fires rule 14 — the day-one brownfield
  finding — while a type-only cycle stays green (not an ESM hazard).
- Output matches the fiction: `cross-service` bucket, hop lines quoting one
  carrying edge each, `see the sharing progression` remedy.

Out of scope, explicitly: rule 3 (transitive purity — coverage table "maybe",
not this step), ratchet/inventory (`deblob status`, future hop), any cap/folding
presentation refinement beyond the ruled output, config surface changes.

## API

### Settled proposals (ratify at review)

- **Rule 13 counts every import kind — the 13/14 asymmetry is intended** (closes
  the chapter open question "type-only scope per rule family"). The arch's own
  trap paragraph already relies on it: "the adapter depends on the parent
  service (it implements the parent's port)" — that dependence IS a type-only
  edge (ports are types; a runtime edge into a port fires rule 10) — "the parent
  depending back on the adapter — even on its model — creates a DAG cycle."
  Canon treats the type leg as a real DAG edge. The extraction-independence
  reasoning holds for types: `import type` from B means A cannot build without
  B's sources. Rule 14 stays runtime-only by its own letter (ESM hazard,
  "type-only circular references are not covered"). `typeOnlyExempt` is
  irrelevant to both: rule 8 exempts composition rules only; 13's stance is its
  own semantics, 14's is canon letter.
- **Assembly gets no exemption — its edges count like anyone's** (ruled
  2026-07-22, rixo, at this spec; replaces a drafted assembly-exclusion
  proposal). The ground truth: assembly that would close a service cycle by
  sitting inside a package is misplaced — it belongs outside the service tree
  (like `src/main.ts`) or in its own service. The root composition case needs no
  exemption anyway: `main.ts` is unowned (no service edges by attribution) and
  has no importers (can never sit on a cycle). The apparent forcing case — a
  service's own spec (assembly, rule 16) wiring its nested adapter — is a true
  positive, not a false one: rule 16's own words are "fixtures are test-purpose
  adapters", so a unit spec wires a fixture from its own service tree (same
  root, no edge, green); importing the _real_ nested adapter is integration
  wiring, and in-package integration wiring that closes a cycle is exactly what
  the rule should catch. The remedy hint teaches both exits: use a fixture
  adapter, or move the wiring out of the service tree.
- **The service-graph operation**: nodes = the distinct `serviceRoot` values of
  the graph's modules, every layer including assembly and blob; edge A→B iff
  some module edge runs from an A-owned file to a B-owned file, A ≠ B, both
  non-null. Ownership is the graph's existing nearest-ancestor contract — a
  nested service's files belong to it, not the parent; the parent's own files
  are its subtree minus nested-service subtrees. Files owned by no service
  contribute no service edges (rule 13 by letter: "any file in A imports from
  any file in B" — direct edges only, no transit through unowned files).
  External targets never induce edges. Named non-goal (ruled 2026-07-22, rixo):
  a cycle between services routed through an ownerless file is invisible to rule
  13 — when its edges are runtime, rule 14 still reports the file cycle; a
  type-only cycle through ownerless code is invisible to both. Narrow, and
  self-healing under adoption: each newly-carved service turns
  formerly-invisible transit into real edges. Ownership is the claim mechanism —
  code outside every service made no extraction-independence claim, so 13 has
  nothing to enforce on it.
- **One finding per SCC, witness cycle carried** (both rules). Enumerating
  elementary cycles is exponential and reporting each 2-cycle of an entangled
  component misdirects the fix (the catalog's own argument). Per strongly
  connected component with a cycle (≥2 nodes, or a runtime self-loop for 14):
  one finding carrying `members` (the full SCC, sorted) and a witness — the
  shortest cycle through the lexicographically smallest member, deterministic
  tie-breaks (goldens and CI diffs stay stable). When the SCC is bigger than the
  witness, the renderer says so rather than pretending the witness is the whole
  knot; breaking the witness and rerunning surfaces what remains.
- **Service-cycle hops quote carrying edges**: per consecutive witness pair A→B,
  the lexicographically smallest (from, to) module edge among those inducing A→B
  — the fiction's
  `orders → billing (src/orders/checkout.service.ts → billing/ports/payment.ts)`
  line, uniform for 2-node (both directions = two hops) and N-node. A hop whose
  inducing edges are all type-only is marked `(type-only)` — the fix is the
  sharing progression either way, but the reader must not hunt for a runtime
  import that isn't there. A hop whose inducing edges all originate in
  assembly-layer files is marked `(wiring)`, and the remedy line gains the
  second exit: wire a test-purpose fixture adapter, or move the wiring outside
  the service tree — for that hop the fix is placement, not the sharing
  progression. (Amended at implementation, 2026-07-22: first drafted as a
  carrying-edge property, but spec files sort lexicographically early — the
  first dogfood run showed a hop carried by a spec edge while a service file
  also induced it, and the placement remedy would have misdirected. All-edges,
  parallel to `typeOnly`.)
- **13/14 double-reporting: keep both, no suppression** (closes the catalog open
  question; 05/07 precedent — overlap accepted, folding is a presentation
  concern). They are distinct guarantees with divergent remedies: converting one
  edge to `import type` cures the module cycle (ESM hazard gone) and leaves the
  service cycle standing (extraction independence still broken — type edges
  count); rule 14's remedy is mechanical, rule 13's is the sharing progression.
  Suppression is also unsound: a runtime module cycle routed through an unowned
  file yields no service edge chain, so the "covering" service finding it
  presumes may not exist.
- **Bucketing** (the ruled grouping made concrete): a service cycle belongs to
  no single service — always `cross-service`. A module cycle whose files all
  share one service root belongs to that service; all files unowned → `blob`;
  anything else → `cross-service`. Bucket order in output: named services
  (sorted), then `cross-service`, then `blob` last (ruled: flagship term closes
  the listing) — matches the fiction.
- **No options.** `checkDag(graph)` — no exemption axis, no knob. Rule 14's
  type-only exemption is canon, not config; a strictness knob for 13 would
  loosen nothing and tighten nothing that exists.
- **Arch touches, proposed** (the gate lifted — flag at review, practice
  register, bounded): (1) §Nesting gains the direction law: a nested adapter's
  edges point up through the port it implements; the parent stays import-blind
  to its children — wiring belongs to assembly, wherever assembly lives; the
  existing trap paragraph becomes the stated law's consequence. (2) The
  acyclic-rule section states the kind asymmetry explicitly: service-level
  counts every import kind (extraction independence holds for types),
  module-level stays runtime-only (already stated there). (3) One placement
  line: assembly whose wiring would close a service cycle is misplaced — it
  belongs outside the service tree (like the root `main.ts`) or in its own
  service; in tests, fixtures are test-purpose adapters, not the real nested
  ones (rule 16 already says so). Each is a clarification of what the rules
  already imply, not new canon.

### `checkDag(graph)` (pure)

Two SCC passes (Tarjan or equivalent), no shared state: the contracted service
digraph (owned files only, every layer, every edge kind) and the runtime module
digraph (all parsed modules, `kind === "runtime"` edges to in-set targets — the
runtime-wins edge merge means no runtime edge hides behind a type edge). Same
loud `moduleOf` contract as the other detectors.

### Violation model — fifth union member

`DagViolation`: `check: "dag"`, `ruleset: "arch"`, and the discriminant:

- `shape: "service-cycle"`, `rules: [13]` — `services` (witness cycle order,
  first = lexicographically smallest member), `members` (full SCC, sorted),
  `hops` (one per consecutive pair: from-service, to-service, carrying edge
  from-file/to-file, `typeOnly` and `wiring` flags).
- `shape: "module-cycle"`, `rules: [14]` — `files` (witness cycle order, first =
  smallest; a self-loop is the one-element list), `members` (full SCC, sorted).

Both carry `group`:
`{ kind: "service"; root: string } | { kind: "cross-service" } | { kind: "blob" }`
— cycles have no single `file`/`serviceRoot`, so the dag member carries its
bucket explicitly instead of the other members' pair; the renderer's grouping
special-cases the dag member (bespoke cycle block, no file header).

### Rendering + CLI registration

- Cycle block per the fiction: tag + head line (`src/orders ⇄ src/billing` for
  2-node, `A → B → C → A` for longer), hop lines
  (`orders → billing (from → to)`, `(type-only)` / `(wiring)` where flagged),
  remedy line `services must form a DAG (rule 13); see the sharing progression`
  — when a hop is flagged `wiring`, extended with the placement exit (fixture
  adapter, or move the wiring outside the service tree). Module-cycle block:
  `runtime module cycle (rule 14) — works in dev, silently fails minified`
  (catalog wording). When `members` exceeds the witness, one dim trailing line:
  `entangled with N more — break this cycle and rerun`.
- `KNOWN_CHECKS` gains `"dag"` first — the fiction's order
  (`dag · layers · private · barrels · ports`); the model's own comment promised
  "`dag` joins with its step". `HELP` / `CHECK_HELP` gain the dag lines the
  fiction holds ready (help-screens lines flagged "absent until the dag step
  lands").
- `explain`: check-name mapping gains `dag → [13, 14]`; rule content already
  shipped (both map to the `acyclic` card since 02).

## Testing

Tier 2 (constructed graphs) + tier 3 (goldens). Red first; commits land green.

Tier-2 case list (= catalog § check dag + the settled proposals):

- 2-node service cycle, runtime both directions → one finding, two hops,
  carrying edges quoted (the catalog's orders ⇄ billing).
- The nesting trap: nested adapter → parent port (type), parent `.service.ts` →
  adapter's model (runtime) → fires; `services` = parent and child roots — the
  type-edges-count pin and the nearest-ancestor pin in one fixture.
- Root wiring green: `main.ts` with no service root importing every service → no
  finding (unowned files contribute no edges).
- Fixture wiring green: in-service `*.spec.ts` importing a test-purpose fixture
  adapter from its own service tree (same root) while the real nested adapter
  type-imports the parent port → no finding.
- Misplaced wiring fires: the same spec importing the real nested `.adapter.ts`
  → rule-13 cycle, the spec-side hop flagged `wiring`, the adapter-side hop
  flagged `typeOnly` (assembly-edges-count pin).
- N-node cycle (A→B→C→A) → one finding, full witness path, three hops.
- SCC with a chord (A⇄B plus the 3-cycle through C) → one finding, `members` =
  three, witness shorter; determinism: identical graph → identical witness and
  hop choice.
- Two disjoint service SCCs → two findings.
- Type-only 2-node service cycle (mutual `import type` of API types, rule-8
  legal per edge) → fires 13, both hops `(type-only)`.
- Module runtime cycle, two blob files → fires 14, `group` blob.
- Module cycle within one service → `group` that service; spanning two services,
  both files owned → `group` cross-service AND the rule-13 finding coexists
  (keep-both pin).
- Module cycle through an unowned file between two services → rule 14 fires, no
  rule-13 finding (no service-edge transit — the suppression-unsound case).
- Type-only cycle through an unowned file between two services → no finding at
  all (the named non-goal, pinned green so the gap stays deliberate).
- Runtime one way, type back → green for 14 (cycle needs runtime edges
  throughout); the same pair still yields the rule-13 cycle when cross-service.
- Self-import (file imports itself at runtime) → 14 fires, one-element `files`.
- Dynamic and `require` edge forms count for 14 (kind runtime, form-blind).
- External targets and `parsed: false` nodes: no back edges possible, no
  findings — pinned by a fixture with an external "cycle-looking" pair.
- Green sweep: acyclic layered mini-graph with nested adapter correctly wired
  from outside → zero findings.

Tier-3 goldens: the fiction's sample run gains its dag block (cross-service
bucket, hop lines, footer rules include 13); `HELP` / `CHECK_HELP` with the dag
lines; `deblob explain dag` prints 13 + 14 (acyclic card once, second citation
points up); `deblob check dag` runs alone.

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Placement: `src/lib/check/dag.model.ts` + spec, next to the other detectors;
  `violation.model.ts` union grows its fifth member.
- SCC: Tarjan over each digraph (iterative — module graphs chain deep, no
  recursion); witness via BFS from the smallest member restricted to its SCC,
  neighbors in sorted order — determinism by construction, no exotic dep.
- Renderer: dag branch in the grouping (group-field bucketing, cycle block);
  `KNOWN_CHECKS`, help literals, explain check-name map.
- Extraction untouched — first detector with zero engine surface growth.
- **Dogfood found two real rule-13 cycles in our own code at first run** (09
  precedent holds): `src/lib/cli ⇄ src/lib/explain` — `cli.model.ts`
  runtime-imports `RULE_COUNT` from explain while explain's content adapter
  type-imported `ExplainEntry`/`ExplainCard` from cli's render model; fixed by
  moving both types into `explain/rule-content.model.ts`, where the shape
  belongs (render imports them type-only, edges all point cli → explain). And
  `src/lib/config ⇄ src/lib/extraction` — the stock flavor adapter
  runtime-imported `STOCK_FLAVOR_NAME` from config's model while config
  type-imports the flavor port; fixed by giving the name its own home,
  `extraction/stock-flavor.model.ts` (the flavor owns its name; config's default
  and the adapter's registry key both import from there, edges all point config
  → extraction). Self-check green after both.

## Docs

- `docs/architecture.md`: the three touches (above) — only if ratified.
- `research/violation-catalog.md`: § check dag absorbs the rulings (SCC/
  witness, hops, keep-both, buckets); the Open section's three dag questions
  (double-reporting, N-node confirm/cap, plus the chapter's type-only-scope
  question) marked resolved here.
- `research/help-screens.md`: the "absent until the dag step lands" note flips;
  shipped screens now match the fiction in full.
- `packages/deblob/README.md`: check list gains dag.
- `history/future/arch-pass/`: the nesting-DAG touch line updated — landed with
  this step (inventory stays truthful).
- Chapter PLAN: step queue — 10 opened; open question "type-only scope per rule
  family" resolved here (pending ratification).
