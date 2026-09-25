# check

The detectors: each one reads the classified import graph and returns structured
violations. All pure — graph in, values out, no IO, no prose, no ordering beyond
determinism. Rendering happens in `cli`, wiring in the driver.

## API

One function per check, all over `ImportGraph` from `extraction`:

- `checkDag(graph)` — `no-service-cycle`, `no-runtime-cycle`. Service cycles
  over every import kind, module cycles over runtime edges only. One finding per
  strongly connected component, with the membership and a shortest witness
  cycle.
- `checkLayers(graph, { pure?, typeOnlyExempt? })` — the dependency matrix:
  `inward-deps`, `service-purity`, `blob-quarantine`, `service-assembly-only`,
  `adapter-assembly-only`, `runtime-import`, `public-unit`. Per-cell
  `runtime-import`: a type-only edge is exempt where the target owns a contract
  shape. An external leaf carrying a layer enters the matrix as a target of that
  layer; an unlabeled external falls to the purity trichotomy (pure / concrete /
  unclassified) that `pure` decides. The matrix is total over the nine kinds:
  the driver, boot and test rows cite what a detector judges today (the
  composition seals, `blob-quarantine`, and `inward-deps` for an import that
  points outward — assembly to driver, driver to boot, the inside to any of
  them); a driver importing model, or a boot importing anything but its driver,
  is canon's letter whose slug is registered and whose cell is not built, and
  reads legal until the outside rules land (driver-layer chapter, step 04).
  Externals from a driver or a boot are not this check's: the driver's tech is
  read elsewhere.
- `checkPrivate(graph)` — `private-sealed`. Every `private` path segment is one
  boundary; every edge kind and form binds.
- `checkBarrels(graph, { tolerateBlobReexport? })` — `layer-in-path`. An index
  re-exporting layered files fires at the index; a layered file importing
  through an index fires at the importer. The brownfield opt-out silences the
  first shape only; the driver runs it with defaults today.
- `checkPorts(graph)` — `ports-types-only`. Ports are inert: runtime content in
  a port file, or a runtime edge touching one at either end, is a defect.
- `checkSurface(graph, surface, { classifyEntry, mirror, disclosed })` — the
  producer's own gate over its exports map, run only when package.json carries a
  `deblob` field. Each entry is resolved to a covered module (source paths
  directly, built paths through the build mirror, pattern keys expanded the way
  Node resolves them) and judged: a suffixed subpath must front a file of that
  layer (`chain-purity`), an unsuffixed one must not front a service or adapter,
  directly or through re-export chains (`layer-in-path`). Returns
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
- `checkModules(graph, { mutableModuleState? })` — `stable-root`: a root
  statement that writes, a root binding that holds state or stores a read of the
  machine, and a root call that reaches the tech, runs a use case, sets up a
  driver's tech, or goes into a function of a file whose layer may touch the
  tech (`reaches`, `null` for a callee the reader cannot place). Exempt by kind:
  a spec file's registrations into its runner (a driver's wiring function handed
  the runner's tech included), the boot's one call. A red call inside a tracked
  local is reported where it sits, the root call that ran it in `via`. A root
  class's static field is a root binding. Atomic: one violation per clause a
  statement breaks, none withheld because another covers it; a violation whose
  subject is a red call's result — a binding storing it (not a `let`, a `var` or
  a writable static, state whatever it holds), a call of what it returned —
  names that call as its `cause`, and every violation names its own `subject`.
  Each violation carries `unknown`: `null` when the red is proven (a binding's
  `by` naming the form that proves it), else the reader's `UnknownCondition` —
  an unknown fails like a red and says what the reader could not see. A broken
  line gets no verdict; the graph's `broken` carries it.
- `checkAssembly(graph)` — `assembly-builds-only`, over every assembly file's
  functions and root: a call that builds nothing (the tech's, the language's, a
  local function's, a use case but a declared load, a wiring function, a package
  nothing claims — `unknown` for one the reader cannot place); an argument, or a
  record argument's entry, that is computed, a function, unknown, or the host
  read in place (tech values arrive as parameters) — a received one is green
  whatever its kind, and one that came out of a call is that call's to answer
  for (a model call's result passed on is green); what the assembly built used
  as a member, computed with or reassigned — a load's or the tech's result is a
  tech value, and may be read; a branch or loop on an instance or a computed
  value (the branch owns its test: a `condition` use is never reported apart); a
  definition at root or a function that builds nothing; any other statement at
  root; an adapter, whole, in the returned record of a function a non-test file
  calls. An argument that came out of a red or unknown call written in the same
  expression — or a function handed to one — names it as its `cause`; through a
  binding, on another statement, it stands alone.
- `groupByFix(violations)` (`grouping.model.ts`) — one group per fix: a
  violation rides with the violation whose subject its `cause` names, the
  chain's root leading; one without a cause, or whose cause no violation
  answers, leads a group of one. What the renderer lays out and the corpus
  matches.
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
