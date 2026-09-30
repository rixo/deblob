import { describe, expect, it } from "vitest"

import { createSystemClock } from "./system-clock.adapter.ts"

describe("createSystemClock", () => {
  it("answers the machine's time as an ISO timestamp", () => {
    const before = Date.now()
    const now = Date.parse(createSystemClock().now())
    expect(now).toBeGreaterThanOrEqual(before - 1000)
    expect(now).toBeLessThanOrEqual(Date.now())
  })
})
