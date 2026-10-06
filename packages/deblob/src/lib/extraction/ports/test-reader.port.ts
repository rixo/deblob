/**
 * The test axis — a test file is a driver in its own right (`test-is-outside`),
 * and a test reader is a driver reader with the test vocabulary: what a hook is
 * for. Stock: `goodEnoughTests`, the default.
 */

import type { Role } from "../graph.model.ts"
import type { DriverReader } from "./driver-reader.port.ts"

export interface TestReader extends DriverReader {
  /**
   * What a hook is for, given the name its registration calls: the export
   * imported from the tech, then the members, through calls (`it.skip.each` →
   * `["it", "skip", "each"]`). The tech's names translated into deblob's;
   * `null` for a name the reader does not map — never guessed.
   */
  roleOf(input: { chain: readonly string[] }): Role | null
}
