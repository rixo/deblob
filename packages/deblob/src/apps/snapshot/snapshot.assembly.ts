/**
 * The snapshot script, built: the snapshot service over the shared project
 * source, the experimental map feed (spike code, shipped: step 09 SPEC §
 * Shipping), and the terminal of the caller's.
 */

import { createProjectSource, extractionFor } from "../../app.assembly.ts"
import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { createProcessTerminal } from "../../lib/terminal/adapters/process-terminal.adapter.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"
import { createSpikeMapFeed } from "../../spike/map-feed/map-feed.adapter.ts"
import type { SnapshotScript } from "./snapshot.service.ts"
import { createSnapshotScript } from "./snapshot.service.ts"

/** The script over a terminal of the caller's. */
export const createSnapshotOver = (terminal: Terminal): SnapshotScript =>
  createSnapshotScript({
    terminal,
    snapshots: createSnapshotService({
      source: createProjectSource(),
      extractionFor,
      feed: createSpikeMapFeed(),
    }),
  })

/** The script a node process runs. */
export const createSnapshotAssembly = (
  host: Parameters<typeof createProcessTerminal>[0],
): SnapshotScript => createSnapshotOver(createProcessTerminal(host))
