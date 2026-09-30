/**
 * The runner: judges a case — collects its markers, resolves the row's config
 * at the case's root, runs the product's own chain (the judge `deblob check`
 * runs), matches. The verdict of a row is the match; whether the code is red is
 * what the markers say, one group per fix; where the reader is known wrong, the
 * failure is expected. Where deblob cannot read the case is claimed like the
 * rest: a broken run still reports every verdict it reaches. A literal import
 * that does not resolve fails the case: a case that does not resolve is never a
 * green line.
 */

import type { Judge } from "../../check/check.service.ts"
import { groupByFix } from "../../check/grouping.model.ts"
import type { ConfigService } from "../../config/config.service.ts"
import type { Case, Verdict } from "./markers.model.ts"
import { markersOf, matchVerdicts, reportedOf } from "./markers.model.ts"

export const createRunner = ({
  config,
  judge: chain,
  root,
}: {
  config: Pick<ConfigService, "resolve">
  judge: Pick<Judge, "judge">
  /** Where a case's tree sits — the root its config resolves at. */
  root: string
}) => {
  const judge = async (row: Case): Promise<Verdict> => {
    const markers = Object.entries(row.files).flatMap(([path, source]) =>
      markersOf(path, source),
    )
    const { violations, graph } = await chain.judge(
      config.resolve(row.config ?? {}, root),
      ...(row.checks ? [row.checks] : []),
    )
    const unresolved = graph.unresolved.filter((entry) => entry.literal)
    if (unresolved.length > 0) {
      throw new Error(
        `the case does not resolve: ${unresolved
          .map(
            (entry) => `${entry.from} → ${entry.specifier} (${entry.reason})`,
          )
          .join("; ")}`,
      )
    }
    return matchVerdicts(
      markers,
      groupByFix(violations).flatMap(reportedOf),
      graph.broken,
    )
  }

  return { judge }
}
