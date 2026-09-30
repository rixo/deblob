# terminal

What a program started from a terminal sees of it — every app deblob ships runs
there, so the kernel is the genre's, not one app's. A port and two adapters, no
service: a consumer takes the port injected.

## Port

- `terminal.port.ts` — `Terminal`: `out(chunk)`, `err(chunk)`, `interactive`
  (stdout is a TTY), `cwd`, `env(name)`, `exit(code)`, and `stopped()`, settled
  when the user stops the program.

## Adapters

- `adapters/process-terminal.adapter.ts` — `createProcessTerminal(process)`:
  node's streams, cwd, env and `exitCode`; the stop listens for SIGINT and
  SIGTERM only once asked, so a program that never waits keeps node's default
  ctrl-c.
- `adapters/recording-terminal.adapter.ts` — `createRecordingTerminal(options)`:
  held in memory, the tests' way in — both streams and the exit code recorded,
  the stop settled on demand.
