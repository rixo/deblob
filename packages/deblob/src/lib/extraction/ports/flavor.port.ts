/**
 * The naming-scheme axis as an interface: a flavor turns paths into layer
 * classifications and service-root attributions. Path-only decidable — no file
 * contents — but set-based: service-root discovery needs the sibling listing,
 * so a flavor classifies the whole coverage set at once.
 */

import type { FlavorLayer } from "../graph.model.ts"

export type FlavorClassification = {
  layer: FlavorLayer
  serviceRoot: string | null
  isPrivate: boolean
}

export interface FlavorResolver {
  /**
   * The flavor's type-only stance — its default for the rule-8 exemption
   * (absent = exempt, canon's letter). The config key overrides either way; the
   * floor stays canon.
   */
  readonly typeOnlyExempt?: boolean

  /**
   * Classify every file of the coverage set (paths relative to the project
   * root, POSIX-style). Total: every given path gets a classification — unknown
   * shapes land in `blob`, never an error, never a skip.
   */
  classify(files: readonly string[]): ReadonlyMap<string, FlavorClassification>

  /**
   * The naming rule over one exports subpath or specifier tail — how a
   * package's entries classify from outside. `null` = no claim. Optional: a
   * flavor without it contributes nothing cross-package. In v1 both sides of
   * the boundary consult the stock resolver's implementation (the `deblob`
   * field claims the stock rule); the method lives on the port so a named
   * flavor can carry its own rule later.
   */
  classifyEntry?(subpath: string): FlavorLayer | null
}
