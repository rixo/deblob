/**
 * Static delivery: a stream of one state, fixed at creation — a baked snapshot,
 * or `null` for a load that never ends (the placeholder until a live source is
 * wired). `select` has nothing to select from.
 */

import { readable } from "svelte/store"

import type { Snapshot } from "../snapshot.model.ts"
import type { SnapshotSource, SourceState } from "../snapshot-source.port.ts"

export const createStaticSource = (
  snapshot: Snapshot | null,
): SnapshotSource => {
  const state: SourceState =
    snapshot === null
      ? { projects: [], loading: true, error: null, snapshot: null }
      : { projects: [snapshot.project], loading: false, error: null, snapshot }
  return { ...readable(state), select: () => {} }
}
