/**
 * Coverage on disk: the files a run judges, the directories they span, and
 * their sizes. Root-relative POSIX paths, sorted.
 */

import type { ResolvedConfig } from "../config.service.ts"

type Scoped = Pick<ResolvedConfig, "root" | "include" | "exclude">

export interface Coverage {
  /** The covered files: `include` minus `exclude`, gated by `covers`. */
  scanCoverage(
    config: Scoped & Pick<ResolvedConfig, "covers">,
  ): Promise<readonly string[]>
  /** The directories coverage spans — what a watcher watches. */
  scanCoverageDirs(config: Scoped): Promise<readonly string[]>
  /** Byte size per file. */
  statSizes(
    root: string,
    files: readonly string[],
  ): Promise<readonly { path: string; size: number }[]>
}
