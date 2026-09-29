/**
 * The project shown last in this browser (step 12 SPEC § API): read once when
 * the server lists its projects, written on each snapshot shown. A root, as the
 * server lists it; `null` when none was kept.
 */
export type LastProject = {
  readonly load: () => string | null
  /** Replaces what is kept. A store that cannot keep it drops it. */
  readonly save: (root: string) => void
}
