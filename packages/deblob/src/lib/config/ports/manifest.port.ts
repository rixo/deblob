/**
 * The package manifest at a project's root, as a run reads it: the name a
 * project is called by, and the package's own surface claim (the `deblob` field
 * with its exports map). A field this version cannot honour is a
 * `ConfigError`.
 */

import type { PackageSurface } from "../config.model.ts"

export interface Manifest {
  /** The package's `name`; `null` without a manifest or a string name. */
  readPackageName(root: string): Promise<string | null>
  /** The `deblob` field's claim; `null` = no manifest or no field. */
  readPackageSurface(root: string): Promise<PackageSurface | null>
}
