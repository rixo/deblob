/**
 * The project a run judges, as the CLI asks for it: its config, its manifest's
 * claim, its covered files and their sizes, and the import graph over them. A
 * config or extraction the user must fix throws its own error (`ConfigError`,
 * `ExtractionError`); presenting it is the front service's.
 */

import type { PackageSurface } from "../../lib/check/surface.model.ts"
import type { ResolvedConfig } from "../../lib/config/config.service.ts"
import type {
  FlavorLayer,
  ImportGraph,
} from "../../lib/extraction/graph.model.ts"

export interface Project {
  /** The config found walking up from `dir`, or the defaults rooted there. */
  loadConfig(dir: string): Promise<ResolvedConfig>
  /** The config at `path` (`-c`), resolved from `cwd`. */
  loadConfigNamed(cwd: string, path: string): Promise<ResolvedConfig>
  /** The package's `deblob` field; `null` = no claim. */
  readPackageSurface(root: string): Promise<PackageSurface | null>
  scanCoverage(config: ResolvedConfig): Promise<readonly string[]>
  sizesOf(
    root: string,
    files: readonly string[],
  ): Promise<readonly { path: string; size: number }[]>
  extractGraph(
    config: ResolvedConfig,
    files: readonly string[],
  ): Promise<ImportGraph>
  /** The layer an exports subpath's name claims, by the stock flavor. */
  classifyEntry(subpath: string): FlavorLayer | null
}
