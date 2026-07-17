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
   * Classify every file of the coverage set (paths relative to the project
   * root, POSIX-style). Total: every given path gets a classification — unknown
   * shapes land in `blob`, never an error, never a skip.
   */
  classify(files: readonly string[]): ReadonlyMap<string, FlavorClassification>
}
