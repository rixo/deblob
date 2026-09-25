# State restore in the design's maps — what they persist, what breaks under us

Research for step 09 (rixo, 2026-09-26: a leak means the whole restore path was
never thought through; trace it all, on Host and on the new Gravity Map, and say
early where Gravity repeats Host's defects). Read from their code as pulled
2026-09-26 (mirror `tmp/design-2026-09-26/`, their Session 48h):
`Deblob Map Host.dc.html` lines 405–740, `Gravity Map.dc.html` lines 86–260,
their own `docs/state-restore.md` (Gravity's plan, "built" per their DECISIONS
47b).

Marks: **observed** = seen in a browser on our product; **read** = from their
code, not run; **inferred** = follows from what is read, not traced line by
line.

## The rule both pages break

A saved view is keyed by the graph's URL. That holds on their side, where a
graph is a file with a stable path. Under a host, a URL names a delivery, not a
graph: ours are `blob:` URLs, a new UUID each time the page is fed. So the key
changes on every load, and nothing that was saved is ever found again.

The right key is the project (what the user is looking at), and the right signal
that "the graph changed" is the graph's own content or `generatedAt`, never its
address.

## Host (`Deblob Map Host.dc.html`)

### What it persists

| Key                              | Holds                                                                                                                                                                         | Written                                                                                            | Read                                                    |
| -------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------- | ------------------------------------------------------- |
| `deblob-map.prefs.v1`            | 16 controls (`wheelZoom`, `chain`, `types`, `kinds`, `dirs`, `detail`, `zoomSel`, `flow`, `passBoxes`, `passInside`, `bundles`, `dockH`, `motion`, `aspect`, `arrowZ`, `hex`) | `componentDidUpdate`, when changed                                                                 | each graph load                                         |
| `deblob-map.view.v1:<graph URL>` | pane size, `pan` (screen px), `k`, `sel`, `pinned`, `collapsed`, `depth`, `seqSel`                                                                                            | `componentDidUpdate` (400 ms debounce); a 1 s interval; `pagehide`; unmount; before a project pick | each graph load, by the URL being loaded                |
| `deblob-map.project`             | the picked project id                                                                                                                                                         | a pick in their picker                                                                             | `projects.json` load, after `?project=` in the page URL |

Not persisted: the Sequence Panel's hook, folds and view mode; the Behavior
Panel's pin.

### Restore sequence (read)

1. `loadProjects`: `?project=` wins, then `deblob-map.project`, then the first
   entry.
2. `loadGraph`: import the graph, read the view under its URL, keep the ids the
   graph still has, apply `pan` and `k`.
3. Settle on the 1 s tick: wait out tweens, call data and 900 ms, then put the
   saved camera back; refit if the pane differs by over 25 %, or if nothing is
   on screen.

Their own doc names this fragile: three timing guesses, and a camera stored as a
pan, whose meaning depends on a layout that changes under it.

### Defects under our host

- **H1. The view never restores, and every load leaks a key.** **Observed**
  2026-09-26 on `pnpm dev`: panned 1,200 px, reloaded: back to the default
  camera; `deblob-map.view.v1:*` keys went from 1 to 2. Every reload, every
  redraw on a save and every pick writes a key under a URL nothing will load
  again. Their writes are wrapped in try/catch: at the quota, saving stops
  silently.
- **H2. A redraw loses the view even without a reload.** Read: we remount the
  page on each snapshot; the unmount saves under the old URL, the new page loads
  the new one. The cp2 "view reset on each save" confession is H1 seen from the
  other side.
- **H3. A pick can write the old project's view under the new project's key.**
  Read, not observed: `pickProject` sets the new project, then `loadGraph`
  imports it; if the 1 s tick fires in between, `saveView` computes the key from
  the new project and the state from the old one. `loadView` then restores the
  old camera on the new graph (folds and selection survive only where ids
  match). Harmless under us today because of H1 (the key is never read again);
  live the day keys are stable.
- **H4. `?project=` outranks every later choice.** Read, and the behavior seen
  in the pick probe: the URL parameter is read on each load and never updated on
  a pick, so a stale parameter beats the user's newer pick. Under us, each
  remount re-reads it: a pick on a page opened with `?project=` snaps back. Same
  fault as H1: saved state with no owner deciding when it stops being true.
- **H5. The camera is a pan, not a place.** Read: a pan restored onto a layout
  that changed (a new snapshot) points at a different place; nothing re-anchors
  it. Invisible under us because of H1.

## Gravity Map (`Gravity Map.dc.html`)

Their rewrite of the restore (their `docs/state-restore.md`), on a new map built
from `Map - Box` parts and `gravity-layout.js`. The design is sound on its own
ground: one write path (`go()` / `set()` / `applyCam()` → `save()`, 300 ms
debounce, flushed on `pagehide`, `visibilitychange` and unmount), nothing
written before restore, the camera stored as world centre plus zoom plus an
anchor box, a fingerprint deciding between exact restore and re-anchoring, the
world hidden until fonts load and every part mounts (1.5 s caps each).

### What it persists

| Key                                   | Holds                                                                    |
| ------------------------------------- | ------------------------------------------------------------------------ |
| `deblob-gravity.controls.v1`          | `flow`, `dirs`, `arrows`, `chain`, `focus`, `centre`, `depth` (global)   |
| `deblob-gravity.view.v1:<graph path>` | `folded`, `cards`, `sel`, `k`, `cx`, `cy`, `anchor { id, dx, dy }`, `fp` |

### Early warning: what it repeats, what it adds

- **G0. It cannot take our data at all.** Read: the graph is a prop naming one
  of three of their sample files (`SRC`, line 86: `deblob-seq` / `deblob-fine` /
  `ai-tools` → `./data/*-graph.js`). No `projects.json`, no picker, no sequence,
  no behavior; it mounts neither panel. Their note to us says the host contract
  is kept; for data it is not. Mounting it under our host today means a new
  bridge shape, or their contract first.
- **G1. H1 again, by design.** Read: the view key is `deblob-gravity.view.v1:` +
  the graph path. Their doc makes it explicit ("per graph file"). The day it
  takes a host URL, it leaks and never restores exactly as Host does.
- **G2. The fingerprint does not see a new snapshot.** Read: `fp` hashes
  `meta.generated || meta.files`; `gen-graph.js` writes `meta.generatedAt`,
  never `generated`. So a new snapshot with the same file count (every edit
  inside a file) fingerprints the same, and the exact camera is put back on a
  layout that moved: the drift the anchor path exists to prevent.
- **G3. A graph switch can write the old view under the new key.** Read, not
  observed: `flush()` computes the key from the current prop. A debounced save
  pending when `graph` changes fires during `load()`'s awaits (import, fonts),
  while `_restored` is still true: the old graph's folds, selection and camera
  land under the new graph's key. The ids are filtered on restore, and the
  camera falls back to fit when the anchor is gone, so the damage is a lost
  view, not a wrong one. Same shape as H3.
- **G4. Each remount blanks the map for up to 3 s.** Read: the reveal gate waits
  for fonts (1.5 s cap) and for every part to mount (1.5 s cap), world hidden
  meanwhile. Right for a cold load; under our remount-per-snapshot, a save
  becomes a blank map. Design ask 2 (a new value updates in place) stops being a
  nicety for Gravity: without it, live redraw is unusable.
- **G5. Controls are global across projects** (their open point, proposed
  global). `focus` and `depth` restored onto another project's graph are valid;
  worth a word only if focus should not follow.

## What we ask, when the batch goes

Ruled 2026-09-26 (rixo): the fix is split on ownership. Where view state is
stored, and under which identity, is the host's: only the host knows which
project is shown and when its data changed, and the `blob:` URLs are ours. What
is saved and how it is restored (camera as a place, anchor, fingerprint, reveal
gate) is the page's: it reads their layout's internals, and they are designing
it. So the brick is a port in the page contract, not their restore logic. We
post its shape; our adapter is built when they wire Gravity to it, so both
halves land and are checked together. Host gets nothing: Gravity replaces it.

### The view store (a port in the page contract)

The page takes an optional prop:

    viewStore: {
      load(): object | null   // what this page saved for the project shown, or null
      save(state: object)     // replaces it; JSON-serialisable; the page debounces
    }

- One store per project: the host scopes it. The page never builds a key and
  never reads a URL to name its state.
- Synchronous both ways: the page reads once at load, before its first layout.
- A new store (another project picked, or a new mount) means other state: the
  page reads again. Writes go to the store the page was given at that time.
- Without the prop (their own room), the page keeps its own storage, keyed as it
  likes: their adapter of the same port.
- Controls that are global on purpose (Gravity's `deblob-gravity.controls.v1`)
  stay the page's own business: they name no project.

What it fixes by construction: H1, H2 (no key from a URL), G1, H3 and G3 (the
store is fixed per project, a write cannot land under another project's name).

### The rest of the asks

1. Detect a changed graph by **`meta.generatedAt`** (or a content hash), never
   `meta.generated`, never the URL. Fixes G2; gives H5 its trigger.
2. `?project=` is **an entry, not a standing order**: honoured on first load,
   then the pick wins (or the pick rewrites the URL). Fixes H4. Gravity has no
   projects yet: this is for when it does.
3. For Gravity: the **host contract for data** (`projects.json`, picker,
   sequence, behavior) before we can mount it (G0), with the view store in the
   same round; and design ask 2 (a new value updates in place) before live
   redraw is usable (G4).
4. A warning with it: until the pick calls back (design ask 3), our bridge reads
   "the page imported project X's graph" as "X was picked". Preloading or
   prefetching graphs of projects not shown would switch the map on its own.

### Our side

- The adapter: product code in the viewer at full quality (the port's type, a
  memory adapter, a localStorage one keyed by project root; rows), built with
  their side.
- A standing probe, run on each pull through our host: pan, reload, the same
  place, no new keys. It caught H1; it is the check that their half holds.
- No patch to their files, and no bridge trick moving keys between URLs (hides
  H1/H2 for Host only, by knowing their key format).
