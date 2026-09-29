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
- **R4 — `good-enough-tests` stays the default test reader.** (S07 ruling 7,
  chapter PLAN.) Default: yes. Status: taken — `readers.assembly.ts`.
- **R5 — Where `PURE_BUILTINS` goes** (`node:path`, `node:querystring`; not in
  the cp3 move list). Default: the `node` reader, as pure builtins it claims.
  Status: taken — `node-reader.adapter.ts`; config folds a bound host's pure
  list into `pure`, so `node:path` is pure only where `node` is bound.
- **R6 — `__dirname`/`__filename` with `node` unbound.** (Canon presumes a
  location, S07 moves `LOCATION_GLOBALS` to `node`.) Default: follows the move —
  a location where `node` is bound, unclaimed elsewhere. Status: taken —
  `node-reader.adapter.ts`.
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
  no. Status: parked.
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
  `plain-ts` again, opt-in. Status: taken — `host-driver-reader.adapter.ts`.
  **To rule**: accept `hostDriver`, or give host readers a way to read drivers,
  or something else.
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
  floods `assembly-builds-only` (≈390 of the self-check's 594). Options: (a) cac
  as the router — tiny, zero-dep, the `cac()` reader already proven on partners;
  costs the help/parse-error goldens; (b) a local router claimed as tech (flips
  D4); (c) the switch cut (ruling 10). Default: none taken — the restructure
  (06) waits on this. **To rule.**

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
