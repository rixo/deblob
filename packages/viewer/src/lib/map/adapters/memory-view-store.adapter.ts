/** The view store in memory: what a page's session keeps, gone on reload. */

import type { ViewStore } from "../view-store.port.ts"

export function createMemoryViewStore(): ViewStore {
  const kept = new Map<string, unknown>()
  return {
    load: (project) => kept.get(project) ?? null,
    save: (project, view) => {
      kept.set(project, view)
    },
  }
}
