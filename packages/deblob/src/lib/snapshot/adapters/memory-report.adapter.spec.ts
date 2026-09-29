import { expect, test } from "vitest"

import { createMemoryReport } from "./memory-report.adapter.ts"

test("keeps every report, in order", () => {
  const { report, reported } = createMemoryReport()
  const first = new Error("FAKE_FIRST")
  report(first)
  report("FAKE_SECOND")
  expect(reported).toEqual([first, "FAKE_SECOND"])
})
