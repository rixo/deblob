# runner

Judges a case: a tree of strings with its red lines marked, run through the real
chain, matched against the markers. The verdict of a row is the match; whether
the code is red is what the markers say. Nothing here calls the test runner: a
spec builds its instance and calls `judge`, the way a test is the one kind that
both builds and fires.

## API

- `runner.service.ts` — `createRunner({ check })` → `judge(row)`: collects the
  row's markers, asks the check port for the violations under the row's config
  and checks, resolves to the match. `Case` and `Row` (`markers.model.ts`) are
  what a spec hands it; `AS_MARKED` is the match a row asserts.
- `markers.model.ts` — the marker grammar and the match.
  `// red: <slug>[, <slug>]* [-- <why>]`: one violation per slug, a repeated
  slug counts twice, the why is for the reader (never compared; the message is
  the renderer's, proven in the CLI golden). At a line's end it claims that
  line; alone on its line it claims the next code line, so stacked markers each
  claim it with their own why; alone at the end of the file it claims the file,
  the form for a violation without a line (today's edge-level ones).
  `// via: <slug>`, same form, marks a line that triggers a red elsewhere — a
  root call running a helper whose body is red at its own line — and matches an
  entry of the violation's `via` list. Loud: an unknown slug, anything that
  looks like a marker (`// red`, `// via`, any case) and fails the grammar, a
  marker after another comment. `matchVerdicts` runs both directions, counted,
  and lists each, `file:line slug`, `file slug` or `file:line via slug`, sorted;
  a line claim never stands for a file claim, nor the reverse; `reportedOf`
  names every file that closes a cycle. `stripMarkers` is the grammar's inverse,
  for a corpus author who wants the same tree claiming green.
- `cases.assembly.ts` — `assembleCase(files)` → `{ judge, check }`: the memory
  adapters built from the tree, the real chain wired over them, the runner over
  it. Returns the check port too, for a spec that wants the violations.

## Ports

- `ports/check.port.ts` — `Check`: `run({ config, checks? })` → violations, the
  tree bound at assembly; throws when a literal import does not resolve, a
  broken case, never a green line. Its one adapter today is the assembly's own
  wiring of the chain (config resolution, scan, extraction, the detectors — the
  same as the CLI's check run); the run service of the placement-debt recut is
  the proper one, and replaces that wiring in place.

## What it does not do

No fixtures on disk, no simulation of the chain: the memory adapters are the
second adapters of the fs port, and the fs-port resolver is the second adapter
of the resolver port. No tsconfig paths, no exports maps, no symlinks in a case:
a case needing them is a node-run case, and no rule depends on how a specifier
resolves, only on where it lands.
