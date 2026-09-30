# router

A command-line router: hooks registered by command word and by winning flag, one
called per run with the command line untouched. The genre's part only — it knows
no program's grammar, no option's arity: the hook's front parses the line
itself. deblob's own CLI's tech (C1 (b)): the CLI's driver reader claims this
file (GUESS: D4), so a callback handed to it is a hook.

## API

- `createRouter()` → `Router`: `command(name, hook)`, `flag(names, hook)`,
  `otherwise(hook)`, each returning the router; `run(argv)` drops node and the
  script, picks the hook — a flag anywhere before `--` wins, else the first word
  naming a command, else `otherwise` — and answers its value.

## Layer map

One model file, `router.model.ts`: a factory, its registrations held inside.

## What it does not do

No parsing: `-c check` picks `check`, the value spelling a command — the front
rereads the line and says so. No help, no usage text: those are a program's.
