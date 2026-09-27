/**
 * Which project a viewer opens on (step 12 SPEC § API): the one shown last,
 * while the server still lists it; else the first one listed.
 */

import type { ProjectRef } from "./snapshot.model.ts"

/**
 * The root to ask for; `projects` is never empty (the server refuses to start
 * without one).
 */
export function chooseProject(
  _projects: readonly ProjectRef[],
  _last: string | null,
): string {
  throw new Error("chooseProject: not built yet (step 12 cp1, red rows)")
}
