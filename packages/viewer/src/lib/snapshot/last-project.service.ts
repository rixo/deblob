/**
 * A source that opens on the last project (step 12 SPEC § API). The server runs
 * nothing before its client says which project it wants: when the first
 * `projects` arrive and nothing was asked for, this asks for the project shown
 * last, while the server still lists it, else the first listed
 * (`chooseProject`). Each snapshot it passes on is kept as the last project.
 * The states pass through unchanged, and so does the page's own `select`.
 */

import type { LastProject } from "./last-project.port.ts"
import type { SnapshotSource } from "./snapshot-source.port.ts"

export function openOnLastProject(
  _source: SnapshotSource,
  _last: LastProject,
): SnapshotSource {
  throw new Error("openOnLastProject: not built yet (step 12 cp1, red rows)")
}
