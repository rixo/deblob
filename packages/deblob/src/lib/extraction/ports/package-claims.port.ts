/**
 * The producers' own claims: a package's `deblob` field names the layer each
 * exports subpath fronts, read through the run's resolver from the consumer's
 * root. One reader per run — it caches by package.
 */

import type { FlavorLayer } from "../graph.model.ts"
import type { Resolver } from "./resolver.port.ts"

export interface PackageClaims {
  readerFor(options: {
    /** The run's resolver — the same lens extraction sees packages through. */
    resolve: Resolver["resolve"]
    /** Absolute file path resolution anchors at (the consumer's root). */
    anchor: string
  }): { layerOf(specifier: string): Promise<FlavorLayer | null> }
}
