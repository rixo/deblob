import process from "node:process"

import { cac } from "cac"

import { createAppAssembly } from "./app.assembly.ts"
import { registerCommands } from "./lib/cli/commands.driver.ts"

// The root driver: wiring only. The one piece the gate does not traverse.
export const main = async () => {
  const notes = createAppAssembly({ token: undefined })
  const parser = cac("notes")
  registerCommands(parser, notes.cli)
  parser.parse(process.argv, { run: false })
  await parser.runMatchedCommand()
}
