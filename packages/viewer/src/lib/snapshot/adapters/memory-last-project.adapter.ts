/** The last project in memory: what a page's session keeps, gone on reload. */

import type { LastProject } from "../last-project.port.ts"

export function createMemoryLastProject(): LastProject {
  let kept: string | null = null
  return {
    load: () => kept,
    save: (root) => {
      kept = root
    },
  }
}
