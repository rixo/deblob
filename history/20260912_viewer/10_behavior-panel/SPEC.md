# Step 10 — behavior in the panel

Draft 2026-09-26, realigned 2026-09-27 to rixo's rulings. Nothing is built; it
waits on the roles from driver-layer (§ API, "Where it is computed"), asked
2026-09-27 and acknowledged.

The design's right panel shows, for a selected function, what its spec says of
it: the tree of its spec, each row openable to its code. Step 09 fed the panel's
READMEs; its per-function behavior is not fed, so every function reads "Behavior
not extracted yet." This step feeds it, from the spec files deblob already
reads.

Who owns what (rixo, 2026-09-27): the design uncovers the need (their reply of
2026-09-25, `data/TO-DEBLOB.md` § 3 and § 5); we own the model's shape, clean,
in our words; a bridge translates it into the design's current words, and the
design realigns to ours over time. How rows are ordered, grouped and worded is
the design's: we send a simple stable default and leave the choice to them (§
Open).

## Goal

Success:

- Selecting a function on the map shows its spec's tree: the group named after
  it and everything under it, groups, behaviors and verifications with their
  titles, each opening onto its code, setup shown as setup.
- Behavior and verification are both kept, and stay distinct (rixo, 2026-09-26):
  a behavior (`it`) describes the function, a verification (`test`: corpus rows,
  tripwires) proves it.
- Every hook the specs hand the runner is captured, with its role or with none;
  presentation decides what to show (rixo, 2026-09-27).
- A function no spec describes reads "No behavior describes it." (amber).
- Every project deblob reads gets this, not only deblob's own tree, whatever its
  runner, as far as its test reader goes.
- The gates stay green, `deblob check` included.

Out of scope, and why:

- Failing rows (`fail`): they need the tests run. deblob reads code, it does not
  run it.
- Uncovered code (`gap`): it needs coverage data. Same reason.
- Globals-mode runners (a free `describe`): the test reader does not read them
  (its own rule: that is the runner's own reader's work).

## API

### The model: roles, ours

A spec's structure is stated in a schema of ours, never in a runner's words.
Each hook the extraction reads carries a role, or none:

- `group`: holds other hooks (vitest's `describe`, mocha's `context`).
- `behavior`: a sentence of what the unit does (`it`).
- `verification`: a row that proves without describing (`test`).
- `setup`, scope `each` or `all`: runs before each row of its level, or once
  before them all (`beforeEach`, `beforeAll`).
- `teardown`, scope `each` or `all`: the same, after (`afterEach`, `afterAll`).
- `mock`: a module mock's factory (`vi.mock`'s).
- no role (`null`): anything else the runner is handed. Kept, not dropped.

Knowing the runner is the test reader's job (rixo, 2026-09-26: "that's the point
of the reader, to know its tech and translate it to our general model"): each
reader declares its runner's names by role, the extraction stamps each hook with
the role of the call that registered it. The good-enough reader maps the common
names; a runner's own reader maps its own. Nothing past the reader reads a
runner's names.

### The contract: the behavior half of `map`, by reference

The panel reads a project's behavior as `{ readmes, fns, docs }`. `readmes`
exists (step 09). This step adds to the contract's `map` references into file
texts, not copies of their lines (rixo, 2026-09-27: whole-file code views are
coming, so the format carries whole texts and ranges from the start):

- `texts`: by path, the text of every spec file a tree comes from. Spec files
  only, in this step (§ Open: on demand).
- `fns`: by `module#Symbol`, an entry `{ known, tree }`. A node is
  `{ role, scope?, id, file, span, title?, body?, kids? }`: `file` the spec's
  path (a key of `texts`), `span` the registering call's range, `title` its
  first argument's range as written, `body` its callback's range, `kids` the
  nodes under a group. Every hook of the linked group is a node, whatever its
  role. A range is `[start, end]`, offsets into the file's text. `fail` and
  `gap` are never sent (§ Goal).
- `known: true` for every exported function of a project read: its tree is what
  the specs say, empty when none describes it. `known: false` is never sent: a
  project's behavior is read whole or not at all.
- `docs` is not sent: a function's doc already rides on its symbol (step 09),
  and the panel falls back to it.

The bridge translates into the design's current words, as the project's
`behavior` value next to the READMEs: `group` → `describe`, `behavior` → `it`,
`verification` → `test`; `setup` of scope `each` → their `setup` lines; `t`,
`line`, `body` cut from `texts` through the ranges; `spec` from `file`. Hooks
their panel has no place for (`teardown`, `setup` of scope `all`, `mock`, no
role) do not cross the bridge until they give them one (§ Open).

### The link: which tree is a function's

A spec's root group is named exactly after the unit it tests (house rule: the
panel links tests to units on that name). So: for each spec file, each root
group whose title is a name exported by a module the spec imports becomes that
module's `module#title` entry. Stated as the operation, not a file-naming
convention: the import says which module, the title says which export. A title
matching exports of two imported modules links both. A root behavior or
verification outside any group links nothing.

Several root groups landing on one entry (two files, or one file twice) join in
a simple stable order: spec path, then source position. Nothing smarter: the
order a reader wants is the design's to pick (§ Open).

### Where it is computed

Extraction already reads every spec: the test reader proves which calls are the
runner's, and each callback handed to one is a hook, nested as written, with its
span and the call that registered it (`ReadHook.registeredBy`, marked
`registration`). What the reading does not keep is the hook's role.

- **The role is driver-layer's to add**: the reader port, the good-enough reader
  and `ReadHook` are theirs, and their next checkpoint edits the reader's hook
  handling. Asked 2026-09-27 (note `FROM-VIEWER-2026-09-27-roles.md` in the
  deblob tree; it replaces the runner-name field asked the day before), and
  acknowledged: after their lens checkpoint 2, its own commit on driver-layer,
  with rixo's go, reaching this branch by merge. Shape proposed, theirs to
  reshape: the `Reader` declares `roles: Readonly<Record<string, Role>>` by the
  name at the root of the call's chain (`it.skip.each` → `it`); `ReadHook` gains
  `role: Role | null`, `null` where the reader maps no role; `setup` and
  `teardown` carry their scope.
- Then a pure `behavior.model.ts` builds each spec's tree from its reading.
  Rejected: a walk beside the reader, re-proving what is the runner's; reading
  the runner's names in the model, which puts one runner's vocabulary past its
  reader.

## Testing

- Rows on small spec fixtures: the tree (nesting, every role, a hook with no
  role kept, behavior and verification kept apart, ranges that cut back the
  title and body as written), the link (title × import, two modules, a root
  behavior linking nothing, the stable join order), a function with no spec
  (empty tree).
- The service's map carries `fns` and the spec `texts`; the bridge translates
  them.
- Probe: select a function on deblob's own map, its spec's rows show, open onto
  their code, with their spec's path.

## Implementation

Checkpoints, riskiest first. Each checkpoint is its own commit; the red rows go
first, as their own commit. Both wait for the role to reach this branch
(driver-layer merged): until then no row can be red for the right reason.

1. **The tree and the link, as a model.** `snapshot/behavior.model.ts`, pure:
   the graph in, `fns` out. The risk is here: whether the reading's hooks and
   their spans give back what the specs say, on any tree.
   - The files it reads: every parsed module whose reading registers a `group`
     hook from its root. Stated as the operation, no spec-file naming convention
     and no reader named.
   - Every hook is a node, with its role and scope, or `null`. `span` is the
     registering call's, `title` its first argument's, `body` its callback's
     body (a block's inside of the braces, an expression body itself).
   - `id` is the registering call's position in its file (`path:offset`): unique
     within an entry, stable across runs of an unchanged file.
   - The link as § API states it: a root group whose title is the name of an
     exported function of a module the file imports (an edge from the file)
     gives that module's `module#title` entry its nodes. The title is read
     through its range: a string literal, or a template literal without
     substitutions; anything else links nothing. Every exported function (`form`
     function, not type-only: what the panel lists) has an entry, `known: true`,
     `tree` empty when nothing links.
   - Rows, on small trees of source strings through the real extraction over
     memory adapters (the cases' way): source in, entry out. Tripwire for the
     open set of runners: a reader of the row's own mapping names the model has
     never seen (mocha's `context` → group, `specify` → behavior), and the tree
     builds. Measured once on deblob's own tree: how many exported functions get
     a tree, stated in the Landed.

2. **Through the pipe.** The service reads the spec texts the trees point into
   and puts `fns` and `texts` on the map beside the READMEs; the bridge
   translates them.
   - The text: `ProjectSource.textsOf(root, paths)`, answered live over the fs
     port and in memory by the memory source, the README reading's way. A file
     gone since the scan is left out, as a missing README is: the change that
     removed it brings the next run.
   - `MapData` gains `fns` and `texts` (the contract,
     `@deblob/viewer/snapshot.model`); the service's `mapOf` computes them from
     the graph, beside the READMEs.
   - The bridge: roles to their words, ranges cut into their lines, `spec` from
     `file`, passed as the `behavior` value.
   - Rows: the service's map carries `fns` and `texts` for a memory project; the
     bridge's value carries them in their words. Probe on deblob's map, from the
     built bundle: select a function, its spec's rows show and open onto their
     code.

Gaps, known before the build:

- `it.todo("…")` hands no callback, so the reader has no hook: not a row.
- A root group linked through a re-export (`index.ts`) lands on the module
  imported, where the function is not declared: it links nothing.
- A title the source does not write as a string (`describe(fn.name, …)`) links
  nothing.

## Open

- **File text on demand** (rixo, 2026-09-27: "we surely DON'T want to send whole
  codebases on first load"). This step ships the linked spec files' texts on the
  snapshot, which is small. The texts of every file the map shows are coming
  (code views), and those must be fetched when asked for, not pushed on first
  load. To design early, before the next step that ships file text; the range
  format does not change for it.
- For the design, theirs to pick: the order of several root groups on one
  function (we send spec path, then source position); whether the panel's `it` /
  `test` rows read apart enough; where the hooks their panel does not draw yet
  go (`teardown`, `setup` of scope `all`, `mock`, no role).

## Docs

The contract's line in the viewer README; the snapshot README (`fns` and `texts`
in the map, `behavior.model.ts`, the project source's `textsOf`). Extraction's
README carries the roles with driver-layer's commit, not this step's.
