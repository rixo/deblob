import type { Router } from "../../lib/router/router.model.ts"
import type { Cli } from "./cli.service.ts"

/**
 * Deblob's commands: one hook per command, each handing the command line on,
 * untouched, to its use case. The help and version flags win over any command;
 * a line no command word picks is the bare status (an unknown word included —
 * the use case tells it).
 */
export const registerCommands = (router: Router, cli: Cli) => {
  router.flag(["--help", "-h"], (line) => cli.help(line))
  router.flag(["--version", "-v"], (line) => cli.version(line))
  router.command("check", (line) => cli.check(line))
  router.command("explain", (line) => cli.explain(line))
  router.command("view", (line) => cli.view(line))
  router.otherwise((line) => cli.status(line))
}
