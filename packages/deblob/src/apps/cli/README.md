# cli (app)

The `deblob` command, whole: its boot, its drivers, its front service, the ports
the front needs and what speaks only this CLI — its grammar and its help
screens. What any front shares lives in `src/lib` (the router, the terminal, the
verdicts as text).

## Map

- `cli.boot.ts` — the package's `bin`: one call, to `cli.driver.ts`'s `main`.
- `cli.driver.ts` — the root driver: the CLI built over the process
  (`cli.assembly.ts`), the router set up, the commands registered, the process's
  argv run. Covered by the boot's child-process smoke test only.
- `commands.driver.ts` — `registerCommands(router, cli)`: one hook per command,
  the line handed on untouched. `--help`/`-h` and `--version`/`-v` win over any
  command; a line no command word picks is the bare status.
- `cli.service.ts` — the front service: `help`, `version`, `status`, `check`,
  `explain`, `view`, each parsing its line (`cli.model.ts`), running, rendering
  (`lib/report`), setting the exit code: 0 clean, 1 violations, 2 usage or
  config error; bare `deblob` is always 0.
- `cli.assembly.ts` — `createCliOver(terminal, install)` (the tests' way in) and
  `createCliAssembly(process)`.
- Collaborators: the config unit (load), `check`'s judge (the check chain,
  shared with the corpus and the snapshot), `Coverage` and `Manifest` for the
  bare status; its own port `install.port.ts` (version, content and bundle
  roots); `Viewer` is `lib/view`'s. Adapter: `adapters/install.adapter.ts`,
  anchored at the package root.
- `cli.model.ts` — `parseCli(line)`: the grammar, usage errors as values;
  `rulesForTopic`, `isRuleNumber`. `help.model.ts` — `HELP`, `CHECK_HELP`.

## Tests

`commands.driver.spec.ts` is the gate: the commands registered on a fresh router
over a recording terminal, real argv, the goldens in `__fixtures__/`; the boot
spawned once as a smoke test.
