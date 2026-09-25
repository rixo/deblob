// SPIKE (step 09) — delete with src/spike. The bridge's signature, for the
// entry: map.js is spike JavaScript, outside the typecheck.
import type { SnapshotSource } from "../../../lib/snapshot/snapshot-source.port.ts"

/** Mounts the design's map on `target`, fed by `source`; returns its teardown. */
export declare function mountMap(
  target: HTMLElement,
  source: SnapshotSource,
): () => void
