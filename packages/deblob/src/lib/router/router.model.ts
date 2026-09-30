/**
 * A command-line router: commands and winning flags registered as hooks, one of
 * them called per run with the command line as the tech received it. The
 * genre's part only — which word is a command, which flag wins — nothing of any
 * one program's grammar: the hook's front parses the line itself. deblob's own
 * CLI's tech (C1 (b)): a reader claims this file, so a callback handed to
 * `command`/`flag`/`otherwise` is a hook (GUESS: D4).
 *
 * A flag wins over any command (`--help` anywhere on the line); else the first
 * word that names a command picks it; else `otherwise`. Words are compared
 * whole, before `--`. A value that spells a command (`-c check`) picks it: the
 * router knows no option's arity (GUESS: C1 — the front reparses and says so).
 */

/** What a hook receives: the command line, `argv` minus node and the script. */
export type CommandLine = readonly string[]

export type Hook = (line: CommandLine) => unknown

export type Router = {
  /** The hook for `name`, the first word on the line that names a command. */
  command(name: string, hook: Hook): Router
  /** The hook for a flag that wins over every command (`--help`, `-h`). */
  flag(names: readonly string[], hook: Hook): Router
  /** The hook when no flag wins and no word names a command. */
  otherwise(hook: Hook): Router
  /**
   * Picks the hook for `argv` (a process's: the first two entries are node and
   * the script) and calls it — its value is the run's.
   */
  run(argv: readonly string[]): Promise<unknown>
}

export const createRouter = (): Router => {
  const commands = new Map<string, Hook>()
  const flags = new Map<string, Hook>()
  let fallback: Hook = () => undefined

  const hookFor = (line: CommandLine): Hook => {
    const end = line.indexOf("--")
    const words = end === -1 ? line : line.slice(0, end)
    for (const word of words) {
      const hook = flags.get(word)
      if (hook !== undefined) return hook
    }
    for (const word of words) {
      const hook = commands.get(word)
      if (hook !== undefined) return hook
    }
    return fallback
  }

  const router: Router = {
    command: (name, hook) => {
      commands.set(name, hook)
      return router
    },
    flag: (names, hook) => {
      for (const name of names) flags.set(name, hook)
      return router
    },
    otherwise: (hook) => {
      fallback = hook
      return router
    },
    run: async (argv) => {
      const line = argv.slice(2)
      return hookFor(line)(line)
    },
  }
  return router
}
