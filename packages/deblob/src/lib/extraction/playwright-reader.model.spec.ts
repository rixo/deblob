import { describe, expect, it } from "vitest"

import { createPlaywrightReader } from "./playwright-reader.model.ts"
import { isTechPackage } from "./tech.model.ts"

describe("createPlaywrightReader", () => {
  it("claims @playwright/test and exempts what a test file does", () => {
    const reader = createPlaywrightReader({ include: ["tests/**"] })
    expect(reader).toMatchObject({ name: "playwright", include: ["tests/**"] })
    expect(isTechPackage(reader.tech, "@playwright/test")).toBe(true)
    expect(isTechPackage(reader.tech, "vitest")).toBe(false)
    expect(reader.exempts).toHaveLength(4)
  })

  it("translates Playwright's names into roles, a step into none", () => {
    const reader = createPlaywrightReader()
    const roleOf = (chain: readonly string[]) => reader.roleOf({ chain })
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
