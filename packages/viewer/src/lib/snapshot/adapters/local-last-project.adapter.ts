/**
 * The last project in the browser's `localStorage` (or any `Storage` handed
 * in), under one key, `deblob.view.project` — per origin, so two servers on two
 * ports keep two. A save the storage refuses (full, blocked) is dropped.
 */

import type { LastProject } from "../last-project.port.ts"

const KEY = "deblob.view.project"

export function createLocalLastProject(storage: Storage): LastProject {
  return {
    load: () => storage.getItem(KEY),
    save: (root) => {
      try {
        storage.setItem(KEY, root)
      } catch {
        // full or blocked: the next load opens on the first project listed
      }
    },
  }
}
