/**
 * The driver axis — one reader per technology a driver listens to. A driver
 * reader is its binding (which files are this tech's drivers), its claims (the
 * packages that are its tech) and its exemptions (the driver rules its shape
 * relaxes, each with its reason). The cut is the stock one: every callback
 * handed to a claimed tech is a hook. A reader's own cut arrives with the first
 * case that needs one, as an addition here; configs written before stay valid.
 * A driver no reader reads is red (`driver-reader`). No default.
 */

import type { Exemption } from "../graph.model.ts"
import type { ReaderBinding } from "../recognition.model.ts"

export interface DriverReader extends ReaderBinding {
  readonly name: string
  /** The packages this technology is: external specifiers it claims as tech. */
  claims(specifier: string): boolean
  /** Driver rules the tech's shape exempts. */
  readonly exempts?: readonly Exemption[]
  /**
   * The file counts as blob on purpose (`blobDriver`): nothing inside is
   * judged, and it keeps the driver's inbound seal.
   */
  readonly blob?: boolean
}
