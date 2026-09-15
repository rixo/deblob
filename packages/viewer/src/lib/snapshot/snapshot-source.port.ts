/**
 * The viewer's only input: a stream of whole states. The listener receives the
 * current state at subscription and every later one; static delivery is a
 * stream of one, live delivery a stream of many. A Svelte store, so components
 * read it as `$source`.
 */

import type { Readable } from "svelte/store"

import type { ProjectRef, Snapshot } from "./snapshot.model.ts"

/** The server's word when a project could not be snapshotted. */
export type SourceError = {
  readonly project: string
  readonly message: string
}

/**
 * Loading means a snapshot was asked for and not answered yet: connecting, or a
 * project selected. The previous snapshot stays up meanwhile, and after an
 * error; a new request clears the error. Every answer is a snapshot or an
 * error, so there is no loaded-but-empty state.
 */
export type SourceState = {
  /** What the source can show; empty until known. */
  readonly projects: readonly ProjectRef[]
} & (
  | {
      readonly loading: true
      readonly error: null
      readonly snapshot: Snapshot | null
    }
  | {
      readonly loading: false
      readonly error: null
      readonly snapshot: Snapshot
    }
  | {
      readonly loading: false
      readonly error: SourceError
      readonly snapshot: Snapshot | null
    }
)

export type SnapshotSource = Readable<SourceState> & {
  /** Ask for another project, by root. A static source has nothing to select. */
  readonly select: (project: string) => void
}
