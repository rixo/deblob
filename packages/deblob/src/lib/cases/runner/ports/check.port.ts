/**
 * The chain over a case's tree, as the runner sees it: config in, violations
 * out. The tree itself is bound at assembly, where the memory adapters are
 * built from it. Today's one adapter is the assembly's own wiring of the real
 * chain; the run service of the placement-debt recut is the proper one.
 */

import type { Violation } from "../../../check/violation.model.ts"
import type { CheckName } from "../../../cli/cli.model.ts"
import type { BrokenSite } from "../../../extraction/graph.model.ts"

export interface Check {
  /**
   * Runs the checks named (every check when absent) under the raw config, and
   * lists every place deblob cannot read. Throws when a literal import of the
   * tree does not resolve: a case that does not resolve, never a green line.
   */
  run(input: {
    config: unknown
    checks?: readonly CheckName[]
  }): Promise<{ violations: Violation[]; broken: readonly BrokenSite[] }>
}
