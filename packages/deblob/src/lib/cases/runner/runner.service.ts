/**
 * The runner: judges a case — collects its markers, runs the chain through the
 * check port, matches. The verdict of a row is the match; whether the code is
 * red is what the markers say.
 */

import type { Case, VerdictMatch } from "./markers.model.ts"
import { markersOf, matchVerdicts, reportedOf } from "./markers.model.ts"
import type { Check } from "./ports/check.port.ts"

export const createRunner = ({ check }: { check: Check }) => {
  const judge = async (row: Case): Promise<VerdictMatch> => {
    const markers = Object.entries(row.files).flatMap(([path, source]) =>
      markersOf(path, source),
    )
    const violations = await check.run({
      config: row.config ?? {},
      ...(row.checks ? { checks: row.checks } : {}),
    })
    return matchVerdicts(markers, violations.flatMap(reportedOf))
  }

  return { judge }
}
