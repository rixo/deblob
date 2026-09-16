# Step 03 — the data half: a snapshot of a project, served to the viewer

Proposed and ratified 2026-09-13 (the cut, the server driver, the source-run,
the contract's home, the corpus seed — each ruled in conversation, § Open
records the closures). The step where the viewer first shows a real codebase,
and the first port-shaped piece written into `deblob`.

**Cut, ratified 2026-09-13:** this step is the snapshot function, the WebSocket
server that delivers it (a driver in `deblob`, run from source, the seed of
`deblob view`), and the viewer's source over that channel, with Vite proxying
the socket in our dev cycle. The watcher is step 04: it re-runs the function and
pushes again, changing nothing below. `deblob view` is step 05: this server plus
static files. Reason for the cut: the channel is built once, WebSocket from the
first byte, so no HTTP-fetch source exists to be replaced later; the watcher is
then purely additive. A Vite plugin or a middleware wrapping the server is
userland packaging, yagni (rixo), back on the chapter's Ideas. The pivot to UI
considerations follows 05.

## Goal

`pnpm dev` in the viewer package opens the viewer on the projects listed in its
config (the committed `deblob.config.ts`, the machine's `deblob.local.json`
beside it, or the viewer package itself when neither lists any), and the page
shows the snapshot of the selected project: what it is, how big, which services,
which files under each, by layer. Switching project in the page asks the server,
no restart.

Success:

- `snapshotOf(projectDir)` in `deblob` returns the viewer's `Snapshot` for any
  deblob project — configless included — through the same extraction the checker
  runs, and a test proves it on `packages/deblob` itself against the numbers
  `deblob check` prints.
- The viewer, given a source, renders the snapshot's project, counts, and the
  service list; pushing a second snapshot re-renders (the step 01 test, kept).
- The dev cycle runs end to end: Vite serves the page and proxies the socket,
  the data server answers it, a WebSocket client connects, receives the project
  list and the first snapshot, selects another project, receives its snapshot.

Out of scope: the watcher, `deblob view`, the map, any styling beyond legible
lists, any diffing between snapshots, any snapshot of a project that fails
extraction (an unresolvable import): that failure is surfaced as the server's
error message and the page says so, nothing more.

## API

Back-filled 2026-09-16 from the code as landed (the ruled method: minimal spec,
then the spec catches up with the deviations). Where nothing is said otherwise,
the ratified text stood.

### The snapshot — the viewer's contract, `deblob` conforms

Owned by the viewer, published as `@deblob/viewer/snapshot.model` (type-only for
`deblob`; the runtime dependency direction stays: `deblob` depends on the
viewer, the viewer never imports `deblob`). JSON, no maps:

- `Snapshot`: `generatedAt`, `project` (`root`, `name` from the package manifest
  when present, `provenance` as the bare status prints it), `stats` (files,
  bytes, blob percent, services), `modules` (path, layer, service root, private,
  parsed), `edges` (from, target as the graph has it, kind, form), `unresolved`.
- The layer vocabulary is restated in the viewer's model: `LAYERS`, the layers
  in display order, `Layer` derived from it. Two packages, one vocabulary, the
  viewer's copy is the contract.

### The protocol — same file

- Server → client: `projects` (the list, each `root` and `name`), `snapshot`
  (the snapshot alone — its `project.root` identifies it, there is no separate
  `project` field), `error` (`project` = the root as requested, `message`).
- Client → server: `select` (`project`, a root as listed).
- On connect the server sends `projects`, then the first project's `snapshot`.

### `deblob` — the snapshot service and its ports (`src/lib/snapshot/`)

Written to the new-package rules, inside the laundered codebase, deliberately.
Fixtures are adapters, never inlined fakes (rixo, 2026-09-15): three memory
adapters beside the live ones.

- `ports/project-source.port.ts`: `ProjectSource` — `loadConfig(dir)`,
  `scanCoverage(config)`, `sizesOf(root, files)`, `manifestNameOf(root)`,
  `now()`. Promise-only. No `engineFor`: composing engine, flavor and package
  meta is wiring, so the extraction composed for one config is the service
  factory's second dependency, `extractionFor(config)`.
- `ports/channel.port.ts`: `Channel` — `onClient(handler)`; a `ChannelClient`
  has `send(message)` and `onMessage(handler)`. No `onClose`: nothing to clean
  up before the watcher. Handlers return promises the adapter awaits.
- `ports/report.port.ts`: `Report` — `(error) => void`, where the server's own
  failures go; the driver decides presentation.
- `snapshot.service.ts`: `createSnapshotService({ source, extractionFor })` →
  `{ snapshotOf, projectsOf }`. `snapshotOf(dir)`: config discovery from `dir`,
  the coverage scan sorted (the snapshot's order is fixed, the scan's is the
  filesystem's), extraction, sizes, manifest name, the fold. `projectsOf (dir)`:
  the config's `view.projects`, or the project at `dir` alone, each root with
  its manifest name — "the list or the cwd alone" is a decision, so it lives
  here, not in the driver.
  `serveSnapshots({ channel, projects, snapshotOf, report })`: on connect send
  `projects`, snapshot the first; on `select` snapshot that one. A `ConfigError`
  — the project's own, actionable failure — answers `error` with its message.
  Anything else is a bug: reported in full through `report`, and the client
  hears "the server failed on this project — see its log". The connection lives
  on either way: a server does not die for one project (rixo, 2026-09-15). An
  empty project list throws at call time.
- `snapshot.model.ts`:
  `snapshotFrom({ config, graph, sizes, name, generatedAt })`, the pure fold.
  Stats come from the CLI's own functions (`sizeStatsOf`, `provenanceOf`,
  `serviceCountOf` in `cli/render.model.ts`, `serviceCountOf` moved there from
  the CLI driver). Config paths are shown relative to the root when under it.
- `isConfigError` in `config.model.ts`: the duck-typed guard the service
  discriminates on (`asConfigError` now uses it). `readPackageName(root)` in the
  config service's `loader.adapter.ts`, sharing the manifest read with
  `readPackageSurface`: `null` without a manifest, an unparseable manifest fails
  naming it.
- `adapters/ws-channel.adapter.ts`: `createWsChannel({ server, path, report })`
  → `{ channel, close }` over the `ws` package (exact-pinned, the one new
  dependency), `noServer`, attached to the HTTP server's `upgrade` filtered on
  the path — another path has its socket destroyed — so it coexists with Vite's
  own socket. JSON text frames. A malformed or non-`select` frame, or a
  rejecting handler, goes to `report` and the socket lives on; nobody listening
  means the frame is dropped. `close` terminates the clients still connected.
- `drivers/serve/main.ts` + `bin.ts`: `main({ cwd, port, stdout, stderr })` →
  `{ port, close }`: `projectsOf(cwd)`, an HTTP server on 127.0.0.1, the channel
  at `/deblob/ws`, `serveSnapshots`; `report` prints `inspect(error)` on stderr;
  one stdout line with the address and the project count. `bin.ts`: `PORT` from
  the environment, default 5175. Package script `serve`, run from source. No CLI
  verb until step 05.
- `drivers/snapshot/main.ts` + `bin.ts`: the script driver (rixo's term,
  2026-09-13 — executed, never imported), split like the CLI so `main` runs
  in-process: cwd in, the snapshot as one JSON line on stdout, exit 0; a
  `ConfigError` as its message on stderr, exit 2; bugs fly. Package script
  `snapshot`. The corpus seed and, in miniature, the future baked static build.
- `drivers/wiring.ts`, one shared file (the "beside each driver" option
  dropped): `createProjectSource()` composes the port from the config service's
  adapters and the clock — the CLI's load sequence duplicated as
  `loadConfig(dir)`, the CLI's own `loadFor` untouched; the duplication is the
  config-as-use-case debt of SPEC 02 § Findings — and `extractionFor(config)`
  composes the engine.

**Other projects' data, how (rixo's question at ratification):** in-process, our
code, their config. `snapshotOf(dir)` runs config discovery from the project's
directory — its own `deblob.config.ts` and `deblob.local.json`, or the defaults
— its tsconfig feeds resolution, and the oxc resolver walks the project's own
`node_modules`, so its installed dependencies are what resolves; a checkout
without an install yields unresolved imports, reported as that project's
`error`. The functions behind the project-source port are the CLI's own
sequence, so a project's snapshot is what `deblob check` would have seen there,
minus the detectors. Nothing is installed or spawned on the project's side.

**Source, never `dist`, inside the workspace (ruled 2026-09-13):** `deblob`
already runs unbuilt — Node 24 strips its types, erasable syntax is a hard
constraint of the package, its own check script runs `src/drivers/cli/bin.ts`.
The viewer follows: its dev script starts the data server from `packages/deblob`
source beside `vite`, its check script runs
`node ../deblob/src/drivers/cli/bin.ts check`, and its `deblob.config.ts` types
itself with `import type { DeblobConfig } from "../deblob/src/index.ts"` — so
nothing resolves through deblob's `exports` map at runtime, and the viewer's
`deblob` devDependency is gone (the cyclic workspace warning with it). `dist`
matters only at the package boundary; the release gate's tarball smoke covers
that side. No build after a clone, no stale `dist` checking the viewer with last
week's rules.

### The viewer

- `src/lib/snapshot/snapshot-source.port.ts`: `SourceState` — `projects` (empty
  until known) and a union discriminated on `loading`: loading (asked, not
  answered — connecting, or a project selected; the previous snapshot stays up),
  loaded (a snapshot), errored (`{ project, message }`, the previous snapshot
  stays up). No loaded-but-empty arm: the server always has the cwd project and
  always answers `snapshot` or `error`. `SnapshotSource` is
  `Readable<SourceState> & { select(root) }` from `svelte/store` — a store, read
  as `$source` in components (rixo, 2026-09-15: bite the bullet). Viewer-
  internal: `deblob`'s import is the model, which stays Svelte-free.
- `src/lib/snapshot/adapters/static-source.adapter.ts`:
  `createStaticSource(snapshot | null)` (was `once` — an adapter, it returns a
  port shape): a stream of one; `null` is a load that never ends.
- `src/lib/snapshot/adapters/ws-source.adapter.ts`: `createWsSource(url)` on
  `readable(start)`: the socket opens on the first subscriber, closes after the
  last, a new subscription reconnects from scratch. Its state machine:
  `projects` keeps the loading arm, `snapshot` and `error` end it, `select`
  re-enters it and clears the error. Answers are taken as they come — the last
  wins (§ Findings). `select` before any subscriber throws. Reconnecting on a
  lost socket is step 04's concern.
- `src/lib/snapshot/outline.model.ts`: `outlineOf(modules)` — the service list
  as the page shows it: services by root, sorted; the files outside every
  service last; layers in `LAYERS` order, empty ones omitted; files in snapshot
  order.
- `App.svelte` renders, each interpolation in its own element (a text node
  mixing two compiles to `?? ""` guards unreachable by type — checkpoint 1's
  rule, two more instances at checkpoint 4): a `<nav>` of buttons as the project
  switch, one `select(root)` per click (a `<select>` compiles `value=` on
  `<option>` to such a guard); the loading line; the error line (root, message);
  the snapshot — name and root, provenance, the time, the four stats as a `<dl>`
  with `data-stat` on each `<dd>`, one `<section>` per outline service with an
  `<h3>` per layer and an `<li>` per file.
- `src/main.ts`: `createWsSource` on `ws://<host>/deblob/ws`, mounts.
- `vite.config.ts`: `server.proxy` forwards `/deblob/ws` to
  `ws://127.0.0.1:5175` with `ws: true`. `pnpm dev` is `run-p dev:*`:
  `dev:serve` runs the serve bin from the viewer's cwd, so the viewer's
  `deblob.local.json` is where you list your checkouts; `dev:vite`.

## Testing

As run (back-filled 2026-09-16):

- Snapshot service through its contract over the memory adapters: the projection
  pinned field by field. Self-extract: one test composes the live functions from
  `drivers/wiring.ts` and snapshots `packages/deblob`, asserting `stats` against
  what `main(["check"])` prints in the same run — no golden.
- `serveSnapshots` with the memory channel: connect → projects + first snapshot;
  select → that snapshot; a `ConfigError` → `error` with its message; a bug →
  reported, `error` with the fixed message; the client stays connected.
- The ws channel adapter against a real `ws` client on a random port: frames
  both ways, another path refused at the upgrade, malformed frames and rejecting
  handlers reported with the socket alive, `close` terminating a connected
  client.
- The serve driver: `main` in-process on port 0 with the viewer package as cwd,
  a real ws client on `/deblob/ws` receives `projects` and the first `snapshot`;
  a malformed frame lands on stderr with its stack; a child-process smoke of the
  bin. The snapshot driver: this package, temp dirs (config + overlay, a lone
  overlay, a bare directory), the broken-config fixture (exit 2), a bin smoke.
  The three bins are excluded from instrumentation — the ruled e2e-only
  exception; everything else runs in-process.
- Viewer: `createWsSource` against a real `ws` server — under
  `// @vitest-environment node`, not jsdom as first written: the `browser`
  resolve condition vitest needs for svelte's client build maps `ws` to its
  browser stub, so the spec's server cannot be built in a jsdom file; Node's own
  `WebSocket` global is the client, same API. The App over a `writable` store (a
  fixture that is a store, not a hand-rolled source). Corpus test: every
  `tmp/corpus/*.json` — `tmp/` is gitignored throughout the repo (rixo,
  2026-09-15: no new ignore rule, and "tmp" says what it is) — read through
  Vite's glob import (no `node:fs` in the viewer), one `test.each` row per
  snapshot; a vitest global setup regenerates `deblob.json` on every run by
  spawning the snapshot script driver with `packages/deblob` as cwd (the viewer
  runs `deblob` as a process, never imports it); private snapshots are dropped
  there by hand. Asserted for any snapshot present: it mounts, every service
  root is listed, one line per module, the four counts shown equal `stats`.
- Coverage bar 100% in both packages, both dogfood checks green — the `.svelte`
  files stay blob; the new deblob files are placed. At close: viewer 18 tests,
  13 files, 0 violations; deblob 586 tests, 71 files, 0 violations. The dev
  cycle verified by hand: `pnpm dev`, a ws client on Vite's port through the
  proxy received `projects` then the snapshot.

## Implementation

Five review checkpoints, one concern each, handed over one at a time, rixo
accepting each by staging (2026-09-13 → 16):

1. Viewer model and port: `Snapshot`, the protocol, `SnapshotSource` in the port
   file, `createStaticSource`, App and entry on the new state shape, the
   `./snapshot.model` export. Second round the same day: the source as a store,
   `SourceState` as a union on `loading`, one interpolation per element.
2. `deblob` snapshot service: ports, `createSnapshotService` + `serveSnapshots`,
   the three memory adapters, in-memory tests, the self-extract test; `deblob`
   gains the viewer as a devDependency for the type-only import. Rulings: the
   error doctrine (a `ConfigError` answers, a bug is reported and the server
   lives on), `readPackageName` in the loader adapter.
3. The ws channel adapter, `drivers/wiring.ts`, the serve and snapshot drivers,
   their package scripts and tests; `projectsOf(dir)` into the service.
4. Viewer: the ws source adapter, the outline model, App, entry; the Vite proxy,
   `dev` running both processes, check and config on deblob's source; the corpus
   test and its global setup.
5. Docs and this back-fill.

## Docs

- `packages/viewer/README.md`: rewritten — the contract and the protocol, the
  source and its adapters, the dev cycle and how to list projects in
  `deblob.local.json`, scripts (all on deblob's source), the tests and the
  corpus.
- `packages/deblob/README.md`: nothing public yet — the server has no verb until
  step 05; the package scripts are documented in the service's living doc.
- `src/lib/snapshot/README.md` in `deblob`: the living doc of the new service —
  API, ports, adapters, drivers.
- Chapter PLAN: the step list re-cut (03 data half, 04 watcher, 05
  `deblob view`), the data contract leaving § Open; an Ideas card on
  non-deterministic test fixtures (rixo, 2026-09-15).

## Findings

Surfaced at review, recorded here for rixo to rule or carry; none changed the
step's cut.

- **`dist/` ships the snapshot service, the two new drivers and `wiring.ts`**,
  their `.d.ts` referencing `@deblob/viewer/snapshot.model`, a devDependency.
  Nothing on the public surface reaches them, so consumers never load them, but
  the tarball carries files with an unresolvable import and bins with no `bin`
  entry. Exclude them from the build until step 05 gives the server a verb, or
  accept.
- **`sizeStatsOf`, `provenanceOf`, `serviceCountOf`** live in
  `cli/render.model.ts` and the snapshot model imports them cross-service:
  kernel candidates.
- **Two roots.** `snapshot.project.root` is `config.root` (discovery may walk up
  from the listed directory); `projects[].root` is the directory as listed. Same
  in practice; different when a project's config sits above it.
- ~~**Out-of-order answers: the last wins.** Rapid selects can answer out of
  order, and the source takes each answer as it comes. Keying on
  `snapshot.project.root` would drop every answer of a project whose config sits
  above its listed directory (the two roots), and the `snapshot` message no
  longer carries the requested root. Keying needs that field back.~~ — closed at
  step 04 (cecef2e) by the server, not by keying: a client's runs never overlap,
  and an answer for a project no longer current is dropped, so answers cannot
  arrive out of order and taking the last one is correct. The guarantee was
  written into the protocol description in the viewer README on 2026-09-16.
- ~~**`select` of any directory answers a snapshot.** `serveSnapshots` does not
  check `select` against its list; `loadConfig` walks up from anywhere and lands
  on the defaults, so a root outside the list — or no directory at all — comes
  back as an empty snapshot rather than an error.~~ — fixed 2026-09-16: a root
  the server did not offer is answered `error` and never run. It mattered more
  than "laxity" said: the channel has no origin check, so any page in the
  browser could reach it and name any path (05 § Findings).
- **Extraction has no failure vocabulary.** A covered file that fails to parse
  throws a bare `Error` from the oxc adapter; the CLI does not catch it (stack,
  no exit code), the server reports it and keeps serving. Doctrine says an
  `ExtractionError` and its guard in the extraction model, the parse failure as
  its first actionable case; a step of its own.
- **The serve bin has no presentation for a `ConfigError` at startup:** a broken
  cwd config crashes with the stack. Step 05's verb inherits the CLI's
  presentation; until then, acceptable for a package-script dev server.
- ~~**The serve test reads the viewer package's real config.** A
  `deblob.local.json` dropped there by hand — the intended dev use — changes
  `projects` and breaks its "1 project" assertion. The test could build its own
  temp project, or assert on the first project only.~~ — fixed at step 04
  (cecef2e): the spec builds its own viewer project in a temp directory. This
  entry was not struck at the time.
- **The CLI's load sequence is duplicated** in `drivers/wiring.ts` — the
  config-as-use-case debt of SPEC 02 § Findings, one more caller of it.

## Open, to rule at ratification

- ~~The contract's home~~ — closed 2026-09-13: the viewer, as written. `deblob`
  as home would need a type-only import from `deblob` in the viewer; the rule is
  "never imports", not "never at runtime", and the viewer says what it needs.
  The restated layer vocabulary is that stance, not a cost.
- ~~The corpus seed~~ — closed 2026-09-13: regenerated on every run by a vitest
  global setup spawning the snapshot script driver, never a checked-in golden
  (it would drift the first time extraction changed). rixo's reservation
  2026-09-15 — a test over non-deterministic input — is an Ideas card on the
  chapter PLAN. The first draft had the setup composing `deblob`'s service from
  the viewer's test file; rejected here as laundering with a test suffix — the
  viewer runs `deblob` as a process, the way a user would.
