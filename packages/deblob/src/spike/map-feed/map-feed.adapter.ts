/**
 * SPIKE (2026-09-25, step 09) — delete with src/spike. The map feed port on the
 * spike's three probes, as they are: the symbol level (fine.ts), the call
 * stacks (sequence.ts: deblob's CLI only, throws on any other tree), the
 * READMEs (readmes.ts). Symbols and READMEs are rebuilt as product code in step
 * 09 checkpoint 3; the tracer graduates with the tracer work.
 *
 * Known gap: the tracer's module list relabels `src/drivers/cli/main.ts` as a
 * driver; only its `callables`, `participants` and `drivers` are kept, so the
 * map shows that file with the layer its config gives it.
 */

import type { MapFeed } from "../../lib/snapshot/ports/map-feed.port.ts"
import { fineSnapshot } from "./fine.ts"
import { readmesOf } from "./readmes.ts"
import { sequenceSnapshot } from "./sequence.ts"

export const createSpikeMapFeed = (): MapFeed => ({
  symbolsOf: async (root, rows) => {
    const { modules, edges } = await fineSnapshot(root, rows)
    return { modules, edges }
  },
  sequenceOf: async (root, symbols) => {
    const { callables, participants, drivers } = await sequenceSnapshot(
      root,
      symbols,
    )
    return { callables, participants, drivers }
  },
  readmesOf: async (root, dirs) => readmesOf(root, dirs),
})
