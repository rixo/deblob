/**
 * The technology axis as an interface — canon's "reading": each technology
 * comes with how its files are recognized, which packages are its tech, how its
 * files are cut into hooks, and which driver rules it exempts. In the checker
 * it is one adapter per tech, as the flavor is one per naming convention; the
 * port is named for what varies. Recognition is the config's (suffixes and
 * designation globs) and the cut is one rule for every tech shipped so far (a
 * function handed to a tech callee — the reader's), so a tech is its claims and
 * its exemptions; a tech that needs a cut of its own adds it here, with the
 * case that needs it.
 */

import type { Exemption, Layer } from "../graph.model.ts"

export interface Tech {
  readonly name: string
  /**
   * The kinds this tech reads — the first tech whose kinds hold a file's reads
   * it.
   */
  readonly kinds: readonly Layer[]
  /** The packages this technology is: external specifiers it claims as tech. */
  claims(specifier: string): boolean
  /** Driver rules the tech's shape exempts. */
  readonly exempts: readonly Exemption[]
}
