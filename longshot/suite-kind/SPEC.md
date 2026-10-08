# Shared test code — the suite, and the exceptions it removes

Written after the fact (2026-10-08): the direction was taken on 2026-10-07, the
build ran while rixo was away, and the read that followed widened it over a day
of talk. This file keeps the reasons for whoever integrates longshot. It is more
than the suite: giving shared test code a kind of its own let three exceptions
go, in the driver rules, in the assembly rules and in who imports a test.

## Why

deblob's own check kept eight reds it could not clear: the four adapter specs
that ran a port's shared suite. The suite lived in a service
(`fs-test-suite.service.ts`, `resolver-test-suite.service.ts`), and a service
may not import the test runner, so the runner had been made a port
(`TestingApi`, one adapter over vitest) for the spec to hand in. The port
existed only to get the runner into a file that was not allowed to import it,
and each spec stayed red twice: the runner's adapter built at its root, the
suite's `run` read as a use case called at load. rixo: "a problem we can't just
ignore".

The cause was upstream. Canon gave tests what a test needs (import anything,
define anything, register at the root) and gave shared test code none of it:
"placed by what it is", an adapter, an assembly, a model or a driver. So every
piece of shared test business was parked in a production kind, and each parking
needed an exception carved into that kind:

- the suite in a service, with the test runner as a port;
- the shared matcher in a driver, with an exemption for a driver handed nothing
  but the test runner;
- the test factory in an assembly, with "an assembly does not return adapters,
  except when called by a test", which made an assembly judged by who calls it.

Three were tried and thrown away before the suite: the suite as a driver (about
150 reds, its tests judged as a driver's hooks), as a table of sentences the
spec registers (green, refused: the suite loses its own registration), as a
plain function in a service file (green through a hole, below).

## Goal

A test file with nothing at its root may be imported by a test file. That is the
whole of it, and it follows from three sentences that hold for every kind:

1. A file whose root acts is imported by nothing. Importing a file runs its root
   as part of the importer's own load, so importing a root that acts is acting
   at one's own root with no call written there. Two kinds have such a root, the
   boot (its one call) and a test file (its registrations): they are the two
   `stable-root` exempts, and the two nothing imports.
2. Test code is outermost: only a test file imports a test file. The test runner
   never enters the program.
3. A call to a function that registers is a registration, and that function's
   body is a group's body.

A **suite** is the test file that 1 leaves importable: the sub-test, as a driver
has its sub-driver. Its name (`.suite` by default) is there so that the test
runner does not collect it; the verdicts go by the root, not by the name.

Shared test code goes where it fits (a fake is an adapter, a data builder a
model) and, when it fits no kind, in a suite: a port's suite, a matcher, a test
factory, a setup helper. A suite has the rights of the spec files that call it.
The dirt a test needs stays where only tests can reach it; that is what holds
the risk, no rule on what a test may do.

A fixture declaration (`export const test = base.extend({ … })`) gives a new
registering function back and registers nothing: a suite's root may make it. The
spec that imports the name registers its tests with it, as with the test
runner's own function: its members (`test.skip`, `test.describe`), another name
the suite exports for it (`export const it = test`), a fixture declared on
another suite's fixture. The name is followed from file to file, through a file
of any kind: it holds the test runner's function, and the files on the way
define none. A fixtures file left in blob keeps its own verdicts and gets no
line for the fixture.

The same holds for a member that, called, registers nothing and gives a
registering function back: `test.each(rows)`, `it.for(rows)`,
`test.skipIf(condition)`, `test.runIf(condition)`. A suite may export what it
gave, a spec may keep it under a name, and the call that uses it registers.
Which members are of that sort is the reader's to say (`givesRegistrar`); the
reading follows the name.

Out: reading a hook written inside an object handed to the tech; a reader per
runner that would find setup files alone. Both are confessed by rows.

## API

- `goodEnoughTests({ suites })`: the files the test reader names suites, by
  glob, `**/*.suite.*` when not written (`TestReader.suites`). A match gives the
  test kind to a file the flavor leaves blob, and makes a registration at its
  root a red. `playwright({ suites })` takes the same argument, with the same
  default. (The stock reader is to be renamed `genericTestApi`, its own step.)
- `expect.extend` is what each reader says of its own runner. The stock reader's
  runners write the shared `expect` and give nothing back: a call into the
  runner, red at a suite's root. Playwright's gives a new `expect` back and
  changes none: its reader reads it as a declaration, like `test.extend`.
- What a call into the runner gave is the runner's across files too: a name a
  file exports for it, called by a test file, is a call into the runner, and a
  registration only when the reader says the call gave a registering function.
- The stock reader's roles gain the group written as a member of the registering
  function: `test.describe`, `it.describe`, `test.suite`, `it.suite`.
- `TestReader.givesRegistrar({ chain })`, optional: whether the name, called,
  registers nothing and gives a registering function back. The stock reader
  answers yes for `each`, `for`, `skipIf` and `runIf` on a name that registers.
- The role a reader gives `test.extend` is renamed `extension` (it was
  `fixture`): the call takes what the runner gave, adds to it and gives the
  extended one back. Playwright's `expect.extend` has it too.
- A suite's wiring function re-exported by another suite is found in the file
  that declares it: the spec's call is a registration.
- A declaration that gives a registering function back registers nothing for
  `test-is-outside` too: a spec file whose root only declares a fixture is
  imported by a test file like one whose root is quiet.
- The stock reader is tested on vitest only; its doc block and the extraction
  README say so.
- A setup file or a global setup file is a test file once the reader is bound to
  it (`include`); unbound it is blob.
- Messages, new or changed:
  - a registration at a suite's root: "line N registers on import — a suite
    registers when a test file calls its wiring function, not when one imports
    it; move it inside the wiring function";
  - a call that keeps nothing of what a service or assembly export returns:
    "line N runs on import — a call to X that keeps nothing of what it returns,
    presumed to act; …";
  - `test-is-outside`, by who imports: a test file, "importing a test file
    registers its tests from here, by an import; tests to share move into a
    suite, which registers when it is called"; anything else, "only a test file
    imports test code: the test runner stays out of the program; what it shares
    moves out of it";
  - an adapter returned by an assembly no longer speaks of its caller: "… an
    assembly returns services, an adapter is born here and handed to a port;
    return services only, a test that asserts on its fakes builds them in a
    suite".
- Gone: the `TestingApi` port and its vitest adapter (`lib/test/`); the
  exemption for a driver's wiring function handed the test runner; the test
  exception in `assembly-builds-only`.

## Testing

Rows, every one read and stamped by rixo unless said:

- `lib/cases/suite.spec.ts`, new: the spec's call is a registration and what it
  hands runs in the tests; an instance built in the call's arguments is red; a
  suite's root registers nothing; nothing but a test file imports one; a suite
  calls a suite; a spec with a quiet root is imported like a suite and one whose
  root registers is not; a matcher and a test factory live in a suite; a suite's
  function that registers nothing is no registration; the reader's `suites`
  names them; a wiring function is judged like a group's body; a fixture
  declared at a suite's root and followed into the spec, with its members,
  another name for it, and a fixture declared on it in a second suite; the same
  fixture in a file with no kind, followed too, and silent when the blob file
  breaks no rule; the function `test.each(rows)` gives, exported by a suite or
  kept under a name, through `skip` and `runIf` too; a mock function made at a
  suite's root, red there and red again called at a spec's root; Playwright's
  `expect.extend` at a suite's root, a declaration by its reader; a wiring
  function re-exported by a second suite; a spec file whose root only declares a
  fixture, imported by a spec (not stamped). Confessed: the handed function
  called while registering (an unknown where the truth is red).
- `lib/cases/setup.spec.ts`, new: both setup forms with their usual content, the
  test reader bound to them. One common shape is red, an instance built at a
  setup file's root; the clean shapes carry its teardown with it.
- `lib/cases/modules.spec.ts`: the two holes of the top-level rule, now caught;
  the matcher written as a driver, flipped to red, its two inner lines re-marked
  true.
- `lib/cases/assembly.spec.ts`: an assembly returning its adapter to a spec,
  flipped to red.
- `lib/cases/driver.spec.ts`: confessed, a hook written inside an object handed
  to the tech is not read.

deblob's own check: the eight lines of the four specs are gone. Five lines are
new, all in `src/apps/serve/serve.assembly.ts`: a function with a branch and a
write, handed to an adapter inside its options, which a hole was hiding. Left
alone, a case for when serve is deblobbed.

## Implementation

- A suite is a file of layer `test` whose node carries `suite: true`; no new
  kind in the type (`extraction/graph.model.ts`,
  `extraction/recognition.model.ts`).
- A test file's export called by a test file is a callee of kind `wiring` marked
  `suite`; a function handed to it is read as a hook
  (`extraction/reading.model.ts`).
- `check/modules.model.ts`: the call is exempt only when the function it names
  registers, looked up in the graph (`subTestVerdict`); a function of a test
  file that registers is judged as a shared body, with its groups
  (`wiringBodiesOf`); at a named suite's root a registration is red.
- `check/layers.model.ts`: `test-is-outside` is not raised when a test file
  imports a test file whose root registers nothing (`registersNothingAtRoot`).
- The two holes, found on the way. A service or assembly export was taken for a
  factory whatever it did: a call that keeps nothing of what it returns is now
  red (`judgeCall`). A function inside an object or a list handed to a call was
  not read: it is read like one handed bare, except when the call is into the
  tech, where which function is a hook is the reader's cut (`functionsWithin`).
- `check/assembly.model.ts`: an exported function returning an adapter is red
  whoever calls it; a helper of the file returning one to its own file is judged
  where it is called, as before.
- deblob's own: `fs/fs.suite.ts` (`describeFs(name, make)`),
  `extraction/resolver.suite.ts` (`describeResolver(name, make)`), called by the
  four adapter specs.

Known and left: a suite that imports another unit and is called by that unit's
spec closes a cycle between the two (`no-service-cycle`), like any shared test
code; a suite shipped by a package is not tried.

## Docs

- `docs/architecture.md`: `stable-root` (the sentence on roots that act),
  `test-is-outside` (rewritten), `boot-one-call`, `sub-driver-wiring` (the
  matcher example gone), the assembly section and `assembly-builds-only` ("an
  assembly brokers the inside of the hexagon … never an adapter"), the test
  factory pattern, the layers list and the import matrix.
- `docs/implementation-guide.md`: shared test code, the `*.suite.ts` suffix,
  suites counted in coverage.
- Recipes (`history/future/recipe-book/recipes/`): `port-ships-its-suite`
  deleted, the kind says it; `harness-is-service-plus-front` shrunk to its
  technique; `spec-closes-a-service-cycle` reworded on the suite.
- Not done: the skill's cards still teach the old placements.
