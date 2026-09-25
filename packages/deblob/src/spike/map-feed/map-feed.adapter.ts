/**
 * SPIKE (2026-09-25, step 09) — delete with src/spike. The map feed port on the
 * spike's probes, as they are: the call stacks (sequence.ts: deblob's CLI only,
 * throws on any other tree) and the READMEs (readmes.ts, rebuilt as product
 * code next). The symbol level graduated into extraction (step 09 checkpoint
 * 3); fine.ts stays only as the parity row's oracle. The tracer graduates with
 * the tracer work.
 *
 * Known gap: the tracer's module list relabels `src/drivers/cli/main.ts` as a
 * driver; only its `callables`, `participants` and `drivers` are kept, so the
 * map shows that file with the layer its config gives it.
 */

import type { MapFeed } from "../../lib/snapshot/ports/map-feed.port.ts"
import { readmesOf } from "./readmes.ts"
import { sequenceSnapshot } from "./sequence.ts"

export const createSpikeMapFeed = (): MapFeed => ({
  sequenceOf: async (root, rows) => {
    const { callables, participants, drivers } = await sequenceSnapshot(
      root,
      rows,
    )
    return { callables, participants, drivers }
  },
  readmesOf: async (root, dirs) => readmesOf(root, dirs),
})
