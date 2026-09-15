# snapshot

A project's extraction run, folded into the viewer's contract and served over a
channel. What `deblob check` would have seen there, minus the detectors; the
stats are the CLI's own headline numbers, computed by the same functions.

The contract is the viewer's: `Snapshot`, `ProjectRef`, `ServerMessage`,
`ClientMessage` from `@deblob/viewer/snapshot.model` — a type-only import, the
one place `deblob` depends on the viewer. The viewer never imports `deblob`.

## API

- `createSnapshotService({ source, extractionFor })` →
  `{ snapshotOf, projectsOf }`. `snapshotOf(dir)`: config discovery from `dir`,
  the coverage scan (sorted, so the snapshot's order is fixed), the extraction
  composed for that config, the sizes, the manifest name, then the fold.
  `projectsOf(dir)`: the projects a viewer at `dir` shows — its config's
  `view.projects`, or the project at `dir` alone — each root with its manifest
  name.
- `serveSnapshots({ channel, projects, snapshotOf, report })`: the protocol in
  one place. On connect: `projects`, then the first project's `snapshot`. On
  `select`: that project's `snapshot`. The project's own failure, its config,
  answers `error` for that project. Anything else is a bug: reported in full
  through `report` (the driver's stderr), and the client hears that the server
  failed on that project. Either way the connection lives on — a server does not
  die for one project. An empty project list is a caller error, raised at once.
- `snapshot.model.ts` —
  `snapshotFrom({ config, graph, sizes, name, generatedAt })`: the pure fold.
  Config paths are shown relative to the root when under it.

## Ports

- `ports/project-source.port.ts` — `ProjectSource`: `loadConfig(dir)`,
  `scanCoverage(config)`, `sizesOf(root, files)`, `manifestNameOf(root)`,
  `now()`. What a snapshot needs from the world, as functions the driver
  composes from the CLI's own sequence; promise-only.
- `ports/channel.port.ts` — `Channel`: `onClient(handler)`; a `ChannelClient`
  has `send(message)` and `onMessage(handler)`. Handlers return promises the
  adapter awaits.
- `ports/report.port.ts` — `Report`: `(error) => void`, where the server's own
  failures go; the driver decides presentation.

## Adapters

- `adapters/ws-channel.adapter.ts` — `createWsChannel({ server, path, report })`
  → `{ channel, close }` over the `ws` package, attached to an existing HTTP
  server's upgrade at one path so it coexists with another socket on the same
  server (Vite's). JSON text frames both ways. A malformed client frame or a
  handler that rejects is reported and the socket lives on.
- `adapters/memory-channel.adapter.ts` — `createMemoryChannel()` →
  `{ channel, connect }`: the caller connects clients and reads what they were
  sent; misuse (connecting before a server, sending before it listens) is loud.
- `adapters/memory-report.adapter.ts` — `createMemoryReport()` →
  `{ report, reported }`.
- `adapters/memory-project-source.adapter.ts` —
  `createMemoryProjectSource({ projects, now })`: the world in memory, projects
  keyed by directory; an unknown directory fails like a missing project.

The live project source is composed by `src/drivers/wiring.ts` from the config
service's adapters (`loader.adapter.ts` — `readPackageName(root)` is the
manifest name — and `scan.adapter.ts`) and the extraction service.

## Drivers (`src/drivers/`)

- `serve/` — the data server, package script `serve` (run from source, `PORT` in
  the environment, default 5175): the projects of the cwd's config, an HTTP
  server with the channel at `/deblob/ws`, the protocol served; its own failures
  on stderr in full, and it keeps serving. No CLI verb until step 05.
- `snapshot/` — the script driver, package script `snapshot`: executed, never
  imported; cwd in, the snapshot as one JSON line on stdout, exit 0; a config
  error on stderr, exit 2. The viewer's corpus seed.
- `wiring.ts` — the project source and the extraction composed for the two
  drivers; the CLI driver keeps its own sequence.
