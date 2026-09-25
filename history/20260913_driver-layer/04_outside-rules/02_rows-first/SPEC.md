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

## The assembly rules — verdicts to rule (checkpoint 3)

The two assembly rules, `assembly-builds-only` and `assembly-driver-only`, one
row per clause of their canon sentences. One tree for all rows unless said:
`src/notes/notes.service.ts` (`createNotes({ store, limits })`),
`src/notes/adapters/fs-store.adapter.ts` (`createFsStore(root: string)`),
`src/notes/adapters/memory-store.adapter.ts`, `src/notes/limits.model.ts`
(`createLimits(max: number)`), and the assembly `src/notes.assembly.ts`, whose
function is
`createNotesAssembly = ({ cwd, store }: { cwd: string; store: "fs" | "memory" }) => …`.
A driver calls it, unless said. Each snippet is the assembly function's body or
the file's root; the verdict is `assembly-builds-only` unless said. Every red
names its way out: a red with none is the finding (rixo, 2026-09-25 — the rules
are strict on purpose; the risk is having made a program impossible by
accident).

| #    | snippet                                                                                                                    | verdict                                    | why (canon)                                                                                                                                                                                                                                                 | way out                                                                                                                                                                  |
| ---- | -------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| A1   | `const fs = createFsStore(cwd)`, `const limits = createLimits(10)`, `return { notes: createNotes({ store: fs, limits }) }` | green                                      | factories in order; a tech value received, a literal, instances as arguments; a model call passed on; locals hand instances along                                                                                                                           |                                                                                                                                                                          |
| A2   | `createFsStore(cwd + "/notes")`                                                                                            | red                                        | "arguments are literals, tech values received as parameters, or instances" — a computed one is none                                                                                                                                                         | a model function passed on, `createFsStore(notesDirOf(cwd))`, or the adapter takes `cwd` and knows its own directory                                                     |
| A3   | `createFsStore(cwd).root` passed to `createNotes`                                                                          | red                                        | "what the assembly builds … is passed on or returned, never … member-accessed" — a field of an instance is the assembly using what it built                                                                                                                 | pass the instance whole; its consumer reads `.root`                                                                                                                      |
| A4   | `const limits = createLimits(10)`, then `createNotes({ store: fs, max: limits.max })`                                      | red                                        | "what the assembly builds — a call's result, whatever layer it came from" — a model's included                                                                                                                                                              | pass `limits` whole; the service reads `.max`                                                                                                                            |
| A5   | `const notesStore = store === "memory" ? createMemoryStore() : createFsStore(cwd)`, `store` a CLI option passed in         | green                                      | "a branch … is wiring when what it tests is a parameter … compared to a literal … and its arms are factory calls"                                                                                                                                           |                                                                                                                                                                          |
| A6   | `const fs = createFsStore(cwd)`, then `fs.ready ? createNotes(…) : createNotes(…)`                                         | red                                        | "a condition on an instance … is a decision the map cannot show"                                                                                                                                                                                            | the decision moves into the service or adapter that owns `ready`                                                                                                         |
| A7   | `const notes = createNotes(…)`, then `notes.list()`                                                                        | red                                        | "no use-case call: a use case whose result feeds a factory is a pipeline hiding in the wiring"                                                                                                                                                              | the use case runs in a hook, or inside the service that needs its result                                                                                                 |
| A8   | `const settings = await createConfig({ cwd }).load()`, then `createFsStore(settings)`, `load` declared in `configLoads`    | green                                      | "the load, a use case the graph itself depends on … declared"; its result counts as a tech value                                                                                                                                                            |                                                                                                                                                                          |
| A9   | A8, `load` not declared                                                                                                    | red                                        | "an undeclared call is a violation whose resolution is the declaration"                                                                                                                                                                                     | declare it in `configLoads`                                                                                                                                              |
| A10  | A8 with `createFsStore(settings.root)`, or `const { root } = await …load()`                                                | green — RULED 2026-09-25 (rixo)            | "a declared load's aside"; "a tech value may be read — a field, a destructured part — and is still a tech value" (canon edited for this row: the prohibition read literally caught tech values, which it never aimed at)                                    |                                                                                                                                                                          |
| A11  | `createNotes({ store: fs, index: createLegacyIndex() })`, `createLegacyIndex` from a blob file                             | green                                      | "a blob file's when a dependency not yet extracted is built here and injected behind the port"                                                                                                                                                              |                                                                                                                                                                          |
| A12  | A1 returning `{ notes, fs }`, a driver calling it                                                                          | red                                        | "no adapter unless a test is the caller"                                                                                                                                                                                                                    | return services only; a test factory returns the adapters                                                                                                                |
| A13  | A12, only a spec file calling it                                                                                           | green                                      | "an assembly that returns adapters can only be called by tests"                                                                                                                                                                                             |                                                                                                                                                                          |
| A14  | `const LIMIT = 10` at the file's root                                                                                      | red                                        | "nothing sits at module root but imports" — `stable-root` green, a primitive: this rule's red alone                                                                                                                                                         | the literal in place, or a model export                                                                                                                                  |
| A15  | `type Deps = { cwd: string; store: "fs" \| "memory" }` at the file's root, the parameter's type                            | red — RULED 2026-09-25 (rixo)              | "a definition is any declaration — function, class, variable, type"; "nothing but assembly functions is defined". What it buys: the file that imports everything does not become where shared shapes collect — a type goes to the layer that owns the shape | the type written in place, or in model (data) or a port (contract)                                                                                                       |
| A16  | `const rootOf = (cwd: string) => cwd` beside the assembly function                                                         | red                                        | "nothing but assembly functions is defined" — it builds nothing                                                                                                                                                                                             | a model function, or inline                                                                                                                                              |
| A17  | `names.map((name) => createFsStore(name))`, `names: readonly string[]` a parameter                                         | green — RULED 2026-09-25 (rixo)            | "a loop is wiring when what it iterates is a parameter … and its arms are factory calls"; `.map` on a proven array is the language's loop, not a call on the tech value — "as long as we can track it 100%"                                                 |                                                                                                                                                                          |
| A17b | the same with `names: any`                                                                                                 | unknown — RULED 2026-09-25 (rixo)          | the receiver is not proven an array: `.map` may be anything's, a call on a tech value ("a call on one is not"); the reader cannot tell a loop from a call — "any declares nothing a reader could prove" (step 06)                                           | type `names` as an array, or the adapter takes the list: `createFsStores(names)`                                                                                         |
| A17c | the same `.map` in a `.js` assembly                                                                                        | unknown — RULED 2026-09-25 (rixo)          | as A17b: no type proves the receiver. Not stuck: a green way out exists today                                                                                                                                                                               | the adapter takes the list — `createFsStores(names)`, the plural owned by the unit that knows stores, one factory call with a tech value; JSDoc once the engine reads it |
| A18  | `const fs = await createFsStore(cwd)`, an async factory                                                                    | green — RULED 2026-09-25 (rixo)            | "awaiting a call is the call: `await` changes when its result arrives, not what it is" (canon edited for this row: await was the reader's walk rule since step 01, never canon); the factory's result passed on                                             |                                                                                                                                                                          |
| A19  | `const shared = createSharedAssembly({ cwd })`, passed on                                                                  | green                                      | "a composition unit's factory, another assembly's"                                                                                                                                                                                                          |                                                                                                                                                                          |
| A20  | `({ cwd, request }) => createAuth({ request })`, `request` the framework's handle                                          | green                                      | "a framework's context handle passed through and never called"                                                                                                                                                                                              |                                                                                                                                                                          |
| A21  | the same with `createAuth({ token: request.headers.get("x-token") })`                                                      | red                                        | "a call on one is not" a tech value; the handle is "passed through and never called"                                                                                                                                                                        | pass `request` to the adapter that reads the header                                                                                                                      |
| A22  | `import { join } from "node:path"`, `createFsStore(join(cwd, "notes"))`                                                    | red, on the import and the call            | "never concrete tech: tech values arrive as parameters"; a non-factory call                                                                                                                                                                                 | as A2; the import goes                                                                                                                                                   |
| A23  | `return { notes, search, limits }`, `limits` from `createLimits`                                                           | green                                      | "a record of services and shared model instances"                                                                                                                                                                                                           |                                                                                                                                                                          |
| A24  | `const { notes } = createSharedAssembly({ cwd })`, `notes` handed to `createSearch`                                        | red                                        | "what the assembly builds … never … member-accessed": a child assembly's record read for one service is an instance moved sideways — "Shared instances flow down, never sideways"                                                                           | the parent builds `notes` and passes it down to both                                                                                                                     |
| B1   | a driver and another assembly import `notes.assembly.ts`                                                                   | green, `assembly-driver-only`              | "imported only by drivers and other assemblies"                                                                                                                                                                                                             |                                                                                                                                                                          |
| B2   | `notes.service.ts` imports `createNotesAssembly`                                                                           | red, `assembly-driver-only`, `inward-deps` | both: the service points outward (`inward-deps`, reported today), and an assembly has no contract                                                                                                                                                           | the service types against a port or a service API                                                                                                                        |
| B3   | the same as `import type { … }`                                                                                            | red, `assembly-driver-only`                | "type imports included … `runtime-import`'s exemption does not reach it"                                                                                                                                                                                    | as B2                                                                                                                                                                    |
| B4   | a blob file imports the assembly                                                                                           | red, `assembly-driver-only`                | blob is neither driver nor assembly                                                                                                                                                                                                                         | the blob gets its instances injected, or is placed as the driver it acts as                                                                                              |
| B5   | a spec file imports the assembly                                                                                           | green                                      | a test is assembly and driver in one; a test factory is an assembly function                                                                                                                                                                                |                                                                                                                                                                          |
| B6   | `notes.assembly.ts` imports `./cli.driver.ts`                                                                              | red, `inward-deps`, `driver-not-imported`  | "never a driver": outward (`inward-deps`, reported today), and "nothing but a boot or another driver imports a driver"                                                                                                                                      | the driver imports the assembly, never the reverse                                                                                                                       |

## The driver rules — verdicts to rule (checkpoint 4)

The six driver rules, one row per clause of their canon sentences. One tree
unless said: the CLI service `src/lib/cli/cli.service.ts` (`createCli(deps)`,
use cases `check(opts)` and `status(opts)`), the assembly `src/cli.assembly.ts`
(`createCliAssembly({ cwd })`, returns `{ cli }`), the parser `cac` declared as
the driver's tech (`driverTech: ["cac"]`), and the root driver
`src/cli.driver.ts`:

```ts
export const main = () => {
  const { cli } = createCliAssembly({ cwd: process.cwd() })
  const parser = cac("notes")
  parser.command("check").action((opts) => cli.check(opts))
  parser.command("status").action((opts) => cli.status(opts))
  parser.parse(process.argv)
}
```

A hook is a function handed to a tech callee (the reader's cut). Each snippet
replaces part of that driver; the verdict names its rule. Every red names its
way out; a red with none is the finding.

| #   | snippet                                                                                                                   | verdict                                                                                          | why (canon)                                                                                                                                         | way out                                                              |
| --- | ------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------- |
| D1  | the tree as written                                                                                                       | green                                                                                            | wiring outside hooks: an assembly call, tech setup, registration; each hook one call, a tech value in, the result returned                          |                                                                      |
| D2  | `const { cli } = createCliAssembly({ cwd: process.cwd() + "/notes" })`                                                    | red, `wiring-outside-hooks`                                                                      | "Arguments are tech values, instances, literals" — a computed one is none                                                                           | the assembly takes `cwd`; the adapter knows its directory            |
| D3  | `cli.status({})` in `main`, outside any hook                                                                              | red, `wiring-outside-hooks`                                                                      | "outside its hooks, a driver only wires" — a use case is not wiring                                                                                 | the call moves into a hook                                           |
| D4  | `.action(async (opts) => (await import("./cli.assembly.ts")).createCliAssembly({ cwd: process.cwd() }).cli.check(opts))`  | green                                                                                            | "Wiring may also sit inside a hook — an assembly imported lazily on first event"; one use-case call                                                 |                                                                      |
| D5  | `const parser = cac("notes")`, a local of `main`                                                                          | green                                                                                            | a local of the wiring function is wiring, not a definition: "the only definitions … its hooks and at most one wiring function" judges the module's  |                                                                      |
| H1  | `.action((opts) => console.log(opts))`                                                                                    | red, `hook-one-call`                                                                             | "Zero calls is a violation too: a hook with no use case is logic with no home"                                                                      | a use case of the CLI service, rendering through its io port         |
| H2  | `.action(async (opts) => { await cli.check(opts); return cli.status(opts) })`                                             | red, `hook-one-call`                                                                             | "Two calls mean the sequence between them is a use case nobody owns"                                                                                | a facade use case, `checkThenStatus(opts)`, the two its subfunctions |
| H3  | `.action((opts) => { if (opts.run) return cli.check(opts) })`                                                             | red, `hook-one-call`                                                                             | "The call is unconditional"                                                                                                                         | the service decides on `opts.run`                                    |
| H4  | `.action((opts) => cli.check({ cwd: opts.cwd ?? process.cwd() }))`                                                        | red, `hook-one-call`                                                                             | "A default on the way in (`opts.cwd ?? process.cwd()`) … is translation"                                                                            | pass both unchanged, H10; the default is the service's               |
| H5  | `.action(async (opts) => { if (!(await cli.check(opts)).ok) process.exit(1) })`                                           | red, `hook-one-call`                                                                             | "a branch on the result (`if (result.ok) exit(0)`)"                                                                                                 | the use case returns the exit code, H6                               |
| H6  | `.action(async (opts) => { process.exitCode = await cli.check(opts) })`                                                   | green                                                                                            | "the result is returned, or handed whole to the tech — a tech call, tech-held state"; "the exit code is part of its result"                         |                                                                      |
| H7  | `.action(async (opts) => console.log(JSON.stringify(await cli.status(opts))))`                                            | red, `hook-one-call`                                                                             | "a transform before handing (`JSON.stringify(result)`)"                                                                                             | the service renders through its io port                              |
| H8  | `.action(async (opts) => { try { return await cli.check(opts) } catch { process.exitCode = 2 } })`                        | red, `hook-one-call`                                                                             | "an error mapped to an exit code"                                                                                                                   | the use case maps it and returns the code                            |
| H9  | `.action((opts) => cli.check(opts.files))`                                                                                | green                                                                                            | "a tech value may be read — a field, a destructured part — and is still a tech value" (edited at checkpoint 3); arguments "tech values … unchanged" |                                                                      |
| H10 | `.action((opts) => cli.check(opts, process.cwd()))`                                                                       | green                                                                                            | two tech values, each unchanged                                                                                                                     |                                                                      |
| H11 | `.action((opts) => cli.check({ ...opts, cwd: process.cwd() }))`                                                           | red, `hook-one-call`                                                                             | the two merged into one value: a translation                                                                                                        | H10                                                                  |
| C1  | `import { createFsStore } from "./lib/notes/adapters/fs-store.adapter.ts"`, `.action(() => createFsStore(process.cwd()))` | red, `driver-calls-services` on the call; `adapter-assembly-only` on the import (reported today) | "Never an adapter: an adapter call from a hook is an effect no contract covers"                                                                     | the assembly builds it, a service calls it                           |
| C2  | `import { parseOpts } from "./lib/cli/opts.model.ts"`, `.action((opts) => cli.check(parseOpts(opts)))`                    | red, `driver-calls-services` and `hook-one-call`                                                 | "Never a model: parsing and rendering are use cases of a service"; the parse is a translation around the call                                       | `check` takes `opts` and parses                                      |
| C3  | `import pc from "picocolors"`, undeclared, used in wiring                                                                 | red, `driver-calls-services`                                                                     | "an external import neither claims is a violation whose resolution is the declaration"                                                              | declare it in `driverTech`; or it is a service's concern             |
| C4  | C3 with `driverTech: ["cac", "picocolors"]`                                                                               | green                                                                                            | "what the project declares as tech"                                                                                                                 |                                                                      |
| O1  | `const parseFoo = (s: string) => s.split(",")` at the driver's root                                                       | red, `driver-hooks-only`                                                                         | "a local `parseFoo` is a model without a test"                                                                                                      | a model function, called by a service                                |
| O2  | in `main`: `const handlers = { check: (opts) => cli.check(opts) }`, `.action(handlers.check)`                             | red, `driver-hooks-only`                                                                         | "a table of lambdas a service without a contract" — a lambda not handed to the tech where it is written is not a hook                               | each hook handed to the tech in place                                |
| O3  | `export const main` and `export const registerMore = (parser) => …` in one driver                                         | red, `driver-hooks-only`                                                                         | "at most one wiring function"                                                                                                                       | the second in a sub-driver                                           |
| O4  | `export const main = (argv: string[]) => …`                                                                               | red, `driver-hooks-only`                                                                         | "a root driver's `main()`, which takes nothing and reads its tech itself"                                                                           | read `process.argv` inside                                           |
| O5  | `type Opts = { cwd: string }` in the driver                                                                               | red, `driver-hooks-only`                                                                         | a definition, A15's ruling                                                                                                                          | the type in place, or in the service's contract                      |
| O6  | `const NAME = "notes"` at the driver's root                                                                               | red, `driver-hooks-only`                                                                         | a definition beside the hooks and the wiring function (`stable-root` green)                                                                         | the literal in place                                                 |
| S1  | `src/cli/check.driver.ts` exports `registerCheckCommands(parser, cli)`, called in `main`                                  | green                                                                                            | "a driver imports another driver only to call its wiring function, during its own wiring, passing tech and instances"                               |                                                                      |
| S2  | `registerCheckCommands(parser, cli)` called inside a hook                                                                 | red, `sub-driver-wiring`                                                                         | "Calling a sub-driver from inside a hook … would let one hook chain two calls"                                                                      | call it in `main`                                                    |
| S3  | the sub-driver exports a hook too, and the root imports it                                                                | red, `sub-driver-wiring` (the import), `driver-hooks-only` (the sub-driver's second export)      | "Never a hook"; "The sub-driver exports that one wiring function and no hook"                                                                       | the root lets the sub-driver attach its hooks                        |
| S4  | `registerCheckCommands(parser, await cli.status({}))`                                                                     | red, `sub-driver-wiring` and `wiring-outside-hooks`                                              | "never data from the hexagon"; a use case outside a hook                                                                                            | pass `cli`; the sub-driver's hook calls `status`                     |
| N1  | `src/lib/cli/cli.service.ts` has `import type { main } from "../../cli.driver.ts"`                                        | red, `driver-not-imported`, `inward-deps`                                                        | "type imports included"                                                                                                                             | nothing but a boot or a driver imports a driver                      |
| N2  | a blob file imports `main`                                                                                                | red, `driver-not-imported`                                                                       | as N1                                                                                                                                               | as N1                                                                |

Doubts, ruled 2026-09-25, each as written; to revisit once the detector shows
what they give:

- **D5 and O2 together** draw the line inside `main`: a local holding tech or an
  instance is wiring; a local holding lambdas not handed to the tech is a
  definition — the canon names "a table of lambdas".
- **H9** follows from checkpoint 3's canon edit: a field of a tech value is a
  tech value, so `cli.check(opts.files)` passes it unchanged. The edit was made
  for assemblies; the paragraph it sits in defines the terms for the assembly
  and driver rules both. Green.
- **H10 vs H11**: two tech values as two arguments green, merged into one red —
  the merge is the smallest translation there is, and H10 is always available.

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

### Checkpoint 3, built 2026-09-25

The assembly table, stamped by rixo ("lgtm, stamp it"): the
`assembly-builds-only` rows in `assembly.spec.ts` (new, 22 rows, one shared
`notes` tree), the `assembly-driver-only` rows in `layers.spec.ts` (B1–B6, six
rows). Several table entries share a row where one tree says both (A3 and A4; A8
and A10; A20 and A21; A22's import and call). Every tree run under every check:
nothing fired but what the rows mark. Every marker's claimed line printed and
checked at handback — a `missed red` is silent on any line until its detector
exists.

- Reported today, marked `red`: `inward-deps` on B2, B3 and B6. B3 corrects the
  table, which listed `assembly-driver-only` alone: the type edge from a service
  to an assembly is already outward, since the type exemption covers service and
  adapter targets only.
- Everything else red is a `missed red` waiting on the assembly check, or on the
  matrix cells (A22's import, B2–B4, B6's `driver-not-imported`).
- A17b and A17c, ruled unknown, needed a marker the grammar did not have: an
  unknown the reader does not report (`missed red` is for a red, `false unknown`
  for an unknown reported wrongly; writing either as a red would state the wrong
  verdict). Added at rixo's go: `// missed unknown: <slug> -- <why>`, the
  expected failure beside `missed red` — still failing while nothing is reported
  on its line, an unexpected pass once the reader reports that unknown; unlike a
  `false unknown`, it holds back no `red`. Step 06 listed `missed unknown` as
  malformed; no row could need it then — no rule had an unknown truth before its
  check existed. Parser, matcher, four unit tests, the runner README.

Gates: 931 green, coverage 100, tsc, prettier; self-check 85 (62 unknown): the
one more is `assembly.spec.ts`'s `ROWS: readonly Row[]`, the type-name unknown
every corpus spec carries. Its tree constants are `as const` — written bare
first, they were five reds, rightly.

### Checkpoint 4, built 2026-09-25

The driver table, stamped at build. `driver.spec.ts` (new, 14 rows): hooks side
by side in one driver where each line carries its own verdict (the
`hook-one-call` reds, H1–H8 and H11, in one row; H6, H9, H10 in one).
`layers.spec.ts`: N1, N2. The parser is `cac`, declared in `driverTech`.

- Reported today, marked `red`: C1's import, `adapter-assembly-only` with
  `runtime-import` beside it (a type import would pass — the table named only
  the first); N1's `inward-deps`.
- Everything else red is a `missed red` waiting on the driver check or the
  matrix cells. Every marker's claimed line printed and checked.
- O1's helper, called in a hook, adds two reds the table did not list on that
  line: `driver-calls-services` (a local function is none of the callees
  allowed) and `hook-one-call` (a parse around the call) — the same pair as C2.

Gates: 947 green, coverage 100, tsc, prettier; self-check 86 (63 unknown): the
one more is `driver.spec.ts`'s `ROWS: readonly Row[]`, the corpus specs' shared
type-name unknown; its tree constants are `as const`.

## Docs

`cases/README.md`: the new spec files in the "one spec per check" list, and a
row may wait on a check that does not exist yet. The chapter PLAN's step queue
records the risk-first order (with this SPEC's commit).

Canon, edited 2026-09-25 (rixo) at the assembly table's A10: the prohibition on
member access, read literally, caught every call result — a declared load's
included, so `settings.root` and even `const { root } = await …load()` were red,
which it never aimed at. `docs/architecture.md` now says what it meant, in the
three sentences that carried it: the tech-value definition ("a tech value may be
read — a field, a destructured part — and is still a tech value; a call on one
is not"), `assembly-builds-only`'s Summary entry ("what the assembly builds … a
declared load's aside"), and how the checker reads it. The prohibition keeps its
reach over what the assembly builds, a child assembly's record included (A24:
reading a service out of it moves an instance sideways). At A18, one clause more
in the terms paragraph: awaiting a call is the call, wherever a rule counts or
judges calls — the reader's "wrappers vanish" walk rule (step 01) made policy on
purpose.
