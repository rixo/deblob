# The reader revealer — rows

A second CLI in the longshot, over a tech that takes no callback: it reads the
command line, the driver dispatches with a `switch`. Its reader is fully custom.
It is built to find what the reader port must offer before the port is ported or
released (rixo, 2026-10-05: the tech's whole role goes to its reader; the reader
receives the AST and says "this is a hook, its body is here", and how the driver
receives its tech).

It runs a ruling that was never exercised (rixo, 2026-09-28): deblob holds no
opinion on driver style, "whatever, as long as you can describe it to me"; a
user keeping a hand-rolled `switch` dispatch must be able to write a reader
whose cut describes it. Canon says the same (`docs/architecture.md` ~l.563): "a
technology whose hooks are not handed callbacks […] needs a reader with a cut of
its own", and `hook-one-call` ends "ruled for the stock cut; a reader with a cut
of its own says where the line sits".

This file is the rows, before any code: realistic snippets with the verdict the
revealer's reader must give. rixo rules row by row (§ Ruled, at the end); a
ruled row becomes a corpus row (`cases/`), written red first.

How to read a row: the code carries the verdict as the corpus does
(`// red: slug -- why`; no marker = green). Each row names what it rests on: an
existing corpus row (`driver.spec.ts:NNN`, in `packages/deblob/src/lib/cases/`),
a canon sentence, or **new** when nothing existing covers it. "Today" is the
verdict without the custom reader, **inferred** from the row cited unless it
says "run"; the fixture checkpoint replaces every inference by a run.

Where the rows stand: every row is a corpus row written red first — it states
the verdict the reader owes and marks what today's reading reports instead.

- Sections 1 and 2: `packages/deblob/src/lib/cases/reader-cut.spec.ts`. Run
  2026-10-05: the switch is "a branch in the wiring", each case's call "a use
  case outside any hook"; `readLine(process.argv)` is green already.
- Sections 3 to 6: `packages/deblob/src/lib/cases/reader-hand-off.spec.ts`. Run
  2026-10-05: the hand-off call is not reported today, eager or through
  `import()`; the shared log service handed down, and the tech handed that
  service at setup, raise nothing. What is red is the same as above, in the
  sub-driver and the lazy unit too.
- Rows 2.5 and 6.3, receiving:
  `packages/deblob/src/lib/cases/reader-receiving.spec.ts`.
- The tech-side `lazy` (4.5) and a computed specifier (4.2):
  `packages/deblob/src/lib/cases/reader-lazy.spec.ts`, written red first. Run
  2026-10-06: `lazy(() => import("./unit"), read, log)` in a case is read as a
  function handed to the tech, so the thunk is a hook and the case a hook with
  no use case (four reds); the unit is handed nothing, so its switch is a branch
  in the wiring. The tech calls the unit's `dispatch`: the name is the bench
  tech's convention, not ruled. A computed specifier is red today in both
  spellings, as a case that loads no driver.
- The bare adapter (5.2, 6.2) is `assembly.spec.ts`'s row already.

The cut, built 2026-10-05: every row above is green as marked, no known failure
left. The driver reader has one more optional member, `cut`
(`ports/driver-reader.port.ts`): asked on each statement, it answers where its
tech hands control — the hooks, and the expression that picks one. The reader is
`packages/deblob/src/lib/cases/argv-switch-reader.model.ts`; all it knows of
`switch` is there. The reading does the rest, the same for any reader: the tech
value the expression is read off is the hooks' event; a hook that is only a call
to a sub-driver's wiring function stays wiring; nothing is cut inside a hook. A
violation of the hook as a whole (its count of calls) is reported on its first
label, as a callback's is on its first line.

"Its tech" (row 1.7) is read off the value: a tech value says whose it is — the
package or project file a reader claims that it came from, nothing for the
host's — through a member read, a destructuring, a call on it, a hand-off, eager
or lazy. The cut takes its event only from a value its own reader claims: a
switch on what `os.platform()` returned is a branch in the wiring, in the root
and in a sub-driver handed it.

One concept, checked 2026-10-06 (the harmony check). A cut answers with hook
pointers of two forms (`HookPointer`, `reading.model.ts`): a function — its
parameters are the event; or statements picked, with the expression that picked
them — the tech value it is read off is the event. Three cuts speak it:

- the default, every reader's: a function handed to a tech is a hook
  (`cutCallbacks`);
- the switch reader: each case is statements picked on the discriminant;
- a hook-object reader (`cases/hook-object-reader.model.ts`, rows in
  `cases/reader-hook-object.spec.ts`): each method of the object a wiring
  function returns is a function pointed at — a bundler's plugin. Functions
  nest, as callbacks did; nothing is picked inside a hook, whatever cut made the
  hook (a switch on a callback's event is a branch in a hook).

The default cut is a cut like any other (`extraction/cut.model.ts`,
`cutCallbacks`): a function outside the reading, last in every reader's stack
and the core's. What made that possible is on the port: a cut is asked on every
call too, not only on statements, and may ask the reading whose a call's callee
is (`context.calleeOf`) — the one thing the callback cut needs that the syntax
does not say.

Not done: a reader saying "callbacks handed to my tech are not hooks" — the
stack is built in one place (`stackedTech`, `extraction.service.ts`), so it is a
key on the reader away, not built. A function pointed at outside a call (a
method) has no role and its event names no tech.

Receiving, built 2026-10-06. rixo: "a home-made router is a service" — the
router stays the driver's tech, and is built like a service, by the assembly,
which hands it over. Nothing is declared for it: the reader claims the router's
file, as it does when the driver builds the router itself, and a value an
assembly handed the driver is followed back, out of the assembly, to the file
whose factory built it (`extraction/trace.model.ts`). Claimed by the driver's
reader, it is that reader's tech, and whose it is travels on as any tech
value's. The base does this for every reader that claims a project file; the
revealer's reader knows nothing of it.

Followed through every way a value may leave an assembly, a row each: the
returned record, written in place or held in a local, nested, a key written
twice; another assembly's instance returned bare; a parameter passed through,
per caller; every return of a branch (they agree, or nothing is followed). The
same following serves the use-case levels (`extraction/levels.model.ts`): a use
case reached through a record held in a local is now traced to its service.

The tech-side lazy seam, built 2026-10-06 (4.5). A cut may say one more thing,
on a call into its tech: the tech loads a module and calls one of its exports
for the driver (`RelayedCall`, `extraction/cut.model.ts`: the `import()`, the
export's name, the arguments). The reader's part is `cutLazy`
(`cases/argv-switch-reader.model.ts`): a call to `lazy` whose first argument is
a function that only returns an `import()` relays a call to that module's
`dispatch`, with the rest. The reading does the rest, in words that are no
tech's: it takes the answer only for a call into the answering reader's own
tech, a literal path, and an export that is a sub-driver's wiring function; the
call then reads as that function called there by the driver. So everything a
sub-driver called is, the unit is: the hand-off stays wiring, the unit's
parameters are what was handed, its cases are hooks, a use-case call beside it
is red. Where the answer is not taken (an assembly loaded, a computed path,
another tech's `lazy`, a thunk doing more) the call reads as the call it is: a
function handed to a tech. A unit that does not export `dispatch` is handed
nothing, red in the unit; the missing export is the type checker's. Rows:
`cases/reader-lazy.spec.ts`, no known failure left.

Not followed, what an assembly may not do — red where it stands, and no one's
tech: what a call that builds nothing returns; a record spread into the returned
one. Ruled 2026-10-06 (rixo): composing assemblies by spread stays red, "that
would be carving exceptions for niche, prefer clarity". Nothing is known of a
key past a spread; one written after it is.

## The principle the rows follow

The driver rules do not change. The reader only says where they apply. The stock
cut says "a callback handed to the tech is a hook, its parameter is the event".
This reader says two things in its place:

1. **The cut.** A `switch` in a wiring function, on a value its tech returned:
   each case's body is a hook, `default` included.
2. **The event.** What `readLine` returned is the event (the stock cut's
   "callback parameter").

Everything else is the rules as they stand: one unconditional use-case call per
hook, the event handed as received with nothing read off it, the value returned
or dropped (`hook-one-call`); only wiring outside the hooks
(`wiring-outside-hooks`).

Sections 3 to 6 each hit an existing rule and started as a question; what was
ruled, and what is still open, is listed at the end.

## The setup, shared by the rows

```ts
// src/lib/argv/argv.model.ts — the tech, a project file its reader lists
export type Read = { command: string; sub: string; line: readonly string[] }
export const readLine = (argv: readonly string[]): Read => {
  const line = argv.slice(2)
  return { command: line[0] ?? "", sub: line[1] ?? "", line }
}
```

```ts
// src/apps/tool/tool.assembly.ts
export const createToolAssembly = (host: Host): Tool => createTool({ ... })
```

The config. Readers stack, as in `deblob.config.ts` today: `node()` claims
`process`, `hostDriver()` reads a driver on the host, and the tech's own reader
is a plain object entry. `tech` stays the declared list (ruled 2026-10-02). How
the reader states its cut is the revealer's outcome, not a row.

```ts
{
  name: "tool-argv",
  include: ["src/apps/tool/*.driver.ts"],
  tech: ["./src/lib/argv/argv.model.ts"],
  // + the cut and the event: the part the port lacks today
}
```

## 1. The cut — a `switch` case is a hook

**1.1 The thin driver: wiring, then a switch on what the tech read, one call per
case, the read handed whole.** Green.

```ts
import process from "node:process"
import { readLine } from "../../lib/argv/argv.model.ts"
import { createToolAssembly } from "./tool.assembly.ts"

export const main = () => {
  const tool = createToolAssembly(process)
  const read = readLine(process.argv)
  switch (read.command) {
    case "check":
      return tool.check(read)
    case "explain":
      return tool.explain(read)
    default:
      return tool.status(read)
  }
}
```

Rests on: the cut and the event, both **new**. The discriminant `read.command`
needs nothing new: the `switch (…)` expression is in the wiring, and canon
~l.440 says "in the wiring […] a tech value may be read — a field, a
destructured part — and is still a tech value".

Today: red on every case, a use-case call outside any hook
(`driver.spec.ts:115`, `:137`), and the read handed on is "a tech call's result,
stored by the wiring" (`driver.spec.ts:353`). The only way out today is
`blobDriver`.

**1.2 `default` is a hook like any case.** Green, in 1.1. **New**; it is the
router's `otherwise`.

**1.3 A case with no call, two calls, a condition, a tech call or a write beside
its one call.** Red, each as a callback hook is today (`driver.spec.ts:202`,
`:236`, `:158`).

```ts
switch (read.command) {
  case "noop":
    return // red: hook-one-call -- zero calls
  case "check":
    tool.check(read)
    return tool.report(read) // red: hook-one-call -- two calls
  case "explain":
    if (read.sub) return tool.explain(read) // red: hook-one-call -- the call is conditional
    return tool.status(read) // red: hook-one-call -- a second call
  case "view":
    console.log("viewing") // red: hook-one-call -- a log line beside the call
    return tool.view(read)
  case "fix":
    process.exitCode = 0 // red: hook-one-call -- a write beside the call
    return tool.fix(read)
}
```

**1.4 Two labels on one body are one hook.** Green. **New.**

```ts
case "-h":
case "--help":
  return tool.help(read)
```

**1.5 A case that falls through into the next body.** Red: one trigger runs two
bodies, so two calls. **New** as a shape; the why is `hook-one-call`'s.

```ts
case "check":
  tool.check(read) // red: hook-one-call -- falls through into "explain": two calls
case "explain":
  return tool.explain(read)
```

**1.6 `break` instead of `return`: the value dropped.** Green
(`driver.spec.ts:284`: the value "returned […] or dropped"). What follows the
switch is wiring, judged as wiring (`driver.spec.ts:137`):

```ts
switch (read.command) {
  case "check":
    tool.check(read)
    break
  default:
    tool.status(read)
}
process.exitCode = 0 // red: wiring-outside-hooks -- a write in the wiring
```

**1.7 A switch on a value the tech did not return.** Red, as today: the reader
cuts only a switch on its tech's value, so this one is a use-case call outside
any hook (`driver.spec.ts:115`).

```ts
switch (process.env["MODE"]) {
  case "ci":
    return tool.check(read) // red: wiring-outside-hooks -- a use case outside any hook
}
```

**1.8 The same dispatch written as an `if` chain.** Red. The reader describes
one shape (the 2026-09-28 ruling: "as long as you can describe it to me"); an
`if` chain is a second shape, for a reader that describes it.

```ts
if (read.command === "check") return tool.check(read) // red: wiring-outside-hooks -- a use case outside any hook
```

**1.9 A switch inside a case.** Red: a branch in a hook (`driver.spec.ts:158`).

```ts
case "check":
  switch (read.sub) { // red: hook-one-call -- a conditional call
    case "dag":
      return tool.checkDag(read)
  }
```

## 2. The event — handed as received

The stock rule, unchanged (`hook-one-call`: "arguments are what the event handed
the hook, as received […] nothing read off them (`opts`, never `opts.files`)").
The reader only says that the event is `readLine`'s result.

**2.1 The read handed whole is green; anything read off it is red**
(`driver.spec.ts:261`, "read off the event").

```ts
case "check":
  return tool.check(read)
case "explain":
  return tool.explain(read.line) // red: hook-one-call -- read off the event
case "view":
  return tool.view(read.line[0]) // red: hook-one-call -- read off the event
case "fix":
  return tool.fix(read.command) // red: hook-one-call -- read off the event
```

**2.2 The read destructured in the wiring.** The switch on a destructured part
is green (canon ~l.440, a tech value read in the wiring); a case handing a part
on is red, the event read in the wiring instead of in the hook
(`driver.spec.ts:353`, "read off the host, in the wiring").

```ts
const { command, line } = readLine(process.argv)
switch (command) {
  case "check":
    return tool.check(line) // red: hook-one-call -- read off the event, in the wiring
}
```

**2.3 A second argument beside the event.** As today (`driver.spec.ts:261`,
`:330`): the host handed whole is green, a host value read or a tech call's
result is red.

```ts
case "check":
  return tool.check(read, process)
case "here":
  return tool.check(read, process.cwd()) // red: hook-one-call, hook-one-call -- a call that is not the use case's, and a value that is not the event handed on
```

**2.4 A root `main` taking the read as a parameter.** Red, as today
(`driver.spec.ts:510`, "main takes nothing and reads its tech itself"). The boot
handing the driver its app stays a separate, low card (GUESSES C2).

**2.5 The tech built in the assembly and handed back to the driver.** Green,
re-ruled 2026-10-06 (was red: its methods read as use cases). The reader's claim
is unchanged — the tech's file — and what an assembly built with that file and
handed over is followed back to it: see "Receiving" below.

## 3. Splitting the dispatch across files

With a callback tech, a sub-driver's wiring function is called once,
unconditionally, during the root's wiring, and attaches its callbacks
(`sub-driver-wiring`; `driver.spec.ts:532`). The tech dispatches later.

A switch dispatches where it stands, so that composition does not carry over:
two switches called one after the other both run, and each `default` fires. The
natural spelling hands the read to the sub-driver from a case:

```ts
// tool.driver.ts
switch (read.command) {
  case "check":
    return dispatchCheck(read, tool)
  default:
    return tool.status(read)
}
```

```ts
// check.driver.ts
export const dispatchCheck = (read: Read, tool: Tool) => {
  switch (read.sub) {
    case "dag":
      return tool.checkDag(read)
    default:
      return tool.check(read)
  }
}
```

Today that case is red twice (`driver.spec.ts:630`: "wired from inside a hook;
the hook runs no use case"). Canon's reason (`sub-driver-wiring`): "calling a
sub-driver from inside a hook […] would let one hook chain two calls through one
level of indirection".

**3.1 A case whose whole body hands the read and instances to a sub-driver's
wiring function is not a hook, it is the dispatch continued.** Green above. The
reason the existing red protects still holds: one trigger still ends in exactly
one use-case call, made by a case of the sub-driver. The sub-driver file is
unchanged in kind: one wiring function taking tech and instances, no exported
hook.

**3.2 Anything beside the hand-off in that case.** Red: a use-case call beside
it is the chain canon forbids; a use-case result handed to it is "data from the
hexagon" (`driver.spec.ts:630`).

```ts
case "check":
  tool.status(read)
  return dispatchCheck(read, tool) // red: sub-driver-wiring -- a use-case call chained with a hand-off
case "explain":
  return dispatchExplain(read, await tool.status(read)) // red: sub-driver-wiring -- handed a use-case result
```

If 3.1 is refused: a switch tech has one flat switch per program and no
sub-driver, unless the tech itself composes (a table of sub-readers at setup),
which is the callback shape again.

## 4. Lazy seams — depends on 3.1

A lazy seam is 3.1's hand-off through an `import()`: the sub-driver and the
assembly it imports are loaded when its case runs. The lazy unit is an ordinary
sub-driver that builds its own app in its wiring.

```ts
// tool.driver.ts
case "view":
  return (await import("./view.driver.ts")).dispatchView(read)
```

```ts
// view.driver.ts — a lazy unit: its own assembly, so the bundler splits here
import { createViewAssembly } from "./view.assembly.ts"

export const dispatchView = (read: Read) => {
  const view = createViewAssembly()
  switch (read.sub) {
    default:
      return view.open(read)
  }
}
```

**4.1 A hand-off through a literal `import()` of a driver file.** Green. The
extraction already records a literal `import()` as a runtime edge. This is what
"a hook does not wire" leaves room for: the case is not a hook (3.1), and the
unit's wiring function wires, as any wiring function does.

**4.2 A computed specifier.** Red: `import(pathOf(read.command))`. Already
reported as unresolved by the extraction.

**4.3 A lazy `import()` of anything but a driver** (an assembly, a service) in a
case. Red, as today (`driver.spec.ts:180`, "a hook does not wire").

**4.4 A unit with a single hook.** Its switch has only `default`, as above. It
is legal and ugly. To rule: accept it, or let the reader also read "the wiring
function's last statement is the hook" for a unit with no switch.

To rule, 4.5: **who writes the `import()`.** Above, the driver does. rixo's
scope (2026-10-05) says the tech loads the unit, as frameworks load route files:
`case "view": return lazy(() => import("./view.driver.ts"), read)`, the tech
calling the unit's wiring function. Same verdicts; the reader then also says
that a thunk handed to `lazy` is a seam, not a hook (the stock cut would call it
a hook). Proposed: build both spellings in the fixture, they cost one row each.

Canon to realign once 4.1 is ruled: "a lazily loaded feature is a lazily
imported assembly" (~l.503) becomes true through its sub-driver; "a lazily
loaded feature is an assembly importing another, at startup — laziness is the
assembly's" (~l.592) goes. Run 2026-10-05: a lazy facade in an assembly is red.

## 5. Shared instances into a lazy unit — the logger

What exists: canon says "a root assembly builds what is shared and passes it
down; a group assembly next to the driver that uses it builds its own graph from
what it received" (~l.496), and a sub-driver takes "tech and instances" from its
parent. So a shared instance already travels root assembly → root driver →
sub-driver → the unit's assembly, by argument, and through a lazy hand-off the
same way.

What crosses a driver is a service (or a shared model instance), never an
adapter: "an assembly returning an adapter to a driver is red"
(`assembly.spec.ts:329`). rixo, 2026-10-05: a logger shared as a bare adapter is
the defect; it is missing a service facade. So the shared logger is a service
over its port, and no rule changes.

```ts
// tool.assembly.ts — the root builds what is shared
export const createToolAssembly = (host: Host) => {
  const log = createLog({ sink: createStderrSink(host) })
  return { tool: createTool({ log /* … */ }), log }
}
```

```ts
// tool.driver.ts
const { tool, log } = createToolAssembly(process)
// …
  case "view":
    return (await import("./view.driver.ts")).dispatchView(read, log)
```

```ts
// view.driver.ts
export const dispatchView = (read: Read, log: Log) => {
  const view = createViewAssembly(log)
  switch (read.sub) {
    default:
      return view.open(read)
  }
}
```

**5.1 A shared service handed down by argument, through the lazy hand-off, into
the unit's assembly.** Green: every step exists today for an eager sub-driver
(`assembly.spec.ts:590`, a record of services returned; `driver.spec.ts:532`,
instances passed to a sub-driver; canon ~l.461, an assembly's arguments are
"instances built or received here"). New is only the lazy hand-off (4.1).

**5.2 The same with the bare adapter.** Red, as today (`assembly.spec.ts:329`).
The way out is the facade.

**5.3 The unit calls the shared service itself, beside its use case.** Red:
`log.info("view")` in a case is a second call (`hook-one-call`); in the unit's
wiring it is a use-case call outside any hook (`wiring-outside-hooks`).

**5.4 The unit reaches for the root's instance sideways** (imports the root
driver, or a module that holds the instance). Red, as today
(`driver-not-imported`, `stable-root`).

To confirm by running, not ruled by reading: that a service received as a
parameter and handed to a unit's assembly keeps its instance binding through the
`import()`; and how the unit's service types its dependency (against the log
service's API, or against a port the log service satisfies).

No longer needed here: an exception letting an assembly return an adapter, and
the context registry (rixo, 2026-09-13, deferred to the viewer). Neither is
ruled out; the revealer does not ask for them.

## 6. A tech with a port — the tech itself needs the logger

Case: `readLine` wants to warn about an unknown flag, through the logger.

**6.1 The driver hands the tech the shared log service at setup.**
`readLine(process.argv, log)`. Expected green by the rules as they stand: the
wiring's arguments are "tech values, instances, literals"
(`wiring-outside-hooks`), and `log` is a service instance the assembly returned.
To confirm by running: the tech file is a model, and a model calling a service
handed to it was never judged (GUESSES C1: "how it is judged […] is not ruled").

**6.2 The same with the bare adapter.** Red, as 5.2.

**6.3 The assembly builds the tech and returns it.** Green, as 2.5: the way a
tech that needs a port is built — as a service, by the assembly.

**6.4 The tech takes no port: it returns what it saw, the use case logs it.**
Green today, no reader work.

## 7. Additivity

No new row. At every checkpoint: the existing corpus unchanged and green, the
self-check baseline unchanged (239 violations, 61 unknown, run 2026-10-05), and
the stock readers (cac, astro, vite, the claimed-file router) keeping the stock
cut with their configs untouched.

## Ruled

- 2026-10-06 (rixo): 2.5 and 6.3 re-ruled green. The router is the driver's
  tech, built by the assembly like a service; the base follows a handed value
  back to a claimed file — one trace, complete, no reader option, no member
  named in the config. The dispatch moved into a service is not what was meant:
  it would hide the primary use cases.
- 2026-10-05 (rixo): sections 1 and 2, the cut and the event.
- 2026-10-05 (rixo): 3.1, a case that hands off to a sub-driver is the dispatch
  continued. All of it lives in this tech's reader: the base learns nothing
  about `switch`.
- 2026-10-05 (rixo): 4.1 to 4.3, a literal `import()` of a driver in a case is
  that hand-off, lazy. "Let's try that, and see if the longshot confirms."
- 2026-10-05 (rixo): section 5, the shared logger is a service facade, not a
  bare adapter; no rule changes. Section 6 follows from it.

- 2026-10-05 (rixo): 4.4, a unit with a single hook keeps a switch with only
  `default`. One shape per reader, as for the `if` chain (1.8); "the last
  statement is the hook" stays addable later.

- 2026-10-05 (rixo): 4.5, both. The driver writes the `import()` first (its own
  checkpoint); the tech-side `lazy(() => import(…), read, …)` is then mixed in
  as one more case of the same switch, in a separate checkpoint, so its diff
  shows what it costs on top. The first is the shape to recommend; the second
  probes the port for techs that own the loading (file-routed frameworks). Two
  hand-off spellings in one reader is the bench's licence: a real project picks
  one.

## What the rows do not decide

- The port's shape: how a reader states its cut next to `tech` (a declared
  list). A reader is a plain object in the config today, so code on it is
  loadable; whether that is wanted is the revealer's verdict.
- Whether the claimed-file edge skip narrows to model or service targets.

## The verdict on the port

What a reader is, ruled 2026-10-06 (rixo): a plugin, as Rollup and Vite have
them. A reader or a flavor is a plain object from outside — a name, declarations
(`include`, `tech`, `exempts`, `blob`), and functions. It is no layer's citizen:
not an adapter, not a service, not a model; nothing regulated is instantiated in
the user's config. Its contract is a type, not a port. What it needs from deblob
comes through the `context` it is handed, made by the service that calls it,
from that service's own ports; the one place plugin functions are called (the
container) is deblob's, under every rule. The stock readers and the stock flavor
deblob ships are values, model files.

A plugin function takes one object, the context under its `context` key:
`cut: ({ node, context }) => …`, `roleOf: ({ chain }) => …`,
`claims: ({ specifier }) => …`, `classify: ({ files }) => …`. No position, so
nothing breaks by order and what a function does not use it does not name;
`this` is not used, deblob's own reading cannot follow it. Built 2026-10-06 for
every plugin function; only a cut is handed a context today, the key appears on
the others the day there is something in it.

Still to do: the container named and taken out of `extraction.service.ts`
(`stackedTech`); the reader and flavor files renamed out of `adapters/` and
`ports/`.

## Known limit, for the verdict on the port

A cut that picks statements takes its event from a value of the wiring, where
calling the tech is legal. Without types, a method called on what the tech
returned (`read.line.slice(1)`, `read.line.join(" ").toUpperCase()`) looks like
a method of an object the tech built (`argv.readLine(…)`, green on purpose), so
its result passes for the reader's tech: a driver may reshape the read and
dispatch on the result, unseen. Sized by running, 2026-10-06: only a chain of
method calls with literal arguments gets through; an operator, a template, a
ternary, a helper of the driver's own, a language function, a method handed a
callback or a computed argument is red already. The callback cut is closed (its
event is born in the hook). Ruled red (rixo, 2026-10-06), confessed as missed:
one row in `reader-cut.spec.ts`, one in `reader-hand-off.spec.ts`. Not fixed: no
shipped reader has such a cut.
