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
- **Where rendering lives, answered by standpoint** (rixo, 2026-09-26). A front
  end is two things at once, and both are right. Seen from the program — the
  core, the services — the web app is a driver, a glorified CLI: its one job is
  to wire hooks and call one use case each; the rest is no. Seen from inside,
  the web app is a program of its own, with the careful architecture a program
  needs (its 42-state keyboard navigation is its party, not the core's
  concession). Fractality, in canon since the start, is the answer: to get it
  right, consider where you are standing — the answer is relative. Canon states
  the outside view here; the inside view — the layers and rules of a web app as
  a program — goes through the lens in its own chapter (the PLAN's Ideas, "the
  web app as a program").

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

## Docs

Canon is this step's deliverable. `check/README.md` where a check's clause
moves; the chapter PLAN's step queue (this step, then `04/05_sweep`,
`04/06_test-rules`).
