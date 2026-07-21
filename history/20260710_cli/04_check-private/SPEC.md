# Step 04 — check private

Second detector: rule 12, the visibility boundary. Behavior seeded from
[research/violation-catalog.md](../research/violation-catalog.md) § check
private; this step settles the catalog's open parenthetical (type-only scope)
and the nesting mechanics the arch's prose already rules.

## Goal

Given the classified import graph, `checkPrivate` returns exactly the foreign
`private/` imports — rule 12 — as pure values, no IO, no formatting.

Success looks like:

- Every import reaching into a `private/` subtree from outside its owning
  service fires — regardless of importer layer (assembly included: rule 12 is a
  packaging rule; the matrix's assembly-may-import-anything privilege is a layer
  fact and does not reach visibility) and regardless of edge kind (type-only
  fires — see API).
- Nesting resolves by the stated operation, not a case inventory: nested child
  services sealed out of the parent's `private/`, services nested _under_ a
  `private/` reachable by their owner, fractal depth handled uniformly.
- Own-service access stays green: layer dirs, `.service.ts`/`.adapter.ts` (rule
  9's side), files inside the same `private/` subtree.
- The all-blob ground state stays clean: a `private/` directory owned by no
  service claims nothing.

Out of scope, explicitly: config loading, CLI surface and rendering, all other
checks. Overlap with `check layers` is accepted, not deduplicated: a labeled
layer importing a foreign `private/` blob file fires rule 5 there and rule 12
here — two facts, two findings.

## API

### Settled (proposal, ratify at review): rule 12 binds every edge kind

Type-only foreign `private/` import is a violation. Rule 8 scopes its exemption
to _composition_ rules by its own words; rule 12 is a packaging rule —
visibility is ownership, and a foreign `import type` pins a service's internals
exactly as hard as a runtime one (renaming a private type breaks the outsider).
The arch's own smell test is path-shaped, kind-blind: "seeing
`import { x } from '../icons/private/helper'` … is an instant, unambiguous
violation". Consequence: `typeOnlyExempt` does not touch this check —
`checkPrivate(graph)` takes no options.

### Boundary semantics — the operation

Every `private` path segment defines one boundary; boundaries are independent
and fractal. For a boundary at directory `B` (the `…/private` dir itself):

- **Owner** — the nearest service-root ancestor of `B`. Grouping dirs collapse
  through (a `private/` under `ports/` still belongs to the service).
- **An edge violates `B`** iff the target lies inside `B`'s subtree, the
  importer lies outside it, and the importer's `serviceRoot` is not the owner.
  An importer already inside `B`'s subtree crosses nothing at `B` — deeper
  boundaries still apply to it.
- **Ownerless boundary is inert** (no service-root ancestor): rule 12 speaks of
  _a service's_ `private/`; a blob-owned `private/` dir makes no deblob claim,
  and firing there would break "blob is legal" on brownfield trees.
- **One finding per edge**: an edge crossing several boundaries reports the
  outermost violated one — resolving it resolves the rest; the rest are echo.

This settles the arch's nesting prose mechanically: a nested child service's
files carry the child's `serviceRoot`, so the parent's boundary fires on them
("a nested service cannot access its parent's `private/`"); conversely the owner
reaching a child service's _public_ files under its own `private/` crosses only
its own boundary — legal.

### `checkPrivate(graph)` (pure)

- One pass over `graph.edges`; in-set (`module`) targets only — externals cannot
  sit under a governed `private/`.
- Edge kind and form are irrelevant: runtime, type, static, dynamic, `require`
  all fire.
- Boundaries derive from module paths plus the graph's service-root set (the
  distinct `serviceRoot` values). The node `isPrivate` flag is any-segment —
  true for a child service's public files under a parent's `private/` — so it
  cannot carry the boundary decision alone; whether it serves as a prefilter or
  the walk goes path-only is an implementation call, reviewed against the
  operation above.

### Violation model — second union member

`PrivateViolation` joins the union: `check: "private"`, `ruleset: "arch"`,
`rules: [12]`, `file` + `serviceRoot` (importer side, grouping per the ordering
ruling), `target`, plus the boundary facts — the crossed `private/` directory
and its owner service root — so rendering never re-derives ownership. Single
shape; the discriminant field pattern from `LayersViolation` recurs only when a
second shape exists.

## Testing

Tier 2 of the chapter strategy: constructed `ImportGraph` values in, violation
sets out — no disk, no engine. Red first; commits land green.

Case list (= catalog § check private + the settled proposals):

- Foreign fires, importer variants: another service's file, top-level blob,
  another service's assembly, nested child service → parent's `private/` (the
  arch's explicit prose case).
- Kind/form: type-only foreign private import fires (the settled proposal, incl.
  the mixed-statement specifier); dynamic import and `require` fire.
- Must stay green: own service's `.service.ts`/`.adapter.ts`/model/layer-dir
  file → own `private/`; sibling files within one `private/` subtree; **owner →
  public file of a service nested under its own `private/`** (the discriminating
  case — a naive `isPrivate`-flag implementation fires here); all-blob graph
  with a `private/` dir and cross-blob imports into it (ownerless boundary
  inert).
- Fractal/tripwire (open set = nesting shape, not a census): two-boundary target
  (`S/private/child/private/x`) — outsider reports the outermost boundary once;
  the child's own files reach it green; the owner service fires on it (inner
  boundary, owner ≠ child).

Gates unchanged: root lint; package typecheck + build + test, 100% coverage
through the public contract.

## Implementation

- Pure per-edge evaluation against the boundary operation; no graph mutation, no
  ordering logic (grouping/sorting stays the CLI step's).
- Placement per the arch cards: `src/lib/check/private.model.ts` +
  `private.model.spec.ts`, next to `layers.model.ts`; `violation.model.ts` union
  grows its second member.
- No flavor or extraction changes expected; if the boundary walk wants a helper,
  it stays detector-side (the graph model stays the neutral value).

## Docs

- `docs/architecture.md`, one proposed touch (ratify at review): rule 12 gains a
  parenthetical fixing its type-only stance — rule 8's exemption names
  composition rules only, but the gap invites the wrong inference; wording along
  "type-only imports included — visibility is ownership, not implementation
  coupling". Practice-level tone bounded same as the rule-4 touch.
- `packages/deblob/README.md`: untouched — still no runnable surface.
- Chapter PLAN: step queue — 04 opened; catalog's open parenthetical noted
  settled here (catalog itself stays research, untouched — 03 precedent).
