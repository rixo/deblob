# Driver readers — a driver is read only by a reader bound to its tech

Born 2026-09-28 from the sweep's builtin row: its way out, `driverTech`, turned
out to be a symptom. Today the stock plain-TypeScript reader reads every driver
with no tech of its own and files what it cannot know as tech: a concrete
import, any free name outside the language list (`reading.model.ts`, the host
global branch of `calleeOf`), whatever the project lists in `driverTech`. The
driver rules then judge against a tech nobody claimed. The knowledge that makes
the difference — what the language is, what the host is — sits hard-wired in the
reading, beside the syntax. Runs before `04/06`: the test reader rides on what
this step settles.

**Drafted 2026-09-28, ruled the same day in two rounds** (§ Ruled).

## Goal

After this step:

- **The flavor names every kind; readers and config only add.** A reader's
  binding or a config designation may give a kind to a file the flavor leaves
  blob, or agree with the flavor; a disagreement is a config error. An import
  stays judgeable by its target's name wherever the flavor has a word.
- **The flavor names test files**: `*.spec.*`, `*.test.*`, `*.e2e.*` over the
  script extensions. A file under `__tests__/` with no such name is blob.
- **Knowledge moves out of the reading into readers**, one interface per
  concern, grouped by concern in the config:
  - **language readers**: `js` (the language's globals, literals, the
    constructors whose instances mutate, `import.meta`'s location members) and
    `ts` (the standard type names, readonly and mutable). Default: both.
  - **host readers**: `node` (the builtins, `process`, `Buffer`, the timers,
    `__dirname`/`__filename`). Shipped, no default.
  - **test readers**: a binding, the tech it claims, its exemptions, its roles.
    Default: `good-enough-tests`.
  - **driver readers**: a binding, the tech it claims, its exemptions. No
    default.
- **Premises are what the project states; the verdict follows them.** A name or
  an import no reader bound to the file claims is `unclaimed`: red wherever a
  rule asks for a proof — in a driver, at any root. The host is no longer tech
  by default; `process` is tech where `node` is bound.
- **A driver or a test file no reader reads is red**: its premises do not cover
  it. Its way out is a binding. `blob-driver`, a stock driver reader bound only
  by the user, silences one on purpose: the file counts as blob and keeps the
  driver's inbound seal.
- **The stock cut ships: a callback handed to a claimed tech is a hook.** No
  open part: a reader relaxes a rule only through a role's exemption, and the
  exemption states its reason.
- **`readers` is an object of four groups**, each an array of reader instances
  built by factories. A group written replaces its defaults. `drivers` and
  `driverTech` are gone (never released).
- **Canon says so**, first.
- **It works on a tech deblob does not ship**: a fixture reader in the corpus
  reads a driver over a router package of the fixture's own, and the rows pass
  through `deblob check` like every other.

Out of scope: a reader with its own cut (§ Ruled 10); framework readers; the
test rules (`04/06_test-rules`); the adapters' own tech (`node:fs` in an
adapter, unworded); configurable flavors, a local router claimed as tech, who
brings the parser (all carded, § Ruled); the TypeScript engine itself (it
arrives as the `ts` reader's, § Ruled 11); the syntax tables (`CALL_FORMS`,
`WRAPPERS`, the type keywords), which are the parser's, not knowledge; skill and
card edits (step 07).

## API

### Canon (checkpoint 1)

`docs/architecture.md`, the passages rewritten:

- § Driver: "Lenient by default, on purpose" and "what a reading leaves uncut is
  that tech's open part" go. In their place: every callback handed to a claimed
  tech is a hook; a reader relaxes a rule only by a role's exemption with its
  reason; a driver no reader reads is red, its way out a binding.
- § Driver: "the stock plain-TypeScript reading cuts exactly that shape, the
  host's globals and the packages declared as tech being the tech" becomes: a
  driver's tech is what the readers bound to it claim; the cut is the stock one.
- § Driver: "Plain-TypeScript drivers carry the `.driver.ts` suffix" becomes:
  the kind comes from the flavor's name, or from a reader's binding over a file
  the flavor leaves blob; the kind does not make the file read.
- `driver-calls-services`: "what the project declares as tech for a technology
  no reading knows yet" becomes: an import or a name no bound reader claims is
  `unclaimed`, and red; the way out is a reader that claims it.
- Test files: "spec files by the test globs" (§ Driver), "files matched by the
  test globs" (§ Services), "Recognized by the configured test globs" (Summary)
  become: named by the flavor; a test reader reads them.
- Assembly and boot: the core reads them by the flavor's kind, no reader
  involved — stated where canon says how the checker reads each.
- **"Tech" pinned** (§ Terminology or the head of § The outside): (1) what a
  driver listens to, and what a reader claims; (2) a tech value, what the tech
  hands the program. The third use, "a file whose layer may touch the tech"
  (Summary, `stable-root`), gets its own words.
- The Summary's driver bullets follow.

"reading" (canon's word) and "reader" (the checker's): canon keeps "reading" for
the concept where it already says so, and names the reader where it speaks of
binding. No global rename.

### Recognition

A file's kind, in order: the flavor's name; else a driver or test reader's
binding (the group gives the kind), or a config designation (`assembly`,
`boot`); else blob. The config fails, the file and both claims named, as
`designation-conflict` does today, when:

- a binding or a designation matches a file the flavor names differently;
- readers of two groups bind one file (a driver reader and a test reader).

### Config

```ts
readers?: {
  language?: readonly LanguageReader[]
  host?: readonly HostReader[]
  test?: readonly TestReader[]
  driver?: readonly DriverReader[]
}
```

- **An entry** is a reader instance: a stock reader's factory called (`node()`,
  `goodEnoughTests()`, `blobDriver({ include: ["src/legacy/**"] })`) or an
  inline object of the group's interface. The config is TypeScript; each group
  is typed by its interface.
- **Every reader binds by `include` and `exclude` globs**, stock and user alike,
  every group included. A factory takes them as options over its default
  binding: `js`, `ts` and `node` default to every file, `goodEnoughTests` to
  every file the flavor names a test, `blobDriver` to none. So a `cac` reader
  binds the CLI's driver and leaves a library's driver to a reader of its own,
  and `node` can be bound to a backend beside a browser front.
- **Defaults**: `language: [js(), ts()]`, `host: []`,
  `test: [goodEnoughTests()]`, `driver: []`. A group written replaces its
  defaults whole: `test: [vitest()]` drops `good-enough-tests`, and keeping it
  is written out (`[vitest(), goodEnoughTests()]`).
- **Stacking**: a file is read by every reader of its group whose binding
  matches it; claims are their union. Where two disagree on a role, the first
  written wins — the cheap partial override of a stock reader.
- **Names are labels**, for messages, never identities: two instances of one
  factory, each bound to its own files, are legal. Messages name the reader with
  its binding.
- **Removed**: `drivers`, `driverTech`, and the record form of `readers`. The
  unknown-key error already fails the first two loud.

### Readers

One port per group; each carries what the reading asks of that concern today,
nothing more:

- **Language reader**: what a free name of the language is (a computation, a
  literal), which constructors make mutable instances, which type names are
  readonly or mutable.
- **Host reader**: the builtins and free names that are the host's; a claim
  makes them tech, in any kind.
- **Driver reader**: a binding, the packages it claims as its tech, its
  exemptions. The stock cut applies; a reader's own cut is added with the first
  case that needs it (§ Ruled 10).
- **Test reader**: the driver reader's parts and its roles — `roleOf`, the test
  vocabulary (group, behavior, verification, setup, teardown, mock). A driver
  reader has no roles.

Every interface starts with the binding (`include`, `exclude`). Stock: `js`,
`ts` (language); `node` (host); `goodEnoughTests` (test); `blobDriver` (driver),
bound only by the user. `plain-ts` is removed: it claims nothing, and its one
effect — a reader for assembly and boot — becomes the core's. The factories are
exported from the package for the config to import (the entry is chosen at
checkpoint 4, with the `surface` check's reading of it).

### Verdicts

| The file                                                 | Verdict                                                     |
| -------------------------------------------------------- | ----------------------------------------------------------- |
| driver: imports or calls what a bound reader claims      | as the driver rules say                                     |
| driver: imports or calls what no bound reader claims     | red, `driver-calls-services`, a package or a name unclaimed |
| any root: calls an import or a free name nothing claims  | red, `stable-root`, reaches unclaimed                       |
| driver or test file no reader reads                      | red, `driver-reader`; way out: bind a reader                |
| a bound reader's cut misses a shape                      | unknown, a better reader would place it                     |
| driver bound to `blob-driver`                            | blob; imported only as a driver                             |
| a named file under a binding of another kind; two groups | config error, exit 2                                        |

### Ruled 2026-09-28

First round:

1. **`unclaimed` at a service's root is red** (`stable-root`'s cell). The reader
   has the tree; an import nothing claims is not tech by definition, so a call
   on it at root is the ordinary root call ([unknown is reader deficiency
   only]).
2. **No default reads the driver kind**; a project names its driver readers in
   `readers`. Shipped readers are fine; defaulted ones are not. Config-less
   standard stacks (CLI flags) are carded. _Amended by 8: a driver no reader
   reads was unknown here; it is red._
3. **Deblob's own CLI rewrite moves whole into `06_cli-restructure`**, its card
   realigned: a router of our own, callbacks, read by a claim-only reader. This
   step's proof is the fixture reader. Whether a project file can be claimed as
   tech (a local router) is carded on 06.
4. **The flavor names every kind; readers and config augment only** (blob files)
   or agree. Overriding the flavor would break judging an import by its target's
   name. The cost that stays: a blob-named file given a kind by a binding
   (`+page.svelte`) is not judgeable by name — frameworks keep their
   conventions, deblob keeps its own suffixes whole.
5. **The flavor names tests**: `.spec`, `.test`, `.e2e`. This reverses the move
   of test naming into the test reader's binding (canon's "recognized by their
   tech's globs"): a flavor is bundled naming opinions, and a named test file no
   reader reads can then fail loud instead of reading blob. `__tests__/`
   dropped: a `**` binding reaches test utilities that sit in qualified layers;
   an unsuffixed file there reads blob, and blob is counted in the report.
   Overriding the patterns waits for configurable flavors (carded).
6. **Knowledge out of the reading, into readers, one interface per concern**. A
   generic tool holding domain knowledge is concern mixing on deblob's side; the
   reader port exists, and a user blocked by a gap in the stock `js` can wrap
   and augment it. One generic reader type would mix concerns whose claims mean
   different things (`Math` is the language, `process` is tech). The step grows;
   accepted.
7. **The test reader stays default**; its wild assumptions on test patterns are
   carded for reassessment on `04/06`.

Second round:

8. **Unknown against red.** A verdict is unknown when a better deblob, on the
   same code and the same premises, would change it; red when only a change of
   the code or of the premises would. Premises are what the project states: the
   readers bound, their claims, `pure`. Setup that widens what deblob sees (the
   TypeScript engine, strict over loose) is not a premise. It holds on every
   unknown the code produces today — type names and forms not followed, call
   results, values not followed, an unrecognised root statement, a called
   parameter, `this`, a binding cycle, `.map` on a tech value: each flips with a
   better reader. `unclaimed` stays red: deblob never guesses a package or a
   host. A driver with no reader bound becomes red: nothing will ever bind one
   for the project (ruling 2). A bound reader whose cut misses a shape stays
   unknown. Precedent already stamped: an assembly importing a package nobody
   classified is red, its way out `pure` (`cases/layers.spec.ts`, the
   unclassified row). A broken config stays exit 2: the premises contradict
   themselves and no verdict can be given; unknown and red both fail with
   exit 1.
9. **`readers` groups by concern**: `language`, `host`, `test`, `driver`, each
   an array of instances (the config is a factory, readers are passed built).
   The group is the interface and gives the kind, so names need no prefix. A
   group written replaces its defaults — the "removing or replacing a default
   reader" idea lands here, no filter key. Names are labels: two `cac` instances
   bound to two files are legal, so no uniqueness rule. Every reader, of every
   group, binds by `include`/`exclude` over its factory's default binding: that
   is how one reader leaves a file to another.
10. **Test readers have their own interface**: roles are test vocabulary. A
    driver reader is a binding, claims and exemptions over the stock cut. Its
    own cut — a `switch` dispatch, route files, `export default { fetch }`, a
    `.svelte` file with the parser its reader brings — lands with the first case
    that needs it, as an addition to the interface; configs written before stay
    valid.
11. **The `ts` reader brings the TypeScript engine.** When the engine lands, it
    is the `ts` reader's source, and `noTsc` becomes an option of `ts()`. Who
    brings the parser — oxc as the `js`/`ts` readers', or the core's for ES
    syntax with a reader turning its format into ES — is carded.
12. **Kinds clash loud, roles stack.** Readers of two groups on one file is a
    config error, like a flavor clash. Two readers of one group on one file
    stack; the first written wins a role.
13. **The corpus binds `node` in `assembleCase`, for the transition only**,
    under a comment saying it is not the pattern and not to be copied: the rows
    are married to the node host today. It fills the `host` group where a row
    writes none, so a row that writes one replaces it like any config. A second
    assembly entry without `node` — each corpus file picks the one it applies to
    its cases — and a node subtree come with a sweep of the gate after this
    step.
14. **`driver-reader`**: a driver or a test file no reader reads is red under a
    slug of its own, stating what is expected — a driver has its reader. No
    other driver rule can be judged without a reading, so none of them names it.
    A test file is a driver in its own right (`test-is-outside`), so the slug
    covers it.

## Testing

The gate is the corpus: rows red first, stamped by rixo while red, then built
green. The corpus's shared configs (`driverTech` in `driver.spec.ts`,
`boot.spec.ts`) become `readers` entries; each row declares its driver and test
readers like a user does. The one exception is `node`, filled in by
`assembleCase` for the transition (§ Ruled 13). Rows, each realistic:

- a driver over the fixture router, the fixture reader bound: hooks cut, the
  rules as today;
- the same driver, the reader unbound: red, the message names the binding;
- an import the bound readers do not claim: red, `unclaimed`;
- `process.argv` in a driver: green with `node` bound, red without — the red
  half writes `host: []`, which replaces the group `assembleCase` fills;
- a call at a service's root on an import no reader claims: red;
- a builtin in a driver: green claimed, red not (the sweep's builtin rows, from
  `tmp/batch4-full.patch`, realigned: their way out is `node`, never
  `driverTech`);
- two test readers on one file: the union of their claims; a role disagreement,
  the first wins;
- a driver reader and a test reader on one blob file: config error;
- `blob-driver`: counted as blob, nothing inside judged, an import of it from a
  service still red;
- recognition: a blob-named file under a driver reader's binding is a driver; a
  `.service.ts` under one is a config error;
- tests: `x.e2e.ts` is a test file; `__tests__/helpers.ts` is blob; with
  `test: []`, a spec file is red.

The language and host move is a refactor: the rows green before it stay green
after it, `stable-root`'s and the reading's included.

The tripwire for the open set of techs: the fixture reader's tech is one no
stock reader knows, so a reading that special-cases the stock readers fails it.
Every core behavior has a row under the fixture reader; rows under a stock
reader prove that reader.

The two missed hook calls carded at the sweep's close (`process.cwd()` behind
`??`; a hook on an unbound parameter) are re-read here: a fix that falls out of
the claims lands with its row; one that does not stays carded. The second one's
verdict follows § Ruled 8: a parameter no caller binds flips with a better
reader, so unknown.

Completion: suite green, coverage 100, typecheck clean, each changed clause
falsified, the self-check's count reported (left red by principle).

## Implementation

Checkpoints, one go each:

1. Canon (API § Canon), docs only.
2. Rows red first, stamped.
3. Knowledge out of the reading: `js`, `ts`, `node` readers, their ports, the
   tables moved (`LANGUAGE_GLOBALS`, `LITERAL_GLOBALS`, `LOCATION_META`,
   `MUTABLE_CONSTRUCTORS` → `js`; `READONLY_TYPE_NAMES`, `MUTABLE_TYPE_NAMES` →
   `ts`; `LOCATION_GLOBALS` → `node`). No verdict changes: until checkpoint 5
   the reading applies `node` bound or not, and the host branch keeps today's
   behavior.
4. Recognition and config: the flavor names tests, augment-only kinds, the
   grouped `readers`, the factories and their package entry, the test reader's
   own interface, the removed keys, `plain-ts` gone. Deblob's own config: the
   `src/drivers/**` assembly designation stops matching `main.spec.ts` (a named
   test file under it is now a config error), and `host: [node()]` is bound; the
   rest of deblob's own layout waits for `06_cli-restructure`.
5. The reading asks the claims: the host branch out, `unclaimed` red wherever a
   rule asks a proof, an unread driver or test file red under `driver-reader`,
   the slug registered; the stock cut stated; `blobDriver`.
6. The close: READMEs of `config/`, `extraction/`, `check/` (the unknown
   criterion of § Ruled 8 where `check/` says what `unknown` carries); the PLAN.

## Docs

Canon at checkpoint 1. READMEs of `config/`, `extraction/` and `check/`, and the
ports' headers, with the code. The chapter PLAN: 04/07 closed,
`06_cli-restructure` realigned per ruling 3 (done with the SPEC), the cards of §
Ruled. The root PLAN's "Built-in knowledge" card: the language half lands here,
the engine is the `ts` reader's (§ Ruled 11), its open questions (the `pure`
key's relation, disagreement between sources) stay. `06_unknown-verdict`'s SPEC
is closed history and stays as written: its "a deblob config option" among
unknown's ways out reads, after § Ruled 8, as setup that widens sight only.
Knowledge cards and the skill wait for step 07.

[unknown is reader deficiency only]: ../../06_unknown-verdict/SPEC.md
