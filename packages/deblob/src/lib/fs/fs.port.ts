/**
 * The filesystem as the run sees it — the read side only: what the readers use
 * today, nothing anticipated (a member arrives with the code that reads it).
 * Promise-only: a sync member exists only with a force-majeure case written
 * next to it. Paths are absolute; `glob` answers root-relative POSIX paths.
 */
export interface Fs {
  /** File contents as UTF-8; `null` when nothing is at the path. */
  readFile(path: string): Promise<string | null>
  /** A file or a directory is at the path. */
  exists(path: string): Promise<boolean>
  /**
   * A file's size in bytes; `null` when nothing is at the path, or what is
   * there is not a file — so `stat` is also the "is a file" question.
   */
  stat(path: string): Promise<{ size: number } | null>
  /**
   * Files under `cwd` matching the patterns and none of the ignores, as
   * cwd-relative POSIX paths in no particular order; hidden segments never
   * match.
   */
  glob(
    patterns: readonly string[],
    options: { cwd: string; ignore?: readonly string[] },
  ): Promise<string[]>
}
