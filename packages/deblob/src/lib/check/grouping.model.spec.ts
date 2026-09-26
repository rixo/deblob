import { describe, expect, it } from "vitest"

import { groupByFix } from "./grouping.model.ts"
import type { ModulesViolation } from "./violation.model.ts"

/**
 * The corpus pins grouping where a check produces it: a red call with the
 * binding storing its result, a decorator factory's call with its application.
 * This file covers what no check produces today: a chain of causes, and a cause
 * no violation answers.
 */

const spanAt = (start: number, end: number) => ({
  start,
  end,
  line: 1,
  column: start,
})

const rootCall = (
  subject: ReturnType<typeof spanAt>,
  cause: ReturnType<typeof spanAt> | null,
): ModulesViolation => ({
  check: "modules",
  ruleset: "arch",
  rules: ["stable-root"],
  file: "src/cli/adapters/cli.adapter.ts",
  serviceRoot: "src/cli",
  line: 1,
  via: [],
  unknown: null,
  subject,
  cause,
  shape: "root-call",
  reaches: "unclaimed",
  name: "cac",
})

describe("groupByFix", () => {
  it("leads a chain of causes at its root: removing the first call removes every call made on its result", () => {
    const first = rootCall(spanAt(0, 5), null)
    const second = rootCall(spanAt(0, 12), spanAt(0, 5))
    const third = rootCall(spanAt(0, 20), spanAt(0, 12))
    expect(groupByFix([third, first, second])).toEqual([
      { lead: first, riders: [third, second] },
    ])
  })

  it("leads a group of one with a violation whose cause no violation has for subject", () => {
    const orphan = rootCall(spanAt(0, 12), spanAt(0, 5))
    expect(groupByFix([orphan])).toEqual([{ lead: orphan, riders: [] }])
  })
})
