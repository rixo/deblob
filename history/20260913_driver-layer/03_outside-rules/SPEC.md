# Step 03 — the outside rules in `deblob check`

Opened 2026-09-16 from step 02's landing (`e2e9592`). This text replaces the
proto drafted 2026-09-15 and amended by step 01 (the proto is in git history at
`e2e9592`); what 01 and 02 settled is taken as given here, not restated. The
reading exists: every parsed file carries root statements with calls classified
and definitions with their readonly fact; every outside-kind file carries its
functions with their hooks cut, parameters bound at call sites, the flavor's
word on factories, the declared loads matched, the tech's exemptions as tokens.
Nothing judges it yet. This step is the judgment: every rule canon states for
assembly, driver, boot and test files, plus `stateless-modules`' first detector,
each as a slug in `RULE_IDS`, a violation shape, a check the CLI runs and
`explain` lists.

Canon is the contract: § Assembly, § Driver, § Boot, § Summary (the nine anchors
`assembly-builds-only` … `boot-one-call`, and `stateless-modules`), § The
dependency matrix. The chapter PLAN's rulings bind: `stateless-modules` restated
(root calls legal only on a pure callee with an immutable result), the declared
load, branch-or-loop-is-wiring, readonly checked by default, row 53 (readers
bound by glob). rixo's framing for this step (2026-09-16): all the new rules in
one step, plans stated as goals and why.

**Cut 2026-09-17, after checkpoint 2.** The step closes with checkpoints 1 and 2
landed: readers bound by glob, recognition as one operation, coverage by
extension or designation or binding, and the open part shrunk — callbacks read
inline, a called result classified by its value, `assignment`, one reading per
world, tracked locals. No rule fires in this commit. The rules — Goal bullets
"Ten rules fire", "Four checks" and "deblob reads itself red", § Rule slugs, §
The matrix, § Config keys, § Violations, § Detectors, § Exemptions, § CLI and
explain, § Decisions, Testing's fixture project, exemptions, matrix cells,
tripwire, CLI and self-check items, Implementation's checkpoints 3 to 6 and the
check, cli and canon lines of Docs — carry to step `04_outside-rules`, which
reads them as its contract and amends them there. Why the cut: checkpoint 2's
handback changed how the rules get proven (rixo: a test is a snippet and its
verdict, never a pinned shape; the reading spec below is the last of its kind)
and what they need first (an fs port with a memory adapter, so a case is a tree
of strings through the real chain). The reader work is one coherent unit and is
banked before that change. Step numbers in the text below shift by one from here
on: the alignment review is 05, the CLI restructure 06, the slugs 07.

## Goal

After this step:

- **Ten rules fire.** Nine slugs join `RULE_IDS` in canon's Summary order —
  `assembly-builds-only`, `assembly-driver-only`, `wiring-outside-hooks`,
  `one-call-per-hook`, `driver-calls-services-only`,
  `driver-defines-hooks-only`, `driver-to-driver-wiring`, `driver-not-imported`,
  `boot-one-call` — and `stateless-modules` gets its first detector. Every one
  of them is cited by at least one violation the suite pins.
- **Four checks.** `assembly`, `driver`, `boot`, `modules` join `KNOWN_CHECKS`;
  `deblob check` runs them by default, `deblob check driver` alone,
  `explain driver` lists its rules. The import-side halves of the rules (who
  imports an assembly, a driver, a boot; what a driver or a boot imports in-set)
  are matrix cells in `layers`, citing the new slugs where today they cite
  `inward-deps` or read legal.
- **Readers are named and bound.** Row 53's ruling lands: the port is `Reader`,
  one per tech; every reader binds files by glob, the stock ones as builtin
  bindings, config's first; test files are the test runner's binding, canon's
  "spec files by the test globs"; a file of an unruled tech that nothing binds
  and no designation names is outside the graph, not blob.
- **deblob reads itself red, and says so.** Under these rules deblob's own tree
  is red: `src/drivers/cli/main.ts` (designated assembly, shaped as a driver)
  under the assembly rules, and the root bindings step 02 measured under
  `stateless-modules`. The count is this step's last "Landed" line and step 04's
  first input; step 05 turns it green. CI runs the self-check on every push, so
  the step says what happens to that lane meanwhile (§ Decisions).

Why one step for all of it: the ten rules read one reading, share one violation
grammar and one renderer, and the matrix cells and the detectors cite each
other's slugs. Cut in three, each step would ship rules that cite slugs the next
step adds. Cut in one, the alignment table (04) reviews one surface.

Out of scope: the `test-setup-assembly` → `test-is-assembly-and-driver` rename
and the "nothing imports a test file" cell (06, breaking); knowledge cards for
the new slugs (06 realigns the skill; `explain` prints canon's own text
meanwhile); the CLI restructure (05); primary use cases on screen; a container
whitelist (07); any web reading.

## API

### Rule slugs

`RULE_IDS` gains the nine, between the testing rules and `stateless-modules`,
canon's order. `CHECK_RULES`:

| Check      | Rules                                                                                                                                                        |
| ---------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| `layers`   | today's seven, plus `assembly-driver-only`, `driver-not-imported`, `boot-one-call`, `driver-calls-services-only` — the import halves, cited per cell (below) |
| `assembly` | `assembly-builds-only`                                                                                                                                       |
| `driver`   | `wiring-outside-hooks`, `one-call-per-hook`, `driver-calls-services-only`, `driver-defines-hooks-only`, `driver-to-driver-wiring`                            |
| `boot`     | `boot-one-call`                                                                                                                                              |
| `modules`  | `stateless-modules`                                                                                                                                          |

`RULE_CARDS` maps the nine to no card (`[]`): `explain` renders the rule's own
Summary entry and its pinned URL, which the content build already ships; the
INDEX mirror test iterates over cards, so a cardless slug passes it. The cards
are 06's, with the rest of the skill realignment (ruled: no piecemeal skill
edits before then).

### The matrix — the import halves

`moduleCellRules` in `layers.model.ts`, the cells that change. The operation:
**a target of an outside kind cites that kind's import rule from every row canon
forbids**, and the driver and boot rows cite their own verb rules for what they
may not import. `inward-deps` stays cited where it is today (the inside rows,
and outward imports among the outside kinds) — the new slug is added, not
swapped, so today's goldens gain a citation and lose none.

| Cell                                           | Today                              | After                                                                                                   |
| ---------------------------------------------- | ---------------------------------- | ------------------------------------------------------------------------------------------------------- |
| inside kinds → `assembly`                      | `inward-deps`                      | `inward-deps`, `assembly-driver-only`                                                                   |
| `blob` → `assembly`                            | legal                              | `assembly-driver-only`                                                                                  |
| `boot` → `assembly`                            | legal                              | `boot-one-call`                                                                                         |
| `test` → `assembly`                            | legal                              | legal (a test factory is an assembly function)                                                          |
| inside kinds, `assembly` → `driver`            | `inward-deps`                      | `inward-deps`, `driver-not-imported`                                                                    |
| `blob` → `driver`                              | legal                              | `driver-not-imported`                                                                                   |
| `test` → `driver`                              | legal                              | legal (a spec calls a shared driver's wiring function)                                                  |
| anything → `boot`                              | `inward-deps` or legal             | `boot-one-call`, plus `inward-deps` where cited today                                                   |
| `driver` → `model`                             | legal                              | `driver-calls-services-only` (runtime edge; type edge exempt)                                           |
| `driver` → `ports`                             | legal                              | `driver-calls-services-only` (runtime edge; type edge exempt)                                           |
| `boot` → anything but `driver`                 | seals, `blob-quarantine`, or legal | `boot-one-call` (runtime edge; type edges to `model`/`ports` exempt)                                    |
| `assembly` → concrete or unclassified external | not judged                         | `assembly-builds-only` (runtime edge; a pure external is model, legal; type edge exempt) — audit item 9 |

Type edges: today the exempt targets are `service` and `adapters` for every row.
Canon says type imports are free on the importing side for every kind — a driver
may type-import model and ports, shapes, no calls — and the restriction stays on
the imported side. So the driver and boot rows also exempt type edges to `model`
and `ports`; every other row already may import those at runtime, so nothing
else moves. Assembly, driver and boot targets bind type edges from every row, as
assembly does today.

Externals from a driver or a boot stay out of the matrix, as today: the driver
detector reads them through the callee table (`unclaimed`, `model`), the boot
detector forbids them outright.

### Readers — row 53 in shape

The port `Tech` is renamed `Reader` (`ports/reader.port.ts`), its adapters
`plain-ts-reader.adapter.ts` and `test-runner-reader.adapter.ts`, the service's
`techs` parameter `readers`. rixo's word: the composable unit is a reader, one
per technology; "tech" stays the word for what a reader claims (`driverTech`,
callee kind `tech`) and for canon's "the driver's tech". The walk in
`reader.model.ts` moves to `reading.model.ts` — it produces the reading, as
`levels.model.ts` produces the levels; `readModule` keeps its name.

```ts
interface Reader {
  readonly name: string
  /** The builtin binding: root-relative globs over the files this reader reads. */
  readonly files: readonly string[]
  /** The kinds this reader reads among the files it binds. */
  readonly kinds: readonly Layer[]
  claims(specifier: string): boolean
  readonly exempts: readonly Exemption[]
}
```

A reader whose files the default engine cannot parse (a `.svelte` file needs its
own parser) brings its engine as a member of this port the day it exists; an
unread slot was drafted here and dropped at checkpoint 1 (rixo, 2026-09-17): a
promise the port makes and nothing keeps.

Binding, one grammar for builtin and configured (ruled 2026-09-16): **a reader
binds files by glob; the reader for a file is the first whose binding matches
the path and whose kinds hold the file's kind; configured bindings come before
the builtin ones; none means recognized and open, `reading: null`, as today.**
The stock bindings: the test runner binds the test naming (`**/*.{spec,test}.*`,
`**/__tests__/**`) and reads `test`; plain TS binds every script extension
(`**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}`) and reads `assembly`, `driver`, `boot`.
The kinds filter is what keeps the wide glob harmless: plain TS matches a model
file and reads nothing there (inside kinds get their root-only reading with no
tech, as today), and a designated `src/routes/+page.ts` driver is matched and
read. Precedence needs no specificity rule: config wins over builtin by
position, and the builtins do not compete once kinds filter — the runner reads
only test files, plain TS never does.

**Test files are recognized by their reader**, canon's own sentence ("a tech's
own files are declared by glob — spec files by the test globs, framework entry
points by the framework's patterns"): a reader whose `kinds` is one kind
designates that kind by binding. The test runner reads `test` only, so every
file its binding matches is a test file, wherever it sits and whatever the
flavor's suffix rule would say. Consequences, all in this step: the flavor stops
classifying test (the stock flavor's test naming moves into the runner's builtin
binding; `FlavorLayer` loses nothing, a flavor may still say `test` and is not
asked); the `tests` designation key of step 01 goes, unreleased — non-standard
test paths are one `readers` line; the extraction service's recognition
precedence reads "a single-kind reader's binding, then a designation, then the
flavor". Plain TS reads three kinds and designates nothing; `assembly`,
`drivers`, `boot` stay as the kind claims for what its wide binding reaches.

Coverage: `.svelte` and `.vue` leave `COVERAGE_EXTENSIONS`. A file under
`include` joins coverage when it carries a coverage extension, **or** matches a
designation glob (`assembly`, `drivers`, `boot`), **or** matches a reader
binding. So a `+page.svelte` named by `drivers` is a driver node, parsed by no
engine (`parsed: false`), reading `null`, recognized and open — as today; one
named by nothing is outside the graph — canon's letter, and the blob share stops
counting it. Step 04 reports the number on a web tree, with and without the
designation.

### Config keys

Step 01's keys and `mutableModuleState` are consumed by the detectors
(`configLoads` → `assembly`, `driverTech` → the reader's table,
`mutableModuleState` → `modules`). One key is added and one removed:

- `readers?: Readonly<Record<string, readonly string[]>>` — reader name → globs,
  root-relative, picomatch like the designations. A configured binding comes
  before every builtin one, so it wins where both match; it does not erase the
  builtin (`readers: { "test-runner": ["e2e/**"] }` adds the e2e tree to the
  runner's test naming). An unknown name is a `ConfigError` naming the stock
  readers. `ResolvedConfig.readers`: the bindings in written order, compiled.
- `tests` is removed: its job is the runner's binding above. Unreleased (0.0.6
  predates step 01), so nothing breaks; `KNOWN_KEYS` drops it and the teaching
  error for an unknown key names `readers` when the key is `tests`.

### Violations

Four members join the `Violation` union, same grammar: `check`, `ruleset`,
`rules`, `file`, `serviceRoot`, then a `shape` discriminant carrying every fact
rendering needs. Spans are the reader's (`Span`, with line and column), so every
line is a click target.

```ts
type AssemblyViolation = {
  check: "assembly"
  ruleset
  rules: ["assembly-builds-only"]
  file
  serviceRoot
  /** The assembly function the statement sits in; `null` at module root. */
  fn: string | null
  span: Span
} & (
  | { shape: "non-factory-call"; callee: CalleeKind }
  | {
      shape: "undeclared-load"
      member: string
      origin: InstanceOrigin | null
      declaredLoads: readonly { file: string; name: string }[]
    }
  | {
      shape: "condition"
      test: ValueKind
      testOrigin: ReadStatement["control"]["testOrigin"]
    }
  | { shape: "definition"; name: string | null; value: ValueKind }
  | {
      shape: "argument"
      callee: CalleeKind
      position: number
      value: ValueKind
    }
  | {
      shape: "adapter-returned"
      key: string
      origin: InstanceOrigin
      importer: string
    }
  | { shape: "return"; value: ValueKind }
  | { shape: "statement"; statement: ReadStatement["kind"] }
  | { shape: "root-content"; statement: ReadStatement["kind"] }
)

/**
 * Every violation of an outside-kind file may carry the world it was read in:
 * the call site whose arguments bound the file's parameters. `null` for the one
 * agreed world (audit item 1).
 */
type World = { site: string; span: Span } | null

type DriverViolation = {
  check: "driver"
  ruleset
  rules: readonly RuleId[] // one of the five
  file
  serviceRoot
  /** The hook the statement sits in, `null` outside hooks (wiring, root). */
  hook: Span | null
  span: Span
  world: World
} & (
  | { shape: "call-count"; count: number } // one-call-per-hook
  | { shape: "translation"; callee: CalleeKind | null } // one-call-per-hook: a language call, a non-tech assignment, an `other` statement in a hook
  | { shape: "statement"; statement: ReadStatement["kind"] } // wiring-outside-hooks: an assignment or `other` in the wiring zone
  | { shape: "conditional-call" } // one-call-per-hook
  | {
      shape: "argument"
      callee: CalleeKind
      position: number
      value: ValueKind
    }
  // one-call-per-hook in a hook, wiring-outside-hooks in wiring, driver-to-driver-wiring for a wiring callee
  | { shape: "result"; use: ResultUse["kind"] } // one-call-per-hook
  | { shape: "callee"; callee: CalleeKind } // driver-calls-services-only (model, adapter/blob/model origin), wiring-outside-hooks (use-case, language outside hooks)
  | { shape: "unclaimed-tech"; package: string } // driver-calls-services-only, resolution: driverTech
  | { shape: "control" } // wiring-outside-hooks
  | { shape: "definition"; name: string | null; value: ValueKind } // driver-defines-hooks-only (function, root non-function), wiring-outside-hooks (computed in wiring)
  | { shape: "wiring-in-hook"; callee: CalleeKind } // driver-to-driver-wiring
)

type BootViolation = {
  check: "boot"
  ruleset
  rules: ["boot-one-call"]
  file
  serviceRoot
  span: Span | null // null for the import shapes
} & (
  | { shape: "call-count"; count: number }
  | { shape: "argument"; count: number }
  | {
      shape: "content"
      statement: ReadStatement["kind"]
      callee: CalleeKind | null
    }
  | { shape: "import-count"; count: number; drivers: readonly string[] }
  | { shape: "import"; target: EdgeTarget }
)

type ModulesViolation = {
  check: "modules"
  ruleset
  rules: ["stateless-modules"]
  file
  serviceRoot
  layer: Layer
  span: Span
} & (
  | { shape: "root-call"; callee: CalleeKind }
  | { shape: "root-statement"; statement: ReadStatement["kind"] }
  | { shape: "mutable-binding"; name: string | null; form: string }
)
```

`AssemblyViolation` carries `world` as well (an assembly function bound at
several sites). The reader's `ReadStatement` gains
`{ kind: "assignment"; target: ValueKind; span }` (audit item 4); the node gains
`readings: readonly { world: World; reading: FileReading }[]` next to `reading`,
the agreed or first world (audit item 1).

### Detectors

Four pure functions over the graph, `check/assembly.model.ts`,
`check/driver.model.ts`, `check/boot.model.ts`, `check/modules.model.ts`. Each
reads `ModuleNode.reading` and the graph's edges, nothing else; a node with
`reading: null` yields nothing (recognized and open — the tripwire). Bodies are
read recursively through `control` arms; a statement inside an arm is judged as
its enclosing body's, and the control itself is judged where the rule says.
Every rule below is stated as what is **legal**; the complement fires, the shape
named. A callee or value of kind `unknown` is not judged — and after the audit
below (2026-09-17), `unknown` is the genuine open part only: an unresolved
import, a binding cycle, `this`, a syntax node the walker does not know, an
unparsed file, a reader that cuts nothing. Everything the reader can see is read
as it reads.

**`checkModules(graph, { mutableModuleState })`** — `stateless-modules`, over
every module with a reading whose kind is not `assembly` or `boot` (those two
roots are held to stricter rules by their own detectors, below), over `root`:

- A root `call` is legal iff its callee is pure by the table and the file's
  kind: `language`; `model`; `local` with `factory: false` in a pure layer
  (`model`, `ports`, `service` — a local function there is model code); or,
  under the `registration` exemption, `tech` and `wiring` (a spec's runner
  calls, and the shared driver's wiring function it calls with the tech). Else
  `root-call` with the callee: every factory (any layer, `local` with
  `factory: true` included), every tech call, every use case, a local function
  in an adapter or blob file (its layer is not pure).
- A root `definition` is legal iff `readonly` is `true`, or `mutableModuleState`
  is set. Else `mutable-binding`. In every kind the check covers, spec files
  included (canon: mutable state at spec root stays forbidden).
- Root `hooks` are judged by the driver detector (a spec's test bodies);
  `control` at root is read through for its arms; an `assignment` or `other`
  statement at root (an assignment, `delete`, `throw`, an increment — the
  reader's `other` is every non-call expression statement and every statement
  kind the walker does not name; imports are not statements to it) is
  `root-statement`: a module's evaluation performs no side effect. A root
  `return` cannot occur in a module.

**`checkAssembly(graph, { configLoads })`** — `assembly-builds-only`, over every
module of kind `assembly` with a reading. Root: every root statement is
`root-content` (canon: nothing at module root but imports; the assembly
functions are listed under `functions`, not `root`). Each function in
`functions`, body through arms:

- A `call` is legal iff its callee is a `factory` (any layer — a model factory
  by the flavor's word, a blob's, another assembly's), or a `use-case` with
  `load` set, or a `model` callee whose every result use is `argument` to a
  `factory` callee (row 37), or `local` with `factory: true` (the definition is
  the violation, the call is a factory call). Else: a `use-case` with `load`
  null is `undeclared-load` (member, origin, the declared list — the renderer
  says "declare it under `configLoads` if it is a load"); anything else is
  `non-factory-call` with the callee (a tech call — tech values arrive as
  parameters; a language call; a model function computed with; a wiring call).
- An argument of a factory call is legal iff its kind is `literal`, `tech` or
  `instance`. Else `argument` (a function handed to a factory, a computed
  value).
- A `control` is legal iff `testOrigin` is `parameter` or `load` (compared to a
  literal or for truthiness is the reader's `test` kind, not re-checked here).
  Else `condition` with the test and its origin — `instance` is canon's named
  crime, `other` covers a tech global or a computed test.
- A `definition` is legal iff its value is `instance`, `tech` or `literal` — a
  binding of what was built or received. Else `definition` (a nested function; a
  computed value). A computed value bound from a non-factory call yields two
  violations on one line, the call's and the binding's; accepted, and 04 reviews
  it on real output.
- A `return` is legal iff its value is an `instance` or a record (a literal
  record, or a binding whose initializer was one — the reader follows that one
  hop). Else `return` with the value's kind (a literal, a tech value, a computed
  value, a function: an assembly returns services and shared instances). A
  record entry with an origin of layer `adapters` is legal iff every importer of
  the file is of kind `test`; else `adapter-returned` (key, origin, the first
  non-test importer).
- An `assignment` or `other` statement in the body is `statement`: nothing in an
  assembly mutates, throws, or does anything but call a factory.

**`checkDriver(graph)`** — the five driver rules, over every module of kind
`driver` or `test` with a reading; `reading.exempts` says what the file's reader
skips (§ Exemptions). Two zones: the wiring zone (`functions`, their `body`) and
the hooks (`hooks` of every function and of the root, nested hooks walked and
each judged on its own body, the nested ones' bodies excluded).

Definitions, `driver-defines-hooks-only`, unless `definitions` is exempt:

- `functions` holds at most one entry; every further one, source order, is
  `definition` (name, `function`) — except a **tracked local**, which the reader
  inlines and which is no entry (rixo, 2026-09-17): a top-level function that is
  not exported and every reference to which in the file is a direct call (never
  passed as a value, never a member's root, never re-exported) is conceptually
  the text of its body at each site, so the reader reads it there — the site's
  arguments bound to its parameters, its statements the site's zone's, its hooks
  registered where the site sits, its `return` value the call's — and the rules
  judge it as the site's own code. A function the reader cannot track whole
  stays a second function and is red. A tracked local calling itself, or one
  tracked local another while it is being inlined, reads at that inner site as a
  `local` callee, not inlined again — red in a wiring zone or a hook, as
  recursion in wiring should be. A `definition` at root, or in any body, with
  value `function` is `definition`. A root `definition` of any other value is
  `definition` too (a driver defines nothing but its hooks and the wiring
  function; the modules check fires on its mutability as well, a second rule on
  the same line, each naming a different fix).

The wiring zone, `wiring-outside-hooks`, unless `definitions` is exempt (a file
that may define anything has no wiring function to judge; its helpers are
definitions, not wiring):

- A `call` is legal iff its callee is a `factory` of layer `assembly`, `tech`,
  or `wiring`. A `use-case` or `language` callee is `callee` — a use case
  outside a hook, a computation in wiring. `model` and `unclaimed` are
  `driver-calls-services-only`'s, below. A `factory` of another layer is the
  matrix's (its import is red already) and not repeated here.
- An argument of any call in the wiring zone is legal iff `literal`, `tech` or
  `instance`, or a `function` handed to a `tech` callee (that is a hook, the
  cut); else `argument` — cited `driver-to-driver-wiring` for a wiring callee,
  `wiring-outside-hooks` otherwise (canon: wiring's arguments are tech values,
  instances, literals — a tech setup call takes the same).
- An `assignment` or `other` statement in the wiring zone is `statement` under
  `wiring-outside-hooks`: wiring calls, it does not mutate or throw.
- A `control` is legal iff its `test` is `tech` or `literal` and its arms hold
  only statements legal in the wiring zone, judged recursively (the assembly's
  branch rule transposed, decision 4: a dev-only command registered behind an
  env check is wiring; a branch on an instance or a computed value is not). Else
  `control` with the test kind.
- A `definition` is legal iff `literal`, `tech`, `instance` (the parser, the
  services record); `computed` is `definition` under `wiring-outside-hooks`;
  `function` was the rule above.

The hooks, `one-call-per-hook`, unless `call-count` is exempt (the token names
the count; it exempts the rule whole — a test body asserts on results, and the
translation clause would make every test red):

- The `use-case` calls in the hook's body number exactly one, else `call-count`;
  the one sits in no `control` arm, else `conditional-call`; its arguments are
  `literal`, `tech` or `instance`, else `argument`; its result uses are each
  `returned`, `discarded`, or `argument` to a `tech` callee, else `result` with
  the use (`condition`, `member`, `computed`, `reassigned`, `entry`, `argument`
  to anything else). A `language` call in a hook is `translation` with the
  callee: the hook wires and makes its one call, a computation is neither —
  whether or not its result touches the use case (`JSON.stringify(opts)` for a
  log line is translation too; canon's closed verb list, 04 reads real hooks). A
  `factory` of layer `assembly` or a `tech` call in a hook is wiring, legal; its
  arguments are judged as in the wiring zone. A `control` in a hook is legal
  under the wiring zone's rule (a test on a tech value or a literal, arms that
  only wire) — the use-case call inside an arm is `conditional-call` whatever
  the test. An `assignment` in a hook is legal iff its target's root is a tech
  value (tech-held state is where a result may be handed); `other` and any other
  assignment are `translation`.

`driver-calls-services-only`, both zones, unless `services-only` is exempt:

- A `model` callee (a pure package's function, a model file's — the file import
  is a matrix cell, the package is not) is `callee`; an `unclaimed` callee is
  `unclaimed-tech` with the package (the renderer names `driverTech`); a
  `use-case` whose origin's layer is `adapters`, `blob` or `model` is `callee`
  (never an adapter, never a model; a service or assembly origin, or none, is
  legal — lenient on what the reader cannot trace).

`driver-to-driver-wiring`, both zones, no exemption:

- A `wiring` callee inside a hook is `wiring-in-hook`. Arguments were above.
  Root wiring calls are the modules check's (`registration` lets a spec's
  through).

**`checkBoot(graph)`** — `boot-one-call`, over every module of kind `boot` with
a reading:

- `root` holds exactly one `call` whose callee is `wiring`, else `call-count`
  with the count; that call has zero arguments, else `argument`; every other
  root statement, and every entry of `functions` and of root `hooks`, is
  `content` with the statement kind and the callee when it is a call.
- The boot's runtime edges reach exactly one module of kind `driver`, else
  `import-count` with the drivers found; every external edge is `import` with
  the target (a boot touches no tech). In-set edges to other kinds are the
  matrix's cells.

### The open part, audited (2026-09-17)

rixo's ruling, recorded on the PLAN: the lenient fence for a half-known tech — a
callback the reading cannot cut, an unparsed file, a tech no reader rules —
exists because the checker lacks the knowledge. Where the reader has the full
tree and the closed grammar, "unknown, not judged" is the same fence applied by
resemblance, and it is wrong there: what cannot be positively read as legal is
judged as it reads. The first draft of this SPEC gave up in nine places. Each,
with its ruling:

1. **Disagreeing call sites** (the graph pass, step 01). Was: two sites handing
   different kinds at a position drop it to `unknown`, the body goes unjudged.
   Now: the file is read once per **world** — one per distinct binding vector
   over its production sites — and every world is judged as if its site were the
   only caller; an infraction carries the inducing site (the renderer says
   "called from `cli.driver.ts` with a tech value"); no violation for the
   disagreement itself, since a parameter only passed through is legal in every
   world. Same kind, different origins (`registerCrud(cli, services.users)` and
   `…services.orders`) are two worlds too, so the levels resolve both as
   primary. `ModuleNode.reading` becomes the agreed world where there is one,
   and the node carries `readings`, one per world, where there are several;
   `unknown` remains for a function nothing calls — dead code, no rule's
   business. Amends step 01 § Parameters are bound at their call sites.
2. **Callbacks handed to a non-tech callee** (`uncut-callback`). Was: listed
   open, the body never walked —
   `Promise.resolve().then(() => services.app.check())` hid a use-case call from
   every rule (the reading fixture has that line). The half-known-tech clause of
   canon is about tech callees whose callbacks the reading cannot cut; with the
   generic cut every tech callback is a hook, so this case only ever arose for
   language, use-case and local callees, where nothing is unknown. Now: the
   callback's body is read inline as the enclosing zone's statements (its calls
   count where the callback sits), and the callback itself is a `function`
   value: in a driver a definition (`driver-defines-hooks-only`), in an assembly
   an `argument`. The open part loses `uncut-callback`.
3. **A call's result called inline, a computed member called** (`f()()`,
   `obj[k]()`). Was: `unknown`. Now: classified by the callee expression's value
   kind, which the reader already evaluates — an instance called is a `use-case`
   with the member unknown (`services[name]()` dispatches on a service), a tech
   value called is `tech`, a computed or literal value called is `language`.
   `unknown` stays for a value of kind unknown only.
4. **Root statements that are not calls or definitions.** Was: `other` and
   `return` at root not judged. Now: `root-statement` under `stateless-modules`
   (above). The reader gains an `assignment` statement kind carrying its
   target's root value kind, so a hook can tell tech-held state from anything
   else; `other` keeps the rest (`throw`, `delete`, an increment, a statement
   the walker does not name).
5. **A non-literal return in an assembly.** Was: not judged. Now: judged by the
   returned value's kind, the record followed through one binding (above).
6. **Arguments of tech calls in the wiring zone.** Was: not judged. Now: the
   wiring zone's argument rule, a hook being the one legal function argument
   (above).
7. **A branch in a hook not around the call.** Was: not judged. Now: the wiring
   zone's branch rule (above).
8. **A language call in a hook.** Was: not a shape, caught only when its result
   touched the use case. Now: `translation` (above).
9. **A tech import in an assembly used as a value.** Was: a known hole left
   to 07. Now: canon says an assembly never imports concrete tech — tech values
   arrive as parameters — and the matrix can say it: the assembly row cites
   `assembly-builds-only` for a runtime edge to a concrete or unclassified
   external (a pure one is model, legal; a type edge is a shape, legal). A
   container library enters by declaration (07) and this cell is where the
   declaration will be read. Added to § The matrix.

What stays unknown, and why: an import the resolver could not land (the run
already exits 2 on it), a binding that resolves through itself, `this`, a syntax
node the walker does not know (the tripwire), a file no engine parsed, an
outside-kind file no reader binds. Each is a fact about the reader, not about
the code. An unknown spreads: a member of it, its call's result, a parameter a
site binds to it are unknown in turn, and no rule fires on any of them. That
spread is accepted from the sources above only; after the four reader-side items
land, nothing else produces one. One case verified while auditing (2026-09-17):
a free name no reader claims (a globals-mode runner's `describe`) reads `tech`
by the kinds table, as a callee and as a value — the resolver does so today;
step 01's value table said `unknown` for it, history. Checkpoint 2 pins it.

### Exemptions

The tokens on `FileReading.exempts` (the test runner's reading sets all four;
the plain TS reader none), and what each skips — the detector reads the token,
never the tech:

| Token           | Skips                                                                                                   |
| --------------- | ------------------------------------------------------------------------------------------------------- |
| `registration`  | `modules`: root `tech` and `wiring` calls are legal                                                     |
| `call-count`    | `driver`: `one-call-per-hook`, whole                                                                    |
| `services-only` | `driver`: `driver-calls-services-only`, whole                                                           |
| `definitions`   | `driver`: `driver-defines-hooks-only`, and with it `wiring-outside-hooks` (no wiring function to judge) |

Canon's list for the test kind (imports anything — the matrix; defines anything;
hook count and services-only do not apply; nothing imports it — 06) maps onto
the four; `driver-to-driver-wiring` and the mutable-binding half of
`stateless-modules` apply to spec files as to any driver.

### CLI and explain

`KNOWN_CHECKS` becomes
`dag, layers, private, barrels, ports, assembly, driver, boot, modules, surface`
— the four before `surface`, which stands apart. Each gets a message per shape
in `render.model.ts`, same fiction: the fact, a dash, the rule's remedy in
canon's words, the citation. The `check-help` golden gains nothing (it explains
the shape of a violation, not the list). `main.ts` wires the four into
`DETECTORS`, handing `configLoads` and `mutableModuleState` from the resolved
config.

### Decisions — ratified 2026-09-16 (rixo), one row each

1. **The self-check goes red until 05, and stays visible.** deblob's own
   `src/drivers/cli/main.ts` is designated assembly and shaped as a driver: the
   assembly check fires on its tech calls, its use-case calls, its definitions;
   the modules check fires on the root bindings step 02 measured. CI runs
   `deblob check` on every push. Ruled: red during the chapter is the tool
   working honestly, and rixo wants to see it; the eight real readonly bindings
   and the `: string` annotation are fixed in this step (one line each — SPEC 02
   § Config key lists them); the `main.ts` reds stay, counted in "Landed"; the
   CI self-check step is `continue-on-error` on this branch with a comment
   naming step 05, reverted there. 05 is the sweep that turns deblob green under
   every rule of this chapter; further architecture cleaning (the fs port, one
   tech per adapter) is its own chapter, not 05's.
2. **One binding grammar, builtin and configured, kinds as the filter; test
   files are the runner's binding; `tests` goes.** § Readers. rixo: builtins are
   globs like anything else, config wins over builtins. The earlier objection (a
   narrow builtin glob would leave a designated `+page.ts` without a reader) was
   a wrong assumption about the builtin glob, not a limit.
3. **Names**: port `Reader`, adapters `*-reader.adapter.ts`, the walk in
   `reading.model.ts`.
4. **A branch in the wiring zone is wiring when it decides only wiring**: the
   assembly's rule transposed — its test is a tech value or a literal, its arms
   hold wiring statements only, judged recursively. rixo: the most flexible
   reading, no nanny. More lenient than canon's three verbs as written, so
   canon's driver rule gains one sentence in this step's commit (§ Docs) and the
   board records it for 04's table.
5. **The matrix adds the new slugs next to `inward-deps`** where a cell cites it
   today — both facts are true and the layers check already prints pairs. The
   boot row cites `boot-one-call` alone for its non-driver targets.
6. **The nine slugs ship without cards** until 06.
7. **Duplicates accepted**: a computed binding from a non-factory call in an
   assembly, and a mutable root definition in a driver, each print two lines
   under two rules. 04 reads real output before anything is merged.

Future, not this chapter, carded for the fs chapter: **one tech per adapter**
(Ideas card) is the rule that forces the port — an adapter's concrete contacts
count to one package, builtin family or host global; its import half is an
edge-level check the graph already serves, the host-global half needs the reader
over adapter bodies. It forces the port, never the sharing; the kernel is the
author's. "Scattered concrete imports" (one package touched from many adapters)
is a status signal, not a rule.

### The reviewer's level — 2026-09-17, at checkpoint 2's handback

Checkpoint 2 landed four reader-side decisions (§ Landed — checkpoint 2) and the
handback presented them as syntax shapes: what `f()()` reads as, what an inline
callback's parameter is, what a world binds. rixo could not follow, and said so:
the discussion is recorded here because it decides how this chapter and the ones
after it are reviewed.

The worry was that the rules had become too complicated. They had not — no canon
sentence changed — but the reader had, and the question was whether that depth
is forced. It is: the depth is JavaScript's. A call hides in a callback, behind
a computed member, on the result of a result; curried factories
(`services.users()()`) are common, and AI agents write them freely (the agent's
"nobody writes that" was wrong and withdrawn). A reader that dodges a shape is a
reader a driver evades by wrapping its calls in a `then`. So the ways out are
three: strict authoring rules, which kill progressive deblob; dodging the
shapes, which sends the reviewer back to the code to trust the map — the failure
mode of "emerging clarity"; or absorbing the depth in the reader so that it
becomes a reliable detail the reviewer never opens. Ruled: the third.

What that costs is the review of the reader itself: the minute decisions build
the whole, they are hard for the agent too, and skipping the reviewer's
understanding because the detail is fine-grained is the danger. The method that
follows, applied from this checkpoint on:

- The reviewer judges verdicts, not shapes. A reader-level decision is presented
  as a row: the code as a human or an agent writes it, where it sits, and the
  verdict the rule gives. The shape-level account stays in the SPEC's Landed
  section for the record. Checkpoint 2's decisions, in that form:
  `process.argv.map((f) => services.app.check(f))` in a wiring zone is red (a
  use case outside a hook); `Promise.resolve().then(() => services.app.check())`
  there is red, same rule; `services.users()()` in a hook is green, a use case
  and the hook's one call; `opts.body = 1` in a hook is green, tech-held state;
  `counter = 1` at a module root is red, a side effect at evaluation;
  `setTimeout(() => registry.warm())` at a model root is red, the warm-up a root
  call where it was invisible; a sub-driver called with a parser from one driver
  and a string from another turns the string caller red, since in that world
  `.command` on a string is a computation in the wiring zone, reported at that
  caller's line — worlds earning their keep.
- Each such row is a test whose title is the snippet's sentence, so a wrong
  verdict is one test to point at and the reader is what gets fixed.
- The reader's two properties a reviewer can check without opening it: the open
  part is empty on a real tree, and the violations make sense. Checkpoint 3's
  self-check is the first real-tree run of worlds and inline callbacks;
  checkpoints 4 and 5 pin every rule as a fixture with its full violation list;
  step 04 aligns canon sentence, detector and test by name.

The guiding principle underneath — the depth is ours, the reviewer's attention
is the scarce resource the tool exists to protect — is carded on the PLAN under
Ideas, to be lifted into the method docs when its home is ruled.

## Testing

Contract tests through the detectors and through `extractGraph`, fixture files
with invented names, `test()` not `it()`.

- **Fixture project `check/__fixtures__/outside/`**: a small tree with one file
  per kind and one statement per shape — an assembly with every legal call form
  and every illegal one (tech call, language call, undeclared load, model
  function computed with, instance condition, nested function, computed binding,
  function argument, adapter returned to a non-test importer, a root constant);
  a root driver with a wiring zone holding each legal verb and each violation
  (use case outside a hook, a branch, a computed binding, a second function, a
  pure package's call, an unclaimed package); hooks with zero, one and two
  use-case calls, a conditional call, a computed argument, each result use, a
  use case on an adapter origin, a wiring call in a hook; a sub-driver called
  with a computed argument; a boot with two imports, an argument, a definition,
  a second root call; a model file with a root factory call, a mutable binding,
  a legal `Object.freeze`, a legal local call; an adapter with a root local
  call; a spec file with root registrations, a helper function, a two-call test
  body, a `let` at root, a wiring call at root. Each file's violation list is
  pinned in full (shape, rule, span line), so a shape added without an
  expectation fails.
- **Exemptions**: the same spec file read with a stub reader exempting nothing
  fires every driver rule; with the test runner's four tokens, only the mutable
  binding and the wiring-in-hook remain.
- **Matrix cells**: `layers.model.spec.ts` gains the changed cells, the type
  exemption for the driver and boot rows to model and ports, and the added
  citations next to `inward-deps`.
- **The open part** (§ The open part, audited, the four reader-side items),
  through `readModule` and `extractGraph`: a function called from two production
  sites with different kinds at one position has two `readings`, one per world,
  `reading` the first, and the levels resolve each; a site in a test file opens
  no world; a function nothing calls has one reading with the parameter unknown.
  A callback handed to a language call
  (`Promise.resolve().then(() => services.app.check())`, the reading fixture's
  hidden line) has its use-case call read where the callback sits, the callback
  itself a `function` value, and nothing listed open for it. An instance's
  result called inline is a `use-case` with the member unknown, a tech value
  called is `tech`, a computed or literal value called is `language`, a value of
  kind unknown called is `unknown`. `a.b = x` and `[a] = x` at root and in a
  hook are `assignment` statements carrying the target root's value kind, never
  calls. The open part of the shapes fixture holds no `uncut-callback`; the
  `why` union loses the token. A free name no reader claims reads `tech`. A
  tracked local (a non-exported top-level function only ever called directly in
  its file) is absent from `functions` and read at each site: its hook
  registered where the site sits, its parameter bound to the site's argument (a
  tech value at one site, an instance at another), its `return` value the
  call's, nothing open for it; a local passed as a value or exported by
  specifier stays in `functions`; a tracked local calling itself reads the inner
  call as a `local` callee.
- **Tripwire**: a designated driver of an unruled tech (`+page.svelte`, no
  reader) yields no violation from any of the four checks; a file whose reading
  holds an `unknown` callee at root and in a hook yields none for it.
- **Readers**: the rename is the compiler's. Binding: a `.spec.ts` file goes to
  the runner and reads `test` with no `tests` key; a `readers` line binding the
  runner to `e2e/**` makes `e2e/flow.ts` a test file read with the four
  exemptions, and the builtin naming still holds; a designated `+page.ts` driver
  is read by plain TS. The kinds filter pinned: a configured binding of plain TS
  over the spec naming comes first by position, yet the file is still `test`
  (the runner's binding designates it) and plain TS does not read that kind, so
  the file falls to the runner, not to null. Coverage: a `.svelte` file under
  `include` is absent from the graph unless a designation names it, then
  present, unparsed; `readers` with an unknown name and a leftover `tests` key
  are `ConfigError`s naming the fix.
- **CLI**: a golden `check-outside.txt` over the fixture project (every shape's
  message once); `check-help` unchanged; `explain assembly` / `driver` / `boot`
  / `modules` list their rules; `explain boot-one-call` prints canon's entry
  with no card.
- **Self-check**: `pnpm -s check` on deblob's tree — red, by design, the count
  recorded in "Landed" per file and rule; the eight readonly fixes leave the
  modules check with the `main.ts` reds only.
- **Gate**: typecheck green (the widened unions total by the compiler); coverage
  100; suite red only on the two `rule-content` slug assertions (06); prettier
  from the root.

## Implementation

Contained checkpoints, each handed back, one commit for the step.

1. **Readers and coverage.** The rename (`Tech` → `Reader`, adapters, the walk
   to `reading.model.ts`, README); `files` on the port with the two builtin
   bindings; the binding pick in the service; the runner's binding as test
   recognition, the flavor's test naming moved out, `tests` removed, `readers`
   in; `.svelte`/`.vue` out of the coverage extensions, designation and binding
   matches in. First because it moves files every later checkpoint touches.
2. **The open part shrinks** (§ The open part, audited): the reader reads
   callbacks to non-tech callees inline, classifies a called result or computed
   member by value kind, emits `assignment` with its target's kind; the graph
   pass reads a file once per world and the node carries `readings`;
   `uncut-callback` leaves the open part. Tests per § Testing "The open part";
   the extraction README's graph-pass paragraph rewritten for worlds. Second,
   ahead of the plumbing (rixo, 2026-09-17): the reading is the contract every
   detector reads, and the worlds are the one part with design risk, so it is
   settled before a detector is written against the node. It waits on nothing in
   3 — `checkModules` reads root statements, the same in every world, and
   `root-statement` fires on `other` as on `assignment`.
3. **Slugs, matrix, modules.** `RULE_IDS`, `CHECK_RULES`, `RULE_CARDS`; the
   matrix cells and the type exemption; `checkModules`; the renderer's messages
   for both; the CLI wiring; the readonly fixes on deblob's own tree; the
   self-check count after this checkpoint.
4. **Assembly and boot.** `checkAssembly`, `checkBoot`, messages, the fixture
   project's assembly and boot files; the assembly row's external cell in the
   matrix.
5. **Driver.** `checkDriver` with the exemptions, messages, the fixture's driver
   and spec files, the exemption test, the CLI golden, the self-check count;
   violations attributed to their world's site.
6. **CI lane.** The workflow change of decision 1, if ratified.

Checkpoints 3 to 6 did not run here: the step was cut after 2 (see the head of
this file) and they are step 04's, re-cut there under its test method.

### Landed — checkpoint 1, 2026-09-16

What the code settled against the sketch above:

- `ports/reader.port.ts`, `Reader`: `name`, `files` (the builtin binding),
  `kinds`, `claims`, `exempts`. Adapters `plain-ts-reader.adapter.ts` (binds
  every script extension, reads assembly, driver, boot) and
  `test-runner-reader.adapter.ts` (binds `*.{spec,test}.*` and `__tests__/`,
  reads test). The walk is `reading.model.ts`, `readModule` unchanged.
- `recognition.model.ts`, new:
  `createRecognition({ readers, isAssembly?, isDriver?, isBoot? })` →
  `kindOf(file, flavorLayer)` and `readerOf(file, layer)`. One operation for the
  extraction service and the bare status — the status counted a designated
  driver of another extension as blob before; it now recognizes as `check` does.
  Takes a reader's binding and kinds as plain data, never the port: the first
  draft imported the port type and the self-check caught it (`inward-deps`,
  model importing ports) — the tool working on its own author.
- The pick, as ruled: configured bindings first, then the stock readers in the
  driver's registry order (test runner, then plain TS); the first whose glob
  matches and whose kinds hold the file's kind reads it. A reader of one kind
  designates that kind by binding; the `tests` designation is gone, with a
  teaching `ConfigError` naming `readers: { "test-runner": [...] }`; the stock
  flavor no longer classifies test naming (a `.spec.ts` file is blob to the
  flavor and test to recognition).
- Config: `readers` (name → globs, validated against the injected
  `ReaderRegistry`; an unknown name names the stock readers), composed into
  `ResolvedConfig.readers` — the configured bindings as the named stock reader
  over the config's globs, then every stock reader as shipped;
  `ResolvedConfig.covers` = a script extension, or a designation match, or a
  reader binding match; `scanCoverage` gates on it. `COVERAGE_EXTENSIONS` lost
  `.svelte` and `.vue`.
- The bare status guards recognition's one failure (a file under two designation
  keys) the way it guards a config error: message on stderr, stat lines skipped,
  exit 0 — `asExtractionError` in `graph.model.ts` is `asConfigError`'s twin, so
  a bug still flies. Pinned on the `twice-designated` fixture.
- The `engine` slot the sketch put on the port was dropped at handback (rixo,
  2026-09-17): a reader that set it would have been parsed by the default engine
  and read `null` without a word — a promise nothing kept. The first non-TS
  reader adds the member with the code that reads it.
- Gates: typecheck clean; suite 630 passing, the two `rule-content` slug
  assertions red (06); coverage 100 on all four axes; self-check 0 violations,
  59 files; the package builds; prettier from the root.

### Landed — checkpoint 2, 2026-09-17 (the open part shrinks)

The four reader-side items of § The open part, audited, as coded:

- **Callbacks inline** (item 2). In `evaluateCall`, a function argument is a
  hook when the callee is the tech's _and the file has a tech_; otherwise
  `readInline` walks its body into the enclosing body — its calls count where
  the callback sits, a nested tech call inside it registers a hook there. Its
  parameters are a binding kind of their own, `callback`: a computed value the
  callee hands back, so a branch on one reads `other`, not `parameter` — an
  inline callback's parameter is no parameter of the function (the first draft
  bound them as parameters and a `.map` callback's `if (n)` read as wiring). A
  `return` inside it is no statement of the function: its value flows to the
  callee the callback was handed to, as an `argument` result use (`inFrame`
  carries that context; a hook or a function of the file resets it). The
  callback itself stays a `function` value. `uncut-callback` left
  `OpenPart.why`. The reading fixture's
  `Promise.resolve().then(() => services.app.check(…))` now reads three calls at
  line 32 — language, the use case with its result handed to the language,
  language — and nothing open.
- **The inside-kind callback** (question raised at checkpoint 1's review, ruled
  here): hooks are no concept of an inside kind, so a model file's root
  `describe(() => test(() => createThing()))` reads its callbacks inline — three
  root calls, factory, tech, tech, where the modules check reads them;
  `reading.hooks` is empty for every inside kind.
- **A call's result called, an expression called** (item 3). `calleeOf` no
  longer has an `unknown` fallback for a root that is a call or an expression:
  `memberCallee(value, members)` classifies by the root's value kind with or
  without members — an instance called is a `use-case` (member `""` when the
  instance is the call's result itself, `services[name]()` keeps `[]`), a tech
  value the tech, a computed or literal value the language, a value of kind
  unknown `unknown`. A non-literal `import(x)` is a computed value, its `.then`
  the language's. A module namespace called bare (`(await import("./x"))()`)
  stays unknown: no export named, nothing to classify.
- **`assignment`** (item 4). `ReadStatement` gains
  `{ kind: "assignment"; target: ValueKind; span }` for an assignment expression
  statement, `target` the root of the target: a binding's own kind (a reassigned
  `let` or parameter reads computed), a free name's (the host's tech; a language
  global's member computed), a member chain's root (a hook parameter's member is
  tech-held), a destructuring pattern computed, `this` unknown. An increment
  statement is `other` — it emitted nothing before.
- **Worlds** (item 1). `worldsOf` replaces the join: a target file gets one
  `World` per exported function and distinct argument vector (`sameArg` per
  position, origin included — the same kinds from another assembly are another
  world), the first site of a vector kept as the inducing one; sites are read
  off every world of the calling file. `ModuleNode.readings` is one
  `{ world, reading }` per world, that function bound from its site, the others
  from their first; `ModuleNode.reading` binds every function from its first
  world. `paramKinds` on the reader is now `readonly ArgValue[]` per name (no
  `null`: a short site leaves the parameter unknown, as before). The fixed point
  loop is unchanged in shape. The levels resolve every world: the sub-driver's
  hook is primary in the world where its parser is tech, and unresolved in the
  world where its instance came from the opaque assembly; the world where the
  parser is a literal reads no hook (`.command` and `.action` are the
  language's, the callback inline) and labels nothing.
- **Same-file call sites** (question raised at checkpoint 1's review; first
  built as "no world, the second function is red anyway"; REVERSED by rixo at
  the handback, 2026-09-17): a non-exported top-level function every reference
  to which is a direct call in its own file is a **tracked local** — the reader
  sees all of it, so it is inlined at each site with the site's arguments bound,
  judged as the site's own code, and is no second function (§ Detectors,
  definitions). Only a function the reader cannot track whole — exported, or
  passed as a value, or reached through a member — stays a second function and
  red. Cross-file sites keep opening worlds; same-file sites never do, since
  inlining is the same-file world. Built in this checkpoint after the handback;
  see the last bullet below.
- **A free name no reader claims reads `tech`**, pinned twice: as a callee (a
  model file's root `describe` reads `call:tech`) and as a value (an assignment
  to an undeclared name targets `tech`).
- Fixtures extended, nothing shifted: the reading fixture's `cli.driver.ts`
  gains a hook with two assignments (tech-held both: the hook's parameter, the
  host global) and a call into the unparsed `+page.svelte` driver (a world for a
  file no reader reads: skipped, `readings` empty — the world loop's one guard),
  `other.driver.ts` a third site for the sub-driver (`process.argv` and the
  opaque assembly's instance — the origin-only world); the reader's
  `bindings-and-roots.ts` gains `this.made = 1`, `Math.made = 1` and a
  block-bodied `.map` callback with a bare `return` and a `return helper()`. The
  six check specs' fake nodes gain `readings: []`.
- **Tracked locals, built after the handback** (rixo's Q3 ruling, above). The
  reader lists the non-exported top-level functions and counts every reference
  to each name in the file (a property name, a key, a label, an import or export
  name and the declaration's own name are not references; TS type nodes
  reference nothing at runtime): one whose references are all direct calls, at
  least one, is tracked, keyed by its root binding so a shadowing local is never
  taken for it. A tracked local is absent from `functions`; at each site,
  `inlineLocal` binds the parameters first and evaluates each argument as
  _bound_ to its parameter — a call's result flow becomes the parameter's, a
  binding handed over shares its flow, so what the body does with the argument
  is recorded on the caller's binding and no "argument to a local" use exists
  (the inlined text has no call); a missing argument is `undefined`, a literal;
  a callback is read at the site. The body is walked into the site's body with
  the site's context as its return frame: hooks register where the site sits, a
  `return` is no statement and its value is the call's (one return's value,
  `undefined` for none, computed for several); the value is memoized by call
  node for the non-emitting evaluation a binding's initializer gets when the
  binding resolves. A call to a tracked local while it is being inlined
  (recursion, mutual calls) reads `local`. A branch on a tracked local's
  parameter reads as a branch on a parameter, as for a cross-file bound one. A
  record literal handed to a destructuring parameter binds by key —
  `setup({ cli: process, services: thing })` binds `cli` to the tech and
  `services` to the instance, so the hook registered inside is cut and its use
  case traced; an instance handed to one binds each name as a member of it; the
  cross-file binding still takes a record's joined kind (a hole, carded).
  Fixture `reader/tracked-locals.ts` (a helper registering a hook, called with
  the tech and an instance one way and the other; a recursive one; one passed as
  a value; one never called; one with two returns; one with none; a call with no
  argument, one with an extra, one with a callback and a spread; a destructured
  record, literal and handed; a multi-declarator `const`, no candidate);
  `reader/tracked-locals-refs.ts` (what counts as a reference: a property name,
  a key, a label, an import or export name, a function expression's own name and
  a type do not, a computed key does); `reader/factories.ts` gains a value
  reference to its two locals so step 02's `local` pins still read an untracked
  local.
- Gates: typecheck clean; suite 640 passing, the two `rule-content` slug
  assertions red (06); coverage 100 on all four axes; self-check 0 violations,
  60 files; the package builds; prettier from the root — and from the root only:
  run from the package directory it reformatted eight line-pinned fixtures
  (restored from the index; the root `.prettierignore` is what skips
  `__fixtures__/`).

## Docs

- `lib/check/README.md`: the four detectors, one paragraph each stating the
  legal forms; the matrix's changed cells; the exemption table.
- `lib/extraction/README.md`: `Reader` in place of `Tech`, the binding rule,
  test recognition by the runner's binding, coverage by extension or designation
  or binding.
- `lib/config/README.md`: `readers` in, `tests` out, coverage.
- `lib/cli/README.md`: the four checks.
- Chapter PLAN: step 03 entry closed with its sha; the self-check count under
  the step queue for 04 and 05; row 53 DONE pointing here; a board row for the
  driver branch sentence (decision 4) so 04's table cites it.
- `docs/architecture.md`: one sentence in `wiring-outside-hooks` — a branch or
  loop outside the hooks is wiring when its test is a tech value or a literal
  and its arms only wire (the assembly's sentence transposed). Nothing else; any
  other rule the detectors could not state as written goes to the board as a
  question, not to canon.
