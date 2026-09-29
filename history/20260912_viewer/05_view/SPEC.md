# Step 05 — `deblob view`: the verb, the bundle, one server

Proposed, ratified and built 2026-09-16, back-filled from the code as landed.
The static half was re-cut from a port-less adapter to a service over a port on
rixo's objection; his rulings closed all five open items. Additive over steps 03
and 04: the protocol, the watcher and the viewer's state shape do not change.
What is new is a CLI verb, a static half on the same HTTP server that already
carries the WebSocket, and the packaging question the chapter has been deferring
— where the built bundle lives when someone installs `deblob` from npm.

This is the GOAL's success test: "`deblob view` on a codebase opens the viewer,
the viewer shows the extracted codebase, and it follows the codebase as it
changes." The first two thirds are what this step buys; the third is step 04,
already landed.

## Goal

In any project with `deblob` installed, `deblob view` prints a URL, and opening
it shows the viewer over that project — no Vite, no workspace, no second
process. Changes to the project update the page (step 04, unchanged). Ctrl-C
stops it.

Success:

- `deblob view` in a project serves the viewer's built bundle and the data
  channel from one port on `127.0.0.1`, prints the URL, and keeps running until
  interrupted.
- The page served that way behaves as the dev page does: the project list, the
  switch, the snapshot, the push on change. The viewer's entry is unchanged — it
  connects to `/deblob/ws` on its own origin, which in dev is Vite's proxy and
  here is the server itself.
- A config error in the project `deblob view` is run from is presented the way
  `deblob check` presents one — the message on stderr, exit 2, nothing
  listening. A config error in one _listed_ project keeps its step 03 behavior:
  the server serves, that project answers `error`.
- `deblob view` works from a package installed from npm, not only from this
  workspace. Proven on a packed tarball, not asserted.

Out of scope: opening a browser (the URL is printed); serving to anything but
loopback; HTTPS; authentication; caching headers beyond what correctness needs;
`deblob view <dir>` (projects come from config — PLAN § Decisions); the baked
static build (PLAN § Ideas); HMR of the viewer itself (that is `pnpm dev`, and
it stays).

## API

### The command surface — `lib/cli/cli.model.ts` (pure)

- `CliAction` gains `{ command: "view"; port: number | null }`; `COMMANDS` gains
  `"view"`. `--port <n>` is digits only — `Number("")` is `0` and
  `Number(" 80 ")` is `80`, and neither is a port somebody typed — up to 65535;
  anything else is a usage error with a teaching message, like every other parse
  failure, a value and never a throw. `0` is accepted: it is the OS's any-free
  port, unusual on a command line and not wrong. `null` = the default, **3615**.
  (The viewer's dev data server keeps 5175: the two run side by side, neither
  knows about the other.) An argument to `view` is a usage error naming
  `view.projects` — the projects never come from the command line.
- As landed: `explainFlags` became `strayFlags(verb)`, one function over the
  flags that ride a single command, so `--port` used anywhere else teaches
  exactly as `--explain` outside `check` already did. A flag that does nothing
  is a lie about the run.
- `HELP` and the bare status's command list gain the verb; both goldens move
  with them.
- The exit contract is unchanged and extended by one line: a `view` that ran and
  was interrupted exits 0; a config error before listening exits 2.

### The bundle's shape — `lib/view/bundle.model.ts` (pure)

The mapping from a request path to a file in the bundle, stated as one operation
over any bundle a Vite build can produce, not over the files today's build
happens to emit:

- `assetFor(target)` → `{ path, file, contentType } | null`. As landed the
  result carries `path`, the decoded request path, so a caller can compare it
  against the paths it keeps for itself without parsing the target twice. The
  URL's path is decoded and normalized; anything that escapes the bundle root —
  `..` segments, an absolute or drive-prefixed path, a NUL byte — yields `null`,
  and the caller answers 404. This is not a nanny guard: the root is a directory
  of someone's machine, and the server binds a port.
- A path with a file extension maps to that file. A path without one — `/`,
  `/anything/deep` — maps to `index.html`: the SPA fallback, so a future router
  works without a server change.
- `contentType` comes from a table keyed by extension; an extension the table
  does not know yields `application/octet-stream` rather than a refusal. The set
  of extensions a bundler emits is open (fonts, images, source maps, formats not
  invented yet); the table is today's census, the default is the rule.

### The static half — a service over a port

Reading files out of a directory the process does not own is I/O; deciding what
a request gets is the view server's own logic. The two are split the way
`lib/snapshot/` splits them, with the same shape it already uses four times
(`channel`, `project-source`, `watch`, `report`): a port, a real adapter, a
memory adapter, and the driver translating node's objects at the edge.

- `ports/bundle.port.ts`: `BundleFiles` — `read(file)` →
  `Promise<Uint8Array | null>`, `null` for a file that is not there. One
  operation; the port knows nothing of URLs, statuses or headers.
- `view.service.ts`: `createViewService({ files, reserved })` →
  `respondTo(request)` over a `{ method, path }` value →
  `Promise<ViewResponse | null>`. `null` means the request is not the view's —
  anything that is not a `GET`, and the paths in `reserved`, which the driver
  fills with the channel's — and the caller leaves it alone. Otherwise:
  `assetFor` refuses the path → 404; the read misses → 404 (a stale hashed
  asset; extensionless paths never miss, they mapped to `index.html`); a hit →
  `{ status: 200, contentType, body }`. A `ViewResponse` is a value: status,
  content type, bytes. No caching headers beyond `content-length` — Vite
  content-hashes the assets and `index.html` must not be cached.
- `adapters/fs-bundle.adapter.ts`: `createFsBundle({ root })` — the read, under
  a root, with the missing file answered as `null` rather than thrown. The root
  is handed in; who decides it is the driver, in one function (below).
  `adapters/memory-bundle.adapter.ts`: `createMemoryBundle(files)` over a map,
  the service's spec partner.

The general fs port deblob never paid for stays unpaid — rixo, 2026-09-16: not
this step's to add. `BundleFiles` is the narrow one this service needs; the
kernel question is cited in § Findings, not settled here.

### The assembly

- `drivers/serve/main.ts`: `ServeIo` gains `bundle: string | null`. Given a
  root, it instantiates `createFsBundle({ root })` and `createViewService`, and
  the HTTP server's `request` listener does the translation node's objects need
  — `req.method` and `req.url` in, `res.writeHead`/`res.end` out, nothing
  decided there; a `null` answer leaves the request alone. Given `null`, no view
  service exists, every GET gets the bare 404 and the driver prints what it
  prints today — the dev cycle, where Vite serves the page. No second server, no
  second port: the WebSocket upgrade and the static requests share the listener
  they already share in dev through the proxy.
- `drivers/cli/main.ts`: `case "view"` → `runView(io, action)`. A bundle root
  with no `index.html` in it is a startup error saying this install cannot serve
  the page, exit 2, nothing listening. Otherwise it calls the serve assembly
  with the root and awaits the server's close. **Reusing the serve driver is the
  ruling** (rixo, 2026-09-16): no `drivers/view/`, one assembly composing
  another. As landed, `runView` does not call `loadFor`: the server loads the
  config to list the projects, so a config error arrives as a throw from
  `serveView` and is presented with the same `asConfigError` line `check` uses —
  one load instead of two, same message, same exit 2.
- `MainIo` gains two members, both as landed. `signal: AbortSignal` — the world
  saying stop; `bin.ts` wires SIGINT and SIGTERM to it, `runView` awaits it,
  closes, and returns 0, and every other verb is done before it could fire.
  `bundle: string` — where the built viewer sits. The SPEC had `bundleRootOf()`
  inside `main.ts`; it moved to `bin.ts` for two reasons. With the root
  hard-coded in the driver the missing-bundle arm is unreachable in a test (the
  workspace always has a bundle), and deblob's suite would have to build the
  viewer, which CI builds _after_ `pnpm --filter deblob test`. As a value it
  follows the driver's own doctrine — the shim owns the process facts, `main`
  takes the world as a value — and the packaging ruling now touches the shim
  alone.
- `bundleRootOf()` in `bin.ts` — the whole of what the packaging ruling touches.
  It points at `dist/viewer`, the copy `build:viewer` makes (shape (b)),
  anchored on the package root the way `CONTENT_ROOT` is
  (`new URL("../../../dist/viewer", import.meta.url)`), so compiled and
  source-run resolve the same directory — and source-run needs the copy to
  exist, exactly as the explain cards already do. The day the viewer is
  published and depended on, its body becomes
  `dirname(fileURLToPath(import.meta.resolve("@deblob/viewer/bundle/index.html")))`
  and nothing else moves (shape (a)).
- `build:viewer` in `deblob`'s `run-s build:*` (`scripts/build-viewer.ts`):
  copies `packages/viewer/dist` into `dist/viewer`, and fails with the command
  to run when the viewer is unbuilt. `files: ["README.md", "dist"]` ships the
  copy with no change. Consequence, as landed: `deblob`'s build now depends on
  the viewer's, so CI builds the viewer first (a `pnpm -r build` orders them by
  the existing devDependency).
- `drivers/serve/bin.ts` passes `bundle: null`. The package script `serve` and
  the viewer's `dev:serve` are unchanged.

## Testing

As run (back-filled 2026-09-16); where nothing is said otherwise, the ratified
text stood.

- `bundle.model`: the mapping for a path with an extension, for `/`, for a deep
  extensionless path; a `..` path, an absolute path, an encoded traversal
  (`%2e%2e%2f`) and a NUL byte all `null`; a known extension's type; and the
  tripwire — a path whose extension is absent from the table (a made-up one)
  resolves with the default type instead of being refused. Code that states the
  operation passes it; code built as a list of five branches fails it.
- `view.service` over the memory bundle: `/` and a deep extensionless path
  answer the html, a hashed asset answers 200 with its type and bytes, an asset
  the bundle does not hold answers 404, a refused path answers 404 without a
  read reaching the port, a `POST` and the WebSocket path answer `null`. No
  filesystem, no socket — the answers are values.
- `fs-bundle.adapter` on a temp directory: a file read back, a missing file
  `null`, and a traversal aimed at a real file outside the root refused at the
  adapter too — the model already refuses it, and the adapter is the one that
  would do the damage if it ever saw one. `memory-bundle.adapter` with its own
  spec, as the other memory adapters have.
- The parser: the bare verb, `--port` given, and a table of refusals — not a
  number, not whole, negative, above the range, padded, empty (`--port=x` form,
  since a leading dash is parseArgs's own refusal and this pins ours); an
  argument to `view`; `--port` on `check` and `--explain` on `view`, the two
  directions of `strayFlags`.
- The serve driver, real sockets, a temp bundle beside the temp project: the
  page at `/` with its type, a client route answering the page too, the hashed
  asset with its type and bytes, a miss 404, the channel's path 404 to a plain
  GET, a `POST` 404 — and the channel itself still answering `projects` and
  `snapshot` on the same port. A bundle root that is a file, not a directory:
  the client gets 500 and the failure is on stderr in full.
- The CLI: `main()` on a temp bundle over a fixture project, started with an
  `AbortController` — the URL line is the handshake, `fetch` of `/` returns the
  page, the abort returns 0 and the port is gone with it. An install without the
  bundle: exit 2, the line, nothing written to stdout. A project whose config
  throws, `view` with no `--port` (so the default is the one read): the `check`
  line on stderr, exit 2, and nothing bound — the config is loaded before
  anything listens.
- **The packed package**, as landed: `scripts/verify-pack.ts`, run by
  `pnpm verify:pack` and by CI, not by the suite — it needs `dist`, and the
  suite builds nothing and runs in a second. It packs (so `prepack` builds what
  a publish would ship), untars elsewhere, asserts the tarball carries
  `dist/viewer/index.html`, lends the copy the workspace's `node_modules`
  **minus `@deblob/`** — the viewer is a devDependency, so an installed `deblob`
  never has it — runs the packed `dist/drivers/cli/bin.js view --port 0` on a
  throwaway project and fetches the page. That absence is the point: it proves
  the bundle served comes from inside the package.
- Coverage 100% on both packages, both dogfood checks at 0 violations, as every
  step so far.

## Implementation

Checkpoints, one concern each, each handover green; the cut by what it touches.
Run 2026-09-16 in the order below.

1. **The pure half**: `lib/view/bundle.model.ts` and its spec. Nothing else —
   the verb is not parsed yet.

   Decided when cutting: the parser moves to checkpoint 3, with the verb it
   dispatches. Adding `view` to `CliAction` makes the CLI's switch
   non-exhaustive, so a checkpoint that parses the verb without running it has
   to carry a branch that answers "not yet" — dead code written to be deleted
   two checkpoints later. The command surface lands in one piece instead.

2. **The service and its port**: `ports/bundle.port.ts`, `view.service.ts`, the
   memory adapter, their specs. Every answer the view server gives is pinned
   here, with no filesystem and no socket in the room; nothing is wired yet. As
   run, it also edited checkpoint 1's model: `Asset` gained `path`, so the
   service compares against `reserved` without parsing the target twice.
3. **The fs adapter and the verb, in one piece**:
   `adapters/fs-bundle.adapter.ts`; the command surface — `view` and `--port` in
   the parser, `HELP` and its golden; `ServeIo.bundle` and the request
   translation in the serve driver; the CLI's `runView` with the config-error
   presentation and the missing-bundle startup error; the driver test through a
   real socket. Working in the workspace, where the bundle sits at a known
   relative path. As run: `MainIo` gained `signal` and `bundle`, and
   `bundleRootOf` landed in `bin.ts` rather than `main.ts` (§ API). Verified by
   hand on the real bundle before the handover — the page, the hashed asset, a
   client route, the channel on the same port, ctrl-c.
4. **The bundle's home**: `build:viewer`, `bundleRootOf` on `dist/viewer`, the
   viewer's `./bundle/*` export added but unused (shape (a) prepared), and the
   packed-package gate. SPEC 03's `dist` findings are decided here, because this
   is what decides them (§ Findings). As run, it also reordered CI: the viewer
   builds before `deblob`'s build, which now embeds its bundle.
5. **Docs and the back-fill.**

## Docs

- `packages/deblob/README.md`: the verb, in the command list and in the prose —
  the port, `--port`, that the bundle ships inside the package, that the project
  list comes from config, and that ctrl-c exits 0.
- `packages/deblob/src/lib/view/README.md`: a living doc for the new service
  directory — what the bundle model decides, what the service answers, the port
  and its two adapters, and where the root is resolved. `lib/snapshot/README.md`
  moves with it: the serve driver is the view server now, with two callers.
- `packages/viewer/README.md`: how the bundle is served in production versus in
  the dev cycle; that the entry's `/deblob/ws` is same-origin in both; that the
  built bundle is copied into `deblob`'s `dist/` and the `./bundle/*` export is
  there for the day that changes.
- Chapter PLAN: step 05 built; step 04 marked built, owed since the last commit;
  § Decisions gains the packaging ruling (do (b), prepare (a), revisit at the
  merge into `main`) and retires the "optional peer or regular dependency" open
  item, which the measurement and the ruling close.

## Open, ruled at ratification (rixo, 2026-09-16)

All five closed; the text above is written to the rulings.

- ~~**Where the built bundle lives when `deblob` is installed from npm.**~~ The
  bundle measured 39 kB of JS plus a 323-byte HTML file — 52 kB on disk, 15 kB
  gzipped, which is what the PLAN's open item ("optional peer or regular
  dependency, decided when the bundle size is known") was waiting for. The three
  shapes were **(a)** `@deblob/viewer` published as a regular dependency, the
  root resolved through a `"./bundle/*": "./dist/*"` export; **(b)** the bundle
  copied into `deblob`'s own `dist/` at build time, the way `build:content`
  already bakes the cards; **(c)** an optional peer. Ruled: **do (b), prepare
  (a)** — the switch is a candidate for the merge into `main`, not for this
  step. Concretely: the viewer gains the `./bundle/*` export now, even though
  nothing resolves through it yet, and the root is decided in exactly one
  function (`bundleRootOf`, in the CLI driver) whose body is the whole
  difference between (b) and (a). (c) is dead.
- ~~**Does the CLI compose the serve driver's assembly?**~~ Ruled: **reuse the
  driver** — `runView` calls `drivers/serve/main.ts`. No `drivers/view/`. One
  assembly importing another; the driver-layer rulings in the main checkout may
  rename or re-home it later, and this step does not pre-empt them.
- ~~**`--port` and its default.**~~ Ruled: the `view` verb defaults to **3615**.
  The viewer's dev data server keeps 5175, so the two never collide and neither
  needs to be told about the other. `--port <n>` overrides.
- ~~**Auto-open the browser.**~~ Ruled: no. Cheap to add behind `--open` the day
  it annoys someone.
- ~~**What `deblob view` prints.**~~ Ruled as proposed: one line with the URL
  and the project count, as `serve` prints today, plus the Ctrl-C hint. Not the
  CLI's status block.

## Findings

Cited at proposal, ruled out of this step:

- **The fs kernel deblob never paid.** `BundleFiles` is the fourth place the
  codebase reads files — after `loader.adapter.ts`, `scan.adapter.ts` and
  `content.adapter.ts`, three adapters the CLI assembly calls with no port
  between them. A general fs port with a node and a memory adapter would swallow
  all four. rixo, 2026-09-16: not this step's to add. The narrow port here does
  not make the kernel harder later — it makes one more caller for it to absorb.

Surfaced while building:

- **SPEC 03's `dist` findings, decided here (checkpoint 4).** The shipped
  package carries the snapshot service, the view service and the drivers as
  compiled `.js` — it must: the `view` verb runs them. What SPEC 03 flagged was
  their `.d.ts` referencing `@deblob/viewer/snapshot.model`, a devDependency an
  installed `deblob` does not have. Measured on the real tarball: no shipped
  `.js` imports `@deblob/viewer` at runtime (the contract is type-only, erased
  by the compiler), and `dist/index.d.ts` — the only type entry the exports map
  offers — does not reach those files, so a consumer's TypeScript never loads
  them. What remains is a dangling reference inside files nothing can address:
  it costs nothing today and disappears the day shape (a) lands and the viewer
  becomes a real dependency. Left as is, deliberately, rather than copying the
  contract into `deblob` (step 03 ruled its home is the viewer).
- **`deblob view` ignores `-c/--config`.** The server discovers the project from
  the cwd, so an explicit config path is silently not honoured. No behaviour
  invented — either it teaches (usage error) or it is threaded through to
  `projectsOf`; a ruling, not a slip to fix in passing.
- ~~**A server with `bundle: null` has no `request` listener at all**, so a
  stray GET is answered by nobody and hangs until node's request timeout~~ —
  fixed 2026-09-16. The listener is attached either way and answers 404 with no
  bundle. Recording it here was the mistake: it is a defect in the surface this
  chapter built, not a fork to rule.
- ~~**`select` of any directory answers a snapshot** (SPEC 03 § Findings)~~ —
  fixed 2026-09-16 alongside it. `serveSnapshots` answers `error` for a root it
  did not offer and runs nothing. The spec's own harness had been selecting two
  roots it never announced, which is how the hole stayed invisible.

The rest filled as the step is built.
