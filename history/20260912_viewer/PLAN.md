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
  shows; local, a `deblob.local.ts` beside the config listing checkouts on one
  machine. The local file is a partial config with the same keys and the same
  validation (a typo fails on the existing unknown-key error), found by the same
  discovery, merged per top-level key with local winning and arrays replacing,
  gitignored by convention. JSON at first ("because it is data"); TS since
  2026-09-25 (step 08), the same kind of file as the config, loaded the same
  way, and never project code. No `deblob view <dir>`: the list covers the need.
  `deblob view` with no configured projects shows the current project alone. The
  in-app project switch is the server knowing the whole list; no restart.
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
- **The bundle ships inside `deblob` (2026-09-16).** Built, it is 39 kB of JS
  and a 323-byte HTML file — 52 kB, 15 kB gzipped, small enough that none of the
  three shapes costs anything visible. `deblob`'s build copies
  `packages/viewer/dist` into its own `dist/viewer`, so one package is published
  and nothing resolves at runtime; the published-dependency shape is prepared
  (the viewer carries a `./bundle/*` export, the root is decided in one
  function) and revisited when this branch merges into `main`. The optional peer
  is dead — nobody wants a `deblob` without the viewer.
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
   component, the reactivity test, checker dogfooded, CI wired. Built.
2. `02_config-overlay/` — `view.projects` and `deblob.local.json`. Built.
3. `03_data-half/` — the snapshot function, the WebSocket server driver in
   `deblob` (run from source, the seed of `deblob view`), Vite proxying it in
   our dev cycle, the viewer's source and first real view, the corpus test.
   Re-cut of what the board called "the data half": the watcher moves to its own
   step; no Vite plugin (yagni). SPEC ratified 2026-09-13, built in five review
   checkpoints through 2026-09-16, back-filled.
4. `04_watcher/` — re-run the snapshot on change, push again; the viewer's
   source reconnects. Additive over 03: protocol and state shape unchanged.
   Ratified and built 2026-09-16 in four review checkpoints (chokidar 5, the
   directories coverage spans, discovery stopping at a listed directory),
   back-filled.
5. `05_view/` — `deblob view`: the CLI verb, the built bundle served from the
   same server as the data channel, the packaging question answered (where the
   bundle lives in an npm install). Ratified and built 2026-09-16 in five review
   checkpoints (the static half re-cut as a service over a `BundleFiles` port,
   the serve driver reused, port 3615, the bundle copied into `deblob`'s
   `dist/`, a packed-package gate), back-filled. The GOAL's success test is met:
   `deblob view` opens the viewer on a codebase, and it follows the codebase as
   it changes.

6. `06_channel-access/` — the socket answers the viewer, not any page: a
   WebSocket handshake is not gated by CORS, so `Origin` and `Host` are checked
   on the upgrade: a loopback host, and a loopback origin on the same port — the
   port is what says the page is this server's, the loopback names alias each
   other. One rule for both servers: the viewer's socket goes to its own origin,
   and Vite's proxy forwards both headers. Additive: the protocol and the viewer
   do not change. Ratified and built 2026-09-16 in three review checkpoints (the
   predicate as a model, the channel's required `allows` answering 403, the
   refusal line on the driver's stderr).

7. `07_map-spike/` — a spike: the design's map, run verbatim on our runtime and
   fed from a live tree, to measure what real data costs. It lives in
   `src/spike/` on this branch and gets absorbed as it stabilizes. It follows
   SDD and review like any step; only code quality gets slack. SPEC written
   after its first commits (2026-09-25).

8. `08_local-ts/` — the local overlay becomes `deblob.local.{ts,mts,js,mjs}`,
   loaded like the config, JSON no longer read. An edited config or local file
   now loads as edited in the same process. Ruled 2026-09-25.

9. `09_map-in-product/` — the design's map at `/` of the product, fed by the
   socket (`map` in the snapshot, a `MapFeed` port in deblob); the outline at
   `#debug`. The pipeline at full quality, their pages and our host with the
   spike's slack; the experimental map ships on 0.0.x. Ruled 2026-09-25, four
   checkpoints: one page in our app (landed), live and switch, symbols and
   READMEs graduate, the spike host goes.

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
- ~~**Optional peer or regular dependency** of `deblob` on the viewer~~ — closed
  2026-09-16 at step 05, see § Decisions.
- **Release gate: the map fully connected** (rixo, 2026-09-25, step 09). A 0.0.x
  may ship the experimental map with its gaps (no call stacks on a tree the
  tracer cannot read, or without `typescript` installed; the view reset on each
  save). A real release may not.

## Design track

The map is this chapter's work, built in a claude.ai/design project: same
chapter, another room. That project has no SDD, so its plan is this one. Since
2026-09-23 the viewer runs its pages verbatim (rixo: blackbox the prototype
while it moves fast), and its files will be committed into the viewer as they
are. The project keeps its own session log (`DECISIONS.md`, `docs/HANDOFF.md`);
a row here closes when that log records it.

### Sent

- **Call stacks** (2026-09-23) — `data/CALL-STACKS.md` with the rev. 2 sequence
  snapshot: selection behavior, a "calls" arrow type, stopping at a port with an
  opt-in to follow into the adapter. **Taken**: their Session 36 draws stacks as
  arcs; not judged by rixo yet. Open on their side: the port opt-in control, the
  port drawn as a pass-through, step → map link.
- **Host pass** (2026-09-23) — `data/FROM-DEBLOB.md`: every file ≤ 200 KiB, one
  `globalThis` module pattern, no React in page code, data paths as a contract
  with the sequence panel on `.2`, `gen-graph` gains `buildGraph`, nothing
  design-host-only, a "Host contract (deblob)" section in their `CLAUDE.md`.
  Behavior unchanged. **Sent**, awaiting their pass.
- **The host feeds the map by value** (2026-09-25, step 09) —
  `data/FROM-DEBLOB.md`: data as props instead of URLs, a new value updates in
  place (view kept), the project pick calls back, a project error has a place;
  plus their stale default paths. **Sent**; the three fixes we owe them go in
  one later batch.
- **The fixes we owe, and the view store** (2026-09-26, step 09) —
  `data/FROM-DEBLOB.md`: the two fixes to their files (call mode on any project,
  the panel following a project switch); a `viewStore` prop for Gravity (the
  host names saved view state, the page shapes it; research note
  `09_map-in-product/research/state-restore.md`); the smaller restore points;
  what Gravity needs to mount under our host; the prefetch warning. The by-value
  post stays open above. **Sent**.

### Queue

Map work for the design room, not sent yet. One goes out at a time, as its own
ask.

- **Search bar to filter nodes by name** (2026-09-23, rixo) — hard to find a
  module or member by name on a big map. Filtering, not only jumping to a match:
  how it composes with folds, zoom on selection and the highlight model is
  theirs to rule.

## Future

### Ideas

- **Tracer: "cannot read" vs "crashed"** (2026-09-25, rixo: "that stinks") — the
  snapshot service turns any throw of `sequenceOf` into `sequence: null` plus
  the message, shown as a calm line. Two different things land there: a tree the
  tracer does not know (every tree but deblob's today: expected) and a tracer
  bug on a tree it should read (a failure: should be reported, loud). The port
  cannot tell them apart. Revisit when the tracer graduates: a typed "not
  readable" answer, and any other throw a bug.

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
