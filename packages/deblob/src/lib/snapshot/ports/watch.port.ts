/**
 * The filesystem's word that something changed under a set of directories —
 * each watched for its own entries, never its subtree. What changed is not
 * reported: the re-run re-scans. One call per burst: the adapter owns the quiet
 * window. Promise-only.
 */

export type Watch = {
  /** Replace the set — no gap: what stays watched keeps its watch. */
  update(dirs: readonly string[]): Promise<void>
  close(): Promise<void>
}

export type Watcher = {
  /** Absolute directories; resolves once they are watched. */
  watch(dirs: readonly string[], onChange: () => void): Promise<Watch>
}
