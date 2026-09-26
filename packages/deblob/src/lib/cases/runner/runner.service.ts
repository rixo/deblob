/**
 * The runner: judges a case — collects its markers, runs the chain through the
 * check port, matches. The verdict of a row is the match; whether the code is
 * red is what the markers say, one group per fix; where the reader is known
 * wrong, the failure is expected. Where deblob cannot read the case is claimed
 * like the rest: a broken run still reports every verdict it reaches.
 */

import { groupByFix } from "../../check/grouping.model.ts"
import type { Case, Verdict } from "./markers.model.ts"
import { markersOf, matchVerdicts, reportedOf } from "./markers.model.ts"
import type { Check } from "./ports/check.port.ts"

export const createRunner = ({ check }: { check: Check }) => {
  const judge = async (row: Case): Promise<Verdict> => {
    const markers = Object.entries(row.files).flatMap(([path, source]) =>
      markersOf(path, source),
    )
    const { violations, broken } = await check.run({
      config: row.config ?? {},
      ...(row.checks ? { checks: row.checks } : {}),
    })
    return matchVerdicts(
      markers,
      groupByFix(violations).flatMap(reportedOf),
      broken,
    )
  }

  return { judge }
}
