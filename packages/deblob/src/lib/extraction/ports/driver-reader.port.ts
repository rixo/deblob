/**
 * The driver axis — one reader per technology a driver listens to. A driver
 * reader is its binding (which files are this tech's drivers), its claims (the
 * packages that are its tech) and its exemptions (the driver rules its shape
 * relaxes, each with its reason). Every reader's stack ends with the default
 * cut (`cut.model.ts`): a callback handed to a tech is a hook. A reader may add
 * a cut of its own (`cut`) for a tech whose hooks are not callbacks — the same
 * function, the same answer; configs written without one stay valid. A driver
 * no reader reads is red (`driver-reader`). No default.
 */

import type { Node } from "@oxc-project/types"

import type { Exemption } from "../graph.model.ts"
import type { Cut, CutContext } from "../cut.model.ts"
import type { ReaderBinding } from "../recognition.model.ts"

export interface DriverReader extends ReaderBinding {
  readonly name: string
  /**
   * What this technology is, declared: package names (`"cac"`, subpaths
   * included) and project files by root-relative path with a `./` prefix
   * (`"./src/lib/router/router.service.ts"`). It tells the driver's reading
   * what the driver listens to; a file named here stays judged by its own layer
   * (GUESS: D4).
   */
  readonly tech: readonly string[]
  /** Driver rules the tech's shape exempts. */
  readonly exempts?: readonly Exemption[]
  /**
   * The file counts as blob on purpose (`blobDriver`): nothing inside is
   * judged, and it keeps the driver's inbound seal.
   */
  readonly blob?: boolean
  /**
   * The reader's own cut, beside the default one (`cut.model.ts`): asked on
   * every statement and every call of a driver it reads, it points at the hooks
   * the node holds — a function its tech will call, or the statements a
   * dispatch on its tech's value picked, with the expression that picked them —
   * or answers `null`. On a call into its tech it may also say that the tech
   * loads a module and calls one of its exports for the driver (a unit loaded
   * on demand): the call then reads as that sub-driver's wiring function called
   * there. The node is the parser's (oxc's ESTree): a change of parser breaks a
   * reader that has a cut. `about` is what it may ask the reading: whose a
   * call's callee is. What the reading does with a pointer — the event, a hook
   * that only hands the dispatch on to a sub-driver, nothing picked inside a
   * hook — is the reading's, the same for every cut.
   */
  readonly cut?: (node: Node, about: CutContext) => Cut | null
}
