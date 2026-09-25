/**
 * What the design's map needs beyond the snapshot, read from a project's tree:
 * the symbol level, the call stacks, the READMEs. One function per part, so
 * each can be replaced on its own. Promise-only: every function may touch the
 * platform.
 */

import type {
  MapData,
  MapSequence,
  Snapshot,
} from "@deblob/viewer/snapshot.model"

/** The snapshot's rows, and the same rows with the symbol level added. */
export type MapRows = Pick<Snapshot, "modules" | "edges">
export type MapSymbols = Pick<MapData, "modules" | "edges">

export type MapFeed = {
  /** Each module's exported declarations, each edge's imported names. */
  symbolsOf(root: string, rows: MapRows): Promise<MapSymbols>
  /**
   * The call stacks, from the drivers down. Throws an `Error` when the tracer
   * cannot read the tree: its message says why.
   */
  sequenceOf(root: string, symbols: MapSymbols): Promise<MapSequence>
  /**
   * The README of each directory given (root-relative, `.` = the root), as
   * blocks; a directory without one is absent from the answer.
   */
  readmesOf(root: string, dirs: readonly string[]): Promise<MapData["readmes"]>
}
