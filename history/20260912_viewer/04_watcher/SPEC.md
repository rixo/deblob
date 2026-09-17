# Step 04 — the watcher: a project's snapshot re-run on change, pushed again

Proposed 2026-09-16, amended the same day on rixo's two rulings (what triggers:
the directories coverage spans, plus the config; the watcher over chokidar). To
size and ratify. Additive over step 03: the channel, the protocol and the
viewer's state shape do not change; the server gains a reason to push a
`snapshot` nobody asked for, and the viewer's source learns to survive a server
that goes away.

## Goal

With `pnpm dev` up and a project on screen, saving a file in that project
re-renders the page with the new snapshot, no reload, no click. Editing the
project's `deblob.config.ts` counts as a change. Restarting the data server (or
editing `deblob`'s own source, which restarts it) is survived: the page
reconnects on its own and shows the project it was showing.

Success:

- A file written, created or deleted under the current project pushes one new
  `snapshot` to every client showing that project, after the burst settles; a
  project whose re-extraction fails pushes `error` and stays watched.
- Selecting another project moves the watch: changes on the previous one push
  nothing to that client any more.
- Killing and restarting the server, the page comes back on its own with the
  project it was showing; the last snapshot stays up meanwhile.

Out of scope: diffing between snapshots (the page re-renders whole), a notice
that an extraction is running (the snapshot just updates), sharing one watcher
between clients on the same project, watching outside the project's root.

## API

Back-filled 2026-09-16 from the code as landed; where nothing is said otherwise,
the ratified text stood.

### `deblob` — the service (`src/lib/snapshot/`)

- `ports/watch.port.ts`: `Watcher` — `watch(dirs, onChange)` → `Promise<Watch>`;
  `Watch` — `update(dirs)`, `close()`. `dirs` is a set of absolute directories,
  each watched for its own entries only, never their subtrees; `onChange` fires
  once per burst, after the adapter's quiet window; what changed is not reported
  — the re-run re-scans. `update` replaces the set without a gap. Promise-only.
- `ports/project-source.port.ts`: `ProjectSource` gains
  `scanCoverageDirs(config)` — the directories coverage spans: the config's
  `include` patterns matched against directories, minus `exclude`, hidden paths
  never entered — the scan's own walk, pruned the same way, so `node_modules` is
  never in the set unless the config covers it. Root-relative, sorted, like
  `scanCoverage`.
- `ports/channel.port.ts`: `ChannelClient` gains `onClose(handler)` — the
  cleanup hook step 03 left out for want of a use. Handler returns a promise the
  adapter awaits.
- `snapshot.service.ts`: a run of one project yields its snapshot and its watch
  set — the spanned directories plus the root (where `deblob.config.ts` and
  `deblob.local.json` sit), made absolute: `runOf(root)` →
  `{ snapshot, watchSet }`, `watchSetOf(root, dirs)` the pure part in the model.
  `snapshotOf(root)` is the run's snapshot, the script driver's call.
  `serveSnapshots({ channel, projects, runOf, watcher, report })` — per client,
  a current project and its `Watch`. The watch is up before the answer goes out:
  the root alone before a project's first run, the run's set before its snapshot
  — so a change right after a push is seen. On connect: `projects`, watch the
  first's root, run it, `update` to its set, send. On `select`: close the watch,
  then the same for that project. On change: run the current one again,
  `update`, send — a directory created under coverage shows up as an event on
  its parent, the re-run scans it, the next set has it, empty or not. On close:
  close the watch. Runs for one client never overlap: a change or select
  arriving while an extraction runs marks one more run, which follows when this
  one ends — the latest wins, the burst collapses; an answer for a project no
  longer current, or a client gone, is dropped, never sent; a select superseded
  while the previous watch closed does not run. Failures as in step 03: a
  `ConfigError` answers `error`, anything else is reported and answers the fixed
  message; the watch set stays as it was — the root is in it, so fixing the
  config is a change.
- `adapters/chokidar-watcher.adapter.ts`:
  `createChokidarWatcher({ quietMs, report })` over chokidar 5 (ESM-only, one
  dependency of its own, `readdirp`; exact-pinned, the one new runtime
  dependency — rixo, 2026-09-16: the reason is the primitive, `fs.watch` is not
  consistent across platforms and has no polling fallback where events never
  arrive). One chokidar instance per set: its paths with `depth: 0`,
  `ignoreInitial`, hidden entries ignored (the scan never covers them; a watched
  directory whose own name is hidden is not); `update` opens the next instance,
  awaits its `ready`, then closes the previous — chokidar's `add` has no ready
  to await and its initial listing races the caller; the two overlap for a
  moment, the shared quiet timer absorbs the doubles; every event resets the
  window, its end is the one `onChange`. chokidar's own errors go to `report`.
  Polling where the filesystem emits nothing (Docker Desktop bind mounts,
  network shares) is chokidar's `CHOKIDAR_USEPOLLING` environment variable,
  passed through, not wrapped. `adapters/memory-watcher.adapter.ts`:
  `createMemoryWatcher()` → `{ watcher, change(dir), watching() }` — the sets of
  the open watches, the test's hand on the clock.
- `adapters/scan.adapter.ts` in the config service: `scanCoverageDirs`, the file
  scan's twin with `onlyDirectories`.
- `adapters/ws-channel.adapter.ts`: `onClose` from the socket's `close`.
  `adapters/memory-channel.adapter.ts`: a connection gains `close()`.
- `drivers/serve/main.ts`: instantiates the chokidar watcher (100 ms quiet, its
  `report`) and passes it — one more line of wiring; `drivers/wiring.ts`
  composes `scanCoverageDirs`. `dev:serve` in the viewer becomes
  `node --watch ../deblob/src/drivers/serve/bin.ts`, so an edit to `deblob`'s
  own source restarts the server and the viewer's reconnect covers it.

### The viewer

- `adapters/ws-source.adapter.ts`: a `close` while subscribed puts the source
  back in the loading arm (the previous snapshot stays up, the error clears) and
  reopens the socket after a fixed delay, again and again until it opens or the
  last subscriber leaves. After a reopen the server sends `projects` and the
  first project's snapshot as on any connect; if the source had selected another
  project, it sends `select` for it right after the open. The delay is a second
  argument with a default (`retryMs`, 1000), the tests' way in. A select while
  the socket is not open — lost, or reopening — is remembered and asked for by
  the open handler, never sent into a dead socket; the remembered project lives
  with the subscription, a new one starts from scratch.
- A pushed `snapshot` is already a state the App renders (step 03: loaded with a
  new snapshot); nothing changes in App or entry.

### The protocol

Unchanged. `snapshot` may now arrive unsolicited; the client treats it as it
treats an answer.

## Testing

As run (back-filled 2026-09-16):

- Service with the memory watcher and the memory channel, runs faked with a
  counter (`generatedAt` = the run number), a deferred "slow" project the test
  releases, and `fail(root)` for a config that breaks: a change pushes a new
  `snapshot` and refreshes the set; select moves the watch (the root first, then
  the set; a change on the old project pushes nothing); a config failing on a
  change answers `error` and keeps the set; changes during a run collapse into
  one more; a select mid-run drops the stale answer; a client gone mid-run with
  a change pending: nothing sent, nothing watched, no more runs; gone right
  after a select; two selects in a row: the first never watched. `watchSetOf`
  pinned in the model spec.
- The chokidar watcher on a temp directory, real filesystem: one `onChange`
  after a write, one after a burst of three, none for a dotfile, none for a file
  in a subdirectory not in the set — then `update` adds it and the next write
  fires — an `update` dropping the root, a write then close inside the quiet
  window (the pending change dies), none after close; the report empty.
  `quietMs` 30 in tests. The memory watcher's own spec: sets, update, close,
  change reaching the right watches.
- `scanCoverageDirs` beside `scanCoverage`'s spec: the directories under
  `include`, an excluded one pruned, a hidden one absent, an empty one present.
- The channels: the ws adapter's `onClose` fires when the client closes (real
  `ws` client); the memory channel's `close()` reaches the handler.
- The serve driver: a temp viewer project of two configless subprojects (also
  closes step 03's finding on the test reading the viewer's real config): the
  list, the first snapshot, select answers the other; a file written under the
  shown project pushes its snapshot again — real chokidar, real socket.
- The viewer's source against the real `ws` server (`retryMs` 20): the client
  terminated → loading with the snapshot kept, the error cleared → a new
  connection receives the re-sent `select` and its answer loads; the server down
  and up on the same port → retries fail silently, a select made meanwhile
  arrives on the reopen; the last unsubscriber stops the retries.
- Coverage 100% both packages, both dogfood checks green. At close: deblob 604
  tests, 76 files, 0 violations; viewer 21 tests, 13 files, 0 violations. By
  hand through the real driver: serve killed → loading, snapshot kept → serve
  back → the new snapshot; and the config change measurement that ruled out
  recursive `fs.watch` (§ Open).

## Implementation

Checkpoints, one concern each. Re-cut at the first handover (2026-09-16): a port
addition drags its adapters and the wiring along for the gate to stay green, so
the cut is by port, not ports-then-adapters.

1. The two port additions and what implements them: `scanCoverageDirs` (port,
   scan adapter, wiring, memory source) and `onClose` (port, ws channel, memory
   channel); their specs. No behavior change in the server. Also, on rixo's ask:
   the viewer's committed config lists two projects (itself and `deblob`) so the
   switch has an effect to see, and the serve driver's test moved to a temp
   project of two subprojects (select answers the other) — step 03's finding
   closed. That test surfaced the next one: a listed directory without a config
   walked up to the lister's. Ruled the same day (rixo): **discovery stops at
   the configured directory** — a listed root, or the script driver's cwd, is
   the project exactly, its own config or the defaults, never an ancestor's.
   `configAt(dir)` in the loader (the walk is now a loop over it),
   `loadConfigAt(root)` on the project-source port, `snapshotOf(root)` reads
   exactly; `loadConfig(dir)` keeps discovery for `projectsOf`. And, asked with
   it: the watch set never holds `.git` or `node_modules` — verified, the
   exclusion baseline every config carries is what the directory scan prunes by.
   Step 03's "two roots" finding is closed by the ruling: both roots are the
   listed directory.
2. The watcher: `Watcher` port, memory and chokidar adapters, `serveSnapshots`
   with the watch set and the latest-wins run, the serve wiring, `node --watch`;
   service and adapter specs, a change on the serve driver's temp project. As
   run (2026-09-16), three things the SPEC did not say: an `update` opens a
   fresh chokidar instance over the next set and awaits its `ready` before
   closing the previous — chokidar's `add` has no ready to await, and its
   initial listing raced the caller (a file written right after an update was
   listed, not reported); the watch is up before the answer goes out — the root
   alone before a project's first run, the run's set before its snapshot — so a
   change right after a push is seen, and the "watch the root on a config
   failure" special case disappears (the root is always watched first); a select
   superseded while the previous watch closed does not run. An answer for a
   project no longer current is dropped, never sent — the server side of the
   out-of-order finding, the source's last-wins stance untouched.
3. Viewer: the source's reconnect; its spec. As run (2026-09-16): as SPEC'd,
   plus two details — a select while the socket is not open (lost, or reopening)
   is remembered and asked for by the open handler rather than sent into a
   closed socket; the remembered project lives with the subscription, so a new
   subscription starts from scratch as the SPEC says. Verified through the real
   driver: serve killed → loading with the snapshot kept → serve back → the new
   snapshot, no reload.
4. Docs and the back-fill.

As first cut:

1. Ports and service: `Watcher`, `scanCoverageDirs`, `onClose`; `serveSnapshots`
   with the watch set and the latest-wins run; memory watcher, memory channel
   `close`; service specs.
2. Adapters and driver: the chokidar watcher, `scanCoverageDirs` in the scan
   adapter, the ws channel's `onClose`, the serve wiring, `node --watch`;
   adapter specs, the serve driver's temp-project test.
3. Viewer: the source's reconnect; its spec.
4. Docs and the back-fill.

## Docs

- `packages/viewer/README.md`: the dev-cycle paragraph — what is watched, no
  reload; what a restart does and that the page survives it.
- `src/lib/snapshot/README.md` in `deblob`: `runOf`, the serve protocol with the
  watch, `loadConfigAt` and `scanCoverageDirs` on the port, the watch port, the
  chokidar and memory watchers, the driver line.
- Chapter PLAN: step 04 built; step 03 marked built.

## Findings

Surfaced while building, recorded for later rulings; none changed the cut.

- **`node --watch` restarts on every loaded file**, the viewer's own
  `deblob.config.ts` included (the loader imports it): a config edit restarts
  the server where the watcher alone would have re-run the project. Harmless
  with the reconnect, heavier than needed; the flag is one line to drop.
- **chokidar's `add` cannot be awaited**: its initial listing races the caller,
  hence the instance swap on `update`. Costs one listing of the set per run.
- ~~**A watched directory whose own name starts with a dot** is exempt from the
  hidden rule by construction, but no test watches one; v8 counts the operand
  covered. chokidar's own error path is wired to `report` and never provoked.~~
  — both tested 2026-09-16. Provoking the error (a symlink loop, `ELOOP`)
  surfaced a race: when a path in the set fails, or is missing, chokidar emits
  `ready` before the rest of the set is attached, so the watch is not yet up
  when the adapter says it is, and `update` closes the previous instance too
  early. Fixed 2026-09-17: chokidar counts a failed path as ready twice (once in
  `_addToNodeFs`'s `catch`, once in `add()`), so the adapter now opens one
  instance per directory, where that cannot happen, and awaits every `ready`.
  The "one chokidar instance per set" in § API above no longer holds. With one
  instance over the set, the two new tests missed the first write in 8 runs out
  of 8; with one per directory they passed 8 out of 8. Upstream (checked
  2026-09-17): reported in 3.x as paulmillr/chokidar#1011 and #1110, both closed
  unfixed in a bulk cleanup on 2024-07-01; PR #1289 names this exact double
  count and was closed unmerged when 4.0.0 shipped; 5.0.0 (2025-11) is still the
  latest release and chokidar's `main` still has both calls. No upstream fix to
  wait for: the one-instance-per-directory shape stays. Vite 8.3 bundles
  chokidar 3.6 with the same code, so its bundled copy is no way around it. Also
  found, not reported upstream: `getWatched()` lists a directory before its
  watcher is attached, so it cannot tell whether a watch is up.
- **Two tabs on one project are two chokidar instances** and two extractions per
  change (§ Open, accepted). The set is re-listed on every run.
- ~~**The source keeps last-answer-wins** (step 03's finding); the server now
  drops stale answers per client, so the visible case is gone in practice but
  the client-side stance is unchanged.~~ — not a defect: with the server
  dropping stale answers, taking the last answer is correct, not just harmless
  in practice. The ordering is now stated in the protocol description in the
  viewer README (2026-09-16).
- **A change in a covered subdirectory during a project's very first run** is
  not seen: only the root is watched until the run's set is known. The next
  change is.
- ~~**A watch opened for a client that already left was never closed.**~~ —
  found and fixed 2026-09-17. The serve script's SIGTERM test hung: a client
  that disconnected before its first snapshot left 8 filesystem watchers open
  after the server closed, so the process never exited. Two races, one fix each.
  In the service, `onClose` closed only a watch that existed; a `watcher.watch`
  still opening was assigned afterwards and kept — now a watch that opens after
  the close is closed at once. In the chokidar adapter, a `close` during an
  `update` closed the old instances, and the update then kept the new ones — now
  an update that finishes after the close closes what it opened. Tested with a
  memory watcher that can hold `watch` and `update` pending (`hold()`), and with
  a real `update` left in flight across a `close`; both tests failed before the
  fix. In the dev cycle, each page reload during a first load had leaked its
  watchers for the life of the server.

## Open, to rule at ratification

- ~~`fs.watch` recursive vs a dependency~~ — closed 2026-09-16, rixo: chokidar.
  The first proposal, Node's recursive `fs.watch` with an ignore list, was
  measured on this checkout: 7917 inotify watches for 9219 entries, files
  included, `node_modules` walked regardless of the list — the list filtered
  events, not watches. The trigger ruling below removes that walk, so the
  dependency is not paid for pruning; it is paid for the primitive: `fs.watch`
  is not consistent across platforms, and where a filesystem emits nothing only
  polling helps. chokidar 5, exact-pinned.
- ~~What triggers~~ — closed 2026-09-16, rixo: covered files and the config — as
  directories, the ones coverage spans plus the root, each watched for its own
  entries. Not the root recursively with an ignore list. Cost: a change to a
  non-covered file in a covered directory re-runs the extraction (milliseconds
  on `deblob` itself).
- ~~The quiet window~~ — closed 2026-09-16, rixo's go: 100 ms, fixed, not
  configurable.
- ~~Reconnect~~ — closed 2026-09-16, rixo's go: a fixed one-second retry, no
  backoff (local dev server); the re-selected project costs one wasted first
  snapshot per reconnect, accepted rather than changing the connect handshake.
- ~~One watcher per client~~ — closed 2026-09-16, rixo's go: not shared per
  project; two tabs on one project are two chokidar instances and two
  extractions per change. Share when it hurts.
- ~~No "extracting" notice~~ — closed 2026-09-16, rixo's go: the protocol stays;
  the page cannot show a loading line for a watcher re-run, the snapshot
  updates.
- ~~Polling~~ — closed 2026-09-16, rixo's go: reaches the adapter only through
  chokidar's own `CHOKIDAR_USEPOLLING`; no deblob-side switch until someone
  needs one.
