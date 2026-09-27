// SPIKE (steps 09, 11) — delete with src/spike. The host's signature, for the
// entry: map.js is spike JavaScript, outside the typecheck.
import type { ViewStore } from "../../../lib/map/view-store.port.ts"
import type { SnapshotSource } from "../../../lib/snapshot/snapshot-source.port.ts"

/**
 * Mounts the design's Viewer on `target`, fed by `source`, its view kept in
 * `viewStore` per project; returns its teardown.
 */
export declare function mountMap(
  target: HTMLElement,
  source: SnapshotSource,
  viewStore: ViewStore,
): () => void
