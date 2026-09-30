/**
 * The snapshot script's front service: the cwd as the project root (exactly:
 * its own config or the defaults, nothing above it), the snapshot as one JSON
 * line on stdout. The corpus seed, and in miniature the future baked static
 * build.
 *
 * Exit contract: 0 snapshot written, 2 config error (message on stderr).
 */

import { asConfigErrorOrRethrow } from "../../lib/config/config.model.ts"
import type { SnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"

export const createSnapshotScript = ({
  terminal,
  snapshots,
}: {
  terminal: Terminal
  snapshots: Pick<SnapshotService, "snapshotOf">
}) => {
  const runSnapshot = async (): Promise<number> => {
    try {
      terminal.out(
        `${JSON.stringify(await snapshots.snapshotOf(terminal.cwd))}\n`,
      )
    } catch (error) {
      terminal.err(`${asConfigErrorOrRethrow(error).message}\n`)
      return 2
    }
    return 0
  }

  return {
    run: async (): Promise<void> => {
      terminal.exit(await runSnapshot())
    },
  }
}

export type SnapshotScript = ReturnType<typeof createSnapshotScript>
