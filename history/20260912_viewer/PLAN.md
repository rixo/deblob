# Chapter PLAN — viewer

## Decisions (2026-09-12, rixo)

- **SPA on Vite, plain Svelte, no SvelteKit.** The delivery shapes ahead (CLI
  static server, middleware, Vite plugin) are all "serve a bundle plus a data
  source"; a Vite build is exactly that bundle. Kit's router, server layer and
  adapters would be worked around in every host. SSR is wanted and out of reach;
  accepted.
- **Two packages, one dependency direction.** `@deblob/viewer` is the UI and
  never imports `deblob`. Extraction, the static server, the watcher and later
  the middleware and Vite plugin live in `deblob`, which depends on the viewer
  for its bundle. A third package (middleware + watcher) is not created until
  something demands it.
- **The UI's only input is a stream of whole snapshots, from step 01.** Static
  is a stream of one; live is a stream of many. The watcher is a second source
  later, not a rewrite: reactivity in the bones from the first component.
- **Live push over WebSocket**, not server-sent events. Mature, everybody's
  default, no detour.
- **Our dev cycle is the product's data half.** Vite dev serves the UI with HMR
  (svelte-hmr, rixo's own — the loop is closed). Data comes from the same
  extract-watch-push half the future Vite plugin exposes; building the dev cycle
  builds that half. Wrinkle: the viewer devDepends on `deblob` for it while
  `deblob` depends on the viewer at runtime — opposite directions, dev vs
  runtime, pnpm handles it.
- **Projects come from config, never from the command line.** A `view.projects`
  key in `deblob.config.ts`: directories, each a deblob project with its own
  config discovery starting there, paths relative to the declaring file. Two
  uses, one key: committed, a monorepo root listing the projects its viewer
  shows; local, a `deblob.local.json` beside the config listing checkouts on one
  machine. The local file is a partial config with the same keys and the same
  validation (a typo fails on the existing unknown-key error), found by the same
  discovery, merged per top-level key with local winning and arrays replacing,
  gitignored by convention, JSON because it is data. No `deblob view <dir>`: the
  list covers the need. `deblob view` with no configured projects shows the
  current project alone. The in-app project switch is the server knowing the
  whole list; no restart.
- **Testing, three loops over one input.** Manual exploration: the dev server
  over the configured projects, `deblob` itself and real checkouts, daily.
  Corpus test: a directory of banked snapshots, the test iterates over whatever
  is there and asserts invariants true of any snapshot (mounts, every service
  appears, counts match, nothing throws) — one operation, not one test per
  codebase; in the repo only `deblob`'s own, private ones only in a gitignored
  corpus directory. Self-extract in CI: `deblob`'s snapshot is extracted at test
  time through the data half rather than banked as a golden that churns with the
  CLI. Consequence: the data half is a function first (snapshot of a project), a
  server second; dev server, `deblob view` and the corpus test call the same
  function. The map's layout leg (headless browser) is the map step's problem.
- **The viewer's own code does not inherit `deblob`'s laundering (2026-09-13).**
  Found at step 02 in the CLI's config wiring (`02_config-overlay/SPEC.md` §
  Findings); the fix in `deblob` is deferred, the rules bind the new package
  from its first I/O: the entry wires and makes one service call per trigger,
  never calls an adapter, never orchestrates; every adapter implements a port
  and comes from a factory; filesystem access goes through an fs port,
  promise-only, with a node adapter and a memory adapter for tests — sync needs
  a stated case, laziness is not one.

## Steps

1. `01_package/` — the package exists: Svelte on Vite, the snapshot source, one
   component, the reactivity test, checker dogfooded, CI wired. Landed 92ae7f2.
2. `02_config-overlay/` — `view.projects` and `deblob.local.json`. Landed
   0676dac.
3. `03_data-half/` — the snapshot function, the WebSocket server driver in
   `deblob` (run from source, the seed of `deblob view`), Vite proxying it in
   our dev cycle, the viewer's source and first real view, the corpus test.
   Re-cut of what the board called "the data half": the watcher moves to its own
   step; no Vite plugin (yagni). SPEC ratified 2026-09-13, built in five review
   checkpoints through 2026-09-16, back-filled. Landed f439f3b.
4. `04_watcher/` — re-run the snapshot on change, push again; the viewer's
   source reconnects. Additive over 03: protocol and state shape unchanged.
   Ratified and built 2026-09-16 in four review checkpoints (chokidar 5, the
   directories coverage spans, discovery stopping at a listed directory),
   back-filled.
5. Candidate: `deblob view` serving the built bundle.

Then the pivot to general UI considerations (rixo, 2026-09-13) before the map
(ELK in a worker, tween, the bake-off's interaction requirements; Playwright
through Vitest browser mode enters there).

## Open

- **Data contract.** What the viewer asks for is the viewer's to define and
  `deblob`'s dump to conform to. Not settled; step 01 ships a stamp only.
- **Driver layer rulings** happening in the main checkout (driver vs assembly,
  "1 trigger = 1 use case", `drivers` config key). They may change what the
  viewer shows. Not settled here.
- **The UI zone in the checker.** `.svelte` files are `parsed: false` nodes, so
  they are blob and their imports are invisible. The viewer's dogfood is honest
  about that; the resolution is the arch-pass card's F1–F3 hole, not this
  chapter's.
- **`svelte-check` against TypeScript 7.** Tried at step 01 (4.7.6): it refuses
  to start on TS 7 alone and asks for TS 6 installed beside it under an alias
  (`@typescript/native@npm:typescript@7`) plus a `--tsgo` flag. Not taken: a
  dual-TypeScript install is not a step 01 call. Until it is, `tsc --noEmit`
  types the `.ts` sources and `.svelte` script blocks go untyped.
- **Optional peer or regular dependency** of `deblob` on the viewer: decided
  when the bundle size is known.

## Future

### Ideas

- **Non-deterministic test fixtures** (2026-09-15, rixo) — the corpus test runs
  over a snapshot of the live codebase, regenerated every run (step 03's seed
  ruling). Revisit testing against non-deterministic inputs: what such a test
  can and cannot prove, and whether the seed stays — if it is still there when
  this card opens.
- **Baked static build** (2026-09-12) — the snapshot written into the HTML, no
  server after delivery; the "prod / staging" flow. Same input, stream of one.
- **Middleware and Vite plugin** (2026-09-12; yagni, rixo 2026-09-13) — userland
  packaging of the view server plus the static build, for people who want it
  inside their own server or Vite. Step 03's data server is the thing they would
  wrap; nothing built until someone asks.
- **Review list as the product** (2026-09-12) — spec, spec diff, services and
  their primary use cases as they appear, tests as the review surface; a diff
  reviewer closer to VS Code's than GitLab's, staging a hunk once reviewed.
  rixo's direction, not ruled.
