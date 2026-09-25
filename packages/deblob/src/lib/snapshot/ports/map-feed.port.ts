/**
 * What the design's map needs beyond the snapshot's fold, read from a project's
 * tree: the call stacks, the READMEs. One function per part, so each can be
 * replaced on its own — the symbol level already graduated into extraction.
 * Promise-only: every function may touch the platform.
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
  /**
   * The README of each directory given (root-relative, `.` = the root), as
   * blocks; a directory without one is absent from the answer.
   */
  readmesOf(root: string, dirs: readonly string[]): Promise<MapData["readmes"]>
}
