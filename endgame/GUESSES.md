# Endgame — the holes

Every point the rulings leave open, the default endgame took, and where it lives
in code (`// GUESS: <id>`). A ruling replaces a default here first. Status:
`taken` (in code), `parked` (not needed yet, no code depends on it).

Sources: `docs/architecture.md` (canon), `history/20260913_driver-layer/`
(`PLAN.md` = chapter PLAN, `04_outside-rules/07_driver-readers/SPEC.md` = S07),
`history/PLAN.md` (root board).

## Readers

- **R1 — Package entry for the reader factories.** (S07:161-163, chosen at cp4.)
  Default: subpath `deblob/readers`, beside `defineConfig` at `deblob`. Status:
  parked.
- **R2 — Who brings the parser.** (S07 ruling 11, root board.) Default: the core
  parses ES/TS with oxc; `js`/`ts` bring knowledge, not a parser. A framework
  reader that needs one (`.svelte`) is out of endgame. Status: parked.
- **R3 — `pure`: knowledge or neighbour.** (Root board, S07:357.) Default: stays
  a top-level key, a premise beside the readers. Status: parked.
- **R4 — `good-enough-tests` stays the default test reader.** (S07 ruling 7,
  chapter PLAN.) Default: yes. Status: parked.
- **R5 — Where `PURE_BUILTINS` goes** (`node:path`, `node:querystring`; not in
  the cp3 move list). Default: the `node` reader, as pure builtins it claims.
  Status: parked.
- **R6 — `__dirname`/`__filename` with `node` unbound.** (Canon presumes a
  location, S07 moves `LOCATION_GLOBALS` to `node`.) Default: follows the move —
  a location where `node` is bound, unclaimed elsewhere. Status: parked.
- **R7 — Ambient members of intrinsics** (`Date.now`, `Math.random`). Default:
  `js` lists them as ambient. Status: parked (no `ambient-access` detector yet).
- **R8 — Effect-free tech calls.** (Canon :1113-1116, no slot in the host
  interface.) Default: an optional list on the host reader, empty in `node`.
  Status: parked.
- **R9 — TypeScript engine** (`ts` brings it, `noTsc` option). Default: not
  built in endgame; syntax proves. Status: parked.
- **R10 — Disagreement between knowledge sources** (reader, engine, unit).
  Default: moot without the engine. Status: parked.

## Drivers and tech

- **D1 — A driver reader's hook cut.** (S07 ruling 10: added with the first
  case.) Default: a stock driver reader claims its package names as tech and
  cuts nothing of its own — the stock cut (every callback handed to claimed tech
  is a hook). Status: parked.
- **D2 — Declared externals and uncovered files as a driver's tech.** Default:
  unclaimed, red, unless a bound reader claims them. Status: parked.
- **D3 — Adapters' own tech** (`node:fs`, `process.env` in an adapter). Default:
  not judged — adapters touch anything, as today. Status: parked.
- **D4 — A reader claiming a project file as tech** (a local router). Default:
  no. Status: parked.
- **D5 — Standard stacks without a config** (`--node`). Default: none, a config
  is written. Status: parked.
- **D6 — Entry points nothing imports** (`+page.svelte`, `entryPoints`).
  Default: out of endgame. Status: parked.

## Tests

- **T1 — What a test body may do.** (04/06, chapter PLAN :575-628: A exempt / B
  `hook-one-call` whole / C unconditional + no writes, bet C.) Default: A until
  milestone 6, then C tried. Status: parked.
- **T2 — `.e2e` in canon** (test kind :263, but "neither … outside the graph"
  :1022). Default: `.e2e` is a test kind, read by the test reader like any test.
  Status: parked.
- **T3 — Configurable flavors** (can test patterns be overridden). Default: no,
  fixed `*.spec.*`/`*.test.*`/`*.e2e.*`. Status: parked.

## Leftovers carried as-is

Not touched by endgame, listed so nobody reads their absence as a ruling:
canon's "the syntax proves" vs engine inference; the `??` hook miss;
`main() + 1` / `void main()` in boot; the reading spec's fate; public by
importer count; readonly laundered after the root; property-read strict mode;
functions as variables; global kernels day 0; service README check; the
container key (`08_container-whitelist`); `no-unit-cycle` rename.
