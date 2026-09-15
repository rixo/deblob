/**
 * What a snapshot needs from the world, as functions: the CLI's own load → scan
 * → measure sequence, composed by the driver from what exists today. The
 * service never sees an adapter. Promise-only: every function may touch the
 * platform.
 */

import type { ResolvedConfig } from "../../config/config.service.ts"

export type ProjectSource = {
  /**
   * The project containing `dir`: config discovery walking up from it, as the
   * CLI does from its cwd; the defaults when nothing is found anywhere above.
   */
  loadConfig(dir: string): Promise<ResolvedConfig>
  /**
   * The project at `root` exactly: its own config files, or the defaults rooted
   * there — never an ancestor's (rixo, 2026-09-16: a listed directory is the
   * project, discovery stops at it).
   */
  loadConfigAt(root: string): Promise<ResolvedConfig>
  /** The coverage set: paths relative to the config root, POSIX-style. */
  scanCoverage(config: ResolvedConfig): Promise<readonly string[]>
  /**
   * The directories coverage spans — `include` matched against directories,
   * minus `exclude`, hidden paths never entered; the root itself is not listed.
   * Same shape as `scanCoverage`: root-relative, POSIX-style, sorted. What a
   * watcher watches, each for its own entries.
   */
  scanCoverageDirs(config: ResolvedConfig): Promise<readonly string[]>
  /** Byte size per covered file — the size-weighted blob share reads it. */
  sizesOf(
    root: string,
    files: readonly string[],
  ): Promise<readonly { path: string; size: number }[]>
  /** The `name` of the package manifest at `root`; `null` when there is none. */
  manifestNameOf(root: string): Promise<string | null>
  /** The clock — an ISO timestamp. */
  now(): string
}
