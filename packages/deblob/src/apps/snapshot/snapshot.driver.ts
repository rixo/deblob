import process from "node:process"

import { createSnapshotAssembly } from "./snapshot.assembly.ts"

/**
 * The root driver: the snapshot script built over this process and run. Its
 * tech is the host alone — the process starting is the event (GUESS: D7).
 */
export const main = async () => {
  const script = createSnapshotAssembly(process)
  await script.run()
}
