# Step 07 — the map spike: the design's map on live data

A spike, written after its first commits. It sits in this chapter as its own
step for a bit of separation. It is not exempt from SDD: every commit carries a
quintet body, is reviewed, and points here. Its exemption is code quality, and
only two things: no tests, and it may be all blob (excluded from `deblob check`,
§ Isolation).

## Goal

Run the design project's map (their pages, verbatim) on our own runtime, fed
from a live tree, to find out what real data costs before building any product
on it. Since 2026-09-23 the viewer runs their pages as a blackbox, with zero
React (chapter PLAN § Design track). What was missing was the data.

The spike lives on `viewer`, beside the product. It moves in three stages:

1. Spike toward a result worth keeping.
2. On the way, capitalize infrastructure it needs (the data connection, for
   example) in the standard tree, at full quality: tests, structure, `check`.
3. Eventually, port the spike into proper structure. From that point there is no
   quality exemption at all.

What dies is deleted in a commit. The history is never rewritten to hide it.

Success:

- `pnpm spike:map` in `packages/viewer` serves the map on
  http://localhost:5188/dc.html, on each configured project the tracer can read
  (deblob trees only, today, § Open), with the sequence panel and the right
  panel fed from that tree.
- The spike changes nothing the product's gates see: typecheck, tests, coverage
  and `deblob check` on both packages stay as they were without it.
- Whenever a measurement comes in, it lands in the commit that produced it.

Out of scope: tests for spike code (the exemption), any product API, and any fix
to the design's files beyond what the map needs in order to run on our side.

## API

None shipped. What exists, all under the two spike directories:

### `deblob` — the feed (`packages/deblob/src/spike/map-feed/`)

- `feed.ts`: `mapFeed(root)`. It also runs as `node …/feed.ts <root>`, printing
  JSON to stdout. Its shape is the design's sequence snapshot contract
  (`data/deblob.sequence.snapshot.2.json`).
- `fine.ts`: the fine-grained snapshot, which gives the symbols of each module.
- `sequence.ts`: the call tracer, which follows calls starting from the
  commands. It works on deblob only: its driver half (`DRIVER_MODULE`, `HOOKS`)
  is read by hand from our CLI, and it throws on any other tree. An unbound call
  carries a `why`: `builtin-method`, `global`, `computed`,
  `held-refused:<kind>:<n>`, `param` or `unresolved`.
- `readmes.ts`: `readmesOf(root, containerIds)`, each container's README.md
  turned into the right panel's blocks (h with level ≤ 3, p, nested ul / ol,
  code with lang, table with head, inline links kept).

### `viewer` — the design and its host (`packages/viewer/src/spike/map/`)

- `design/` holds their code, byte for byte: the three pages (Deblob Map Host,
  Sequence Panel, Behavior Panel), the engine scripts, their test, and
  `gen-graph.js`. Their docs, their data, `support.js` (their runtime; ours
  replaces it), and any root md / json / png never enter git, because their
  project has none of our sanitization rules. `spike/map/.gitignore` catches
  whatever slips through.
- `host/` is our side: `dc-compile.js` (their `.dc.html` compiled to Svelte),
  `dc-runtime.svelte.js`, `main.js`, `dc.html`, and `vite.config.js`. The Vite
  config serves the host contract: `projects.json` lists the live projects, each
  with its graph and its `behavior` url. The projects come from the viewer's
  config, the same way `deblob view` gets them: the snapshot service's
  `projectsOf(packages/viewer)`, so `view.projects` plus the local file. A
  checkout elsewhere on one machine goes in the local file, written by hand.
  Nothing committed names a path outside the repo. A project the tracer cannot
  read (today, any tree that is not deblob, the viewer included) is skipped,
  with one line on stderr. Their older contract paths serve the first project
  when a page loads with no project picked.

## Isolation

Deleting the spike = the two directories plus every line that names `src/spike`.
The `.ts` configs say "delete with the directory" in a comment; the tsconfig
lines carry no comment:

- `packages/deblob`: `deblob.config.ts` `exclude`, `tsconfig.json`,
  `tsconfig.build.json` (spike code never reaches `dist`), the coverage exclude
  in `vitest.config.ts`.
- `packages/viewer`: `deblob.config.ts` `exclude`.
- Root `.prettierignore` skips `design/`, so the pre-commit hook never reformats
  their bytes.

## Sync with the design project

There is no shared git between us and the design project. A pull copies the code
files they list (their `data/TO-DEBLOB.md`) over `design/` by hand, then greps
for `michelin|mds`. It is committed as sent, in a technical commit ("their
session N"), even when that leaves the spike host not running. Our fixes are
then re-applied in the next commit:
`git diff <prev pull> <our last before this pull> -- packages/viewer/src/spike/map/design | git apply -3`.
What we owe them is `git diff <last pull> HEAD -- …/design`, sent back as one
batch when the time is right.

## Testing

No test rows: that is the exemption. Every commit says what was probed and on
which trees: Chrome on both live projects, node counts, frame ids shared between
the map and the panel, and the gates measured unchanged.

## Implementation

Landed so far, in order:

- The feed: the two tmp probes turned into one function, near-verbatim. Its
  output is byte-identical to the chained probes, and it takes ~0.9 s on deblob.
- Their Session 46 code, vendored as pulled.
- Our side: two fixes to their files. First, call mode was gated on the graph's
  file name. Second, the panel's snapshot cache kept the first project after a
  switch. The host also moved out of tmp and is now fed live only.
- The right panel on live READMEs: no test extraction, so the panel shows the
  functions with no rows under them.
- Their reply to our FROM-DEBLOB of 2026-09-25, pulled as sent.
- Our side re-applied on that reply, plus a third fix: the host passes the panel
  its project's `behavior` and `label`. A panel with no extracted tests reads
  "Behavior not extracted yet." `dc-compile.js` ports their table handling.
- The tracer's `why`, as a measurement of our misses:
  - Of the calls reachable from a command, 792 frames stay unbound. 102 of them
    are our code, not followed: 59 `param`, 43 `unresolved`. The rest is
    language builtins and globals, left out correctly, plus 105 `computed`.
  - The panel ↔ map link is thin by the design's rule, not because of our data:
    for `check`, 112 of its 117 cross-file calls draw an arc.

## Docs

None. The spike has no docs surface; the commits and this SPEC are its paper
trail.

## Open

- **Next data moves**, picked (rixo, 2026-09-25): first (a) bind a call's
  arguments to the callee's params when following (~60 of the 102), with (c)
  externals via params (~10) and the tag that calls `io` from the enclosing
  scope `param` in one place and `unresolved` in another
  (`src/drivers/cli/main.ts:569`). Then (b) carry return values (~25). The
  measurement is rerun after each.
- **The host takes two shortcuts into deblob.** It imports the feed straight
  from `packages/deblob/src/spike/` by relative path, and it calls deblob's
  config code for the project list. The chapter's rule is that the viewer never
  imports deblob. When the data connection is moved into the standard tree
  (stage 2), it goes through the data half (snapshots of the configured projects
  over WebSocket), and both shortcuts go away.
- **Fix batch owed** to the design project (three fixes), not sent. They build a
  new map and the design room can't run several heads at once. Their reply also
  shows stale default graph paths (`graphSrc()` fallback and the `stackOf` gate
  still name `./deblob-seq-graph.js`).
- **`sequence.ts` is deblob-only.** Its driver half is read by hand. Reading it
  from any tree is the step it graduates through.
