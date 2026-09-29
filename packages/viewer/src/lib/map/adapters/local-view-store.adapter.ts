/**
 * The view store in the browser's `localStorage` (or any `Storage` handed in):
 * one JSON entry per project, `deblob.view.v1:<project root>`. An entry that
 * does not parse reads as nothing kept; a save the storage refuses (full,
 * blocked) is dropped: the view is a convenience, never worth a failure.
 */

import type { ViewStore } from "../view-store.port.ts"

export function createLocalViewStore(storage: Storage): ViewStore {
  const keyOf = (project: string) => `deblob.view.v1:${project}`
  return {
    load: (project) => {
      const entry = storage.getItem(keyOf(project))
      if (entry === null) return null
      try {
        return JSON.parse(entry) as unknown
      } catch {
        return null
      }
    },
    save: (project, view) => {
      try {
        storage.setItem(keyOf(project), JSON.stringify(view))
      } catch {
        // full or blocked: the view is not kept, nothing else is lost
      }
    },
  }
}
