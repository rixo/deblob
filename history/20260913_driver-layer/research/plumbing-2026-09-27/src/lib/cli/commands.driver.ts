import type { CAC } from "cac"

import type { Cli } from "./cli.service.ts"

// The sub-driver: the commands, their options, the hooks. Each hook hands
// cac's event on, untouched, to one use case.
export const registerCommands = (parser: CAC, cli: Cli) => {
  parser
    .command("add <text>")
    .option("--pin", "pin it")
    .action((text, opts) => cli.add(text, opts))
  parser
    .command("list")
    .option("--pinned", "pinned only")
    .action((opts) => cli.list(opts))
}
