/**
 * The snapshot script, built: the shared snapshot service over the disk, and
 * the terminal of the caller's.
 */

import { createSnapshotsAssembly } from "../../app.assembly.ts"
import { createNodeFs } from "../../lib/fs/adapters/node-fs.adapter.ts"
import { createProcessTerminal } from "../../lib/terminal/adapters/process-terminal.adapter.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"
import type { SnapshotScript } from "./snapshot.service.ts"
import { createSnapshotScript } from "./snapshot.service.ts"

/** The script over a terminal of the caller's. */
export const createSnapshotOver = (terminal: Terminal): SnapshotScript =>
  createSnapshotScript({
    terminal,
    snapshots: createSnapshotsAssembly(createNodeFs()),
  })

/** The script a node process runs. */
export const createSnapshotAssembly = (
  host: Parameters<typeof createProcessTerminal>[0],
): SnapshotScript => createSnapshotOver(createProcessTerminal(host))
