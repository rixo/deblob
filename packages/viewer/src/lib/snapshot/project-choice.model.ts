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
  projects: readonly ProjectRef[],
  last: string | null,
): string {
  const listed = projects.find(({ root }) => root === last)
  return (listed ?? (projects[0] as ProjectRef)).root
}
