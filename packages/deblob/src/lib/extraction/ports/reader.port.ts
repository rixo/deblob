/**
 * The technology axis as an interface — canon's "reading": each technology
 * comes with which files are its own, which packages are its tech, how its
 * files are cut into hooks, and which driver rules it exempts. In the checker
 * it is one reader per tech, as the flavor is one per naming convention. A
 * reader binds files by glob — the stock readers as builtin bindings, config's
 * bindings first — and reads, among the files it binds, the kinds it knows; a
 * reader of one kind designates that kind by binding (the test reader's binding
 * is what makes a file a test file — canon: "spec files by the test globs").
 * The cut is one rule for every tech shipped so far (a function handed to a
 * tech callee — the reading's), so a reader is its binding, its kinds, its
 * claims, its exemptions and its roles; a tech that needs a cut of its own adds
 * it here, with the case that needs it.
 */

import type { Exemption, Layer, Role } from "../graph.model.ts"

export interface Reader {
  readonly name: string
  /** The builtin binding: root-relative globs over the files this reader reads. */
  readonly files: readonly string[]
  /**
   * The kinds this reader reads among the files it binds. Exactly one kind
   * means the binding designates it: a file the binding matches is of that
   * kind, wherever it sits.
   */
  readonly kinds: readonly Layer[]
  /** The packages this technology is: external specifiers it claims as tech. */
  claims(specifier: string): boolean
  /** Driver rules the tech's shape exempts. */
  readonly exempts: readonly Exemption[]
  /**
   * What a hook is for, given the name its registration calls: the export
   * imported from the tech, then the members, through calls (`it.skip.each` →
   * `["it", "skip", "each"]`). The tech's names translated into deblob's;
   * `null` for a name the reader does not map — never guessed.
   */
  roleOf(chain: readonly string[]): Role | null
}
