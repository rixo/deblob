# Detectors — the outside rules fire, against the rows written red first

Opened 2026-09-25, after `02_rows-first` closed. Every outside rule has its rows
and every red there is a `missed red` (or a `false unknown`) waiting on a
detector. This step builds the detectors those rows name, and nothing the rows
do not ask for: a detector is done when its rows' markers turn plain, the row
stating the verdict and the check giving it.

**Drafted 2026-09-25.** Nothing below is built until "build".

## Goal

After this step:

- **`stable-root` judges root calls.** A root call is red when it reaches the
  tech, runs a use case, or goes into a function of a file whose layer may touch
  the tech; exempt by kind: the boot's one call, a spec file's registrations
  into its runner. The call half's rows (`modules.spec.ts`, § "a root call is
  red…") flip from `missed red` to `red`.
- **Three checks join `KNOWN_CHECKS`**: `assembly` (`assembly-builds-only`),
  `driver` (the five call rules), `boot` (`boot-one-call`). The import halves
  land as `layers` cells (`assembly-driver-only`, `driver-not-imported`,
  `boot-one-call`'s, `test-is-outside`'s, an assembly's concrete tech, a
  driver's undeclared or pure package). `assembly.spec.ts`, `driver.spec.ts`,
  `boot.spec.ts` and the import rows of `layers.spec.ts` flip.
- **Every new violation renders**, with the way out its row's table names, and
  `explain` resolves the three new check names.
- **A row that does not flip says why** in its marker: a reader limit is a
  confessed expected failure, never a changed verdict.

deblob's own code turns red under the new rules (`main.ts`, `cases.assembly.ts`
— the laundering this chapter exists to close). That is expected and not gated:
the self-check count is recorded per checkpoint; the CLI restructure (chapter
queue, after this step) is where deblob obeys its own rules.

Out of scope: type names beyond 04/01's first checkpoint, `node_modules` types,
the TypeScript engine (their rows stay `false unknown`); a container whitelist;
any web reading; the CLI restructure; skill and card edits (07).

## API

### What a detector reads

Every detector reads a module's `FileReading` (`graph.model.ts`), the one
vocabulary: `CalleeKind` for what a call reaches, `ArgValue` for what it is
handed, `ResultUse` for where its result goes, `ReadHook` and `ReadFunction` for
a driver's shape, `control` with `testOrigin` for a branch. A detector decides;
the reader classifies. A detector never re-reads a tree, and a judgment that
needs a fact the reading lacks is a reader addition, named in the checkpoint
that needs it.

A callee of kind `unknown`, an argument of kind `unknown`, or a result the
reader cannot follow gives an **unknown**, never a green and never a proven red
— step 06's rule, applied to every new check.

### `stable-root`, the call clause

A root call (a `call` statement of `root`, branches flattened as today, and the
calls of a tracked local or an inline callback read at their site) is red when
its callee is:

- `tech` — a host global, a claimed package, a concrete builtin; a `new`, a
  tagged template, an optional call, a dynamic `import()` included ("a call is
  presumed to have side effects");
- `use-case` — "a call that runs a use case";
- `local`, or a `factory` of layer `adapters` or `blob`, when the function sits
  in a file whose layer may touch the tech (every layer but model and service:
  adapter, blob, driver, assembly, boot, test) — "a local function of a file
  whose layer may touch the tech";
- `unclaimed` — a package nothing claims is not proven free;
- `wiring` — a driver's wiring function sets up the tech (row 175: `main()` at a
  spec's root), unless it is the boot's one call, or its body, inlined, is only
  registrations into the runner (T6: `registerMatchers(expect)`).

Green: `language`, `model`, a `factory` of layer `model` or `service` — "a
factory call at root is not itself the violation". Unknown: `unknown`.

Exempt by kind: a boot's one call to its driver's wiring function (the one; a
second is red), a test file's calls into its runner's tech (the reading's
`exempts` holds `registration`) — the call reached through a tracked local or a
wiring function it inlines to included (T6).

**A call's result stored at root adds nothing to the call**: when the call is
red, the binding holding its result draws no second verdict (rows 1, 2, 11, 12
lose their `false unknown`); when the call is green, the binding is judged as
today — row 52's "the binding is what must be proven".

**`via`**: a red inside a tracked local or a callback read at a root site is
reported at its own line, the root sites that ran it in `via` (row 104). This
needs a reader addition: a call read inline carries the sites it was read into.

New shape on `ModulesViolation`: `shape: "root-call"`, carrying the callee's
kind and name for the message.

### `assembly` — `assembly-builds-only`

Over every function of an assembly file and its root:

- a call whose callee is not a `factory` (any layer), an assembly's, or a
  `model` call whose result is only passed on or returned — red; a `use-case`
  red unless it is a declared load;
- an argument of kind `computed` or `function` — red; `literal`, `tech`,
  `instance` green;
- a result used as `member`, `computed`, `condition`, or `reassigned` — red,
  unless it is a load's (a tech value); never `condition`: a condition sits in a
  `control`'s test, and the control owns it (checkpoint 5: one fact, one
  clause);
- a `control` whose `testOrigin` is `instance` or `other` — red; `parameter`,
  `load` green;
- a definition at root, or a function that is not an assembly function (it
  builds nothing: no factory call in its body) — red; a statement at root that
  is not an import — red;
- a returned record entry whose origin is an adapter's, when a non-test file
  calls the function — red (the callers come from the graph's call sites, the
  same pass that binds worlds).

New `AssemblyViolation`, one `shape` per clause, as 03 § Violations drafted
them, amended where the rows moved (the load's result read by field is green).

### `driver` — the five call rules

Over a driver file's `ReadFunction`s and `ReadHook`s:

- `wiring-outside-hooks` — a function body's calls are an assembly factory,
  tech, a sub-driver's wiring; arguments `tech`, `instance`, `literal`;
- `hook-one-call` — a hook's body holds exactly one `use-case` call, outside any
  `control`; its arguments `tech`, `instance`, `literal`; its result `returned`
  or an argument to a `tech` callee (handed whole) or assigned to tech-held
  state; nothing else computed in the hook;
- `driver-calls-services` — any call in the file whose callee is not `use-case`,
  `factory` of layer `assembly`, `wiring`, or `tech`;
- `driver-hooks-only` — a root definition that is not a hook or the wiring
  function; more than one wiring function; a root driver's `main` with a
  parameter; a local of the wiring function holding functions not handed to the
  tech where written (O2);
- `sub-driver-wiring` — a `wiring` call inside a hook, or handed an argument
  that is a use case's result; an import of a sub-driver's non-wiring export.

The test tech's exemptions (`call-count`, `services-only`) apply as the reading
states them (T1).

### `boot` — `boot-one-call`

A boot's root: exactly one call, its callee a driver's `wiring`, no argument,
its result discarded, awaited or voided; no definition, no assignment, no other
statement. The import half is a `layers` cell.

### The `layers` cells

The import halves 03 § The matrix drafted, now cited: `assembly-driver-only`
(anything but a driver or an assembly importing an assembly, type imports
included); `driver-not-imported` (anything but a boot or a driver importing a
driver, types included; a test file is a driver); `boot-one-call` (a boot
importing anything but one driver; anything importing a boot); `test-is-outside`
(anything importing a test file); an assembly's runtime import of concrete tech
(`assembly-builds-only`); a driver's import of a package neither a reading
claims nor `driverTech` declares, or of a pure one (`driver-calls-services`).
`CHECK_RULES` grows accordingly.

### Atomic violations, grouped by fix

**Drafted 2026-09-26, built at checkpoint 3.** Three concerns, three owners:

- **Detection reports atomic facts.** A check emits one violation per clause a
  statement breaks, and never withholds one because another covers it. What
  checkpoints 1 and 2 folded goes back to being facts: a binding storing a red
  call's result draws its own verdict again (the four `false unknown` of
  checkpoint 1's rows 1, 2, 11, 12 come back as unknowns), and a decorator
  factory's application is a call of its own, beside the factory's call.
- **Grouping is a model, and asserted.** One fix, one group: a violation whose
  subject is the result of a call judged red rides with that call's violation —
  removing the call removes it. The call's violation leads. The rule is stated
  over every violation, not per shape: a violation says what it derives from
  (`cause`, the span of the red call its subject came out of), and the grouping
  model, pure, turns violations into groups by it. A violation with no cause
  leads its own group of one.
- **Formatting only lays out groups.** The renderer prints a group as its lead
  with its riders under it; it decides nothing about what belongs together.

**The marker grammar gains `+`**: slugs joined by `+` are one group, the first
the lead, whose verdict the marker's word states; `,` still separates groups.
`// red: stable-root + stable-root` is a red call and a violation riding with
it; `// red: stable-root, stable-root` is two groups, two fixes. The runner
matches groups, not violations: a group reported with riders the marker does not
list, or listed as separate groups, fails its row. A group whose members sit on
different lines is not expressible yet, and no row needs one.

The summary counts groups: one fix, one count (ruled 2026-09-26).

## Testing

The gate is the rows: a checkpoint is done when the rows it owns show plain
verdicts, every marker left an expected failure with the reader limit named.
Units are scaffolding (step 04's ruling): the detectors are proven by the
corpus, and unit tests exist only for what no row reaches, cut against coverage
at the end of each checkpoint. Coverage stays 100.

Falsification, not green: each checkpoint shows at handback one mutation per new
clause — the clause removed or inverted — and the rows that fail under it. A
clause no row fails without is either unrowed (add the row) or dead (delete the
clause).

Messages: each new shape is shown rendered at handback, with the way out the
row's table names; the CLI golden gains one block per new check.

## Implementation

Checkpoints, one commit each, one go each, riskiest judgments first:

1. **`stable-root`'s call clause.** The root-call shape, the stored-result rule,
   `via` from inline sites (the reader addition), the boot and registration
   exemptions. Flips the call half. The call classification every later check
   reads is proven here first, on the most rows.
2. **The reader forms the rows exposed.** A static field initializer and a
   static block run on load; a decorator is a call on class evaluation; an
   IIFE's `via` (rows 3–6b). Each is a reader addition with its row as the gate.
3. **Atomic violations, grouped by fix** (added 2026-09-26, § API). Before any
   new detector: every later check would otherwise bake its grouping into
   detection. The marker grammar, the grouping model, the renderer, and the rows
   of checkpoints 1 and 2 rewritten to state their groups.
4. **The reader facts the assembly rows need** (split out 2026-09-26): where a
   built value is used, a record argument's entries, a ternary's value as its
   arms', a map whose callback builds, a type declared at root, an assembly's
   local helper as a callee.
5. **The `assembly` check.** The tightest rule, and the one the chapter exists
   for.
6. **The `driver` check.** Where hook cutting meets the rules, and where the
   provisional rulings (D5/O2, H9, H10/H11) meet a detector: each is shown
   against its row at handback.
7. **The `boot` check and the `layers` cells.** The smallest, mostly tables.

### Checkpoint 1, built 2026-09-25

`stable-root`'s call clause, as § API drew it, with what building it taught:

- **Reader additions.** `ReadCall.registration` (a call into the runner the
  file's own reader claims — the claim now says who made it: `reader`, `tech`,
  `model`, `unclaimed`); `ReadCall.handsRunner` (every argument is that runner,
  handed on); `ReadCall.site` (the outermost tracked-local call a body was read
  from — the `via`); `definition.storedCall` (the call a binding stores, past
  `await`); `UnknownCondition` `callee`. A binding's span is its name, so
  matching the stored call by position was fragile: the reader says which call
  it is.
- **The stored-result rule, wider than drawn.** When the stored call is red, the
  binding draws no verdict at all about what it holds — an unfollowed type name
  (`: Response`, row 2), a read made on the way to the callee
  (`import.meta.resolve`) — not only an unknown result. A `let` or `var` stays
  red: reassignable is state whatever it holds.
- **The matcher exemption (T6)** is read off the call, not the body: a driver's
  wiring function called at a spec's root with every argument the runner the
  file's own reader claims — canon's "a driver whose wiring function the spec
  file calls with the tech". `main()` at a spec's root has none, and stays red
  (row 175); handed the host, `enterTmp(process)`, it is red too. The body is
  the driver check's, in its own file (§ Ruled).
- **Flipped:** the call half's 20 `missed` markers, and the `false unknown` of
  rows 1, 2, 11, 12. **Still waiting, now named:** row 3's IIFE and row 20's
  `import()` (checkpoint 2, reader forms). **New rows:** a spec calling the host
  at root (`process.chdir`, `import.meta.resolve`) is red; a spec handing the
  host to a shared driver's wiring function is red.
- **Unit tests** only where no row can reach: an unknown callee at root (the one
  such callee is an import that did not resolve, and a case refuses those), and
  every message shape.
- **Falsification:** each clause switched off in turn — tech (12 rows fail), use
  case (1), a local of a layer that may touch the tech (1), an adapter's or a
  blob's factory (2), a wiring function (2), an unclaimed package (1), the
  registration exemption (11), the boot's (11), the matcher's (1), the matcher's
  taking any tech for the runner (2), the stored-result rule (5), `via` (3). No
  clause survives unfailed.
- **Self-check:** 87 → 139 violations, unknowns 64 → 51 (stored results now
  judged by their call). About 44 of the new reds are
  `fileURLToPath(new URL(…, import.meta.url))` at a root — `node:url` and the
  host's `URL` presumed to act; the rest are specs building adapters or running
  use cases at root.

Ruled at this handback (§ Ruled): row 15, globals-mode runners, `node:url`, the
layers that may touch the tech, and the matcher exemption. Row 15 stays a
`missed red` for `stable-root`, the reader taking `.catch` for a language call.

### Checkpoint 2, built 2026-09-26

The reader forms the rows exposed, each read where it runs:

- **An immediately invoked function** is inlined like a tracked local, with no
  binding: its body's calls are root calls, the invoking call their `via`.
- **`import()`** is a call into the host's module loader, the tech; a binding
  storing it is a stored call.
- **A class's evaluation**: its decorators and its members' (one call each —
  `@Injectable()` is the factory's call, its application the same decorator),
  its static blocks, its static fields. A static field is a root binding (§
  Ruled): `readonly` judged by what it holds, a writable one reassignable like a
  `let` (form `static`). An instance field runs at construction and is not read.
- **Flipped:** rows 3 (IIFE, with its `via`), 4 (static field), 5 (static
  block), the tech decorator, and 20 (`import()`). **New rows:** a member's
  decorator; every static form (a `declare` one is a type, green); `import()`
  stored in a binding; a red call stored in a `let` or a writable static is two
  reds (§ Ruled, violations stack).
- **Coverage drove a refactor, not a row**: `import()` had its own classify-only
  guard, reachable only by an `import()` in a branch's test. A call is now
  emitted in one place, ordinary calls and `import()` alike, and the guard is
  the one realistic rows already cover.
- **A gap from checkpoint 1**: the stored-result rule's exception — a `let` or
  `var` is state whatever it holds — had no row; removing it failed nothing, so
  checkpoint 1's "no clause survives unfailed" was wrong for it. The last new
  row pins it, and the writable static with it.
- **Falsification:** each clause switched off in turn — the IIFE (1 row fails),
  `import()` (1), a class's decorator (1), a member's (1), a static block (1), a
  static field (2), a `declare` static skipped (1), a stored `import()` (1), the
  `let`/`var` exception (1), the writable static's (1).
- **Self-check:** unchanged, 139.

Still `missed`: row 15's `.catch`, the one `stable-root` limit left with a row.
Known and unrowed: a computed member key and `extends` also run on class
evaluation and are not read; a named function expression invoked on the spot
that calls itself reads its own name as a host global.

### Checkpoint 3, built 2026-09-26

Atomic violations, grouped by fix, as § API drew them:

- **Detection is atomic again.** The stored-result rule of checkpoint 1 is gone:
  a binding storing a red call's result draws its own verdict. A decorator
  factory is two calls: `@Injectable()` calls the factory, then calls its result
  on the class.
- **Every `stable-root` violation names its `subject`** (the span it is about)
  **and its `cause`**: the red call its subject is the result of — the call a
  binding stores (not a `let`, a `var` or a writable static: state whatever it
  holds, a fix of its own), or the call whose result a call calls — followed
  through a green link: `connect(url).then(…)` stored holds what came out of
  `connect()`. A call the reader could not place is not a cause: its fix is not
  removing it.
- **Reader additions.** `ReadCall.calleeCall`: the call whose result a call
  calls, the root of its member chain. And two found building, one rule: what an
  unclaimed package gives is the package's, as the same on the tech is the
  tech's, an intrinsic prototype method (`.then`) the language's. The reader
  typed an unclaimed package's call result `computed`, so calling it read as a
  language call, green — `@Injectable()`'s application, `cac("x").option(…)`.
  And a member of an unclaimed package's default import, called
  (`mongoose.connect()`), read green the same way, where the namespace import
  read red.
- **`groupByFix`** (`check/grouping.model.ts`), pure: a violation rides with the
  one whose subject its cause names; a chain leads at its root; a cause no
  violation answers leads a group of one. The runner and the CLI both group
  through it.
- **Markers.** `+` joins a group, `,` separates groups; `via` names no group. A
  rider on another line than its lead is reported as `stable-root (line 7)`,
  which no marker writes: such a row fails visibly instead of matching by
  accident.
- **The renderer** prints a group's lead, its riders under it marked `+`; the
  summary counts groups, and counts an unknown by its lead.
- **Rows now stating their groups** (`modules.spec.ts`): the `new Worker`, the
  awaited `fetch`, both tech decorators, a spec's blob function stored, the
  tagged template, `import.meta.resolve` stored, the stored `import()` — each
  `red: stable-root + stable-root`. The `let` and writable-static row keeps two
  groups. **New rows:** a method chained on an unclaimed package's call (three
  in one group); a binding holding `.then` on a red call (one group, through the
  green link); a default import's method called at root.
- **Falsification:** each clause switched off in turn — the binding's cause (6
  rows fail), the `let`/`var`/static exception to it (1), a call's cause (2),
  the grouping itself (8), the runner matching riders (11), the cause through a
  green link (1), an unclaimed package's result called (3), its prototype method
  the language's (1), a default import's member (1). The cause only when the
  call is red fails no row (an unplaced callee cannot be built from a case), and
  fails its unit.
- **Self-check:** 139 groups, unchanged: the returned bindings ride with their
  calls, 15 riders. A multi-line destructuring stored from a red call is a group
  across lines: rendered well, not markable yet.

### Checkpoint 4, built 2026-09-26

The reader facts the assembly rows need, found by dumping the reading of every
`assembly.spec.ts` row. No verdict changes here: every assembly red stays
`missed` until checkpoint 5; this checkpoint makes each row's verdict readable
off the reading, and its gate is reading-level units, one per fact, cut against
coverage when checkpoint 5's rows take over.

| Fact                                                                                                                                                                                                                                                                                                                                                                            | Today                                                                                                                   | Rows that need it                                                         |
| ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| F1. Where a built value is used: each `ResultUse` carries its span                                                                                                                                                                                                                                                                                                              | a use has no place: `limits.max` on line 11 is recorded on the call on line 10                                          | a field read on what the assembly built                                   |
| F2. A field read straight off a call is `member`                                                                                                                                                                                                                                                                                                                                | `createFsStore(cwd).root` reads `computed`                                                                              | the same row                                                              |
| F3. A built value called on is a `receiver` use: the call on it is judged as a call                                                                                                                                                                                                                                                                                             | `notes.list()` records `member`/`computed` on `createNotes`'s result; `createConfig({ cwd }).load()` records `computed` | the use-case row (a second, wrong red); both load rows (a false red)      |
| F4. A record argument carries its entries, each an `ArgValue`                                                                                                                                                                                                                                                                                                                   | `createNotes({ store: root, limits: limits.max })` collapses to `instance`                                              | the field-read row's line 11                                              |
| F5. A conditional's value is the join of its arms                                                                                                                                                                                                                                                                                                                               | `store === "memory" ? createMemoryStore() : createFsStore(cwd)` reads `computed`                                        | branch on a parameter (a false red); branch on an instance (a second red) |
| F6. A value that is a call's result carries that call (`from`), so a check reads the callee                                                                                                                                                                                                                                                                                     | `join(cwd, "notes")` handed on reads `computed`                                                                         | the pure builtin row (a false red)                                        |
| F7. `.map(callback)` on an array is a loop: a `control` over the receiver, the callback's body its arm, the callback's parameter an element of the receiver, the map's value the join of what the callback returns; the receiver proven an array by its annotation (`T[]`, `readonly T[]`, `Array<T>`, `ReadonlyArray<T>`), else the control says so and the verdict is unknown | a `language` call handed a `function`                                                                                   | the three map rows                                                        |
| F9. In an assembly file a local function is not inlined: it is a definition beside the assembly function, and its call a `local` callee                                                                                                                                                                                                                                         | inlined, both invisible                                                                                                 | the helper row                                                            |

`stable-root` reads F9's calls as it reads any local's in a layer that may touch
the tech: red, where today the inlined body is judged. Self-check effect to be
measured.

**Built as drafted**, F7 as ruled below, F8 dropped: a type is no definition
(below). Each fact switched off fails a reader unit (F1 2, F2 1, F3 2, F4 2, F5
1, F6 2, F9 1, `received` 1; F7: the loop 5, the unknown 1, the element 1, a
read in the arm counted 1, the value read after the loop 1, a destructured name
typed by its pattern 3, each array form 2). Found building: a loop's element can
hold a tech value, so a read in the arm counts toward the binding storing the
loop, and the returned record's entries are read after its value, so a loop in
one is read first. Rows: none move — the assembly check is checkpoint 5's.
Self-check unchanged, 140.

**Ruled at review (2026-09-26):**

- **Q1. A parameter no production site binds** — ruled as recommended: a
  received argument is green whatever its kind; what is passed in is judged
  where the function is called (a driver's wiring by `wiring-outside-hooks`, a
  parent assembly by this rule, a test free by design). `createRootedAssembly`
  (the load row) is called by nothing; the test-factory row's assembly is called
  by a spec only, and a test's call site binds nothing (a test hands fakes).
  Both read their parameter `unknown`, so a factory handed it would be unknown
  where the rows say green. Recommended: canon's letter, "tech values received
  as parameters" — an argument that is the function's own parameter, or a part
  of one, is _received_ (`ArgValue.received`), green whatever its kind; the kind
  still decides everything else. Alternatives: bind a test's sites when no
  production site binds (reverses the fakes ruling for test factories), or
  complete the load row's driver and let the test factory read unknown.
- **Types, all layers** — a type is no definition: canon's "a definition is any
  declaration — function, class, variable, type" loses "type"
  (`docs/architecture.md`). A local type only names what an inline annotation
  writes, so banning one bans typing; an exported one travels only where the
  import rules let it — the outside targets types included, `import type` exempt
  where a contract must cross, the service DAG over every import kind. The
  assembly type row (02 A15) re-ruled green; F8 dropped, nothing reads it.
- **F7, unproven** — ruled B: `.map(callback)` on what the reader cannot prove
  an array reads unknown, in any file; the name only withholds a verdict, never
  grants one.
- **Q2. `request.headers.get("x-token")` read as a language call** — the symptom
  of a wider flaw, fixed before this checkpoint (§ A call on a tech value,
  below): the line reads a tech call now, and the message says so.

### A call on a tech value, fixed 2026-09-26

Found drafting checkpoint 4: the reader took a call on a tech value for the
language's when its name was an intrinsic prototype method's (`get`, `push`,
`then`, `slice`). The name cannot tell a string's `.trim()` from a server's
`.get()`: an Express `server.get(path, handler)` in a wiring function read as a
language call, its handler inlined into the wiring function instead of cut as a
hook (where `server.post` was cut); `window.dataLayer.push(…)` at root read
green.

- **Ruled:** a call on a tech value, or on what an unclaimed package gave, is
  the tech's or the package's, whatever its name. Classification follows what
  the reader proved the receiver to be, never the method's name; a call on a
  literal or an operator's result stays the language's. Canon's escape hatch
  stays the only one: the tech's reading declaring a call effect-free.
- **Consequences:** `process.argv.slice(2)` stored at root reads as a call into
  the host until a Node reading declares `argv` an array — confessed
  (`export const ARGS = process.argv.slice(2)`: `false red` on the call's group,
  `missed red` on the read of the machine); `.map(cb)` on it reads unknown since
  checkpoint 4 (F7); `connect().then(…)` stored is three members of one group.
  The name-based set is gone from the reader.
- **Rows:** new, the `get` route (`driver.spec.ts`, green, a gate for the driver
  check: nothing reports it today, the reader fixture pins the hook), the data
  layer push at root, and a binding through a language call on a local's result
  (the green link the `.then` row used to pin); re-stamp, the `.then` row.
  Falsification: the host global's call (1 row), a tech value's (reader units),
  an unclaimed package's (1 row).
- **Self-check:** 140, one new: `bin.ts`'s `process.argv.slice(2)` at root, a
  line already red.

### Checkpoint 5, built 2026-09-25

The `assembly` check, as § API drew it, over checkpoint 4's reading. New
`AssemblyViolation`, one `shape` per clause, each with the `subject` and `cause`
checkpoint 3 gave `stable-root`'s, so the grouping model groups it unchanged.

**How its violations group — ruled 2026-09-25:**

- **Grouping gains nothing.** A red call leads what its result carries, on its
  line, as checkpoint 3 built it; this check adds no grouping rule and no marker
  grammar. Grouping is for the same thing reported many times, not for two facts
  sharing a line: each is reported, each with its way out, and whoever wrote the
  line picks the fix. When one fix clears both, they both go.
- **A computed argument whose value came out of a red call rides with the call**
  — checkpoint 3's rule as is. The helper row's call line,
  `createFsStore(rootOf(cwd))`, becomes
  `red: assembly-builds-only + assembly-builds-only`: `rootOf(…)` leads, the
  argument it computed rides.
- **One fact, one clause.** A branch is the `control`'s: its `testOrigin`
  decides. A result used as a `condition` is red only where no control reports
  the branch; if building shows every condition use sits under a control, the
  clause is dropped and says so here.
- **Two facts on one line are two groups.**
  `fs.ready ? fs : createMemoryStore()` reads a field of what the assembly built
  and branches on an instance:
  `red: assembly-builds-only, assembly-builds-only`.
- **Across lines, no grammar.** The undeclared load's result handed on
  (`createNotes({ …, settings })`) is a computed argument, its own red on its
  own line, beside the load's red; declaring the load clears both (a declared
  load's result is a tech value). The load row gains that second marker.

**Rows.** Every `missed` marker of `assembly.spec.ts` flips but the `node:fs`
import (checkpoint 7's matrix cell); the helper row's call line and the load
row's second line change as above; the two map rows stay `unknown` (F7). Greens
that must stay green, the gate as much as the reds: the branch on a parameter,
the declared load (whole, by field, destructured), the blob factory, the test
factory, the pure builtin, the proven-array map, a tech call's result handed on
(only the call is red).

**Self-check:** deblob's own assemblies turn red (`main.ts`, `cases.assembly.ts`
— § Goal, not gated); the count and a breakdown by clause recorded at handback.

**Built as drafted**, the grouping as ruled, with what building it taught:

- **The `condition` clause is dropped.** The reader makes a `condition` use in a
  branch's test only, so a control always reports it.
- **Reader additions.** An argument carries where it is written
  (`ArgValue.span`): an argument's red sits on its own line, and a rider needs a
  subject. A callback's parameter is handed back by the call the callback was
  handed to (`from`), which answers for it. A record's spread is one entry,
  keyed `...`, so it is judged as passed. And one found building: a call into a
  sibling package's entry that claims service, adapter, assembly or blob read as
  a package nothing claims — the `aware` fixture's `main.ts`, a false red. It
  reads as a factory of the layer it claims now ("trust is the dependency
  model", as the import rules already read it), and binds no world: nothing here
  reads the package's function. Ruled at review (2026-09-25): a package the
  project installs is trusted — a deblob claim is the same act of faith as any
  behavior it claims, verified at home by its own `surface` check; a consumer's
  `externalLayers` patch is the user's own word, and deblob does not
  second-guess it.
- **What rides, exactly.** An argument that came out of a red or unknown call
  written in the same expression — the spans nest — and a function handed to a
  red or unknown call. Through a binding, on another statement, it stands alone
  (the load row). An unknown call leads like a red one here, where checkpoint 3
  said "a call the reader could not place is not a cause": `stable-root`'s fix
  is removing the call, this rule's fix for an unknown one is making it
  readable, and that clears what it handed back. Each unproven-map row is one
  unknown group of four: the map's call, the callback, the element, the value
  passed on. **Ruled 2026-09-25**: one limit reported four times is what
  grouping is for; making a long group a pleasant read is the formatter's
  business, not detection's.
- **A result use rides nothing.** Built with a cause, cut at falsification: no
  row reached it, and its realistic case
  (`createFsStore(resolveRoot(cwd).path)`) groups only partway — a field read
  off a call carries no `from`, so the argument would stand alone beside a group
  of two.
- **The host, found, is red** (stamped red first at review, 2026-09-25). The
  argument clause took any tech value; canon's is "tech values received as
  parameters". `createFsStore(process.env)` read green: the assembly discovering
  the platform itself, the driver's job. The reader marks a tech value whose
  root is a free name, directly or through a `const` (`ArgValue.host`); a
  declared load's result and a loop's element over a received array stay green.
  An assembly builds blind; a driver touches the platform and never builds — the
  partition is the rule.
- **An adapter returned is the adapter whole**: a field of one returned is the
  field read, one red.
- **Other specs' trees.** Two stamped rows of other checks had assemblies that
  build nothing, and gained this rule's markers: `layers.spec.ts`'s assembly
  handing a driver's function on; `modules.spec.ts`'s assembly built at root
  (the call and its binding, one group; the function returning it, one).
- **Rows.** The ten `missed` markers flipped; the branch, helper and load rows
  changed as ruled; the map rows' marker is the group of four. New, written
  after the check and stamped after it (2026-09-25), which the corpus says rows
  should not be: a function handed to a factory; a function handed to a tech
  call, riding it; a computed record spread in; an assignment at root (and
  `stable-root`'s); a field of an adapter returned. And, red first: the host
  read in place, whole, by field and through a `const`.
- **Units** only where no row reaches: an assembly with no reading, a root
  callback's local, an unknown argument no call handed back; every message shape
  in `render.model.spec.ts`. The CLI golden gains an assembly block: the
  `violating` fixture's `billing.assembly.ts` reads a method off an adapter.
- **Falsification:** each clause switched off in turn — a call building nothing
  (4 rows fail), an undeclared use case (2), a declared load green (1), an
  unknown callee (2), a received argument green (13, across four specs), entries
  judged one by one (7), a function argument (4), a function riding its call
  (3), a green call's result passed on (1), a computed argument (2), an argument
  riding its call (3), riding only within an expression (1), a result used (4),
  a tech value read (1), a branch (1), a root definition (2), a root statement
  (2), a function building nothing (3), an adapter returned (1), the adapter
  whole (1), a test caller exempting (1), the host found (1); in the reader, the
  host through a `const` (1), a callback's parameter handed back (2), the spread
  entry (1), a crossed claim (1), a crossed factory binding no world (3).
- **Self-check:** 140 → 429 groups (142 `modules`, 287 `assembly`), unknowns 51
  → 94. The two new `modules` are the new unit file's root constants. The
  assembly ones: `main.ts` 269, `cases.assembly.ts` 14, `bin.ts` 4; by clause,
  arguments 93 (10 unknown), calls 78 (31 unknown), results used 68 (38 computed
  with, 30 field reads), branches 26, definitions 13, root statements 9; 42
  riders.

## Docs

`check/README.md`: the three checks and the call clause. `cases/README.md`: the
specs whose check now exists. `explain` and the CLI help: the three check names.
The chapter PLAN's step queue: this step, then the alignment review.

## Ruled

- **A language call in a driver or an assembly** — `JSON.stringify(x)`,
  `String(x)`, `Object.keys(x)` — is red, by the letter: the Summary's driver
  "calls services, assembly, sub-driver wiring and its own tech, nothing else",
  and "every call in an assembly builds". A language call computes, and
  computing is what both rules forbid. H7's line gains a `driver-calls-services`
  marker at checkpoint 4 (ruled 2026-09-25).
- **The axis decides** (ruled 2026-09-26). deblob serves one dimension, full
  blob to strict deblob, and optimizes reading, not openness: program specifics
  live inside the boxes, the frame around them is regular. Four answers fall
  out:
  - **`node:url` and `URL` stay off the pure list.** A root
    `fileURLToPath(new URL(…))` outside an adapter is the tech leaking; the way
    out is a port. The self-check's ~44 such reds are correct.
  - **A free name is never taken for the runner.** A free `describe` is red at a
    spec's root until a reader declares it: accepting unknown globals would be
    the widest hole. The way out today is importing from the runner; a runner's
    own reader (jest's globals, vitest's config), a later step, is the other.
  - **Row 15, `main().catch(console.error)`, is red.** The boot makes one bare
    call; handling its errors is the driver's job, inside `main`.
  - **Every layer but model and service may touch the tech**, so a local
    function called at their root is red: the frame does nothing at root beyond
    its exempt calls.
- **Violations stack, never merge; one per fix** (ruled 2026-09-26). Two defects
  on one line, each with its own fix, are two violations, each with its reason
  and its way out: merged diagnostics multiply their combinations, separate ones
  stay modular, and under-reporting is the worse failure. A red call stored in a
  `let` is two reds. Calls one fix removes together are one: `@Injectable()`,
  the factory's call and its application, is one decorator.
- **A root class's static field is a root binding** (ruled 2026-09-26). It is
  made when the class is evaluated, on load: `readonly` is its `const`, a
  writable static is reassignable state whatever it holds.
- **The matcher exemption reads the call, not the body** (ruled 2026-09-26). A
  shared driver's wiring function handed only the runner is exempt at a spec's
  root; its body is judged where it is written, by the driver check. Each rule
  judges its own file, and the call's shape is regular.
