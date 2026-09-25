# @deblob/viewer

The deblob viewer: a browser app over a codebase deblob has extracted, launched
by `deblob view`. At `/` it shows the design's map of a project — experimental:
the design room's pages, run as they send them, on the snapshot's `map` (step
09). At `#debug` it shows the outline: what the project is, how big, which
services, which files under each, by layer. The entry follows the hash: the next
view is mounted before the last one goes, so the socket and the snapshot stay
across a switch.

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
  `modules` (path, layer, service root, private, parsed), `edges`, `unresolved`,
  and `map`: what the design's map draws — the modules again with their exports
  (`symbols`) and their count of internal declarations, the edges again with the
  names they import, the call stacks (`sequence`, `null` with `sequenceMissing`
  saying why when the tracer cannot read the tree), each directory's README as
  blocks. Typed on the read side: the fields the design's code reads. `LAYERS`
  is the layer vocabulary, in display order.
- The protocol over the socket. Server to client: `projects` (the list, each
  root and name), `snapshot`, `error` (project, message). Client to server:
  `select` (project root). On connect the server sends `projects`, then the
  first project's `snapshot`; a project whose extraction fails yields `error`
  and the connection lives on. `projects` is the whole menu: a `select` naming
  anything else answers `error` too, and is not run. Answers come in order: once
  a `select` is run, nothing more arrives for the project shown before it (a run
  still going for that project is dropped), so the last `snapshot` or `error` a
  client receives is the answer to its last `select` that the server ran. The
  messages carry no request id because the client does not need one.

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

## The map

Spike code, under `src/spike/map/`, outside `check` and coverage (step 09).
`design/` holds the design room's files as they send them; `host/` runs them:
`dc-plugin.js` compiles their `.dc.html` pages to Svelte on our DC runtime and
answers their engine scripts (the `.js` their pages load relative to the page)
at the app's root, in dev and in the build — only those files, never their data
or docs. `map.js` is the bridge: their page reads its data from URLs, so it
answers `./data/projects.json` with every project, so their picker is the
project switch, and hands the current one's graph, call stacks and READMEs over
as `blob:` URLs made from the snapshot's `map`. Any other project's graph is an
empty module whose import tells the bridge it was picked — their pick imports
the graph, its only word today — and the bridge asks the server for it. Each new
snapshot remounts their page: they keep a view (pan, zoom, selection) per graph
URL, and a new URL has none, so a redraw starts from their default view — until
they take data by value and update in place (our ask). Above the page, a strip
of ours: loading, the server's error, the tracer's reason when a project has no
call stacks, and the "experimental map" tag. Their page's root is
`position: fixed`; our `#dc-root` contains it (`contain: layout`) so it fills
the space under the strip.

## The dev cycle

```
pnpm dev
```

Two processes: Vite serving the page, and deblob's data server run from its
source (`node --watch ../deblob/src/drivers/serve/bin.ts`, port 5175) with this
package as its cwd. Vite proxies `/deblob/ws` to it — and because the entry
builds the socket URL from `location.host`, the browser opens it on Vite's own
origin, which the proxy forwards unchanged. So the data server sees a
same-origin handshake and applies the same rule `deblob view` does, with no
dev-only escape: a page on another local port is refused here too. A client of
your own needs `--origin http://localhost:5173`, or whichever port Vite took.
The server watches the project it shows — every directory its coverage spans,
plus its root for the config files — and pushes a fresh snapshot after a change
settles, no reload, no click. Editing deblob's own source (or this package's
`deblob.config.ts`, which the server loads) restarts the server; the page
reconnects on its own, the last snapshot staying up meanwhile, and comes back on
the project it was showing.

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
To view your own checkouts, list them in a `deblob.local.ts` beside
`deblob.config.ts` — gitignored, same keys as the config (the local list
replaces the committed one):

```ts
import type { DeblobConfig } from "../deblob/src/index.ts"

const local: DeblobConfig = {
  view: { projects: ["../deblob", "/path/to/a/checkout"] },
}

export default local
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
`createWsSource` is tested against a real `ws` server. The entry's spec checks
the route — the map at `/`, handed `#app` and the source, the outline at
`#debug` — with the map stubbed: the map itself has no rows yet. The corpus test
mounts every snapshot in `tmp/corpus/` — `tmp/` is gitignored throughout the
repo — and checks what is true of any: it mounts, every service root is listed,
the counts shown are the snapshot's. `vitest.global-setup.ts` regenerates
`tmp/corpus/deblob.json` on every run by running deblob's snapshot script driver
as a process; drop other snapshots there by hand: in any deblob project,
`node <this repo>/packages/deblob/src/drivers/snapshot/bin.ts > <name>.json`.
