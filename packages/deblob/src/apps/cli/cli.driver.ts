import process from "node:process"

import { createRouter } from "../../lib/router/router.model.ts"
import { createCliAssembly } from "./cli.assembly.ts"
import { registerCommands } from "./commands.driver.ts"

/**
 * The root driver: the CLI built over this process, the router set up, the
 * commands registered, the process's line run. The one piece the gate does not
 * traverse — the boot's child-process smoke test does.
 */
export const main = async () => {
  const cli = createCliAssembly(process)
  const router = createRouter()
  registerCommands(router, cli)
  await router.run(process.argv)
}
