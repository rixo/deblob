# check

The detectors: each one reads the classified import graph and returns structured
violations. All pure — graph in, values out, no IO, no prose, no ordering beyond
determinism. Rendering happens in `cli`, wiring in the driver.

## API

One function per check, all over `ImportGraph` from `extraction`:

- `checkDag(graph)` — rules 13 and 14. Service cycles over every import kind,
  module cycles over runtime edges only. One finding per strongly connected
  component, with the membership and a shortest witness cycle.
- `checkLayers(graph, { pure?, typeOnlyExempt? })` — the dependency matrix,
  rules 1, 4–9. Per-cell rule 8: a type-only edge is exempt where the target
  owns a contract shape. An external leaf carrying a layer enters the matrix as
  a target of that layer; an unlabeled external falls to the purity trichotomy
  (pure / concrete / unclassified) that `pure` decides.
- `checkPrivate(graph)` — rule 12. Every `private` path segment is one boundary;
  every edge kind and form binds.
- `checkBarrels(graph, { tolerateBlobReexport? })` — rule 2. An index
  re-exporting layered files fires at the index; a layered file importing
  through an index fires at the importer. The brownfield opt-out silences the
  first shape only; the driver runs it with defaults today.
- `checkPorts(graph)` — rule 10. Ports are inert: runtime content in a port
  file, or a runtime edge touching one at either end, is a defect.
- `checkSurface(graph, surface, { classifyEntry, mirror, disclosed })` — the
  producer's own gate over its exports map, run only when package.json carries a
  `deblob` field. Each entry is resolved to a covered module (source paths
  directly, built paths through the build mirror, pattern keys expanded the way
  Node resolves them) and judged: a suffixed subpath must front a file of that
  layer (rule 3), an unsuffixed one must not front a service or adapter,
  directly or through re-export chains (rule 2). Returns
  `{ violations, unverified, checked, disclosed }` — an entry the graph cannot
  reach is not a violation but a claim the run cannot certify; the two counts
  are the claim's coverage (concrete subpaths judged) and the field's
  carve-outs, for the summary line.
- `resolveSurface(surface, covered, { mirror, disclosed })` — the reach half on
  its own: the exports map against a covered path list, no graph. Returns the
  reached entries (subpath → modules), the unverified ones, and the disclosed
  count. `tallySurface(...)` folds that into `{ claimed, disclosed }` for the
  bare status — claimed counts reached and unverified alike, since bare never
  diagnoses.
- `violation.model.ts` — the violation shapes, one structured value per finding
  carrying every fact rendering needs.

## Layer map

Model files only. There is no service here: each check is a pure function over
the graph, the driver picks which ones run and with what options.

## What it does not do

No fixing, no suggestions beyond the rule cited. No reading of files or package
manifests — those facts arrive parsed, from `extraction` and the config loader.
No decision about exit codes: `unverified` and unresolved imports become exit 2
in the driver.
