/**
 * A source that opens on the last project (step 12 SPEC § API). The server runs
 * nothing before its client says which project it wants: when the first
 * `projects` arrive and nothing was asked for, this asks for the project shown
 * last, while the server still lists it, else the first listed
 * (`chooseProject`). Each snapshot it passes on is kept as the last project.
 * The states pass through unchanged, and so does the page's own `select`.
 */

import { readable } from "svelte/store"

import type { LastProject } from "./last-project.port.ts"
import { chooseProject } from "./project-choice.model.ts"
import type { SnapshotSource, SourceState } from "./snapshot-source.port.ts"

export function openOnLastProject(
  source: SnapshotSource,
  last: LastProject,
): SnapshotSource {
  // the start function runs on the first subscriber and sets the source's
  // current state at once: no subscriber ever sees this placeholder
  const states = readable<SourceState>(undefined, (set) => {
    // per subscription, as the socket is: a new one opens a new connection
    let asked = false
    return source.subscribe((state) => {
      if (state.snapshot !== null) {
        asked = true
        last.save(state.snapshot.project.root)
      } else if (state.error !== null) {
        // it names its project, which the source asks for again
        asked = true
      } else if (!asked && state.projects.length > 0) {
        asked = true
        source.select(chooseProject(state.projects, last.load()))
      }
      set(state)
    })
  })
  return { subscribe: states.subscribe, select: source.select }
}
