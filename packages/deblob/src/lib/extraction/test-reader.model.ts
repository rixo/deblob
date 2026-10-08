/**
 * The test axis — a test file is a driver in its own right (`test-is-outside`),
 * and a test reader is a driver reader with the test vocabulary: what a hook is
 * for. Stock: `genericTestApi`, the default.
 */

import type { Role } from "./graph.model.ts"
import type { DriverReader } from "./driver-reader.model.ts"

export interface TestReader extends DriverReader {
  /**
   * What a hook is for, given the name its registration calls: the export
   * imported from the tech, then the members, through calls (`it.skip.each` →
   * `["it", "skip", "each"]`). The tech's names translated into deblob's;
   * `null` for a name the reader does not map — never guessed.
   */
  roleOf(input: { chain: readonly string[] }): Role | null
  /**
   * Whether the name, called, registers nothing and gives back a function that
   * registers as the name does: `test.each(rows)`, `it.skipIf(condition)`. The
   * call is then a declaration, and a name that keeps what it gave is followed
   * as the registering function it is. The chain as `roleOf` takes it. Absent =
   * the reader knows of none.
   */
  givesRegistrar?(input: { chain: readonly string[] }): boolean
  /**
   * The suites of this runner, by glob: files of the test kind the runner does
   * not collect, whose wiring function a test file calls at its root to
   * register the tests they hold. The reader names them, as it knows what its
   * runner collects; a match gives the test kind to a file the flavor leaves
   * blob, and this reader reads it. Absent = the reader names none.
   */
  readonly suites?: readonly string[]
}
