/**
 * SPIKE (2026-09-25, step 09) — delete with src/spike. The map feed port on the
 * spike's tracer, as it is: the call stacks (sequence.ts: deblob's CLI only,
 * throws on any other tree). The symbol level and the READMEs graduated (step
 * 09 checkpoint 3). The tracer graduates with the tracer work.
 *
 * Known gap: the tracer's module list relabels `src/drivers/cli/main.ts` as a
 * driver; only its `callables`, `participants` and `drivers` are kept, so the
 * map shows that file with the layer its config gives it.
 */

import type { MapFeed } from "../../lib/snapshot/ports/map-feed.port.ts"
import { sequenceSnapshot } from "./sequence.ts"

export const createSpikeMapFeed = (): MapFeed => ({
  sequenceOf: async (root, rows) => {
    const { callables, participants, drivers } = await sequenceSnapshot(
      root,
      rows,
    )
    return { callables, participants, drivers }
  },
})
