# Step 04 — the outside rules, proven by verdicts

Opened 2026-09-17 from step 03's cut. Step 03 landed the reading in shape
(readers bound by glob, the open part shrunk to genuine ignorance, one reading
per world, tracked locals) and stopped before any rule fired. This step is the
judgment 03's SPEC describes, re-cut under two things ruled at 03's handback:
how a rule is proven, and what that needs first.

**Contract, taken as given.** SPEC 03's rule sections are this step's API and
are not restated: § Rule slugs, § The matrix, § Config keys, § Violations, §
Detectors, § Exemptions, § CLI and explain, § Decisions (seven, still to ratify,
first among them the self-check red until the CLI restructure and CI's lane
saying so). Where this step changes one of them, the change is written here,
dated, and 03's text stands as what was planned.

**Drafted 2026-09-17, decisions ratified the same day** (§ Decisions; one
deferred). Nothing below is built until "build".

## Goal

After this step:

- **The rules of 03's Goal fire**: ten rules, four checks, the import halves as
  matrix cells, deblob red under its own rules with the count recorded.
  Unchanged from 03's Goal, bullets one, two and four.
- **Every rule is proven by verdict cases, and nothing else pins the reading.**
  A case is a tree of source strings under a config, run through the real chain
  — scan, extraction, the checks — out to violations; its expectation is which
  lines are red under which slug, every other line green. The reader is the
  user's language: a case reads as code with a verdict next to it, never as a
  shape of the reading. Coverage stays at 100 from these cases and the contract
  tests on the ports; the reading spec 03 left is cut to what they do not cover,
  and what survives is ruled contract or deleted (§ Testing).
- **The fs is a port.** `lib/fs/`: one port, a node adapter, a memory adapter,
  one contract test over both. Every disk touch in `lib/` goes through it; a
  case runs on the memory adapter with no disk and no simulation — the second
  adapter of a port the node-project baseline expects anyway. Placement-debt's
  `03_fs-kernel` card, pulled forward; the run service stays in 09.

Why the test method rules the step: rixo, 2026-09-17, at 03's handback — the
special cases of absorbing JavaScript's depth will not be right on the first try
nor the second; what converges to zero defects is a corpus of minimal repro
snippets with their verdicts, in a language the reviewer reads without opening
the reader, capitalised over time. The tests 03 left pin hook line numbers and
kind lists: shapes only the reader's own consumer reads, which the reviewer
skimmed and cannot vouch for. ESLint's `RuleTester` and rustc's UI tests are the
precedent: source plus expected diagnostics, no AST-level units.

Out of scope: 03's out-of-scope list unchanged (the slug rename and the test
cell, 07; knowledge cards, 07; the CLI restructure, 06; primary use cases on
screen; a container whitelist, 08; any web reading); the run service and the
check registry (09); a `deblob-test` skill (the outermost PLAN's Ideas — this
step is its first run, the skill is written from what the run shows).

## API

### The fs port

`lib/fs/fs.port.ts`, promise-only — async first, every member; a sync member
exists only with a stated case of force majeure, and laziness or a sync caller
upstream is not one (rixo, 2026-09-17, restating the 2026-09-13 ruling) — the
exact set the readers use today and no more (a debt ceiling, read as such):
`readFile(path) → string | null`, `exists(path)`,
`stat(path) → { size } | null`, `glob(patterns, { cwd, ignore }) → paths`.
Adapters: `node-fs.adapter.ts` (`node:fs/promises`, tinyglobby) and
`memory-fs.adapter.ts` (a `Map` of path → content, glob by picomatch over the
keys, state exposed for assertions). Paths are absolute in both; the memory
adapter's root is whatever the case says.

What moves onto it, the six disk touches outside tests: the oxc engine's source
read; the package-meta reader's manifests; the loader's config discovery,
tsconfig and manifest reads (the config file's native `import()` stays a
platform call in the loader, ruled out of the port — placement-debt's card); the
coverage scan's glob and stat; the explain content adapter's docs read. `main`'s
own `package.json` read is the boot's and stays. Consequence:
`ExtractionEngine.extract`, `createExtraction`, `extractGraph`, the package-meta
reader and the loader go async; the reading specs await.

### Resolution without a disk

`ExtractionEngine.resolve` is oxc-resolver over the real disk; a memory tree
resolves nothing through it. The engine splits: parsing (oxc, from a string,
pure) and resolution, a port of its own — `resolver.port.ts`:
`resolve(fromAbsolutePath, specifier) → Resolution`. Two adapters: oxc-resolver
for the node run, unchanged in behaviour; `fs-resolver.adapter.ts` over the fs
port for cases — relative and absolute specifiers with the script extensions and
`index`, a bare specifier resolved by the manifests in the tree through the
package-meta reader, else external. No tsconfig paths, no symlinks: a case that
needs them is a node-run case. Decision 2 carries the fallback.

### Verdict cases

A case is a record of relative path → source, plus an optional config object
(the resolved shape, no loader), run by one spec-side assembly, `cases.ts` next
to the check specs: the same wiring as `main`'s `runCheck` over the memory
adapters — scan, engine, extraction, the checks the case names — returning the
violations. The expectation is written in the source: a line that must be red
carries a trailing marker `// red <slug>` (several slugs, several markers or a
comma list), optionally followed by `: <why>` for the reader; the harness
collects the markers, runs the tree, and compares the full violation set — file,
line, slug — against them, so an unexpected red fails as a missing one does, and
a tree with no marker asserts green everywhere. The `why` is prose for the
reviewer, not compared: the message is the renderer's, proven once per shape in
the CLI golden. `describe` is named after the rule's check, cases nested by the
canon statement they prove (the Behavior panel links on the name).

### Carried from 03, unchanged

Slugs, `RULE_IDS` order, `KNOWN_CHECKS`, the matrix cells and the type
exemption, the violation shapes, the four detectors' legal forms, the exemption
tokens, the CLI and explain surface — 03's § API, sections Rule slugs through
CLI and explain.

## Testing

- **Contract test on the fs port**, one spec run over both adapters (the node
  one against a temp dir it creates and removes): read a file, a missing file is
  `null`, exists, stat, glob with an ignore, paths absolute.
- **Contract test on the resolver port** over both adapters, the shared part
  only: a relative import with and without extension, `index`, a bare specifier
  that is a builtin, one that is unresolved.
- **Verdict cases per check**, the shapes of 03's § Testing fixture project
  rewritten as cases — an assembly with every legal call form and every illegal
  one, a driver's wiring zone with each verb and each violation, hooks with
  zero, one, two use-case calls, the sub-driver, the boot, the model file with a
  root factory call, the adapter, the spec file — each shape one small tree, red
  lines marked, everything else green. 03's exemption test becomes two cases on
  one tree: a stub reader exempting nothing, the runner's four tokens. 03's
  tripwires become green trees: a designated `+page.svelte` driver with no
  reader, a file whose reading holds an `unknown` callee.
- **Red first.** Each check's cases are written and run red before the check
  exists; the checkpoint's handback shows the cases, the reviewer judges
  verdicts and never opens a detector to trust one.
- **The reading spec's fate**, after the last check is green: the reading spec
  and the levels spec are removed, coverage is run; every uncovered line of the
  reader gets either a verdict case, when a compiling snippet reaches it and a
  verdict depends on it, or is deleted, when no compiling snippet reaches it, or
  is listed — reachable, no verdict depends on it — for rixo's ruling: contract
  test on the reader port, or residue. The type checker is the floor for
  "compiling"; a contrived snippet that compiles is a legitimate case, never
  "nobody writes that". The extraction service spec and the recognition spec are
  read with the same eye at the same time; the config and levels specs are next
  in line but not this step's.
- **Matrix cells, CLI golden, self-check, gate**: 03's § Testing, unchanged —
  `layers.model.spec.ts` gains the changed cells; a golden `check-outside.txt`
  over a fixture project on disk (the one file-fixture kept: it proves the
  renderer and the node run end to end); the self-check red by design with the
  count in Landed; typecheck green, coverage 100, suite red only on the two
  `rule-content` slug assertions (07), prettier from the root.

## Implementation

Contained checkpoints, each handed back and committed on its own go (rixo,
2026-09-17: the checkpoint story is for future reviewers too); verdict cases
land red as their own commit, the check that greens them as the next.

1. **The fs kernel.** `lib/fs/` port, adapters, contract test; the six disk
   touches moved; async spread through the engine, extraction, package-meta, the
   loader; `main` composes the node adapters; the reading specs await. Gate: the
   existing suite green, self-check 0, coverage 100. Mechanical, no verdict
   changes — first because every later checkpoint runs on it.
2. **Resolution and the harness.** The resolver port and its two adapters; the
   engine split; `cases.ts` (landed as `lib/cases/runner/`, a service behind a
   check port with an assembly front, see Landed); one green case through the
   whole chain (a driver importing an assembly importing a service, no marker)
   and one red case on an existing rule (`inward-deps`) to prove the markers.
3. **Slugs, matrix, modules** — 03's checkpoint 3 with the cases first:
   `RULE_IDS`, `CHECK_RULES`, `RULE_CARDS`, the cells and the type exemption,
   `checkModules`, the renderer's messages, the CLI wiring, the readonly fixes
   on deblob's tree, the self-check count.
4. **Assembly and boot** — 03's checkpoint 4, cases first.
5. **Driver** — 03's checkpoint 5, cases first; the exemption pair; the CLI
   golden; the self-check count; violations attributed to their world's site.
6. **The reading spec, assessed** with both sets in hand (decision 6); § Testing
   holds the proposal.
7. **CI lane.** 03's decision 1, if ratified.

### Landed — checkpoint 1, 2026-09-17 (the fs kernel)

What the code settled against the sketch above:

- `lib/fs/`: `fs.port.ts` (`Fs`: `readFile`, `exists`, `stat`, `glob`, all
  promise-returning), `adapters/node-fs.adapter.ts` (`createNodeFs()`,
  `node:fs/promises` + tinyglobby; ENOENT and ENOTDIR read as missing, every
  other failure flies — pinned on a directory read as a file and a name too
  long), `adapters/memory-fs.adapter.ts` (`createMemoryFs(files)`, absolute path
  → content; a directory exists when a file sits under it; `glob` is picomatch
  over the keys under `cwd`, `dot: false` like the disk, ignores matched with
  `dot: true` so a baseline exclude works either way; `files` exposed). The
  contract was first a `fs.port.spec.ts` running one tree through both adapters;
  reshaped at checkpoint 2's review into the conformance kit (see Landed —
  checkpoint 2), since a port owns its suite but knows no adapter. The
  self-check counts the directory as a sixth service: a port marks a root, no
  service file needed — a kernel.
- The five readers take the port narrowed to what they use
  (`Pick<Fs, "readFile">` and the like — the crossing-services rule, one port
  scoped per consumer, never a restated dialect): `createOxcEngine({ fs, … })`
  (a covered file not there throws `no such file`, never a parse result),
  `createPackageMetaReader({ fs, … })` with `layerOf` async,
  `createConfigLoader({ fs })` → `discoverConfig`, `explicitConfigPath`,
  `tsconfigPathOf`, `readPackageSurface` (all async; `importConfigDefault` stays
  a top-level export — the platform call), `createCoverageScan({ fs })` →
  `scanCoverage`, `statSizes` (a covered file gone since the scan throws
  `covered file vanished`), `createContentReader({ fs })` → `readExplainEntries`
  (a promised file not shipped throws `shipped content missing`). `main`'s
  version read stays sync, the boot's.
- The async spread: `ExtractionEngine.extract` resolves to the extraction;
  `extractGraph` is async and its `externalLayerOf` may answer with a promise
  (assembly composes the sync config patch with the async package-meta reader).
  Files are still read one at a time, the tree dropped after each — no parallel
  pre-read, so memory stays per file on a large tree; the graph pass reparses
  per world as before, awaited in order.
- `main` instantiates the node adapter once inside `main()` and threads a `Deps`
  record (fs, loader, scan, content) into the runs — never at module root (a
  root factory call is what the modules check will forbid).
- Specs: the mechanical sweep to `await` over the extraction, levels, loader,
  scan, content and package-meta specs; the reading spec parses every reader
  fixture once at module top (top-level `await`, the fixture directory listed
  through the port's own `glob`) so `read` stays a plain function — the reading
  never writes to the tree, and the one test that mutates one parses its own.
  New cases: the port's suite over both adapters, the node adapter's failures, a
  scan over a memory tree, the vanished file, the missing shipped content, the
  engine's missing file.
- Docs: `lib/fs/README.md` new; the config, extraction and explain READMEs say
  the port; the config README's "not behind a port on purpose" paragraph is
  gone.
- Gates: typecheck clean; suite 661 passing, the two `rule-content` slug
  assertions red (07); coverage 100 on all four axes; self-check 0 violations,
  64 files, 6 services; the package builds; prettier from the root.

### Landed — checkpoint 2, 2026-09-17 (resolution and the harness)

What the code settled against the sketch above:

- `ports/resolver.port.ts`, `Resolver`: `resolve(from, specifier)` resolves to a
  file, a builtin under its `node:` name, or a reason; `Resolution` moved here
  from the engine port, which is now parse-only (`createOxcEngine({ fs })` →
  `{ extract }`). `createExtraction({ engine, resolver, flavor, readers })`; the
  package-meta reader takes `Resolver["resolve"]`. Promise-only like the fs
  port: oxc-resolver's `async` for the node adapter
  (`createOxcResolver({ tsconfigPath?, alias? })`, moved out of the engine
  verbatim), the fs port underneath for `createFsResolver({ fs })`.
- The fs-port resolver, as sketched and no more: relative and absolute
  specifiers with the script extensions, the `.js` → `.ts` aliases and `index`;
  a builtin (`node:module`'s `isBuiltin`) normalized to `node:`; a bare
  specifier by the nearest `node_modules/<name>` up the tree, the manifest's
  `main` else `index`, a subpath as a path. "Else external" of the sketch read
  as: unresolved, exactly as the node run reports a package that is not there —
  a case declares it in `external` or ships it under `node_modules/` in the
  tree. The port's suite runs one tree through both adapters: the shared part a
  case may rely on (first as `resolver.port.spec.ts`, reshaped below).
- `Fs.stat` refined: `null` for a directory too (node: `isFile()`), so `stat` is
  the "is a file" question the resolver asks; pinned in the fs port's suite.
- **The corpus has its own service directory, `lib/cases/`, and the harness is a
  service behind a port** — decision 5 said "a spec-side assembly next to the
  check specs"; two things reshaped it at the review. The DAG first: every file
  counts for `no-service-cycle`, specs included, so a spec in `check/` importing
  a harness that imports `check/` closes a cycle (the self-check caught it: one
  `dag` violation, then zero). Then the layer: a file that builds the chain,
  runs it and asserts is a driver's work plus a test's, red under
  `assembly-builds-only` once it exists, and vitest in an assembly is tech in
  the wrong place. rixo: "having the test triggers in the driver is what deblob
  is crying for us to do" — service plus assembly front, the trigger in the
  test. Landed as `lib/cases/runner/`, a unit with its README:
  `markers.model.ts` (the grammar, the match, `reportedOf`, `Case`, `Row`,
  `AS_MARKED`), `ports/check.port.ts`
  (`Check.run({ config, checks? }) → violations`, the tree bound at assembly,
  throws on an import the tree does not resolve), `runner.service.ts`
  (`createRunner({ check })` → `judge(row)`: markers, the port, the match —
  specced over a fake port), `cases.assembly.ts` (`assembleCase(files)` →
  `{ judge, check }`: the memory adapters from the tree, the real chain wired
  over them as the port's one adapter today — the `DETECTORS` table and
  `STOCK_READERS` duplicated from `main`, the run service of 09 replacing that
  wiring in place — nothing here runs a case). The corpus: one spec per check,
  `layers.spec.ts` and `dag.spec.ts` today, the root `describe` the check's
  name, a `test.each` table of `Row`s and two lines — the test builds its
  instance and calls `judge`, `expect(await judge(row)).toEqual(AS_MARKED)`, a
  failure the diff of the two lists, one verdict line each; the test runner is
  named in spec files only. The corpus files carry no layer suffix and sit in no
  service, so they open no DAG edge. (Along the way, dropped: a `GREEN` constant
  — the case's verdict is "as marked", never "green"; a `toBeAsMarked` matcher
  from a runner setup file; an `expectAsMarked` helper — each a test-kind file
  without a name, the shape above needs none.)
- **Markers, and the line a violation does not have** — decision 4 said file,
  line, slug; today's violations carry no line at all (edge- and file-level,
  `Violation` has no span). Settled as: a violation without a line matches its
  file's markers by slug alone, consuming one; a violation with a line (the
  outside rules of checkpoints 3–5, read off spans) matches exactly. A cycle is
  reported on every file that closes it — a service cycle's hops by their
  importing file, a module cycle's files. The match lists both directions,
  `file:line slug`, sorted, so a failing case reads as a diff of verdict lines.
  `markers.model.ts` owns the grammar (`// red <slug>[, <slug>]*[: why]`, an
  unknown slug loud) and the match; its own spec.
- The proof: the corpus rows (`layers.spec.ts`: a model importing a service red
  `inward-deps, runtime-import` on the import line; a bare import landing in the
  tree's `node_modules` and read as concrete in a service —
  `service-purity, runtime-import`; `dag.spec.ts`: a service cycle and a runtime
  module cycle red on every closing file), the runner's spec over a fake port
  (as marked; both lying directions; the config and checks handed through), the
  assembly's spec (a green driver → assembly → service tree through every check;
  an unresolved import throwing; the checks by name and a `package.json`
  reaching the surface check), the marker model's spec.
- **No port specs: a port ships its suite as a conformance kit** (rixo at the
  review: a port may hold its suite — "rather sexy" — but cannot know its
  adapters; a `resolver.port.spec.ts` importing both adapters had passed the DAG
  only by being test kind inside the same service). Landed as a root unit
  `lib/test/` (`testing-api.port.ts`: `TestingApi` — `describe`, `it`, `equal`,
  `matches`, the four things a suite says;
  `adapters/vitest-testing-api.adapter.ts`, four one-liners) and one conformance
  service next to each port with two adapters:
  `extraction/resolver-test-suite.service.ts` (`RESOLVER_TREE`,
  `createResolverTestSuite({ suite }).run({ name, make })`, thirteen sentences)
  and `fs/fs-test-suite.service.ts` (`FS_TREE`, eight). The service knows the
  tree and the sentences, never a runner nor an adapter; an adapter's spec —
  `oxc-resolver`, `fs-resolver`, `node-fs`, `memory-fs`, each its own file —
  materializes the tree where its adapter reads (a temp dir, or strings) and
  runs the kit under the adapter's factory name; the node-fs failures and the
  memory-fs `files` exposure stay as those specs' own `it`s. A third-party
  adapter conforms with the same six lines in its own repo. The self-check
  counts `test` as an eighth service.
- Docs: `lib/cases/README.md` and `lib/cases/runner/README.md` new (rixo: a full
  unit implies a README); the extraction README says the three ports and the
  three adapters; the fs README says what `stat` is.
- Gates: typecheck clean; suite 688 passing, the two `rule-content` slug
  assertions red (07); coverage 100 on all four axes; self-check 0 violations,
  77 files, 7 services; the package builds; prettier from the root.

## Docs

- `lib/fs/README.md`, new: the port, the two adapters, what stays a platform
  call and why.
- `lib/extraction/README.md`: the engine split (parse, resolve), async, the
  harness as the reader's proof.
- `lib/config/README.md`: the loader over the port.
- `lib/check/README.md`, `lib/cli/README.md`, `docs/architecture.md`: 03's Docs
  items, unchanged.
- Chapter PLAN: 03's entry gets its sha; this step's entry closed with its own;
  the self-check count for 05 and 06; the reading spec's ruling recorded.
- Outermost PLAN, the `deblob-test` card: what this run showed, feeding the
  skill.

## Decisions — ratified 2026-09-17 (rixo), one row each

1. **The fs port's set**: read, exists, stat, glob — the readers' use today,
   nothing anticipated. A reader needing more adds the member with the code that
   reads it. All promise-returning; no sync member without a force-majeure case
   written next to it. Ruled before the rest, restating 2026-09-13.
2. **Resolution for cases**: a resolver port with two adapters — oxc-resolver
   for the node run, a small resolver over the fs port for the memory run.
   Ratified as not a question: making the chain testable is what a port is for.
   The catch, stated so it is not mistaken for a hole: oxc-resolver is native
   and reads the disk itself, so it cannot be handed the fs port; the case
   resolver is the weaker one (no tsconfig paths, no exports maps, no symlinks),
   which is fine because no rule depends on how a specifier resolves, only on
   where it lands, and the node run stays proven by the CLI golden. The temp-dir
   fallback is dropped.
3. **Case shape**: markers in the source, `// red <slug>[: why]` on the line
   that must be red; nothing to renumber; rustc's `//~ ERROR` precedent.
4. **What a marker proves**: file, line, slug. Messages are not compared: rixo —
   messages are an entirely different problem, a closed set, fully testable at
   the level that natively makes sense (the renderer, once per shape); mixing
   that concern into the task of covering every JavaScript idiom would be a
   mistake.
5. **The harness's home**: a spec-side assembly next to the check specs,
   duplicating `runCheck`'s wiring over the memory adapters, replaced by 09's
   run service. Accepted as is; laundering-adjacent on purpose, 09 removes the
   duplicate.
6. **The reading spec's fate**: DEFERRED, not ruled — revisited once both sets
   exist, the verdict cases and the reading spec, and the situation is assessed
   with full information. Checkpoint 6 becomes that assessment, with § Testing's
   procedure as the proposal on the table, not the plan.
7. **03's seven decisions**: carried and ratified, the self-check red included —
   rixo: self-checking comes with woes; the branch is not `main` and can stay
   red for a while. CI's lane says so (checkpoint 7).
