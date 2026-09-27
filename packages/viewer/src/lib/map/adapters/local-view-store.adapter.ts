/**
 * The view store in the browser's `localStorage` (or any `Storage` handed in):
 * one JSON entry per project, `deblob.view.v1:<project root>`. An entry that
 * does not parse reads as nothing kept; a save the storage refuses (full,
 * blocked) is dropped: the view is a convenience, never worth a failure.
 */

import type { ViewStore } from "../view-store.port.ts"

export function createLocalViewStore(_storage: Storage): ViewStore {
  throw new Error("createLocalViewStore: not built yet (step 11 cp2, red rows)")
}
