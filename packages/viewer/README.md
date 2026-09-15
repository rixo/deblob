# @deblob/viewer

The deblob viewer: a browser app over a codebase deblob has extracted, launched
by `deblob view` (step 05 of its chapter, `history/20260912_viewer/`). Today it
runs as the dev cycle described below and shows a project's snapshot: what it
is, how big, which services, which files under each, by layer.

A Svelte single-page app built by Vite. It never imports `deblob`: data reaches
it through its one input, a **snapshot source** — a Svelte store of whole
states, static delivery a stream of one, live delivery a stream of many; the app
does not care which.

## The contract

`src/lib/snapshot/snapshot.model.ts`, published as
`@deblob/viewer/snapshot.model`. The viewer owns it; `deblob` conforms to it
through a type-only import. JSON throughout.

- `Snapshot`: `generatedAt`, `project` (root, manifest name, provenance as
  `deblob check` prints it), `stats` (files, bytes, blob percent, services),
  `modules` (path, layer, service root, private, parsed), `edges`, `unresolved`.
  `LAYERS` is the layer vocabulary, in display order.
- The protocol over the socket. Server to client: `projects` (the list, each
  root and name), `snapshot`, `error` (project, message). Client to server:
  `select` (project root). On connect the server sends `projects`, then the
  first project's `snapshot`; a project whose extraction fails yields `error`
  and the connection lives on.

`src/lib/snapshot/snapshot-source.port.ts` is the app's side: `SourceState`
(projects, and loading / loaded / errored — the previous snapshot stays up while
the next loads and under an error) and `SnapshotSource`, a readable of it with
`select(root)`. Two adapters: `createStaticSource(snapshot | null)` and
`createWsSource(url)`, the socket opening on the first subscriber and closing
after the last.

## The dev cycle

```
pnpm dev
```

Two processes: Vite serving the page, and deblob's data server run from its
source (`node ../deblob/src/drivers/serve/bin.ts`, port 5175) with this package
as its cwd. Vite proxies `/deblob/ws` to it. The server extracts a project on
every request and pushes once; there is no watcher yet, reload the page (or
click the project again) to see a change.

The projects shown are this package's `view.projects`. Nothing is listed in the
committed config, so the server shows this package alone. To view your own
checkouts, list them in a `deblob.local.json` beside `deblob.config.ts` —
gitignored, same keys as the config:

```json
{ "view": { "projects": ["../deblob", "/path/to/a/checkout"] } }
```

Each is a deblob project of its own: its config discovered from that directory,
its `node_modules` resolving its imports. A checkout without an install shows as
that project's error.

## Scripts

```
pnpm dev          Vite + the data server (run-p dev:*)
pnpm build        production bundle in dist/
pnpm test         vitest, 100% coverage through the contract
pnpm typecheck    tsc over the TypeScript sources
pnpm check        deblob on its own source, run from deblob's source
```

Everything runs `deblob` from `../deblob/src`, never from its `dist`: the check
script, the data server, the config's `import type { DeblobConfig }`.

## Tests

Through the contract: a writable store stands in for the source in the App spec,
`createWsSource` is tested against a real `ws` server. The corpus test mounts
every snapshot in `tmp/corpus/` — `tmp/` is gitignored throughout the repo — and
checks what is true of any: it mounts, every service root is listed, the counts
shown are the snapshot's. `vitest.global-setup.ts` regenerates
`tmp/corpus/deblob.json` on every run by running deblob's snapshot script driver
as a process; drop other snapshots there by hand: in any deblob project,
`node <this repo>/packages/deblob/src/drivers/snapshot/bin.ts > <name>.json`.
