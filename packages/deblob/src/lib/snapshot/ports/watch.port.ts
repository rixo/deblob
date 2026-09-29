/**
 * The filesystem's word that something changed under a set of directories —
 * each watched for its own entries, never its subtree. What changed is not
 * reported: the re-run re-scans. One call per burst: the adapter owns the quiet
 * window. Promise-only.
 */

export type Watch = {
  /**
   * The set to watch from now on — no gap: what stays watched keeps its watch,
   * and what is added is watched before what is removed goes. Calls are applied
   * in the order they are made, whatever their durations: the set of the last
   * call is the one watched, and a call that resolves has been applied. An
   * update to the set already watched does nothing.
   */
  update(dirs: readonly string[]): Promise<void>
  close(): Promise<void>
}

export type Watcher = {
  /** Absolute directories; resolves once they are watched. */
  watch(dirs: readonly string[], onChange: () => void): Promise<Watch>
}
