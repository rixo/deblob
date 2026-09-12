/**
 * What the viewer displays. Step 01 of the viewer chapter carries a stamp only;
 * the real contract is open (chapter PLAN § Open).
 */
export type Snapshot = {
  /** ISO timestamp of the extraction that produced the snapshot. */
  readonly generatedAt: string
}

/**
 * The viewer's only input: a stream of whole snapshots. The listener receives
 * the current snapshot at subscription and every later one. Static delivery is
 * a stream of one; live delivery a stream of many.
 *
 * Structurally a Svelte store, so components read it as `$source` — without
 * this model importing anything.
 */
export type SnapshotSource = {
  readonly subscribe: (listener: (snapshot: Snapshot) => void) => () => void
}

/** Static delivery: a stream of one. */
export const once = (snapshot: Snapshot): SnapshotSource => ({
  subscribe: (listener) => {
    listener(snapshot)
    return () => {}
  },
})
