# Rows first — the call half and the ten outside rules, red before any detector

Opened 2026-09-24, after step 06 (unknown verdict) closed. Step 04's Testing
already planned it ("Red first. Each check's cases are written and run red
before the check exists"); this step does that part alone, for every rule still
without a detector, and builds no detector.

**Drafted 2026-09-24.** Nothing below is built until "build".

## Goal

After this step:

- **Every canon sentence of `stable-root`'s call half has a row**: a call that
  reaches the tech, runs a use case, or goes into a local of an impure layer; a
  property read presumed free and a call not; the two exemptions by kind. Seven
  rows exist (`modules.spec.ts`, "a root call is red when…"); the table below
  adds the forms they leave open, one verdict each, ruled by rixo before a line
  is written.
- **Each of the ten outside rules has a thin first pass of rows**:
  `assembly-builds-only`, `assembly-driver-only`, `wiring-outside-hooks`,
  `hook-one-call`, `driver-calls-services`, `driver-hooks-only`,
  `sub-driver-wiring`, `driver-not-imported`, `boot-one-call`,
  `test-is-outside`. Thin: one row per clause of the rule's canon sentence where
  the verdict is not obvious, one legal tree beside it. Not coverage.
- **No detector, no reader change.** Every red the program does not report yet
  is a `// missed red:` naming what it waits for; the suite stays green on known
  failures.

Why now and not after type names (risk-first, ruled 2026-09-24): the ten rules
are call rules, and none has a row; binding depth feeds one rule and is low-risk
now that unknown is honest. The surprises of this chapter came from writing and
stamping rows, not from building (2026-09-22: stamped rows caught three reader
errors the unit tests passed). Rows are cheap to write and cheap to reject; a
detector built before its rows is the batch the 2026-09-21 ruling stopped.

Guard against the other failure, the corpus that never ships: rows only where
the canon sentence has a clause to prove, canon holes first. A rule whose rows
expose a hole in its canon sentence stops there, with the hole on the chapter
PLAN board, instead of a row inventing the policy.

Out of scope: detectors, the reader (call reading), the checks `assembly`,
`driver`, `boot` in `KNOWN_CHECKS` (the next step), cards for the nine (07),
type names (04/01, later).

## API

- **The nine slugs enter `RULE_IDS`**, canon's order, as 03 § Rule slugs set; a
  marker names a `RuleId`, so a row cannot cite an unregistered rule.
  `RULE_CARDS` maps them to `[]`, as 03 ruled: `explain` prints the canon entry
  and its URL. `rule-content.model.spec.ts`'s "every rule with at least one
  card" becomes "every rule maps; a cardless rule is one of the nine".
  Consequence, said: `explain` lists nine rules no check reports yet — the canon
  states them, the tool says so.
- **Rows live in the spec of the check that will report them**, 03 § Rule slugs:
  `assembly.spec.ts`, `driver.spec.ts`, `boot.spec.ts` (new); the import halves
  (`assembly-driver-only`, `driver-not-imported`, and `boot-one-call`'s import
  cell) in `layers.spec.ts`; the call half in `modules.spec.ts`.
  `test-is-outside` has no check in 03's table; its rows sit where the verdict
  they pin would be reported (ruled 2026-09-24, § The ten rules).
- **A row omits `checks`** and runs every known check: a red of an existing
  check the tree triggers is marked too — part of the hunt.
- **The wait is named**:
  `// missed red: <slug> -- <why>; the <check> check is not built yet` (or
  `the call shape is not built yet`, the existing wording for `stable-root`).

## The call half — forms without a row, verdicts to rule

Each snippet sits at the root of the file named. My verdict, the canon words it
rests on; rixo rules each row red / green / unknown before it is written. A tree
is legal under every other rule, so the row proves the one it cites: a time or
environment read goes in an adapter (in a model `ambient-access` is red too), an
adapter reaches another file only through its own service's `private/`
(`adapter-assembly-only`, `public-unit`).

| #   | file      | snippet                                                                                                                                    | verdict                                | why (canon)                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| --- | --------- | ------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | adapter   | `export const WORKER = new Worker("./w.js")`                                                                                               | red                                    | a `new` is a call; "a call that reaches the tech"                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 2   | adapter   | `const RES: Response = await fetch(URL)`                                                                                                   | red                                    | a tech call; `await` adds nothing                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 3   | adapter   | `const X: number = (() => { console.log("x"); return 1 })()`                                                                               | red at `console.log`                   | the body runs on load; inlining: judged where the call sits                                                                                                                                                                                                                                                                                                                                                                                                                |
| 4   | adapter   | `class Clock { static started = Date.now() }`                                                                                              | red                                    | a static field runs on load: "stores nothing read from the machine"; an adapter, `ambient-access` kept out                                                                                                                                                                                                                                                                                                                                                                 |
| 5   | adapter   | `class A { static { console.log("a") } }`                                                                                                  | red                                    | a static block runs on load: a side effect                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 6a  | model     | `@sealed class A {}`, `sealed` from a `.model.ts`                                                                                          | green — RULED 2026-09-24 (rixo)        | a decorator is a call on class evaluation, at load for a root class: a model's own function called at root, legal like row 70; its body inlined and judged where it sits (a write to a module-level registry is red there)                                                                                                                                                                                                                                                 |
| 6b  | adapter   | `@Injectable() class Repo {}`, `Injectable` from `@nestjs/common`                                                                          | red — RULED 2026-09-24 (rixo)          | a call reaching the tech at root: registration into a global registry on import, the container pattern                                                                                                                                                                                                                                                                                                                                                                     |
| 7   | adapter   | `export const f = (at = Date.now()) => at`                                                                                                 | green                                  | a default parameter runs at call time, not load; an adapter, since in a model `ambient-access` is red in a function too                                                                                                                                                                                                                                                                                                                                                    |
| 8   | model     | `const K: readonly string[] = Object.keys(DEFAULTS)`                                                                                       | green                                  | a language global, not the tech (row 121's line)                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 9   | model     | `const TOKEN: unique symbol = Symbol("token")`                                                                                             | green — RULED 2026-09-24 (rixo)        | a fresh identity per load, like any literal; no machine read; red would be an ultra-orthodox read — object literals are allowed, a symbol is no different                                                                                                                                                                                                                                                                                                                  |
| 10  | adapter   | `src/clock/adapters/system-clock.adapter.ts`: `import { nameOf } from "../private/naming.adapter.ts"` then `const N: string = nameOf("x")` | red                                    | "a local function of a file whose layer may touch the tech" — reached across files through the one legal route, a private file of its own service (`public-unit`); an adapter importing a public adapter is already `adapter-assembly-only`                                                                                                                                                                                                                                |
| 11  | spec file | `const DATA = loadFixture()` with `loadFixture` from a blob file                                                                           | red                                    | a blob's local function; a registration is the only exemption                                                                                                                                                                                                                                                                                                                                                                                                              |
| 12  | adapter   | ``const Q = sql`select 1` `` (`sql` from a tech package)                                                                                   | red                                    | a tagged template is a call                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 13  | model     | `const V: number = holder.value` (`value` a getter)                                                                                        | green                                  | "a property read is presumed free of side effects"                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 14  | adapter   | `process.emitWarning?.("x")`                                                                                                               | red                                    | an optional call is a call                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 15  | boot      | `main().catch(console.error)`                                                                                                              | red, `boot-one-call` and `stable-root` | "nothing else … called"; the exemption is the one call                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 16  | boot      | `await main()` / `void main()`                                                                                                             | green                                  | still the one call, nothing else called                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 17  | spec file | `vi.mock("./clock.adapter.ts")`                                                                                                            | green                                  | a registration into the runner                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 18  | spec file | `expect.extend({ toBeRed })`                                                                                                               | green                                  | a registration into the runner (matchers)                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 19  | spec file | `describe.each(ROWS)("$name", …)`                                                                                                          | green                                  | a registration, the call on a call's result included                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 20  | model     | `import("./heavy.model.ts")` at root, awaited or not                                                                                       | red — RULED 2026-09-24 (rixo)          | `import()` is a call into the host's module loader: "a call is presumed to have side effects", like `process.cwd()` at root; a presumption, not a proven instability — the loaded module is cached, a static import loads the same. Inside a function, green: the lazy load, the only point of the form. Ways out: a static import when needed at load, a function when needed later. Canon unchanged: the row records the reading; a clause is added if a reader stumbles |

Decorators (rows 6a, 6b) are a form the reader likely does not read yet: their
rows may land with an expected-failure marker.

## The ten rules — the clauses a first pass rows

One red and one green per clause below; snippets come with each checkpoint's
handback, as a table like the one above.

- `assembly-builds-only`: a non-factory call; a call result computed with or
  member-accessed; arguments of each legal kind (literal, tech value received,
  instance); a use-case call vs a declared load; a branch on a parameter with
  factory arms vs a branch on an instance's output; a statement at root beyond
  imports; returning an adapter (legal only called by a test).
- `assembly-driver-only`: a service, a model, a blob importing an assembly (type
  import included); a driver and an assembly doing so, green.
- `wiring-outside-hooks`: each verb outside the hooks (assembly call, tech
  setup, sub-driver registration) green; a computation or a use-case call there
  red.
- `hook-one-call`: zero, one, two use-case calls; a conditional call; a
  translation around the call; the result returned vs handed to the tech vs
  computed with.
- `driver-calls-services`: an adapter call, a model call from a driver, red; a
  service, assembly, sub-driver wiring, own tech call, green.
- `driver-hooks-only`: a helper function, a constant, a type beside the hooks
  and the one wiring function.
- `sub-driver-wiring`: a driver importing another for its wiring function
  (green), for a hook or hexagon data (red).
- `driver-not-imported`: a boot and a driver importing a driver, green; a
  service, an assembly, a blob, red (type import included).
- `boot-one-call`: a second import, a definition, a held value, an argument, a
  second call; anything importing a boot.
- `test-is-outside` (placement ruled 2026-09-24, rixo): its one red of its own,
  something importing a spec file, in `layers.spec.ts` with the import rows; its
  permissions as green rows in the spec of the rule they must not trigger — a
  test body with two use-case calls beside `hook-one-call` in `driver.spec.ts`,
  a spec importing blob and defining helpers in `layers.spec.ts` (the likeliest
  false reds once the driver detectors exist); shared test code judged as its
  kind in `modules.spec.ts` — a fake `helpers/fake-clock.adapter.ts` calling the
  tech at root is red under `stable-root`, only tests using it or not. The
  registration exemption already has its rows.

## Testing

The rows are the deliverable, and the gate is rixo's stamp, not green: every row
lands `UNSTAMPED`, and a row is stamped when rixo says so (the stamp convention:
the marker line removed). Green here means only that the markers parse and every
expected failure is still expected. Gates per checkpoint: suite green, coverage
100, tsc, prettier from the root; self-check count unchanged (no detector, so no
new red).

## Implementation

Checkpoints, one commit each, one go each:

1. **The call-half table ruled, its rows written** in `modules.spec.ts`.
2. **The nine slugs registered** (`RULE_IDS`, `RULE_CARDS` `[]`, the card test
   reworded), the `explain` output shown at handback.
3. **Assembly rows** (`assembly.spec.ts`, the import half in `layers.spec.ts`).
4. **Driver rows** (`driver.spec.ts`, `driver-not-imported` in
   `layers.spec.ts`).
5. **Boot and test rows.**

A canon hole found on the way stops its rule's rows and goes to the chapter PLAN
board, one line, for rixo.

### Checkpoint 1, built 2026-09-24

The table's 21 entries (6 split in two) as 19 rows in `modules.spec.ts` (17–19
one spec file, the three registrations side by side), § "a root call is red
when…", stamped by rixo at "build". Every tree run under every check: no red of
another rule appeared, so each row proves only `stable-root`. What the reader
says today:

- Green and right: 6a (a model's decorator), 7 (default parameter), 8
  (`Object.keys`), 13 (getter), 16 (awaited / voided boot call), 17–19 (spec
  registrations). Decorators parse; the reader skips them.
- A red missed, `missed red` with what it waits for: the call shape (3, 10, 14,
  15, 20, and 3's `via`), a static field (4), a static block (5), a decorator
  (6b) — the last three reader forms of their own, not the call shape.
- A red answered unknown, `false unknown` stacked above `red`: 1, 2, 11, 12 —
  the binding holds a call's result, which the reader cannot follow; canon says
  the stored result adds nothing, the red is the call's.
- Green answered unknown, `false unknown` alone: 9 (`unique symbol`, not read
  yet — same marker as the existing row).

`boot-one-call` on row 15 is not marked: the slug is registered in checkpoint 2.
Gates: 899 green, coverage 100, tsc, prettier; self-check 84 unchanged.

### Checkpoint 2, built 2026-09-24

The nine slugs in `RULE_IDS`, canon's order, a family comment each (assembly
rules, driver rules, boot rule) as the Summary heads them; `RULE_CARDS` maps
them to `[]` with the reason. `explain <slug>` prints the canon entry and the
pinned URL (`deblob explain boot-one-call`); `explain` has no rule listing, so
nothing else shows them. `CHECK_RULES` unchanged: it mirrors what detectors
cite, and none cites the nine. Tests: the card mapping names the cardless nine
exactly (a tenth cardless rule fails it); the rule count is 27. Row 15 now marks
`boot-one-call` too. Prose that said the slugs did not exist — `layers.model.ts`
comments, `check/README.md`, a `layers.model.spec.ts` title — now says the cells
are not built. The spec files touched use `it` for verb-first titles.

## Docs

`cases/README.md`: the new spec files in the "one spec per check" list, and a
row may wait on a check that does not exist yet. The chapter PLAN's step queue
records the risk-first order (with this SPEC's commit).
