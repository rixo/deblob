/**
 * The last project in the browser's `localStorage` (or any `Storage` handed
 * in), under one key, `deblob.view.project` — per origin, so two servers on two
 * ports keep two. A save the storage refuses (full, blocked) is dropped.
 */

import type { LastProject } from "../last-project.port.ts"

export function createLocalLastProject(_storage: Storage): LastProject {
  throw new Error(
    "createLocalLastProject: not built yet (step 12 cp1, red rows)",
  )
}
