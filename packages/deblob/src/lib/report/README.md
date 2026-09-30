# report

Verdicts as text: violation values, status numbers and shipped content in, the
exact strings the goldens pin out. Pure. Any front that shows verdicts as text
reads them here — the CLI's listings, the map's messages (`violationMessage`,
the provenance and size lines) — so no single app owns it. The CLI's own grammar
and help screens are the CLI's (`src/apps/cli`).

## API

- `renderCheckResults(groups, stats, colors, pathPrefix)` — the check listing:
  one entry per fix (`groupByFix`), its lead's line with its riders under it,
  marked `+`, sorted deterministically, each with its cited rules; it decides
  nothing about what belongs together. Then the summary line (verdict — groups
  counted, one fix one count — and inventory: files, size, blob %), the coverage
  line (services, imports, and `exports N checked, M disclosed` when a `deblob`
  claim was checked — absent otherwise, so a dropped field is a visible diff),
  and the fired rules as a pasteable `explain` invocation. `GraphStats` carries
  the numbers; `InventoryStats` is the half both commands share.
- `renderUnresolved(entries, colors, prefix)` and
  `renderUnverified(entries, colors, prefix)` — the two stderr blocks of an
  uncertifiable run, remedies included. `SURFACE_NOT_CLAIMED` — the one-line
  stderr note for `check surface` named by hand on a package with no field.
- `renderBareStatus(status, colors)` — the informational headline: version,
  provenance, blob percentage by size, then service count and the field's claim
  as written (`exports N claimed, M disclosed`), when there is one.
- `renderExplain(entries, colors)` — rule rationale plus shipped cards.
- `Colors`, `NO_COLORS`, `ANSI_COLORS` — the palette a front picks from
  `NO_COLOR`, `FORCE_COLOR`, and TTY detection.
- `violationMessage(violation)` — one violation's words, unwrapped: what the map
  shows.

## Layer map

One model file, `render.model.ts`; no service, no ports.

## What it does not do

No IO: nothing here writes to a stream or reads a file. No policy: which checks
exist is `check`'s, what the command line says is the CLI's. No exit codes: the
front maps results to 0, 1, or 2.
