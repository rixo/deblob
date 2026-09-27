# Lens — the outside layers are concessions, one thing each

Opened 2026-09-26 at the review of the detectors step's checkpoint 6, which it
pauses before checkpoint 7. The detectors went row by row, weighing what each
detail buys and risks; the review found the test that makes the weighing
unnecessary. This step writes it down, in canon, and re-reads everything built
so far through it.

**Drafted 2026-09-26.** Nothing below is edited until "go".

## Goal

**The rationale — the prize of this step.** Recorded as rixo gave it at the
review, to survive into canon in substance:

- **The outside layers are concessions made under duress.** A program has to
  start, events have to reach the use cases, the graph has to be built. None of
  that can live in a service without dirtying it, so it lives outside. We need
  these layers; we do not want them; we keep them as short as possible — the
  highway to the holidays, whose one quality is to be short.
- **One layer doing all three was tried.** The old assembly: the more a part
  does, the harder it is to enforce it does nothing else. So the three
  activities we need but do not like became three layers, each allowed one
  thing:
  - **boot starts the fire** — one call, to its one driver; not zero, not two;
    no export, no import but that driver;
  - **driver connects** an event to a use case — hooks, one call to a service
    per hook; nothing between the event and the call: no read, no write, no
    transform, no log, no side effect. A tech that answers by return value gets
    the call's value returned, and that is the most a hook does with it;
  - **assembly assembles** — builds, passes around, and decides what to build
    under heavy constraints (someone has to: boot is a spark, driver may only
    call a service); never looks into or touches what it built.
- **The single test.** Every question on these layers is one question: is this
  line doing its layer's one thing? Yes, or no. Convenient otherwise? No. Three
  files for one call, bureaucratic? Still no. No to everything, except one yes.
- **Why it pays.** On the deblob map, a driver's arrow to a service is all there
  is to know: one call, nothing more, nothing more allowed — no code to open, no
  question to ask. Anything more is the party, and the party is narrated by the
  tests, which start at the services. The boring layers are boring on purpose:
  that is the goal, not an observation.
- **They are not invited.** Boot, driver and assembly drive the guests to the
  party; the services are the party — polite, testable, their dependencies
  handed in through ports. A rule on the outside layers never reaches into
  service territory to be lenient there: what is not the layer's one thing is
  outlawed, and the service is where it goes, with full rights.

**After this step:**

- `docs/architecture.md` states the lens, and each of the three layers opens
  with its one thing and the benefit it concedes to; every rule of the three
  traces to that sentence.
- `hook-one-call` says what a hook does with the call's value: returns it, or
  nothing. The service gets what it needs through its ports (`process` handed
  down, not `process.exitCode` set in the hook).
- Every stamped row of `assembly.spec.ts`, `driver.spec.ts` and `boot.spec.ts`
  is re-read under the lens, and those that change are re-marked and re-stamped.
- What the rules assume about the tech is said, not left unsaid: the rules are
  generic over "a hook is a function handed to the tech"; the rows are
  Node-shaped (`process`, `console`, `cac`, `express`); a tech whose hooks are
  not handed callbacks (route files, JSX handlers, decorators) is its reading's
  to cut.
- **Where rendering lives, answered by standpoint** (ruled 2026-09-26). A web
  front end, seen from the program whose services it fires, is a driver: each
  hook calls one use case and computes nothing. Seen from inside, it is a
  program of its own, with its own architecture. The two views meet at the hook.
  What a hook may not do (read the event, render, hold view state) is not taken
  from the front end: it goes to a service, the front's own ("front service", §
  Ruled 2026-09-27), with a service's full rights. Canon states the outside view
  (`docs/architecture.md`, § The outside); the inside view, meaning which layers
  a web app has, is the PLAN's Idea "the web app as a program".

Out of scope: the test tech's rules (`04/06_test-rules`); skill and card edits
(step 07: "no piecemeal skill edits before then").

## API

The contract is canon's text, `docs/architecture.md`:

- **A paragraph before the three layers** — § Assembly, § Driver, § Boot under
  Services — stating the lens: the concession, the one thing each, the single
  test, the map reading.
- **Each section's opening** names its one thing and the benefit it concedes to;
  the rules below it keep their slugs and are reworded only where the lens
  changes a verdict. Assembly's "or it becomes the place where logic hides"
  stays: it is the lens, said of one layer before the lens was named.
- **`hook-one-call`**: "the result is returned, or handed whole to the tech — a
  tech call, tech-held state" becomes: the call's value is returned or dropped,
  never used — read, written, handed, logged. Canon's own example flips: "the
  exit code is part of its result" stays, but the service sets it through a
  port, `process` handed down unchanged (a tech value, as arguments already
  are).
- **To rule at checkpoint 1**: a `const` holding the call's value before the
  `return` (rixo leans no: a no-op, but one more thing).
- **The reading's limit, said**: one paragraph in § Driver.
- **Rendering, by standpoint**: where the lens is stated, one paragraph — from
  the program, a front end is a driver with one job; from inside, it is a
  program, whose architecture is its own chapter's.

## Testing

- **Canon traces**: at checkpoint 1's handback, a table — each sentence of the
  three sections, the one thing it serves; a sentence serving none is cut or
  becomes a question.
- **Rows**: every stamped row re-read, one table per spec — the snippet, its
  verdict today, its verdict under the lens, why. Changed rows are re-marked red
  first (the check disagreeing with the new marker) and stamped before the check
  moves. Known already: H6 (`process.exitCode = await cli.check(opts)`) and the
  `console.log(await cli.status(opts))` row turn red.
- **Gates** as ever: the rows, coverage 100, one mutation per changed clause.

## Implementation

Checkpoints, one commit each, one go each:

1. **Canon.** The lens paragraph, the three openings, `hook-one-call`'s value
   clause, the reading's limit, rendering named; the trace table. rixo reads it
   — the prize is the rationale, the rows follow from it.
2. **The rows re-read.** The tables; rulings; changed markers red first.
3. **The checks aligned** with the re-marked rows (the driver check's value
   clause first: the `assigned` and handed-to-the-tech exemptions go).
4. **Memory and the assert sweep.** The agent's memory rules that weigh merits
   where the lens decides, realigned; the unit asserts that contradict the lens,
   a table to rule. Skill and card edits noted for step 07.

Then the detectors step resumes at checkpoint 7 (the boot check, the `layers`
cells), under the lens.

### Checkpoint 1, built 2026-09-26

Canon, `docs/architecture.md`: § The outside — concessions, one thing each (new,
before § Assembly: the concession, one thing each, the single test, the map
reading, the web app by standpoint); the layer list's "one right" for driver and
boot; § Driver's opening; the reading's limit said; `hook-one-call` and its
Summary line rewritten; § Boot's "one thing".

**The trace.** Every paragraph of § Assembly, § Driver and § Boot against its
layer's one thing: all serve it but four sentences written before the lens, each
allowing a little more — ruled at review, 2026-09-26:

| Sentence                                                                                             | Ruled                                                                                                                                                                                                             | Row that flips (checkpoint 2)                 |
| ---------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------- |
| A model call "on the same terms" — `createFsStore(join(cwd, "notes"))`                               | no: "the taxista opening the house's door — our door, our policies, that's a service". A model factory builds (shared instance); a model function computes, and is not called. The flavor's word tells them apart | A22 (the pure builtin row), red               |
| The declared load: the assembly awaits a service's use case, uses its result to decide what to build | yes: "the taxista delivering the guest to the doorman, not touching the door" — the constraint assembling needs; five files for a trim is the price, three arrows with guarantees the prize                       | none                                          |
| "Wiring may also sit inside a hook — an assembly imported lazily"                                    | no: laziness is the assembly's, at startup; a hook does not wire. Event-time laziness has no home in the program; the front end's route splitting belongs to the web app as its own program                       | D4, red                                       |
| A tech value "may be read — a field", and a host call feeding the call                               | no: "opts? process? pass it down, someone qualified will handle it". A hook hands the event on as received and the host whole; reading stays the wiring's and the assembly's                                      | H9 (`opts.files`), H10 (`process.cwd()`), red |

And the open point: a `const` holding the value before the `return` — "under the
lens it's no; in practice, if it's free I allow it": it is free (the reader
follows the value through the binding), so allowed, and canon says nothing of
it.

### Checkpoint 2, drafted 2026-09-26

Every stamped row of `assembly.spec.ts`, `driver.spec.ts` and `boot.spec.ts`
re-read under the canon of checkpoint 1. "A hook makes exactly one use-case
call, and nothing else": every other call in a hook is a fact of its own — a
call the driver may make elsewhere (the tech, an assembly) is `hook-one-call`'s
"a call that is not the use case's", a call it may not make at all stays
`driver-calls-services`' alone; what a branch's arms hold stays the branch's.

| Row                                                                              | Before                                 | Under the lens                                                                |
| -------------------------------------------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------- |
| H6 `process.exitCode = await cli.check(opts)`                                    | green                                  | red: the value written                                                        |
| H9 `cli.check(opts.files)`                                                       | green                                  | red: read off the event                                                       |
| H10 `cli.check(opts, process.cwd())`                                             | green                                  | red ×2: a call that is not the use case's; a value not the event handed on    |
| `{ console.log(await cli.status(opts)) }` (added at checkpoint 6, unstamped)     | green                                  | red ×2: the value handed on; a call that is not the use case's                |
| D4 `(await import(…)).createCliAssembly({ cwd: process.cwd() }).cli.check(opts)` | green                                  | red ×3: `import()`, `process.cwd()`, the assembly call — a hook does not wire |
| H1 `(opts) => console.log(opts)`                                                 | red: no use case                       | + `console.log`, a call that is not the use case's                            |
| H7 `console.log(JSON.stringify(await cli.status(opts)))`                         | `driver-calls-services, hook-one-call` | + `console.log`, a call that is not the use case's                            |
| H11 `cli.check({ ...opts, cwd: process.cwd() })`                                 | red: merged                            | + `process.cwd()`, a call that is not the use case's                          |
| C1 `() => createFsStore(process.cwd())`                                          | `driver-calls-services, hook-one-call` | + `process.cwd()`, a call that is not the use case's                          |
| A22 `createFsStore(join(cwd, "notes"))`                                          | green                                  | red: a model function computing an argument                                   |

Unchanged: H4 and H8 (the calls sit in a branch's arm), H2, H3, H5, the
sub-driver and definition rows, every other assembly row, boot's rows (they
already say the lens). Markers applied red first (`missed`, pointing at
checkpoint 3); the rows' names and canon citations rewritten.

**Stamping suspended 2026-09-26, resumed 2026-09-27**: the stamp review reopened
what a hook may do with values. Ruled below — (A) — so the table stands as
re-marked. **All ten rows stamped 2026-09-27**; at C1 the wording "a call
beside" became "a call that is not the use case's" (C1's hook makes no use-case
call to be beside), swept to every row.

### Ruled 2026-09-27: a hook hands the event on, untouched — (A)

**The question.** Checkpoint 1's canon says a hook hands the event on as
received and returns the call's value, at most. Then the service it reaches has
to read the event's fields, report failures, print — it looks shaped by the
tech, and the golden gate, which starts at the services, seems to need glue per
front to reach it. The alternative, (B) "plumbing", let the hook move values
without computing: read the event or a tech value by path (`opts.files`,
`process.env.X`), call a tech function that takes no argument (`process.cwd()`),
and store or hand the result whole to the tech (`process.exitCode = …`,
`console.log(…)`); any operator, branch, merge or other call red.

**Ruling: (A), checkpoint 1's canon unchanged.** Rows 1–10 of the checkpoint 2
table stand as re-marked. rixo, 2026-09-27: "I'm ruling (A)".

**Why not (B): it has no line that traces to a why.** "Handed whole to one tech
call" admits `console.log(result)`, and with it `writeFileSync(path, result)`,
`res.send(result)`, `fetch(url, { body: result })` — any I/O. Narrowing it to
"output sinks" needs a list of which calls are sinks, per tech, reopened by
every row (`res.json`? `ws.send`? `process.stdout.write`?). The source side is
the same: "a call that takes no argument" was a line picked by feel. Every
golden case would become a negotiation. (A) is one sentence with a why: the
driver's one thing is connecting; whatever reads, writes or shapes a value is a
service's or a port's.

#### What the worked example found — input, not ruled

Only (A) is ruled. What follows is what the worked example (below) did and
learned. It is kept as input for the steps listed under "Owed by the ruling",
which rule each part in turn.

**Why the fear behind (B) dissolved: the front service.** Under both options,
something has to receive the event when its shape differs from the use case's,
or when the tech wants something done on it (`event.preventDefault()`). (B)
could not do that in the hook either — it is a second call. So both end with a
service taking the event: a **front service**.

- It is a plain service. Its parameter types are structural
  (`res: { status(code: number): Response; json(body: unknown): unknown }`); it
  imports nothing from the tech. It translates, renders, reports expected
  failures, then calls the shared service, which stays agnostic.
- It is optional. When the tech's event already matches the use case — cac's
  parsed options often do — the hook calls the shared service directly.
- It needed no convention in the example. No naming rule, no special rule on
  `.service`: the map finds it by the hook's call (the service a hook reaches is
  primary), and a driver can reach several, or one with a function per command.
- The example files it with its sub-driver (placement to rule, see "Owed"). The
  hook's signature is the front service's input shape; the two change together.
  Canon's folder axis (`docs/architecture.md`, § Services: "a service package
  files its adapters, and may file its own assembly") says nothing of drivers
  either way, and the check accepts a `.driver.ts` in a service package — import
  rights follow the layer, not the folder.

So (B) only let the hook absorb small cases, for a longer rule; the pattern is
the same under both.

**The testing consequence, as the example built it: the gate runs through the
fronts.** The example's golden gate keeps its rows at the primary services, in
the shared service's terms, and runs each row once per front. The shape is input
for `04/06_test-rules`, not ruled:

- A front is a table keyed by use case. An entry turns a row's input into what a
  user does on that front — the argv they type, the request they send, the
  clicks they make — and the front's output back into the row's terms. A missing
  key means the front declines the use case.
- Each front runs the real tech: a fresh cac with the driver's own registration
  and real parsing; a fresh express app with the driver's own middleware and
  routes, on port 0, reached by real `fetch`. The test does not invent the
  event's shape; the tech produces it. What stays to review in the front's table
  is one question: is this what a user types?
- For that, the example's drivers expose their registration — the sub-driver's
  `registerCommands(parser, cli)`, a shape canon already has. Proposed as not
  required: a driver that keeps everything in `main` would still be valid, its
  hooks showing untested, a visible cost, not a violation. `main` shrinks to the
  assembly call, the tech, the registration, the parse or listen — the one piece
  no gate traverses, like the boot.
- The identity front — the shared service called straight — runs every row, and
  gives the coverage of the shared logic. A use case no other front reaches is
  dead. A row that passes on identity and fails on a front, or the reverse,
  shows logic that belongs to the core living in a front service.
- Front-owned rows hold what only one front has: authorization, exact output
  text, `defaultPrevented`. They also close the output inverse: the agnostic
  rows check meaning; mapping a front's output back to the row's terms is lossy
  by design (a CLI line's pin marker, a JSON body's ids), and the exact
  rendering is the front-owned rows' job.

Glue sits in every approach — the marker DSL is glue too. What changes is how
much of it there is, and whether the tech sits inside it: here each front's glue
is one table, and the tech checks it against the driver's declarations (a driver
declaring `--pinned-only` while the table types `--pinned` goes red).

**Read by standpoint.** The front service and its driver are the front's program
in small: argv and exit codes for the CLI, status codes and auth for the web,
form reading and view state for a UI. A front end is the same shape with a
bigger inside. What belongs to the front's program is decided by vocabulary: a
line that speaks the front's terms (DOM, argv, HTTP) is the front's; a line that
would be the same on every front is the core's, whatever file holds it. The hook
rule guards the edge of the front's program, the tech; the core's edge is a
service calling a service, guarded by the gate through the fronts. The two gates
overlap on the front service, so there is no hole at the seam between them. The
holes both share stay open: the tech's emulation (happy-dom) and `main`'s
wiring.

**Evidence: a worked example**,
`history/20260913_driver-layer/research/plumbing-2026-09-27/` (its README
carries the notes). One shared notes service (add, list, purge, async store
port), three fronts — cac, express with `express.json()` and an auth middleware,
a Svelte 5 component in happy-dom — plus the identity front; 26 tests pass, 2
skipped (the fronts' declines), under a second. The check reports 0 violations
on it under today's rules. The front services call methods on the tech's objects
(`response.status(…)`, `next()`, `event.preventDefault()`) and the reader
accepts them. Hand-picked mutations, each caught by the gate or by the check:

| Mutation                                         | Gate                     | Check |
| ------------------------------------------------ | ------------------------ | ----- |
| the driver declares `--pinned-only`              | red, the CLI's row only  | green |
| the CLI's front service reads `opts.pinned`      | red, the CLI's row only  | green |
| the web's front service reads `?pinned=true`     | red, the web's row only  | green |
| the driver forgets the auth middleware           | red ×3, the web's own    | green |
| the driver forgets `express.json()`              | red ×2, the web's        | green |
| a front service drops its `catch`                | red, that front's row    | green |
| the component wires the filter to the wrong call | red, the UI's row        | —     |
| a hook drops the promise (`void cli.add(…)`)     | green: the store is fast | red   |
| a hook branches to answer 400 itself             | green                    | red   |

What the gate cannot see, the hook rule catches, and the reverse.

**What the example does not prove.** It is a toy: one entity, three use cases,
written by the agent who picked the mutations — selection, not a mutation run.
Two mutations passed both nets, both in the UI front on happy-dom, which is an
emulation, not the tech: a front service forgetting `preventDefault` (happy-dom
does not navigate; a front-owned row asserting `defaultPrevented` catches it),
and one reading `event.currentTarget` after an `await` (null in a browser, kept
by happy-dom; only a real browser catches it). The check does not read `.svelte`
files: the component's hooks are unchecked. Not exercised: a real store, a row
that needs a failing adapter (a 500, a crash), flows across use cases, rows at
scale. The shape is not new — Cockburn's test harness is a driver; Farley's
four-layer acceptance tests run one DSL through a protocol driver per channel;
Screenplay runs a task through different abilities. Being close to them is the
sanity check. What is ours: in-process, the real tech in the loop without a
process, and the untested residue bounded by the hook rule rather than by
discipline.

**Owed by the ruling**, each at its own step, each with its own go:

- Error guidance: "Report at the edge. The driver decides presentation"
  (`docs/implementation-guide.md` § 7, the skill's error-management card) — the
  front service decides; a hook cannot catch. It worked without friction in the
  example. Skill card at step 07.
- The folder axis: "…and may file its own assembly and its drivers" — to rule;
  the example files each sub-driver with its front service.
- deblob's own CLI, after checkpoint 3: `drivers/cli/main.ts` (544 lines)
  dispatches, wires and renders in the driver. Under (A), it becomes
  `lib/cli/cli.service.ts` taking argv, with an output port; the sub-driver
  exposes its registration; the gate runs through an argv front. Today
  `deblob.config.ts` files `src/drivers/**` as assembly, so the check judges
  `main.ts` as an assembly — most of the 292 assembly violations deblob reports
  on itself. The placement-debt recut, done with the finished check, as its
  first real run.
- `04/06_test-rules`: the gate's shape (`defineGate`, the fronts table, the
  declines, dead use cases, front-owned rows) is input, not ruled; where its
  files live is open (unlayered today, counted blob).
- The web app as a program (the PLAN's Ideas): the check reading `.svelte`; what
  rules hold inside a front's program; a real browser for its gate.
- Message sweep: with express missing from `driverTech`, the reader called
  `app.post` "the language" and piled misleading messages; a message naming the
  undeclared tech would have saved the detour.

**Open, not blocking:** the gate's setup (`given`) goes through the shared
service, not the fronts — defensible (setup is not under test), to decide on
purpose; the gate's assembly takes no per-row adapter yet.

### Checkpoint 3, drafted 2026-09-27

The checks catch up with the stamped rows: every `missed red` of checkpoint 2
becomes a plain `red`, and nothing else moves. What the reader gives today was
probed on the ten rows' shapes before drafting: every fact is there but one.

**The driver check, `hook-one-call`.** In a hook, outside a branch's arms:

- **Every call that is not the use case's is red**: the tech's and an assembly's
  factory alike, whatever its result does. Today a tech call is let through when
  its result feeds something (`process.cwd()` as an argument) or when it takes
  the use case's result (`console.log(result)`); both exemptions go. A call the
  driver may not make at all (the language, a model, an adapter) stays
  `driver-calls-services`' alone, as now. A sub-driver's wiring stays
  `sub-driver-wiring`'s.
- **The use case's value is returned or dropped.** Handed to anything — the tech
  included — is red; the `argument`-to-the-tech exemption goes. Written into the
  tech's state is red once, on the write (`process.exitCode = …`): the
  `assigned` exemption goes. A `const` holding it before the `return` stays free
  (ruled at checkpoint 1).
- **The use case's arguments**: the event as received, the host whole,
  instances, literals. Red: anything read off the event or the host
  (`opts.files`, `({ files }) =>`, `process.env`), and a call's result
  (`process.cwd()`), which is also red as a call — two facts, two reds (row
  H10).

**The one reader addition.** Today `opts.files` reads exactly like `opts`: a
received tech value, nothing more. The reader records the member path read off a
received parameter or the host, a destructured parameter's part included, as it
already does for an instance (`services.app`). Nothing else reads that path for
a tech value today; the wiring and the assembly keep reading tech values freely
(canon: "in the wiring and in an assembly, a tech value may be read").

**The assembly check, `assembly-builds-only`.** A call to a model function is
red, as a call that builds nothing; a model factory still builds. Today both
pass, "on the same terms".

**Messages.** Every way out that points at what the lens closed is rewritten:
the driver's "calls X beside the use case" (no use case to be beside, row C1),
"hands it whole to the tech", "pass the tech values unchanged"; the assembly's
"a model function passed on" (four messages). `check/README.md`'s driver and
assembly clauses follow.

**To rule — three new rows**, red first with the rest, stamped before the check
moves:

| Row                                         | Proposed | Why                                                                                                                     |
| ------------------------------------------- | -------- | ----------------------------------------------------------------------------------------------------------------------- |
| `({ files }) => cli.check(files)` in a hook | red      | read off the event, in the signature: the same fact as `opts.files`. Way out: `(opts) => cli.check(opts)`               |
| `(opts) => cli.check(opts, process.env)`    | red      | read off the host: canon's "the host's values handed whole (`process`, never `process.cwd()`)". Way out: hand `process` |
| `(opts) => cli.check(opts, process)`        | green    | the host whole                                                                                                          |

**Units.** A unit that fails because it pins a pre-lens verdict is updated in
this checkpoint, each listed at the handback. Units that still pass while
asserting pre-lens reasoning are checkpoint 4's sweep.

**Gates.** The rows; coverage 100; one mutation per changed clause (each
exemption put back turns its row red again). Then the worked example,
`research/plumbing-2026-09-27`, re-checked: built to (A), it must stay at 0
violations. Any new red there is either a wrong check or a wrong example, and
gets named.

**Built 2026-09-27.** The three rows stamped as drafted. Every `missed red` of
checkpoint 2 is a plain `red`. A22's marker took the rider form the helper row
already has (`red: assembly-builds-only + assembly-builds-only`): the call to
`join` leads, the argument it computed rides with it. Messages: the rewritten
way outs, plus a hook calling an assembly ("a hook does not wire; the wiring
calls it once, at startup") and a tech value read or called for. Units: the
render expectations of the rewritten messages, two new ones for the new
wordings, and one assembly unit for a forbidden import's call whose result is
handed on (the one green call left whose result is computed; only trees red
under another check reach it). Gates: coverage 100; nine mutations, each caught
by its rows (the host-whole row among them); the plumbing example stays at 0.
deblob on itself: 436 → 471 violations, all 35 new ones `assembly-builds-only`
on model calls in `src/drivers/**`, which `deblob.config.ts` files as assembly
(`06_cli-restructure`'s ground).

**Added at review, 2026-09-27:** two rows. The host read or called in the
wiring, then handed on by a hook (`const env = process.env`,
`const root = process.cwd()`): red, a verdict the argument clause implied that
no row pinned. A sub-driver handed a value the wiring computed:
`wiring-outside-hooks`, not `sub-driver-wiring`. That row also pins the explicit
null check in `useCaseAt` that an earlier draft had folded away to reach
coverage.

**Found building, ruled 2026-09-27:** the assembly row "a framework's handle
passed through is green" builds its assembly per event, in a hook
(`process.on("request", (request) => createAuthAssembly({ request }).notes.list())`).
Checkpoint 2's re-read missed it: its subject is the assembly. Ruled (a): both
hooks red, `hook-one-call`, "a hook does not wire"; the assembly half stands. An
assembly built per request is gone: the request goes to the use case (or its
front service). Canon's "a framework's context handle passed through" meets only
handles that exist at wiring time, such as a component's context at mount.
Rejected: rewriting the driver (no per-request handle exists at wiring time in
Node), reopening D4 for request-scoped assemblies.

### Checkpoint 4, built 2026-09-27

**Memory.** Two of the agent's memory rules still weighed what the lens now
decides, and were realigned. The rule on the three outside layers said a `const`
before the `return` was undecided (ruled free at checkpoint 1), stated the front
service's filing and the gate through the fronts as ruled (input only), and did
not yet say that a hook makes no call but the use case's, reads nothing off its
event, or that an assembly never calls a model function. The assembly-laundering
review routine named a driver's allowed line "translate a trigger"; under the
lens a driver connects, and translation is the front service's.

**The assert sweep.** No unit asserts a verdict the lens reversed. The ones that
did (the render expectations of the rewritten way outs) moved at checkpoint 3.
What still reads pre-lens in the units describes the reader's facts, not
verdicts: "a call on a tech-held value is the tech's", "the hook's parameter and
the host global are both tech-held", "a model call's member". Those stay: the
reader still reads them so; only the rules changed.

**Skills, for step 07** (no piecemeal skill edits before it): the hexagon card
says drivers "translate an external trigger … into calls on the hexagon's public
API". Under the lens a driver connects, and translation is a front service's.
Placed on the PLAN's `07_slugs` line, beside the error guidance already owed.

## Docs

Canon is this step's deliverable. `check/README.md` where a check's clause
moves; the chapter PLAN's step queue (this step, then `04/05_sweep`,
`04/06_test-rules`).
