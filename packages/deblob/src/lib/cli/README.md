# cli

The command surface as data, and the text the terminal shows. Both pure: argv
in, a dispatch decision out; violation values in, the exact strings the goldens
pin out. The process, streams, and exit codes belong to the driver.

## API

- `parseCli(argv)` → `ParsedCli | UsageError` (`cli.model.ts`). Recognizes the
  bare status run, `check` with its check selection and `--explain` /
  `--explain-only` / `--no-color` / `-c` flags, `explain <topic...>`, and help.
  Usage errors are values with teaching messages, never thrown.
- `KNOWN_CHECKS`, `CHECK_RULES` — the check names and the rules each one cites;
  `rulesForTopic(topic)` maps an `explain` topic (a check name, a rule slug) to
  rules; `isRuleNumber(topic)` spots a 0.0.4-era number so the driver's refusal
  can say rules are named now.
- `renderCheckResults(violations, stats, colors, pathPrefix)` — the check
  listing: findings grouped and sorted deterministically, each with its cited
  rules, then the summary line (verdict + inventory: files, size, blob %), the
  coverage line (services, imports, and `exports N checked, M disclosed` when a
  `deblob` claim was checked — absent otherwise, so a dropped field is a visible
  diff), and the fired rules as a pasteable `explain` invocation. `GraphStats`
  carries the numbers; `InventoryStats` is the half both commands share.
- `renderUnresolved(entries, colors, prefix)` and
  `renderUnverified(entries, colors, prefix)` — the two stderr blocks of an
  uncertifiable run, remedies included. `SURFACE_NOT_CLAIMED` — the one-line
  stderr note for `check surface` named by hand on a package with no field.
- `renderBareStatus(status, colors)` — the informational headline: version,
  provenance, blob percentage by size, then service count and the field's claim
  as written (`exports N claimed, M disclosed`), when there is one.
- `renderExplain(entries, colors)` — rule rationale plus shipped cards.
- `HELP`, `CHECK_HELP` — the help screens as literals, so docs cannot drift from
  the binary.
- `Colors`, `NO_COLORS`, `ANSI_COLORS` — the palette injected by the driver from
  `NO_COLOR`, `FORCE_COLOR`, and TTY detection.

## Layer map

Model files only; no service, no ports. `cli.model.ts` imports `node:util` for
argument parsing, declared pure in the dogfood config.

## What it does not do

No IO: nothing here writes to a stream or reads a file. No policy: which checks
exist is data here, what they mean lives in `check`. No exit codes: the driver
maps results to 0, 1, or 2.
