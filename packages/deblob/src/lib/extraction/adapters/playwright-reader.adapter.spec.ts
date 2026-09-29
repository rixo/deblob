import { describe, expect, it } from "vitest"

import { createPlaywrightReader } from "./playwright-reader.adapter.ts"

describe("createPlaywrightReader", () => {
  it("claims @playwright/test and exempts what a test file does", () => {
    const reader = createPlaywrightReader({ include: ["tests/**"] })
    expect(reader).toMatchObject({ name: "playwright", include: ["tests/**"] })
    expect(reader.claims("@playwright/test")).toBe(true)
    expect(reader.claims("vitest")).toBe(false)
    expect(reader.exempts).toHaveLength(4)
  })

  it("translates Playwright's names into roles, a step into none", () => {
    const { roleOf } = createPlaywrightReader()
    expect(roleOf(["test"])).toEqual({ kind: "verification" })
    expect(roleOf(["test", "skip"])).toEqual({ kind: "verification" })
    expect(roleOf(["test", "describe", "only"])).toEqual({ kind: "group" })
    expect(roleOf(["test", "beforeEach"])).toEqual({
      kind: "setup",
      scope: "each",
    })
    expect(roleOf(["test", "afterAll"])).toEqual({
      kind: "teardown",
      scope: "all",
    })
    expect(roleOf(["test", "step"])).toEqual({ kind: "verification" })
    expect(roleOf(["expect"])).toBeNull()
  })
})
