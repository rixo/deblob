# Step 12 — the load sequence

Ruled 2026-09-27 (rixo). Checkpoint 1 landed; checkpoint 2 to go.

Step 11's trace ([research](../11_viewer-by-value/research/load-sequence.md))
found two defects on our side. Their page is mounted before any data: their
shell shows with an empty map until the first snapshot arrives (0.1 s on the
viewer, 1.1 s on deblob), and their mount runs on whatever the host has at that
moment. And nobody on our side names the project: the server runs its first
project on every connect, then their page asks for the project it remembered, so
a load runs one project twice, or runs one for nothing. The duplicate run is
what made the outcomes of that trace change from one run to the next.

This step fixes our part of the sequence the note specifies (steps 1–4 of § The
sequence that works). The design's part (their six rules) was posted to them on
2026-09-27; it lands on their side, and a pull brings it in.

## Goal

Opening the viewer shows the right project, whole, at once: nothing of the
design's page appears before the host can hand it the full first rendering — the
project to show, its data, its saved view — and on our side nothing is left to
the order in which things happen to arrive.

Success:

- A load runs one project, once: the server runs nothing before the client has
  said which project it wants.
- The project shown is the one shown last in this browser, while the server
  still lists it; otherwise the first project listed.
- Their page is mounted once, on the first state that carries the chosen
  project's snapshot or its error, with every prop present. Until then, a loader
  of ours, and nothing of their page.
- Their page never has to pick a project: `project` is never `null` when it
  mounts, so their `firstPick` and their own project memory are off our path,
  and they send no `select` of their own on mount.
- A project switch and a save on disk behave as today.
- The gates stay green: typecheck, tests, the viewer's 100 % coverage,
  `deblob check` on both packages.

Out of scope, and why:

- The design's rules (reveal once the camera is final, the camera is the Map's,
  a switch never reaches the old map, a fingerprint without `generatedAt`, no
  late corrections, the readout): theirs, posted. Until they land, a first load
  still shows their fit tween, and a switch can still carry the old camera. This
  step removes the races on our side; it does not remove those.
- What the loader looks like: rixo, 2026-09-27: ours, temporary, designed in a
  polish phase. Here it is a line of text.
- `?project=` in our URL: nothing asks for it yet (§ Open).

## API

### The protocol (deblob, breaking)

`serveSnapshots`, on connect: `projects`, and nothing else. It runs nothing and
watches nothing until the client's first `select`. From then on, as today: a
`select` answers that project's snapshot and moves the watch to it, a change
under the watch answers again.

Breaking for any client that waited for a snapshot after `projects`; our two
clients are the viewer's socket source and its tests. `ServerMessage` and
`ClientMessage` keep their shapes; only the order changes.

### Which project (viewer)

- **`chooseProject(projects, last)`**, pure
  (`lib/snapshot/project-choice.model.ts`): the last project if the list holds
  it, else the first root listed. The list is never empty (the server refuses to
  start without a project).
- **`LastProject` port** (`lib/snapshot/last-project.port.ts`):
  `load(): string | null`, `save(root)`. Adapters: `localStorage` (the product;
  one key, `deblob.view.project`; a store that refuses a save drops it), memory
  (tests). The key is per origin, so two servers on two ports keep two.
- **`openOnLastProject(source, last)`**, a service
  (`lib/snapshot/last-project.service.ts`): it takes a `SnapshotSource` and a
  `LastProject` and returns a `SnapshotSource` (same port, so the entry, the
  outline and the map read it unchanged). When the first `projects` arrive and
  nothing was asked for, it selects `chooseProject(projects, last.load())`. Each
  snapshot it passes on saves that snapshot's project. A `select` from the page
  goes through, as today.
- **The socket source** keeps its API. Its `initial` path (a hot update hands it
  a state) already asks for that state's project on open, so the service has
  nothing to choose then.

### The mount (host, spike)

`map.js` boots their page on the first state carrying a snapshot or an error,
not before. Before it, the frame shows our loader (the strip's line, "loading…",
over an empty frame). Their page then mounts with `projects`, `project`,
`graph-data`, `sequence`, `behavior`, `view-store`, `loading: false` (or the
error, with no graph). After the mount, nothing changes: each state is an update
in place.

## Testing

Rows red first, then green.

- `serveSnapshots`: on connect, `projects` alone — no run, no watch — until a
  `select`, answered with that project's snapshot and its watch. The existing
  connect row changes accordingly. A client gone before its first `select`:
  nothing to close.
- `chooseProject`: the last root when listed; the first root when none is kept;
  the first root when the last one is no longer listed.
- `LastProject`: both adapters — a save then a load gives the root back; a
  refused save is dropped; nothing saved reads `null`.
- The service: on the first `projects`, it selects the chosen project (once,
  even when `projects` come again after a reconnect); a snapshot saves its
  project; a state handed over (`initial`, a snapshot already up) selects
  nothing; the page's own `select` goes through.
- The socket source's rows: its behavior does not change (a transport); the row
  whose title spoke of the server's first snapshot says the source asks for
  nothing, its caller chooses.
- Entry: no row; its source is a live socket, which the entry rows do not run.
  The probe checks the wiring.
- Probe, headless, on `deblob view` from the built bundle, with the step 11
  trace redone (logs in a temporary copy, removed after): one `select` and one
  snapshot per load; `#dc-root` empty until the first snapshot; their mount with
  a project; a reload onto a project picked before comes back on it; a project
  removed from `view.projects` falls back to the first.

## Implementation

Checkpoints, each its own commit; red rows first, as their own commit.

1. **The server waits** (deblob): the protocol change, its rows, the snapshot
   README. The viewer's socket-source rows and the service land in the same
   checkpoint, so no commit has a client waiting for a snapshot that never
   comes.

   Landed: the server sends `projects` alone on connect and runs on the first
   `select`; the viewer asks for the last project. Probed on `deblob view` from
   the built bundle: one `select` of ours per load. Until checkpoint 2 their
   page, still mounted before the first snapshot, sends a `select` of its own
   (their `firstPick`): a second run, and on a reload their remembered project
   wins over ours. What it took:
   - Three rows of deblob's serve driver (`drivers/serve/main.spec.ts`) read a
     snapshot right after `projects`; the red commit missed them (only the
     service's rows were run). They now name a project first.
   - `openOnLastProject` builds its store with `svelte/store`'s `readable`, a
     `service-purity` violation: the `pure` key takes package names only, and
     declaring `svelte` would declare its DOM runtime pure too. rixo: the
     subpath is pure, the violation accepted until deblob reads subpaths (PLAN
     card "`pure` by subpath").
   - The entry wraps its source at the module root: four more of the entry's
     known `assembly-builds-only` violations, left for the dogfood sweep with
     the rest (rixo).

2. **The mount waits** (viewer host): `map.js` boots on the first snapshot or
   error, our loader until then; the probe runs whole.

## Docs

deblob's snapshot README (the protocol: on connect, `projects` only); the viewer
README (the project remembered, the mount after the first snapshot, the loader);
the chapter PLAN (step 12's line); the model's protocol comment
(`snapshot.model.ts`).

## Open

- `?project=` as an entry point (the design honours it on first load, then drops
  it from the URL): useful for a link to a project; nothing asks for it yet.
- The loader's look: a polish phase (rixo, 2026-09-27).
