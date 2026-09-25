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
  unless it is a load's (a tech value);
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
3. **The `assembly` check.** The tightest rule, and the one the chapter exists
   for.
4. **The `driver` check.** Where hook cutting meets the rules, and where the
   provisional rulings (D5/O2, H9, H10/H11) meet a detector: each is shown
   against its row at handback.
5. **The `boot` check and the `layers` cells.** The smallest, mostly tables.

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
