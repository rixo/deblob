# Step 11 — the design's Viewer, fed by value

Ruled 2026-09-27 (rixo). Both checkpoints landed; the load sequence goes to a
step of its own (checkpoint 2, below).

Step 09 put the design's map in the product through a bridge: every snapshot
became `blob:` URLs, their page fetched and imported them, and the page was
remounted on each one. So every save reset the view, and a pick went through an
empty graph module whose import said "picked". That bridge existed only because
their pages read their data from URLs.

The design has since taken our ask (their replies of 2026-09-27): one page,
`Viewer.dc.html` (the shell: picker, legend, control bar, behavior panel,
sequence dock, and their `Map` inside), fed entirely by value. We checked it
headless in our runtime, on our live server: update in place, pick, error,
loading, view store, spec paths, dock (`tmp/` probe, not kept). This step mounts
it in the product and deletes the bridge.

## Goal

Success:

- `pnpm dev` and `deblob view` open on `Viewer.dc.html`, mounted once and fed by
  value from the snapshot source: no `blob:` URL, no fetch or import of project
  data by their pages, no remount on a new snapshot.
- Saving a file redraws the map in place: pan, zoom, folds and selection stay
  wherever their ids survive.
- Their picker is the project switch: a pick asks the server, their page shows
  loading until the project's snapshot arrives.
- A project error (the server's message) shows on their page, the last good map
  stays under it.
- The view (theirs to shape) survives a reload, per project.
- Call stacks and behavior reach the dock and the panel as values; a project
  with no call stacks has a closed dock and says why once.
- The bridge's workarounds are gone: `blob:` URLs, the `projects.json` fetch
  hook, `__deblobMapPick`, the remount, and their old `Deblob Map Host` page.
- The gates stay green: typecheck, tests, the viewer's 100 % coverage,
  `deblob check` on both packages.

Out of scope: step 10's `fns` (the behavior value carries the READMEs only, as
today); the view drivers' reshaping under `assembly-builds-only` (waits on
driver-layer's CLI pattern); any change to the design's files (asks go to their
`FROM-DEBLOB.md`).

## API

### Their contract (theirs, as replied 2026-09-27)

`Viewer.dc.html` takes, all optional, a prop winning over their room's URLs:
`projects` (each `{ id, label, graph, sequence, behavior }`), `project` (the id
shown), `graph-data` (their `buildGraph` object), `sequence` (the design's
sequence snapshot), `behavior` (`{ readmes, fns, docs }`), `on-project(id)`,
`loading`, `error` (a message), `view-store` (`{ load, save }`, one per project,
`load` synchronous, `save` debounced by them, the value opaque to us). Any of
`projects`, `graph-data`, `on-project` given = fed by value: then nothing of
their room is fetched, and a `null` means none.

### Ours: the bridge becomes a model

What each source state means for their page is a pure translation, and step 10
will add to it (`fns` into their words). So it leaves the spike's slack:

- **`buildViewerProps(state, previous, buildGraph)`**, pure, product code with
  rows (`lib/map/viewer-props.model.ts`): the source's state in, their props out
  (minus the store and the callback, which the host adds), with the snapshot
  they were built from, the next call's `previous`.
  - `projects`: every project the source knows, `id` its root, `label` its name
    or its root; `graph`, `sequence`, `behavior` `null` (by value, no URLs).
  - `project`, `graph-data`, `sequence`, `behavior`: from the current snapshot;
    none before the first one. `graph-data` is `buildGraph` of the design's
    sequence snapshot (step 09's shape), hooks on. `sequence` is that same
    snapshot, or `null` when the tracer could not read the tree. `behavior` is
    `{ readmes }`.
  - The same snapshot gives the same `graph-data` object (taken from
    `previous`): a state that only flips `loading` or `error` must not read as a
    new graph to their page, which would lay out again.
  - `loading`: the source's. `error`: the source's message, whichever project it
    names (the source keeps the last good snapshot under it).
  - `buildGraph` comes in as an argument: it is their code (`gen-graph.js`), the
    model does not import design code.
- **The host** (`map.js`, spike code, slack kept): mounts their page once with a
  reactive props object, updates it from `buildViewerProps` on each state, adds
  `on-project` (the source's `select`) and the project's view store.

### Ours: the view store, behind a port

Their view is kept where only the host can name it: per project. Storage is I/O,
so it gets a port.

- **`ViewStore` port**: `load(project): unknown | null`, `save(project, value)`.
  Synchronous (their contract reads once before the first layout). The host
  binds it to the project shown to hand them `{ load, save }`.
- Adapters: `localStorage` (the product; key `deblob.view.v1:<project root>`,
  JSON, a parse failure reads as none), memory (tests).
- The value is theirs and opaque: we store what they save, never read into it.

### What stays of our strip

Their page now draws loading and error. Two notices have no place on it yet:
"experimental map" (step 09's shipping rule: said wherever a user meets the map)
and "no call stacks for this project: <why>". Our strip keeps those two only,
above their page. Where they should live is the design's to pick (§ Open).

## Testing

Rows red first, then green.

- `buildViewerProps`: no snapshot yet (projects, loading, no graph); a snapshot
  (project, graph, sequence, behavior); a project with no call stacks
  (`sequence: null`); loading and error kept apart from the data; the same
  snapshot under a new state gives the same `graph-data` object, a new snapshot
  a new one; the labels (name, else root).
- `ViewStore`: the memory adapter and the `localStorage` one (jsdom): a save
  then a load gives the value back; another project reads none; a broken entry
  reads none.
- `main.spec` keeps its rows: the entry mounts the map on `#app`, `#debug` the
  outline.
- Probe, headless, on the product (`pnpm dev`, then `deblob view` from the built
  package): the map draws; a save on disk under the watch redraws in place
  (camera and selection kept); a pick through their picker switches project; a
  broken config shows their error with the map under it; a reload keeps the
  view; the deblob package's dock shows its hooks; no request for `blob:` or
  `data/` in the whole run.

## Implementation

Checkpoints, each its own commit; red rows first, as their own commit.

1. **Their files, then their Viewer by value.**
   - Their files as sent, in their own commit (the sync procedure): whatever
     their room stands at when this starts, `Viewer.dc.html` in. Their old
     `Deblob Map Host.dc.html` and the frozen `Gravity Map.dc.html` (used by
     nothing of ours) go with the switch, not in that commit: the product mounts
     Host until then, and the build must hold at every commit.
   - `buildViewerProps` with its rows; `map.js` mounts `Viewer.dc.html` once and
     feeds it; the bridge's URL code, the fetch hook and `__deblobMapPick` go;
     the strip keeps its two notices. Until checkpoint 2, their page keeps its
     view in their own `localStorage` keys (no `view-store` given).

   Landed: probed headless on `pnpm dev` — the map draws; a save on disk brings
   a new snapshot to the same page, camera and selection kept; a pick through
   their Viewer switches project; no request for `blob:` or `data/`. What it
   took:
   - The model reads a shape of its own, `ViewerInput`, which the source's state
     fits: importing `SourceState` from the source's port broke `inward-deps` (a
     model imports models only).
   - `bootPage` takes the host's props and hands back an `update`: one getter
     per key over a raw state, never a deep proxy, so a graph keeps its identity
     — their pages compare values to tell a new one from the same.
   - Their old Host and the frozen Gravity Map are deleted with the switch.

2. **The view store.** The port, both adapters with their rows, the host binds
   it per project. The probe runs whole on the built package.

   Landed: probed headless with `deblob view` from the built bundle (and
   `verify:pack` green) — their page reads the store once, before its first
   layout, and writes it under `deblob.view.v1:<root>`; a zoom survives a
   reload; a broken config shows their error with the map under it, and a fix
   clears it; no request for `blob:` or `data/`. What it took:
   - The entry builds the `localStorage` store inside the map's mount, not at
     the module's root, where it would add two violations to the entry's known
     debt.
   - The host hands them `{ load, save }` bound to the project shown, a new
     object only when the project changes (their contract reads it again on a
     new object only), `null` before the first snapshot.

   The reload restore holds by accident. Tracing it
   ([research/load-sequence.md](research/load-sequence.md)) showed that their
   page is mounted before any data, that nobody on our side names the project
   (every load runs the server's first project, then often again), and six
   defects on their side, among them a project switch that saves the old
   project's camera into the new project's slot. The sequence that works, and
   what must not happen before what, is in that note; our part is a step of its
   own, theirs goes to the design.

## Docs

The viewer README's map section (fed by value, no remount; experimental stays);
the chapter PLAN (step 11's line; § Open's "the view reset on each save" gap
closes); step 09's SPEC stays as it was (history).

## Open

- For the design: where "experimental" and "no call stacks: <why>" should live
  on their page.
