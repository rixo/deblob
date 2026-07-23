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
  interleaved/nested-assembly placement.

Inward protection stands solid (nothing inner imports UI; UI wiring services =
assembly hat) — the holes are all about the UI zone's internal structure.
Resolution material: `future/svench-flavor/` (taxonomy sketch).

## Accumulated doc touches

- `XxxService` (not `XxxServiceAPI`) in examples.
- Store pattern reality check — zero `.store.ts` in practice: role, not file
  kind.
- **Landed 2026-07-22** (cli chapter, step 10_check-dag: direction law in
  §Nesting; kind asymmetry + wiring-placement line in the acyclic section):
  Nesting DAG implications spelled out — direction law (nested-adapter edges
  point up via the port; parent stays import-blind to its children; only the
  cycle trap is documented today). Rule 10 stands as written: ports are types
  only — an earlier softening idea was a misreading, since reverted in the
  guide.
- Port-type examples (`FsPort`, `LoggerPort`, `IconSourcePort`) predate the
  name-by-role ruling (2026-07-08, skills chapter step 02: bare role names,
  qualify only to disambiguate) — rename, then propagate to the arch cards
  mirroring them (layer-ports, crossing-services ref).
- **Owned by the cli chapter, listed here for inventory completeness** (both
  land with the cli layers detector step, 2026-07-17 rulings — see
  `20260710_cli/` PLAN + violation catalog): (a) rule 4 purity-is-declared
  clarification — prose reads permissive, ruled default-concrete; (b) rules 6/7
  enumeration gains blob — "only assembly" covers it, the "not by …" list omits
  it; ruled: composition/privacy seals bind blob as importer.
