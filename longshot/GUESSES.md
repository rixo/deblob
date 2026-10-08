# Longshot — the holes

Every point the rulings leave open, the default longshot took, and where it
lives in code (`// GUESS: <id>`). A ruling replaces a default here first.
Status: `taken` (in code), `parked` (not needed yet, no code depends on it).

Sources: `docs/architecture.md` (canon), `history/20260913_driver-layer/`
(`PLAN.md` = chapter PLAN, `04_outside-rules/07_driver-readers/SPEC.md` = S07),
`history/PLAN.md` (root board).

## Readers

- **R1 — Package entry for the reader factories.** (S07:161-163, chosen at cp4.)
  Default: subpath `deblob/readers`, beside `defineConfig` at `deblob`. Status:
  taken — `src/readers.ts`, `package.json` exports.
- **R2 — Who brings the parser.** (S07 ruling 11, root board.) Default: the core
  parses ES/TS with oxc; `js`/`ts` bring knowledge, not a parser. A framework
  reader that needs one (`.svelte`) is out of longshot. Status: parked.
- **R3 — `pure`: knowledge or neighbour.** (Root board, S07:357.) Default: stays
  a top-level key, a premise beside the readers. Status: parked.
- **R4 — `generic-test-api` stays the default test reader.** (S07 ruling 7,
  chapter PLAN.) Default: yes. Status: taken — `readers.assembly.ts`.
- **R5 — Where `PURE_BUILTINS` goes** (`node:path`, `node:querystring`; not in
  the cp3 move list). Default: the `node` reader, as pure builtins it claims.
  Status: taken — `node-reader.model.ts`; config folds a bound host's pure list
  into `pure`, so `node:path` is pure only where `node` is bound.
- **R6 — `__dirname`/`__filename` with `node` unbound.** (Canon presumes a
  location, S07 moves `LOCATION_GLOBALS` to `node`.) Default: follows the move —
  a location where `node` is bound, unclaimed elsewhere. Status: taken —
  `node-reader.model.ts`.
- **R7 — Ambient members of intrinsics** (`Date.now`, `Math.random`). Default:
  `js` lists them as ambient. Status: parked (no `ambient-access` detector yet).
- **R8 — Effect-free tech calls.** (Canon :1113-1116, no slot in the host
  interface.) Default: an optional list on the host reader, empty in `node`.
  Status: parked.
- **R9 — TypeScript engine** (`ts` brings it, `noTsc` option). Default: not
  built in longshot; syntax proves. Status: parked.
- **R11 — A value read of a free name nobody claims** (`x = window.y` with no
  host bound). Default: read as the tech's value, as before; only a call on it
  is `unclaimed`. So `stable-root` still reds such a read at a service's root,
  as a read of the machine. Status: taken — `reading.model.ts` `evaluate`.
- **R10 — Disagreement between knowledge sources** (reader, engine, unit).
  Default: moot without the engine. Status: parked.

## Drivers and tech

- **D1 — A driver reader's hook cut.** (S07 ruling 10: added with the first
  case.) Default: a stock driver reader claims its package names as tech and
  cuts nothing of its own — the stock cut (every callback handed to claimed tech
  is a hook). Status: parked.
- **D2 — Declared externals and uncovered files as a driver's tech.** Default:
  unclaimed, red, unless a bound reader claims them. Status: taken —
  `extraction.service.ts` `claimOf`.
- **D3 — Adapters' own tech** (`node:fs`, `process.env` in an adapter). Default:
  not judged — adapters touch anything, as today. Status: parked.
- **D4 — A reader claiming a project file as tech** (a local router). Default:
  no — a GUESS, canon never limited claims to packages. **Ruled 2026-09-29 (with
  C1): yes, and the claimed file stays judged by its own layer** — being claimed
  as tech tells the driver's reader what the driver listens to, it gives the
  file no pass. How it is judged: to find by experiment. Status: taken —
  `DriverReader.claimsFile(path)`, root-relative; a claimed module reads as a
  claimed package in the driver's reading, its edge carries `claim: "reader"`
  and skips the driver's layer cell (`extraction.service.ts`,
  `layers.model.ts`). Rows in `cases/readers.spec.ts`: claimed = green; the
  claimed file keeps its own layer's rules (root state red); unclaimed = six
  reds for one missing premise — D8's cut does not cover a project file's
  callee, and the message calls the router's `route` "the use case" (two
  findings, confessed in the row). deblob's router, a model factory, reads clean
  as its own layer. **2026-10-02:** claims became a declared list under the key
  `tech` (`./path` for a file), `claimsFile` gone (committed). The edge skip
  stays: removing it was tried and failed, no project kind is importable by a
  driver (services and adapters are assembly-only, a model is
  `driver-no-model`). **2026-10-05, where it stands:** the supported shape is
  the one built — the driver imports the claimed file and builds the tech
  itself; verified by running, `cli.driver.ts`, `commands.driver.ts` and
  `router.model.ts` carry no violation. A tech built in an assembly, or handed
  to the driver as a parameter, is not supported: the instance's origin is the
  assembly factory, not the claimed file, and the reader does not follow
  assembly bodies, so its methods read as use cases (tried, red). The base is
  not stretched to cover it (claim by origin and type-based identification were
  proposed and dropped): the way in for such a case is the reader's own cut, to
  be proven by the reader revealer. Not decided, waits on the revealer: whether
  the skip narrows to a model or service target (adapter red). History of the
  thread: `tests-model/README.md` § The router thread.
- **D5 — Standard stacks without a config** (`--node`). Default: none, a config
  is written. Status: parked.
- **D6 — Entry points nothing imports** (`+page.svelte`, `entryPoints`).
  Default: out of longshot. Status: parked.

- **D7 — Who reads a driver whose tech is the host alone** (a plain Node CLI on
  `process.argv`/`process.on`). Found by the CLI golden: `node()` is a host
  reader, no stock driver reader claims nothing, and `plain-ts` — the reader
  that did it by default — is gone (ruling 2, 6). Default: a stock
  `hostDriver()` driver reader, claiming nothing of its own, shipped not
  defaulted — the host readers bound to the file claim its tech. It is
  `plain-ts` again, opt-in. Status: taken — `host-driver-reader.model.ts`. **To
  rule**: accept `hostDriver`, or give host readers a way to read drivers, or
  something else.
- **D8 — A callback handed to an unclaimed callee.** Found writing the rows:
  `process.on(…, cb)` with no host bound gave four reds for one missing premise
  (the call, then the callback's use case read inline as "outside any hook",
  plus two argument reds). Default: cut as a hook like a tech callee's — the
  missing premise is red once, at the call. Likewise an unread driver's imports
  are not also `driver-calls-services` (ruling 14's spirit: one fix, one red).
  Status: taken — `reading.model.ts` hook cut, `driver.model.ts` wiring args,
  `layers.model.ts` driver cell.

## Tests

- **T1 — What a test body may do.** (04/06, chapter PLAN :575-628: A exempt / B
  `hook-one-call` whole / C unconditional + no writes, bet C.) Default: A until
  milestone 6, then C tried. Status: parked.
- **T2 — `.e2e` in canon** (test kind :263, but "neither … outside the graph"
  :1022). Default: `.e2e` is a test kind, read by the test reader like any test.
  Status: parked.
- **T3 — Configurable flavors** (can test patterns be overridden). Default: no,
  fixed `*.spec.*`/`*.test.*`/`*.e2e.*`. Status: parked.

- **T4 — The corpus fills `driver: [hostDriver()]` too** (ruling 13 fills only
  `node`). A transition on longshot's side, same "not the pattern" comment: rows
  whose driver's tech is the host would each need a binding otherwise. Rows that
  used `driverTech` now bind an inline reader claiming their package. Status:
  taken — `cases.assembly.ts`.

- **T5 — `stable-root` over a test file's root.** Row tables at a spec's root
  (`const rows: Row[] = [...]`) read red or unknown: deblob's own corpus and a
  partner codebase's specs alike. Is a test file's root judged by `stable-root`,
  like any module's, or exempt as a test's definitions are? Default: judged, as
  today. Status: parked — to rule with T1.

## Partner findings

Anonymous; the partner run's details stay local.

- **P1 — The exclude baseline swallowed a source unit named `build`.**
  `**/build/**` (and `**/dist/**`, `**/coverage/**`) in the non-removable
  baseline dropped `src/lib/build/` — a service — out of coverage; its imports
  then read as an unclassified package. A bug in the shipped line too (0.0.6 has
  the same baseline). Default: anchor the build outputs at the config root
  (`dist/**`, `build/**`, `coverage/**`). Status: taken — `config.model.ts`.
  **To carry to main.**
- **P2 — A CLI entry designated `assembly` floods `assembly-builds-only`.**
  Every partner package had its CLI (a cac parser, services built in hooks)
  under `assembly`. With a driver reader bound instead, the same file reads as a
  driver and its reds speak the driver rules. No default to take: it is what the
  ruled config buys; noted as the migration step a user must know.
- **P3 — Framework hook objects** (a Vite plugin's `{ name, transform() {} }`)
  are no callback handed to the tech: the stock cut reads the methods as
  definitions, `driver-hooks-only` red. D1's own cut is owed for these.

- **P4 — `node:path` in a driver is red.** A bound host's pure builtin is model;
  a driver imports no model. So every CLI that resolves a path reds. Consistent
  with canon (a driver computes nothing — the path math belongs in a service),
  but it is the first friction a partner meets. No default taken: a consequence
  to confirm or soften.

- **P5 — Brought to green by hand: what the rules cost, and bought.** The
  smallest partner package (a cac CLI over five services), on a scratch copy:
  the CLI split into boot, a thin cac driver (one use-case call per hook), an
  assembly, a `cli` service with its use cases, and `terminal`/`env`/`paths`
  ports with their adapters; the remote API adapter reads its token through the
  env port. 78 → 16 in under an hour; the 16 are 13 T5 (spec roots), 1 R9 (a
  type name not followed), 2 E1 (unknown, see below). The rules caught a design
  error of the refactor's own: the env port first sat in the `cli` unit, the
  adapter needing it made a service cycle — env and paths are a kernel of their
  own.
- **E1 — An import read as a function, whatever the target declared.** A
  constant a covered file exports, handed on by an assembly, was red "hands a
  function". Fixed: extraction parses every file first, and a covered module's
  export declared as a value (`const`, `let`, `var`, an enum) reads unknown. The
  truth is a literal: a better reader follows it (`false unknown` row in
  `cases/assembly.spec.ts`). Status: taken — `extraction.service.ts` two passes,
  `reading.model.ts` `isValueForm`.

## deblob's own outside

- **C1 — deblob's own CLI has no router.** A hook is a callback handed to the
  tech; a CLI's tech is its router (a partner's: cac). deblob parses argv with
  its own pure model and dispatches by `switch` — neither a tech nor a cut any
  reader has (ruling 10 cards the switch-dispatch cut; D4 whether a local router
  can be claimed). Until then `src/drivers/**` stays designated assembly and
  floods `assembly-builds-only` (≈480 of the self-check's 601). Options: (a) cac
  as the router — fits partners, not deblob's CLI (help topics, uneven
  subcommands); (b) a local router claimed as tech (flips D4); (c) the switch
  cut (ruling 10). **Ruled 2026-09-29: (b)**, the router file judged by its own
  layer (D4). How it is judged — its layer, a model calling a function handed to
  it — is not ruled: longshot writes the router, runs the rules, suggests. The
  switch at `drivers/cli/main.ts:530` goes; a `cli.driver.ts` registers one hook
  per command. Status: built — `lib/router/router.model.ts` (flags win, first
  command word, `otherwise`; no arity: the front rereads the line and tells a
  value spelling a command, `-c check`), `apps/cli/commands.driver.ts` one hook
  per command, `cli.service.ts` the front service. Both CLI driver files read
  clean. **2026-10-05:** stands as built, see D4's note (the driver builds the
  router from the claimed file; handing it in from the assembly is not
  supported). Option (c), the switch cut, comes back as the reader revealer's
  first target: a second CLI over a switch-case router with its own reader.

- **C2 — The boot hands the driver its app** (card, 2026-10-02; LOW since
  2026-10-05: the untested gap is `main()`'s four lines, `registerCommands` is
  tested in-process and the boot smoke test covers `main`; the revealer may
  dissolve it). Today the root driver's `main()` builds its app
  (`createCliAssembly(process)`) and reads its tech itself, so it is testable
  only by the boot's child-process smoke test. Idea (rixo): the boot imports an
  assembly and a driver, builds the app, calls `main(router, cli, argv)`. The
  root driver then holds no tech of its own, takes everything as parameters like
  a sub-driver, and is testable in-process; the irreducible concession shrinks
  to a logic-free boot, where canon already puts "the process starts". Touches:
  `boot-one-call` (canon: a boot imports one driver and calls its wiring), the
  outside-layers ruling (one thing each — is building the app a second thing for
  the boot?), D7 (the host-driver reader would dissolve), `main()`'s "takes
  nothing and reads its tech itself". None checked yet. 2026-10-05: handing the
  app in as a parameter mixes instances with the tech, and a rule reading every
  handed-in parameter as tech would blind the driver's use-case rules. Status:
  card.

- **L1 — Where an app lives** (talked through 2026-09-30, to try). One folder
  per app under `src/apps/` (boot, root driver, sub-drivers, front service, its
  ports and adapters, what only that app speaks); `src/lib/` holds what no
  single app owns, genre code included (the router, the terminal kernel, the
  verdicts as text); what the apps share and none owns sits at `src/` root
  (`app.assembly.ts`). A recipe, never a check. Status: taken — deblob's three
  apps moved, `src/drivers/` and its glob gone (601 → 269 on the self-check,
  most of the drop the glob's `assembly-builds-only`). What it caught: the
  snapshot unit's spec drove the CLI (a lib unit depending on an app — `dag`
  reported the cycle); the parity test moved to the CLI's gate.
- **L2 — The gate registers the sub-driver in every test.** The CLI's gate
  (`commands.driver.spec.ts`) builds a fresh router and calls `registerCommands`
  per test — 63 `sub-driver-wiring` reds, a test body being a hook. The same
  shape the plumbing research's gate had. Input for T1, no default taken.
- **L3 — An app's process assembly delegates to its test-facing one.**
  `createCliAssembly(process)` calls `createCliOver(terminal, install)` — "calls
  createCliOver, which builds nothing"; same in serve and snapshot. **Found in
  the placement recut: a reader limit, not design.** Canon's "a factory call
  builds, any layer's — an assembly's included" held for an imported assembly
  function only; a same-file sibling reached the judge as `local`. Fixed
  (`assembly.model.ts` `judgeCall`), two rows in `cases/assembly.spec.ts`.
  Status: taken. `viewer: { serve }` handing a function stays, with L5.
- **L4 — A driver whose event is the process starting** (serve, snapshot):
  `app.run()` in the root driver reads "the use case run outside any hook". D7's
  other half: a host-only driver with no callback to hand. Open.
- **L5 — The server composition** (`apps/serve/serve.assembly.ts`, 32 groups):
  the request listener is a hook with its translation inline, `node:http` in an
  assembly, a use case run. From the CLI's standpoint the server is its `Viewer`
  port's adapter; from its own, a driver. Carried as-is.
- **L7 — What makes a function an assembly's.** Every function at an assembly's
  root reads green at its definition, whatever its name, but a call to one not
  named as a factory reads red (`storeAt(cwd)` — row in
  `cases/assembly.spec.ts`). One of the two is wrong: either a root helper is no
  assembly function (red where defined, the call riding with it — one fix, one
  red), or every root function is one (the call green). Default: as the reader
  answers today, recorded, not chosen. Status: to rule.
- **L8 — `configLoads` dropped by the CLI** (a bug, not a guess). The chain was
  wired three times; only the corpus passed `configLoads` to extraction, so
  `deblob check` told a user to declare a load they had declared. On
  driver-layer too. Fixed by the placement recut (one judge); proof in
  `apps/cli/__fixtures__/config-loads` and its CLI test. **To carry to
  driver-layer** with its own fix, whatever the recut's fate there.
- **L6 — The map's call sequence for deblob** reads missing: the spike tracer
  hand-reads a `switch` in `main.ts`, which is gone; the snapshot service shows
  `sequenceMissing` as designed. Teaching the tracer the router's hooks is its
  own piece of work.

## Map

- **M4 — Cycles on the map.** A cycle belongs to no one file; the snapshot's
  verdicts leave it out. Default: left out. Status: taken — `snapshot.model.ts`
  `verdictsOf`.

## Leftovers carried as-is

Not touched by longshot, listed so nobody reads their absence as a ruling:
canon's "the syntax proves" vs engine inference; the `??` hook miss;
`main() + 1` / `void main()` in boot; the reading spec's fate; public by
importer count; readonly laundered after the root; property-read strict mode;
functions as variables; global kernels day 0; service README check; the
container key (`08_container-whitelist`); `no-unit-cycle` rename.
