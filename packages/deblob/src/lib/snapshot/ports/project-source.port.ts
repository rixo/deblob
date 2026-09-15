/**
 * What a snapshot needs from the world, as functions: the CLI's own load → scan
 * → measure sequence, composed by the driver from what exists today. The
 * service never sees an adapter. Promise-only: every function may touch the
 * platform.
 */

import type { ResolvedConfig } from "../../config/config.service.ts"

export type ProjectSource = {
  /** Config discovery from a project directory — its own files, or defaults. */
  loadConfig(dir: string): Promise<ResolvedConfig>
  /** The coverage set: paths relative to the config root, POSIX-style. */
  scanCoverage(config: ResolvedConfig): Promise<readonly string[]>
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
