/**
 * SPIKE (2026-09-25, map feed) — rewritten 100% before anything ships; delete
 * with src/spike.
 *
 * The map prototype's data, live from a project tree: the snapshot, plus the
 * symbol level (fine.ts), plus the call stacks (sequence.ts). Same shape as the
 * frozen `data/deblob.sequence.snapshot.2.json` the design project runs on;
 * their `data/gen-graph.js` turns it into the graph module.
 *
 * Usage: node src/spike/map-feed/feed.ts <projectRoot> > snapshot.json
 */

import { resolve } from "node:path"

import { createProjectSource, extractionFor } from "../../drivers/wiring.ts"
import { createSnapshotService } from "../../lib/snapshot/snapshot.service.ts"
import { createSpikeMapFeed } from "./map-feed.adapter.ts"

// step 09: through the product's snapshot service and the feed port, flattened
// back to the design's one-object shape; a tree the tracer cannot read throws,
// as before
export async function mapFeed(root: string): Promise<any> {
  const { snapshotOf } = createSnapshotService({
    source: createProjectSource(),
    extractionFor,
    feed: createSpikeMapFeed(),
  })
  const { map, ...snapshot } = await snapshotOf(root)
  if (map.sequence === null) throw new Error(map.sequenceMissing ?? "")
  return {
    ...snapshot,
    modules: map.modules,
    edges: map.edges,
    ...map.sequence,
  }
}

if (import.meta.main) {
  const root = process.argv[2]
  if (root === undefined) throw new Error("usage: feed.ts <projectRoot>")
  process.stdout.write(
    `${JSON.stringify(await mapFeed(resolve(root)), null, 1)}\n`,
  )
}
