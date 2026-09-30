import process from "node:process"

import { createServeAssembly } from "./serve.assembly.ts"

/**
 * The root driver: the serve app built over this process and run. Its tech is
 * the host alone — the process starting is the event (GUESS: D7).
 */
export const main = async () => {
  const app = createServeAssembly(process)
  await app.run()
}
