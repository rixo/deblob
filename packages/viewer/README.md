# @deblob/viewer

The deblob viewer: a browser app over a codebase deblob has extracted, launched
by `deblob view`. It shows a project's snapshot: what it is, how big, which
services, which files under each, by layer.

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
after the last. `createWsSource` also takes an `initial` state to start from
instead of a blank connect: it is shown as it was handed over while the socket
opens — nothing blinks on the way in — and the project it was showing is asked
for again.

## How it is served

Two ways, one page. **`deblob view`**, in any project with `deblob` installed:
the built bundle of this package is copied into `deblob`'s own `dist/` at build
time, and its view server answers the page, its assets and the WebSocket channel
on one port (3615 by default). Nothing to install, no Vite, no second process.
The `./bundle/*` export is there for the day `deblob` depends on this package
instead of embedding it; nothing resolves through it yet.

**`pnpm dev`**, below, for working on the viewer itself. Either way the app
connects to `/deblob/ws` on its own origin — in dev that is Vite's proxy, under
`deblob view` it is the server itself — so the entry has no idea which one it is
talking to.

## The dev cycle

```
pnpm dev
```

Two processes: Vite serving the page, and deblob's data server run from its
source (`node --watch ../deblob/src/drivers/serve/bin.ts`, port 5175) with this
package as its cwd. Vite proxies `/deblob/ws` to it. The server watches the
project it shows — every directory its coverage spans, plus its root for the
config files — and pushes a fresh snapshot after a change settles, no reload, no
click. Editing deblob's own source (or this package's `deblob.config.ts`, which
the server loads) restarts the server; the page reconnects on its own, the last
snapshot staying up meanwhile, and comes back on the project it was showing.

Editing this package's own source updates the page in place too. Components are
their own HMR boundaries; everything else under the entry — the source adapter,
the models — has none, so `src/main.ts` is the boundary for all of it: it
unmounts the app, hands the state it was showing to the next instance of itself
through `import.meta.hot.data`, and mounts again. The socket is recreated with
it — the adapter is the socket, and there is nothing in a live socket to patch —
but the snapshot never leaves the screen. An update the old state does not fit
is a reload away, as hot updates go.

The projects shown are this package's `view.projects`: the committed config
lists this package and `deblob`, so the switch has two entries out of the box.
To view your own checkouts, list them in a `deblob.local.json` beside
`deblob.config.ts` — gitignored, same keys as the config (the local list
replaces the committed one):

```json
{ "view": { "projects": ["../deblob", "/path/to/a/checkout"] } }
```

Each is a deblob project of its own: its config discovered from that directory,
its `node_modules` resolving its imports. A checkout without an install shows as
that project's error.

## Scripts

```
pnpm dev          Vite + the data server (run-p dev:*)
pnpm build        production bundle in dist/ (what `deblob view` serves)
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
