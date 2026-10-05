/**
 * A function judged once per caller. An exported function of an outside kind —
 * an assembly's, a sub-driver's wiring — is read once per world: per distinct
 * hand-over its production call sites make (`graph.model.ts`, `readings`). A
 * rule judges it in each as if that site were the only caller; here the
 * verdicts are put back together: a red every caller gets is one red, a red
 * only some get names the first call site it holds for. Pure.
 */

import type { World } from "../extraction/graph.model.ts"

/** The call site a red holds for, when not every caller gets it. */
export type CalledFrom = { file: string; line: number }

export const mergeCallers = <V extends object>(
  found: readonly { world: World; violations: readonly V[] }[],
): (V & { calledFrom?: CalledFrom })[] => {
  const keyed = found.map(({ world, violations }) => ({
    world,
    violations: violations.map((violation) => ({
      violation,
      key: JSON.stringify(violation),
    })),
  }))
  const seen = new Set<string>()
  const merged: (V & { calledFrom?: CalledFrom })[] = []
  for (const { world, violations } of keyed)
    for (const { violation, key } of violations) {
      if (seen.has(key)) continue
      seen.add(key)
      const everywhere = keyed.every((other) =>
        other.violations.some((same) => same.key === key),
      )
      merged.push(
        everywhere
          ? violation
          : {
              ...violation,
              calledFrom: {
                file: world.site.path,
                line: world.site.span.line,
              },
            },
      )
    }
  return merged
}
