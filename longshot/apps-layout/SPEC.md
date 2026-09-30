# Apps layout — one folder per app

Written after the fact (2026-09-30): the move was talked through and built the
same day, and its reasons lived only in the conversation. This file keeps them
for whoever integrates longshot. GUESSES.md L1–L6 carry the findings; DELTA.md
the file list.

## Why

Boot, driver and assembly are thin by canon, one allowed thing each. Seen from
outside, the drivers of one app are its surface: the list of primary use cases,
where the tests connect. Filing a driver next to the unit it happens to call
(the first idea tried in the talk) scatters that surface over the units: the CLI
reaches `config`, `extraction`, `check` and `view`, and no unit owns it. A
surface read in one place answers "what can this program do" in one place; a
scattered one answers it nowhere.

The old `src/drivers/` folder was a leftover of glob designation, from before
the suffixes named the kinds. Its glob (`src/drivers/**` as assembly) also
claimed files it should not (`main.spec.ts`, fixed by a pattern hack) and turned
every CLI line into an `assembly-builds-only` red (≈420 of the self-check's
601).

deblob wants to show in its own tree what it believes is best (the codebase is
the showcase), and to publish the layout as a recipe others can follow — never
as a check (a check on folders is one step into nannying, rixo 2026-09-30).

## Goal

One folder per app under `src/apps/`, holding everything that app alone speaks;
`src/lib/` holding everything no single app owns. The line between the two is
vocabulary, not layer:

- An app's folder: its boot, its root driver, its sub-drivers, its front
  service, the ports and adapters only it uses, the models of its own grammar
  (argv, help screens).
- `src/lib/`: the domain units, and genre code no single app owns — a CLI router
  is CLI-genre, not deblob-CLI (a second CLI would reuse it untouched), the
  terminal kernel serves every app, the verdicts as text serve the CLI and the
  map. rixo's input, not ruled: web components live in their domain unit
  (`lib/user/ui`), the same reasoning — `$lib/components` is framework habit.
- `src/` root: what the apps share and none owns (`app.assembly.ts`), and the
  packaging entries.

The wrapper is named `apps/`: fractal with a monorepo's `apps/` beside
`packages/`. An earlier "no wrapper, `src/` is the wrapper" was wrong — the same
shape as a monorepo is `src/apps/*` + `src/lib/*`, not `src/<app>/` beside
`src/lib/`. Rejected names: `drivers/` (the folder holds boots, front services,
ports — naming it after a layer the suffix already carries), `fronts/` (reads as
frontend), `entries/` (sounds like a part of a bigger whole). Cost owed: canon's
"a program has one [boot] per entry point — a bin, a server, an app"
(architecture.md ~714) uses "app" for one kind of entry point.

SvelteKit alignment: `routes/` is a framework-owned folder beside `lib/`, the
same shape; `lib/` keeps the same meaning on both sides.

## API

What moved, and the contracts it created:

- `lib/router/router.model.ts` — `createRouter()`: `command`, `flag`,
  `otherwise`, `run(argv)`. deblob's CLI's tech (C1 (b)), claimed by an inline
  reader in `deblob.config.ts` through `DriverReader.claimsFile` (D4). No option
  arity: the front rereads the line (`-c check` picks `check`; the front says
  "write it `--config=<path>`").
- `lib/terminal/terminal.port.ts` — `Terminal`: `out`, `err`, `interactive`,
  `cwd`, `env`, `exit`, `stopped`. Every app's world, replacing the `io` value
  each `main(io)` took. Why a port and not a value: the exit code and the stop
  are effects, and the tests need a recording terminal.
- `apps/cli/`: `cli.boot.ts` (the package `bin`), `cli.driver.ts` (root),
  `commands.driver.ts` (one hook per command), `cli.service.ts` (front service,
  one use case per command, each rereading its line), ports `project`,
  `install`; `Viewer` is `lib/view`'s (two apps use it).
- `apps/serve/`, `apps/snapshot/`: boot, root driver, front service, assembly.
- `lib/report/` — ex `lib/cli` minus the grammar and help: the map imports
  `violationMessage` and the stats lines, so it is no single app's.
- `KNOWN_CHECKS`, `CHECK_RULES` → `lib/check/checks.model.ts`: the corpus uses
  them, they are the check domain's words.

## Testing

Each app's gate runs it as the process runs it, the process aside: the CLI's
registers the commands on a fresh router over a recording terminal and runs real
argv (the goldens unchanged); serve and snapshot run their front over a
recording terminal. The boots are covered by child-process smoke tests only,
excluded from coverage with the root drivers (process glue, the 09 exception).
Suite and coverage 100 held through the move.

## Implementation

What the self-check said, and what was learned:

- 601 → 269. Most of the drop is the glob's `assembly-builds-only`; both CLI
  driver files read clean.
- The layout caught a real direction error at once: `lib/snapshot`'s spec drove
  the CLI to compare counts — a lib unit depending on an app, reported by `dag`
  as a service cycle. The parity test belongs to the app; it moved to the CLI's
  gate.
- Findings L2–L6 (GUESSES.md): the gate registering per test (T1 input), each
  app's process assembly delegating to its test-facing one (L3), process-start
  drivers (L4, D7's other half), the server composition (L5), the map's sequence
  for deblob now missing (L6, the spike tracer read the old `switch`).
- The pattern every app hit identically (L3, L4) is the signal to weigh: a rule
  every app trips the same way, with no clean way out, is a smell in the rule.

## Docs

Done: READMEs for `apps/cli`, `lib/router`, `lib/terminal`, `lib/report`; path
updates in `lib/snapshot`, `lib/view`, the viewer package. Owed at integration,
each with its own go: `docs/implementation-guide.md`'s `drivers/` bullet and the
skill's `service-anatomy.md` (both describe `drivers/cli/`), canon's "a bin, a
server, an app", the recipe itself as published guidance.
