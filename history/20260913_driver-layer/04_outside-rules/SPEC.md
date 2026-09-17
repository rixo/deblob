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

**Draft, 2026-09-17 — to ratify before the build.** Decisions listed under §
Decisions; nothing below is built.

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

Contained checkpoints, each handed back, one commit for the step.

1. **The fs kernel.** `lib/fs/` port, adapters, contract test; the six disk
   touches moved; async spread through the engine, extraction, package-meta, the
   loader; `main` composes the node adapters; the reading specs await. Gate: the
   existing suite green, self-check 0, coverage 100. Mechanical, no verdict
   changes — first because every later checkpoint runs on it.
2. **Resolution and the harness.** The resolver port and its two adapters; the
   engine split; `cases.ts`; one green case through the whole chain (a driver
   importing an assembly importing a service, no marker) and one red case on an
   existing rule (`inward-deps`) to prove the markers.
3. **Slugs, matrix, modules** — 03's checkpoint 3 with the cases first:
   `RULE_IDS`, `CHECK_RULES`, `RULE_CARDS`, the cells and the type exemption,
   `checkModules`, the renderer's messages, the CLI wiring, the readonly fixes
   on deblob's tree, the self-check count.
4. **Assembly and boot** — 03's checkpoint 4, cases first.
5. **Driver** — 03's checkpoint 5, cases first; the exemption pair; the CLI
   golden; the self-check count; violations attributed to their world's site.
6. **The reading spec cut** (§ Testing) and the list for the ruling.
7. **CI lane.** 03's decision 1, if ratified.

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

## Decisions — to ratify

1. **The fs port's set**: read, exists, stat, glob — the readers' use today,
   nothing anticipated. A reader needing more adds the member with the code that
   reads it. All promise-returning; no sync member without a force-majeure case
   written next to it (ruled, not open — listed so the async spread through the
   engine, extraction and the loader is read as the consequence it is).
2. **Resolution for cases**: the resolver port with an fs-port adapter for the
   memory run (recommended; relative imports and in-tree manifests cover every
   rule case, the resolver is small, and cases stay strings). Fallback if the
   split is judged too much for this step: cases materialise their tree in a
   temp dir and run the node adapters — strings in the spec, disk underneath,
   slower, no port split.
3. **Case shape**: markers in the source (recommended: the line is where the
   marker sits, nothing to renumber; the reviewer reads code and verdict on one
   line; rustc's `//~ ERROR` precedent). Alternative: an expectation list next
   to the tree with file, line, slug — explicit, renumbered by hand.
4. **What a marker proves**: file, line, slug; the message is not compared (the
   renderer's, the golden's). Alternative: compare the message too, every case
   pins the wording.
5. **The harness's home**: a spec-side assembly next to the check specs,
   duplicating `runCheck`'s wiring over the memory adapters, replaced by 09's
   run service. Named as laundering-adjacent on purpose: it is assembly, it
   lives with the tests that own it, and 09 removes the duplicate.
6. **The reading spec's fate**: the procedure in § Testing, the survivors ruled
   by rixo, not by the agent.
7. **03's seven decisions**: carried, to ratify here with these.
