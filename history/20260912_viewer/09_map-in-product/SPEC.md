# Step 09 — the map in the product

Ruled 2026-09-25 (rixo). The map spike (step 07) runs on its own Vite host with
its own HTTP feed. The product, `pnpm dev` and `deblob view`, still shows the
step 05 outline. This step puts the map at `/` of the product, fed by the data
half over the socket. The outline stays reachable as a debug view.

We will run the design's map, as they send it, for a long time. What we build
around it is meant to last: the data pipeline. The map and what it asks for will
keep changing, faster than the pipeline. So the pipeline gets full quality now.
The map's host (our DC runtime, `dc-compile`) keeps the spike's slack, and the
design's own code stays byte for byte.

## Goal

Success:

- `pnpm dev` and `deblob view` open on the design's map at `/`, on the first
  configured project, fed by the data half's socket and nothing else: no HTTP
  data path, no import of deblob by the viewer.
- Saving a file under a project's watch redraws the map with the new tree, with
  no reload.
- The outline view (steps 01–06) lives at `#debug` and still passes its specs.
- The project switch works from the product: the snapshot of the chosen project
  arrives and the map redraws on it.
- A project the tracer cannot read (any tree that is not deblob, today) still
  gets its map, with no call stacks, and says so once.
- The symbol level and the READMEs are produced by product code at full quality:
  tests, structure, `check`. On deblob's tree, their output equals the spike's.
- `pnpm spike:map` and its host's HTTP feed are deleted once the product shows
  the same map.
- The gates stay green: typecheck, tests, the viewer's 100 % coverage,
  `deblob check` on both packages.

Out of scope: rewriting the call tracer (`sequence.ts`); it graduates with the
tracer work that follows this step. Any change to the design's files: what we
need from them is asked (§ Design asks). Porting the map to Svelte.

## API

### The contract: the snapshot carries the map's data

The chapter's rule stands: the UI's only input is a stream of whole snapshots
(PLAN § Decisions). The map's data joins the snapshot. There is no second
message kind and no request on demand (rixo, 2026-09-25: all on the socket, for
simplicity). The server and the page are on one machine, so 1.6 MB per push
costs nothing visible. A split waits until it is measured slow.

`Snapshot` (the viewer's `snapshot.model.ts`, the contract's one home) gains
`map`. It holds the design's sequence snapshot (their
`data/deblob.sequence.snapshot.2.json` shape), typed on the read side: the
fields their `gen-graph.js`, `sequence-data.js`, `call-stack.js` and Behavior
Panel read, and no more. It has three parts:

- **Symbols**: `modules` and `edges`, the snapshot's own rows with each module's
  symbols and each edge's imported names added, as the spike's `fine.ts` gives
  them.
- **Sequence**: `sequence` = `callables`, `participants`, `drivers`. It is
  `null` when the tracer cannot read the tree, with `sequenceMissing` saying why
  (the error's message).
- **READMEs**: `readmes`, README blocks keyed by directory (`.` = the root), the
  blocks of the spike's `readmes.ts`. Keyed by directory, not by container id:
  container ids come from their `gen-graph.js`, which runs in the browser.
  deblob asks for the root and every directory holding a covered file and each
  one above it, a superset of the containers.

The existing fields stay as they are. `modules` and `map.modules` hold much of
the same data twice. That is accepted: the debug view reads one, the map the
other, and on a local socket the bytes cost nothing.

### deblob: the feed behind a port

- **`MapFeed` port** (in the snapshot service): one function per part, so each
  one can graduate on its own. `symbolsOf(root, rows)` takes the fold's own
  `modules` and `edges`, `sequenceOf(root, symbols)` takes the symbol level,
  `readmesOf(root, dirs)` the directories. `runOf` calls them after the fold.
  (Landed in checkpoint 1 in place of the drafted `feedOf(root, graph)`: the
  spike's symbol pass reads the snapshot's rows, not the graph, and each part
  behind its own function is the graduation seam.)
- **Symbols and READMEs, product code** (their home is decided at build time,
  under `check`). They are rebuilt from the spike's `fine.ts` and `readmes.ts`
  with tests, not moved as they are. The spike's output is the oracle.
- **Sequence, spike code.** An adapter wraps the spike's `sequenceSnapshot`
  behind the port. When it throws, the `map` carries `sequence: null` and the
  message. That is not a project error: the rest of the snapshot is good.
- **Failures.** A throw from the symbols or the READMEs is a bug. It goes the
  way a failed run goes today: `report` in full, and the client hears that the
  server failed on that project.
- **Watch.** The watch set stays as it is: the root and every directory coverage
  spans. A README sits in a container's directory, so it is under the watch
  whenever its container is covered. That is inferred from `watchSetOf`, not
  observed. A red row settles it.

### viewer: the map mounted in the app

- **Routes.** `/` is the map. `#debug` is the outline, as it is today. A hash,
  not a path: the view service has no fallback for unknown paths, and a debug
  view is no reason to add one.
- **gen-graph runs in the browser.** Their `gen-graph.js` is design code, so it
  lives in the viewer and never in deblob. The viewer calls
  `GenGraph.buildGraph(snapshot.map, opts)` for the graph. `opts` is the
  spike's: hooks on, `initialCollapsed` as in the spike host.
- **The bridge, until the design takes the asks.** Their pages read data from
  URLs: `./data/projects.json` by `fetch`, the graph by `import()`, and the
  sequence and behavior by `fetch`. The bridge is ours, spike code in our host.
  It never edits their files.
  - The graph, the sequence and the behavior for the current snapshot become
    `blob:` URLs, new ones on each snapshot.
  - `./data/projects.json` answers every project the server offers: their picker
    is the project switch (rixo, 2026-09-25, at cp2's review: connect to their
    dropdown, invent nothing). Only the current project has data; any other's
    graph is an empty module whose import says it was picked (their picker's
    only word until design ask 3), and the bridge sends `select`.
  - On a new snapshot, the page is remounted. Cost, confessed: their saved view
    (pan, zoom, selection) is keyed by the graph URL, and a new `blob:` URL has
    no saved view, so each redraw starts from the default view. Design ask 2
    removes that cost.
- **dc-compile and the DC runtime** move from `src/spike/map/host/` into the
  product's Vite config and app, keeping the spike's slack. The design's files
  move with them, still byte for byte.

### Shipping: the experimental map is published

Ruled 2026-09-25 (rixo). The map will likely run the design's pages on `main`
for a long time, and the spike will not be cleaned up by then. The goal is to
publish our packages (0.0.x), install `deblob`, and have `deblob view` work,
with the map marked experimental.

- The spike code the product imports ships: the sequence adapter and the tracer
  in deblob's `dist`, and the design's pages and the DC host in the viewer's
  bundle. Step 07 kept spike code out of `dist`. For the code the product
  imports, that rule is lifted here. Spike code nobody imports (the feed's CLI
  entry, the spike host) still never ships.
- The slack stays: spike code is still out of `check` and coverage, and it is
  still marked "delete with the directory".
- "Experimental" is said wherever a user meets the map: the README of each
  package and one line on the page.
- A published `deblob view` shows what `pnpm dev` shows. The packed-package run
  in CI (it already serves the viewer from the tarball) proves it. One gap,
  found in checkpoint 1: the tracer loads `typescript` at run time, and
  `typescript` is not one of deblob's dependencies. An install without it has no
  call stacks, even on deblob's own tree; `sequenceMissing` says why. Adding the
  dependency is a ruling of its own, left for the tracer work.
- **Before a real release, the map is fully connected**, experimental or not
  (rixo, 2026-09-25). A 0.0.x may ship the gaps this step leaves: no call stacks
  on a tree the tracer cannot read, the view reset on each save. A real release
  may not. The gate goes on the chapter PLAN's § Open.

## Design asks

Posted in their `data/FROM-DEBLOB.md` (rixo, 2026-09-25: we have privileged
requests there). They are one ask, "the host feeds the map by value", in four
parts:

1. **Data by value.** The map host takes `projects`, and for the current project
   its graph (`buildGraph`'s object), sequence snapshot and behavior, as props.
   URLs stay as their own room's path.
2. **A new value is an update, not a new map.** A new graph for the same project
   redraws in place: pan, zoom, folds and selection are kept where their ids
   survive.
3. **The project pick goes out.** Their picker calls back with the chosen id.
   The data for it arrives later: a loading state until then.
4. **A project error has a place.** The server's `error` message (a broken
   config) shows on the map, and the last good map stays up.

Their reply's stale default paths (`graphSrc()` fallback, the `stackOf` gate on
`./deblob-seq-graph.js`) and the three fixes we still owe them go out in the
same post.

## Testing

Rows are written red first, then made green.

deblob (snapshot service spec, memory adapters, a memory `MapFeed`):

- A run's snapshot carries the feed's `map` for that project.
- A feed whose sequence throws: the snapshot carries `sequence: null` and the
  message. The client hears a `snapshot`, not an `error`.
- A feed whose symbols throw: reported in full, the client hears that the server
  failed on that project, and the connection lives on.
- On the real watcher (chokidar spec): a README edited in a covered directory is
  a change. This row settles the watch inference.

Symbols and READMEs: rows on small fixture trees for each shape the spike
handles. Then the parity row: the product functions' output on deblob's own tree
equals the spike's, deep-equal, while both exist. That row goes when the spike's
two files are deleted.

viewer: whether anything is asserted on the map side is open, not ruled (rixo,
2026-09-25: it moves like a comet, to be seen). This step adds no map-side rows:
the map host, the bridge and the switch strip are spike code, under the spike's
slack: no rows, no coverage. The product code this step touches keeps its
coverage: the route choice (`/` or `#debug`) gets its rows in `main.spec`, with
the map host stubbed. The outline's specs stay as they are.

Probe, by hand in Chrome on both live projects: the map at `/`, a save redraws
it, the switch, `#debug`. Then `deblob view` from the built package.

## Implementation

Checkpoints, riskiest first. Each checkpoint is its own commit.

1. **One page in our app.** The map mounted at `/` in the product, fed by the
   bridge from a snapshot whose `map` comes from the spike feed through the
   port. The unknown here is whether their pages run inside our app shell. The
   spike ran them alone on the page.

   Landed: their pages run in our app, in `pnpm dev` and in `deblob view` from
   the built bundle, on deblob's tree with its call stacks (414 callables, 12
   READMEs, 6 hooks, the spike host's numbers) and on the viewer's without them.
   The spike host's feed now goes through the same service and port. What it
   took:
   - `#debug` came forward from checkpoint 2, read once at load: without it the
     outline and its entry spec would have no way in for a checkpoint.
   - The DC compiler imported its runtime by a root path
     (`/dc-runtime.svelte.js`), true only in the spike host's Vite root; it now
     imports it by file path.
   - The `dc` plugin moved out of the spike host's config (`host/dc-plugin.js`),
     used by both configs. It answers their engine scripts at the app's root,
     listed from `design/`, so their data and docs never reach `dist`
     (`publicDir` would copy whatever a local pull holds). Vite's dependency
     scan starts from `index.html` only, and skips the pages.
   - The spike's symbol pass takes the run's rows instead of running a second
     extraction.

   Gaps, confessed:
   - The tracer relabels `src/drivers/cli/main.ts` as a driver in its own module
     list; the port keeps only `callables`, `participants` and `drivers`, so the
     map shows that file as the config classifies it (assembly).
   - Their Sequence Panel fetches its default path
     (`data/deblob.sequence.snapshot.2.json`) before a project is known: one
     console error per load. The spike host answered that path; the product does
     not. It is one of the stale default paths in § Design asks.
   - An edge the symbol level did not match carries no `symbols`, which their
     `gen-graph.js` requires; the bridge gives it an empty list.

2. **Live and switch.** Remount on each snapshot, the switch (their picker),
   `#debug` on a hash change.

   Landed: probed headless on the three projects of this machine, in dev and in
   `deblob view` from the bundle — first map, a switch to deblob (call stacks
   up, the tracer's line gone), a save redrawing it, `#debug` and back on the
   same project with no new request. What it took:
   - The entry mounts the next view before tearing the last one down: the source
     keeps a subscriber, so its socket and snapshot stay. One row: the outline
     on `#debug`, the map again after, and no remount on a hash that keeps the
     view (the guard was mutated off: the row went red).
   - The switch is their picker (rixo at review: a strip of buttons of ours was
     invented UI). `projects.json` lists every project; a project not shown gets
     an empty graph module whose import calls the bridge — their pick does
     `import(project.graph)`, the only word it gives — and the bridge sends
     `select`. The snapshot remounts the page, which reopens on the project
     their picker stored (their localStorage; their `?project=` URL parameter
     wins over it, so a page opened with one follows it back). Labels are the
     manifest names: their picker shows the root beside each.
   - The strip left is plain DOM in the bridge: loading, the server's error, the
     tracer's reason (the goal's "says so once": while that project is shown)
     and the "experimental map" tag. Spike code, outside the coverage gate a
     `.svelte` file would fall under.
   - Their page's root is `position: fixed; inset: 0`, so it covered the strip
     and took its clicks. Our `#dc-root` gets `contain: layout`, which makes it
     the containing block of fixed descendants: their page fills the space under
     the strip, their file untouched.
   - "Experimental" is said on the strip and in both READMEs (deblob's names the
     gaps and `/#debug`).

   Gaps, confessed: each remount leaves one more copy of the DC runtime's
   full-page style in `<head>`, and its probe hook (`__dcLogics`) keeps every
   page instance ever made; both are spike runtime, gone with it.

3. **Symbols and READMEs graduate.** The product functions, their rows, the
   parity row.
4. **The spike host goes.** `pnpm spike:map`, the host's HTTP feed and the
   spike's `projects.ts` are deleted, along with the two shortcuts step 07
   listed (the relative import of the feed, the direct call into deblob's config
   code).

## Docs

- `packages/viewer/README.md`: the map at `/`, `#debug`, the data by snapshot.
- `packages/deblob/src/lib/snapshot/README.md`: `MapFeed`, the `map` field, the
  sequence's `null`.
- The home of symbols and READMEs: their README.
- Step 07 SPEC: nothing (frozen). Chapter PLAN: step 9 on the list, the design
  track's § Sent row for the post, the release gate on § Open.
