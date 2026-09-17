# snapshot

A project's extraction run, folded into the viewer's contract and served over a
channel. What `deblob check` would have seen there, minus the detectors; the
stats are the CLI's own headline numbers, computed by the same functions.

The contract is the viewer's: `Snapshot`, `ProjectRef`, `ServerMessage`,
`ClientMessage` from `@deblob/viewer/snapshot.model` — a type-only import, the
one place `deblob` depends on the viewer. The viewer never imports `deblob`.

## API

- `createSnapshotService({ source, extractionFor })` →
  `{ runOf, snapshotOf, projectsOf, watchSetFor }`. `runOf(root)` →
  `{ snapshot, watchSet }`: the project at `root` exactly — its own config or
  the defaults, never an ancestor's (a listed directory is the project; rixo,
  2026-09-16) — the coverage scan (sorted, so the snapshot's order is fixed),
  the extraction composed for that config, the sizes, the manifest name, then
  the fold — and the watch set for the next run: the root and every directory
  coverage spans, absolute. `snapshotOf(root)` is the snapshot alone.
  `projectsOf(dir)`: the projects a viewer at `dir` shows — the config of the
  project containing `dir` (discovery, as the CLI) names them in
  `view.projects`, or that project alone — each root with its manifest name.
  `watchSetFor(root)` is that same set read ahead of a run — the config and the
  directories, without the extraction — for a caller that must watch before it
  runs.
- `serveSnapshots({ channel, projects, runOf, watchSetFor, watcher, report })`:
  the protocol in one place. On connect: `projects`, then the first project's
  `snapshot`, its watch set watched. On `select`: that project's `snapshot`, the
  watch moved to it — the list sent on connect is the whole menu, and a root
  outside it answers `error` and is never run. On a change under the watch: the
  current project's `snapshot` again, unasked, the set refreshed. A project's
  set is watched **before** its first run, read by `watchSetFor` — the run's own
  set is only known when it ends, and the watcher watches each directory for its
  own entries, so a change under a covered directory during that run would be no
  event at all. A set that cannot be read ahead of the run (its config is
  broken) falls back to the root alone, and the run answers for the config. On
  close: the watch closed. Runs for one client never overlap — a change or
  select mid-run marks one more run; an answer for a project no longer current
  is dropped. The project's own failure, its config, answers `error` for that
  project, the watch set as it was (the root is in it: fixing the config is a
  change). Anything else is a bug: reported in full through `report` (the
  driver's stderr), and the client hears that the server failed on that project.
  Either way the connection lives on — a server does not die for one project. An
  empty project list is a caller error, raised at once.
- `snapshot.model.ts` —
  `snapshotFrom({ config, graph, sizes, name, generatedAt })`: the pure fold.
  Config paths are shown relative to the root when under it.
- `handshake.model.ts` — `allowsHandshake({ origin, host })`: who may open the
  channel. A WebSocket handshake is not gated by CORS, so any page in the
  browser reaches a local server unless the server refuses it. Allowed is a
  loopback `host`, an `origin` that is there, and that origin being `http` on a
  loopback name at the same port — the port is what says the page is this
  server's own, and the loopback names alias each other. The `host` clause is
  not redundant: under rebinding, a page's `Origin` and `Host` match because it
  owns both.

## Ports

- `ports/project-source.port.ts` — `ProjectSource`: `loadConfig(dir)` (the
  project containing `dir`, discovery), `loadConfigAt(root)` (the project at
  `root` exactly), `scanCoverage(config)`, `scanCoverageDirs(config)` (the
  directories coverage spans — the watch set), `sizesOf(root, files)`,
  `manifestNameOf(root)`, `now()`. What a snapshot needs from the world, as
  functions the driver composes from the CLI's own sequence; promise-only.
- `ports/channel.port.ts` — `Channel`: `onClient(handler)`; a `ChannelClient`
  has `send(message)`, `onMessage(handler)` and `onClose(handler)`. Handlers
  return promises the adapter awaits.
- `ports/report.port.ts` — `Report`: `(error) => void`, where the server's own
  failures go; the driver decides presentation.
- `ports/watch.port.ts` — `Watcher`: `watch(dirs, onChange)` → `Watch` with
  `update(dirs)` and `close()`. Absolute directories, each watched for its own
  entries only; one `onChange` per burst; what changed is not reported.

## Adapters

- `adapters/ws-channel.adapter.ts` — `createWsChannel({ server, path, report })`
  → `{ channel, close }` over the `ws` package, attached to an existing HTTP
  server's upgrade at one path so it coexists with another socket on the same
  server (Vite's). JSON text frames both ways. A malformed client frame or a
  handler that rejects is reported and the socket lives on. `allows` is asked on
  the handshake's own headers before any client exists; refused is a `403` on
  the raw socket and nothing else — the rule itself is the caller's.
- `adapters/memory-channel.adapter.ts` — `createMemoryChannel()` →
  `{ channel, connect }`: the caller connects clients and reads what they were
  sent; misuse (connecting before a server, sending before it listens) is loud.
- `adapters/memory-report.adapter.ts` — `createMemoryReport()` →
  `{ report, reported }`.
- `adapters/chokidar-watcher.adapter.ts` —
  `createChokidarWatcher({ quietMs, report })` over chokidar 5 (exact-pinned):
  one instance per watched directory at depth 0, hidden entries ignored, the
  initial listing skipped, events coalesced until `quietMs` of silence;
  chokidar's own errors reported. One instance per directory rather than one
  over the set because chokidar 5 counts a path that fails (missing, a loop) as
  ready twice, so a shared instance says `ready` before the rest of the set is
  watched. Polling where a filesystem emits nothing: chokidar's
  `CHOKIDAR_USEPOLLING`, untouched.
- `adapters/memory-watcher.adapter.ts` — `createMemoryWatcher()` →
  `{ watcher, change(dir), watching, hold }`: the test fires the changes, reads
  the live sets, and with `hold()` keeps `watch` and `update` pending until it
  releases them — a real watcher's time to come up.
- `adapters/memory-project-source.adapter.ts` —
  `createMemoryProjectSource({ projects, now })`: the world in memory, projects
  keyed by directory; an unknown directory fails like a missing project.

The live project source is composed by `src/drivers/wiring.ts` from the config
service's adapters (`loader.adapter.ts` — `readPackageName(root)` is the
manifest name — and `scan.adapter.ts`) and the extraction service.

## Drivers (`src/drivers/`)

- `serve/` — the view server. `serve(io)` is the assembly, with two callers: the
  projects of the cwd's config, an HTTP server with the channel at `/deblob/ws`,
  the chokidar watcher (100 ms quiet), the protocol served; its own failures on
  stderr in full, and it keeps serving. A cwd config it cannot read is not one
  of those: it throws before anything listens, and each caller presents it. The
  package script `serve` (run from source, `PORT` in the environment,
  default 5175) is `main(io)`, the dev cycle's data half alone: the config's
  message on stderr and exit 2, or serving until SIGINT/SIGTERM and exit 0. The
  CLI's `view` verb calls the same assembly with a bundle root, and the same
  server then answers the page and its assets at `/` ([view](../view/README.md))
  — one port for both, since the channel rides the HTTP server's upgrade. Either
  way the channel takes `allowsHandshake`, and a refusal is one line on stderr
  naming the origin — not a bug, so not `report`'s, but a server that turns
  clients away without a word cannot be debugged.
- `snapshot/` — the script driver, package script `snapshot`: executed, never
  imported; cwd in as the project root (exactly, nothing above it), the snapshot
  as one JSON line on stdout, exit 0; a config error on stderr, exit 2. The
  viewer's corpus seed.
- `wiring.ts` — the project source and the extraction composed for the two
  drivers; the CLI driver keeps its own sequence.
