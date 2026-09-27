/**
 * Where the design's view of a project is kept between visits (step 11 SPEC §
 * API). Only the host knows which project is shown, so the store is keyed by
 * project; the value is theirs, opaque: what they save comes back as it was,
 * never read into. Synchronous: their page reads it once, before its first
 * layout.
 */
export type ViewStore = {
  /** What was saved for `project`, or `null` when nothing usable was. */
  readonly load: (project: string) => unknown
  /** Replaces what is kept for `project`. A store that cannot keep it drops it. */
  readonly save: (project: string, view: unknown) => void
}
