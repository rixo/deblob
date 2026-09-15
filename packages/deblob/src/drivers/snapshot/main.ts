/**
 * The snapshot script driver — assembly: executed, never imported. Trigger =
 * the process invocation, input = the cwd as the project root (exactly: its own
 * config or the defaults, nothing above it), output = the snapshot as one JSON
 * line on stdout, exit code. The corpus seed, and in miniature the future baked
 * static build. One service call.
 *
 * Exit contract: 0 snapshot written, 2 config error (message on stderr).
 */

import { asConfigError } from "../../lib/config/config.model.ts"
import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { createProjectSource, extractionFor } from "../wiring.ts"

type Writer = { write(chunk: string): unknown }

export type SnapshotIo = {
  cwd: string
  stdout: Writer
  stderr: Writer
}

export const main = async (io: SnapshotIo): Promise<number> => {
  const { snapshotOf } = createSnapshotService({
    source: createProjectSource(),
    extractionFor,
  })
  try {
    io.stdout.write(`${JSON.stringify(await snapshotOf(io.cwd))}\n`)
  } catch (error) {
    io.stderr.write(`${asConfigError(error).message}\n`)
    return 2
  }
  return 0
}
