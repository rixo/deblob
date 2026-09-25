/**
 * What the design's map needs beyond the snapshot's fold and the project's
 * files: the call stacks. The tracer is spike code (it reads deblob's own CLI
 * only), so it stays behind a port until it graduates; the symbol level and the
 * READMEs already did (extraction, the project source).
 */

import type { MapData, MapSequence } from "@deblob/viewer/snapshot.model"

/** The map's rows: modules and edges with their symbol level. */
export type MapRows = Pick<MapData, "modules" | "edges">

export type MapFeed = {
  /**
   * The call stacks, from the drivers down. Throws an `Error` when the tracer
   * cannot read the tree: its message says why.
   */
  sequenceOf(root: string, rows: MapRows): Promise<MapSequence>
}
