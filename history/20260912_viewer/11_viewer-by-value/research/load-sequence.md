# The load sequence — traced, and the one that works

Research for step 11 (rixo, 2026-09-27): the view must not show anything before
it can produce the full initial rendering — the actual project known, its state
restored, everything. The goal is simple; the sequence that reaches it is not.
Trace it for real, spec the sequence that works, and say what must not happen
too early ("not before …"), including transitions that premature content
triggers.

Marks: **observed** = seen in the trace below; **read** = from code, not run;
**inferred** = follows from both, not traced step by step.

## How it was traced

`deblob view` from the built bundle, served in `packages/viewer` (three
projects: the viewer first, then deblob), driven headless (Playwright, Chromium
1400 × 900). Timestamped logs were added to a temporary copy of our host
(`map.js`: each source state, the boot) and of their pages (`Viewer.dc.html`:
mount, `firstPick`, each update of `project` / `graph-data` / `view-store`,
`loadGraph`, `fit`, the 1 s `checkLost`; `Map.dc.html`: mount, `load`, the
inputs of `placeCamera`, the pane size, `fit` and whether it jumps or tweens,
`camTo`, `go`, a load that kills a running tween, `reveal`, `writeView`), then
removed. The socket's frames were logged from the browser side; a 50 ms sampler
logged what was on screen: the number of nodes under `#dc-root` and the Map
part's camera (`window.__gmap.cam`, their console hook).

The zoom readout on their control bar is not a measure: it is rewritten only
when the Map reports its camera, not after a restore. A first probe read it and
concluded wrongly that the view was lost on reload.

Scenarios: first load on empty storage; zoom, then reload; reload with a
remembered project that is not the server's first; a pick through their picker.
A save on disk (same project, new snapshot) was not traced in this pass; step 11
checkpoint 1's probe saw its camera and selection kept.

Times are milliseconds from navigation, from one run each. The order of the
events below changes from run to run: that is itself a finding (§ Races).

## Who takes part

- **The server** (`serveSnapshots`, deblob): on connect it sends `projects`,
  then runs its first project and sends that snapshot. A `select` arriving
  during a run marks another run; an answer for a project no longer current is
  dropped.
- **The socket source** (`ws-source.adapter.ts`, ours): opens on the first
  subscriber. On a plain load it never says which project it wants (only a
  source handed an `initial` state asks again for that state's project).
- **The host** (`map.js`, ours): subscribes, imports their page, boots it on the
  props built so far, then hands it each new state. The view store is bound to
  the project of the current snapshot, `null` before the first one.
- **Their Viewer** (the shell): on mount, when given `projects`, picks
  `project ?? firstPick(projects)` — `firstPick` reads `?project=`, then their
  own `localStorage` key `deblob-map.project`, else the first project — and asks
  the host for it (`on-project`) when no graph is there yet and the pick differs
  from the `project` prop. Its `loadGraph` restores its own view (the `host`
  field of the view-store object) or, when none is saved, calls `fit()` at the
  next frame and again 80 ms later; under the gravity engine `fit()` is a
  command to the Map part.
- **Their Map part** (the gravity map inside the Viewer): `load` lays out,
  `placeCamera` restores the saved camera (the `map` field) or fits, `reveal`
  shows the world once every part is mounted, and only from then on does it save
  (`_restored`).

## What happens today

### First load, empty storage (observed)

```
 12  host: state {projects: 0, loading}          our strip only
 17  ← projects (viewer, deblob, deblob)
 30  host boots their page: project null, no graph
 56  Viewer mounts; firstPick → the first project (nothing remembered)
     → on-project → select viewer                 duplicate of the server's own run
 60  their shell on screen, empty map area       PREMATURE: shell without data
151  ← snapshot viewer
153  Viewer: graph arrives; loadGraph: no saved host view → fit at rAF + 80 ms
179  Map mounts, loads
246  Map placeCamera: nothing saved → fit
249  Map revealed at its default camera (k 0.80, x 60)
253  Viewer fit → Map fit (tween)
260  ← snapshot viewer again (the select's answer)
264  Map load (keep) — kills the running fit tween
```

In this run the fit was killed by the duplicate snapshot, and the map stayed at
the Map's default camera, never fitted. In the next run the second snapshot came
before the reveal: the Map loaded twice, was revealed at the default camera (k
0.80), and then tweened for 400 ms to its fit (k 1.30). **PREMATURE**: the
default camera is shown, then animated away from.

### Reload with a saved view (observed)

The view is restored: k 2.08 before the reload, 2.08 after, read from the
camera. Their page reads our store once (at ~40 ms, before its first layout;
`load()` returns the saved object). But on another run, with the camera saved at
k 1.28, `placeCamera` judged the restored camera off screen and called `fit()`;
the fit's tween was then killed by the duplicate snapshot, and the saved camera
survived **by accident**. The restore path never matches the fingerprint
(`fpMatch: false` on every reload): it falls back to the anchor (§ Defects, T4).

### Reload with a remembered project (observed)

`deblob-map.project` set to deblob, the server's second project:

```
 27  Viewer mounts: firstPick → deblob; select deblob
     (the server's run of the viewer, already started, is dropped: one snapshot)
 59  their shell on screen, empty map area       PREMATURE, for 1.1 s here
821  ← snapshot deblob (2.1 MB)
913  Map mounts, loads; Viewer fit
1162 Map placeCamera: nothing saved for deblob → fit (tween)
1171 Map revealed at the default camera (k 0.80)
1192…1661 tween to the fit (k 0.52)              PREMATURE: default then animated
```

The remembered project works only because our `project` prop is `null` at mount;
had the snapshot arrived first, `project ?? firstPick` would have taken the
server's first project and ignored the remembered one.

### A pick through their picker (observed)

On the viewer project, pick deblob:

```
7823 host: loading; → select deblob; their "loading…" over the old map
8517 ← snapshot deblob
8555 the Map still mounted (the viewer's) gets deblob's graph first, before the
     Viewer's project changed: it loads it as a new graph of the SAME project
     (keep), camera kept
8556 Viewer: project viewer → deblob; loadGraph (cold); no saved host view for
     deblob → fit scheduled
8822 that old Map instance saves its camera (k 1.30, the viewer's) through the
     store — now bound to deblob                  CROSS-PROJECT WRITE
8852 a new Map mounts and loads deblob
9106 placeCamera: saved k 1.30, fingerprint MATCHES (just written) → "restored"
9136 revealed at k 1.30                           deblob at the viewer's camera
9135…9607 Viewer's fit → tween to k 0.21          PREMATURE: wrong camera, animated
```

What the user sees: deblob appears at the viewer's zoom, then zooms out.
deblob's slot in the store now holds a camera it never had; had the Viewer not
fitted, it would have stayed.

## Defects

Ours:

- **O1 — their page is mounted before any data.** The host boots it as soon as
  its module is imported (~30 ms), with no project and no graph: their shell
  shows with an empty map for as long as the first run takes (0.1 s on the
  viewer, 0.8–1.1 s on deblob). And their `firstPick` runs on whatever
  `projects` holds at that moment: an empty list throws (`list[0].id`) — today
  the `projects` frame wins the race against the module import. (observed; the
  throw read)
- **O2 — nobody on our side knows which project to show.** The server runs its
  first project on every connect; the client never names one; their page's own
  `localStorage` is the only memory, and it answers only when our `project` prop
  happens to be `null` at mount. So every load runs the server's first project
  and then, when their pick is that same project, runs it again (a duplicate 2.1
  MB snapshot on deblob), or throws the first run away. The duplicate is what
  makes the outcomes below vary. (observed)

Theirs (to send; § What goes where):

- **T1 — the Map reveals before its camera is final.** With nothing saved,
  `placeCamera` fits; `fit()` tweens because `ready` is already set; the reveal
  happens at the default camera and the tween runs on screen. A first placement
  must jump, and the reveal must wait for it. (observed)
- **T2 — the Viewer fits the Map on its own.** `loadGraph` fits when the Viewer
  has no saved `host` view, and under the gravity engine that fit is sent to the
  Map after the Map restored its own camera: it overrides the restore. The
  camera is the Map's; the shell must not decide it. (observed, pick)
- **T3 — a project switch reaches the old Map first.** The Viewer passes the new
  project's graph down before its own project changes: the old Map loads it as a
  new graph of its own project, keeps its camera, and saves it through the store
  now bound to the new project. The old project's view must be flushed to the
  old project's slot before anything of the new one arrives, and a graph must
  never be loaded as "same project" when the project changed in the same update.
  (observed)
- **T4 — the camera fingerprint changes with every run.** `fp` includes the
  snapshot's `generatedAt`, new on each run, so after any reload the saved
  camera never matches and the anchor fallback decides. `generatedAt` says "a
  new delivery", not "a different layout"; the fingerprint should be the
  layout's inputs only (their content). (observed: `fpMatch: false` on every
  reload; `true` only within one page life)
- **T5 — late corrections.** The Viewer's `checkLost` runs ~1 s after a restore
  and may `fit()` (a pane more than 25 % off the saved one) or put back its own
  camera; `placeCamera` itself may fit after judging the restored camera off
  screen. Any camera change after the reveal is a visible jump or tween. (read;
  `checkLost` observed putting back the shell's camera, no visible change)
- **T6 — the readout is not refreshed on a restore** (`onGCamera` is not called
  by `placeCamera`): the bar says 100 % while the map is at 208 %. (observed)
- Minor, read only: `loadGraph(first = false)` when the graph arrives after
  mount never binds the nested engine's wheel listener; `firstPick([])` throws.

### Races

The same scenario gave different outcomes on two runs: the duplicate snapshot
lands before the reveal (two loads, then a tween) or after it (it kills the fit
tween, the camera stays wherever it was). Which of the page's module import, the
`projects` frame, the first snapshot and the duplicate comes first decides what
is shown. A sequence that works has no such order left to chance: each step
waits for what it needs.

## The sequence that works

Five steps, each gated on the one before. Nothing of their page is on screen
before step 4 ends.

1. **Know the project (host).** The host decides which project to show before
   anything runs: the URL's `?project=` if any, else the project the host
   remembers (its own storage, one key), else none, meaning "the server's
   default". Identity is the host's (step 09's research: the host owns storage
   and identity, the page owns restore).
2. **Ask for it (socket).** The client names that project on connect, and the
   server runs nothing before the client has spoken: its first message is the
   project wanted, or "your default". One run, one snapshot.
3. **Have everything (host).** The host waits for the first snapshot of the
   wanted project (or its error). Then it has, at once: the project list, the
   project, its graph, call stacks and READMEs, and the view store bound to that
   project, whose `load()` is synchronous. Until then, a loader of ours, nothing
   of theirs.
4. **Mount with all of it (host → their page).** Their page is mounted once,
   with every prop present and `loading: false`. It lays out, places the camera
   — the saved one, or a fit — **as a jump**, and reveals the world only then.
   Nothing moves after the reveal unless the user moves it.
5. **Save from then on (their page).** Saving starts after the reveal (as today)
   and goes to the slot of the project whose graph is drawn.

A **project switch** repeats 2–5 inside a mounted page: the pick goes to the
host (`on-project`); the old map stays under a loading mark until the new
snapshot is in; then one update carries the project, its graph and its store
together (the host already does this); their page flushes the old project's view
to the old slot first, then loads the new project cold (never "same project"),
jumps to its saved camera or its fit, and reveals.

A **new snapshot of the same project** (a save on disk) is the one case that
updates in place: same project, new graph, camera and selection kept where their
ids survive, no fit.

## Not before …

- Their page is not mounted before the first snapshot of the wanted project (or
  its error) is in — never on an empty project list, never with `project: null`.
- The server does not run a project before the client has said which one.
- The client does not accept the server's first project as "the" project when it
  wanted another: it asks on connect, not after a first answer.
- A project is not handed to their page before its graph and its view store:
  `project`, `graph-data` and `view-store` change in one update, always.
- The view store is not bound to a project whose graph is not the one drawn.
- Nothing is saved before the reveal; and after a switch, nothing of the old
  project is saved through the new project's store.
- The world is not revealed before the camera is final (restored or fitted, by a
  jump).
- The shell does not fit, re-anchor or "put back" the Map's camera — not at
  mount, not on a timer. Under the gravity engine the camera is the Map's alone.
- No tween runs from a camera the user never saw settle: a tween is only for a
  change the user caused (zoom, fit, fold) or a relayout of what is on screen.
- The camera fingerprint does not depend on when the snapshot was made, only on
  what the layout is made of.

## What goes where

Ours (a step of its own, § Open):

- The host remembers the project shown and names it on connect (new: a host
  storage key; `select` sent on open on a plain load too).
- The server waits for the client's first word before running (protocol change
  in deblob's `serveSnapshots`, and its README).
- `map.js` mounts their page only once a first snapshot or error is in, with
  every prop; a loader of ours until then.
- With the project always given, their page's own `firstPick` and
  `deblob-map.project` fall out of the path: no second `select`, no duplicate
  run.

Theirs (a FROM-DEBLOB post, rixo's go): T1–T6, stated as the rules above, with
this trace as evidence.

## Open

- The loader of step 3 is ours, before their page exists (rixo, 2026-09-27):
  temporary, to be designed in a polish phase. Today there is no loader to speak
  of: on a local machine the wait is short, and what shows is a freeze while the
  new data is taken in.
- On a switch, the old map stays under their loading mark for now (rixo,
  2026-09-27: fine for now).
- Our part of the fix is a step of its own (rixo, 2026-09-27), not a checkpoint
  of step 11: it changes deblob's protocol.
- A save on disk was not traced here; its path (update in place) should be
  traced the same way once the above lands.
