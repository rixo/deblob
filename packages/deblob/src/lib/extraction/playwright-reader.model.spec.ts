import { describe, expect, it } from "vitest"

import { createPlaywrightReader } from "./playwright-reader.model.ts"
import { isTechPackage } from "./tech.model.ts"

describe("createPlaywrightReader", () => {
  it("claims @playwright/test", () => {
    const reader = createPlaywrightReader({ include: ["tests/**"] })
    expect(reader).toMatchObject({ name: "playwright", include: ["tests/**"] })
    expect(isTechPackage(reader.tech, "@playwright/test")).toBe(true)
    expect(isTechPackage(reader.tech, "vitest")).toBe(false)
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
    expect(roleOf(["test", "extend"])).toEqual({ kind: "extension" })
    expect(roleOf(["expect"])).toBeNull()
  })

  it("reads expect.extend as a declaration: Playwright's gives a new expect back", () => {
    const reader = createPlaywrightReader()
    expect(reader.roleOf({ chain: ["expect", "extend"] })).toEqual({
      kind: "extension",
    })
  })

  it("names the suites, a .suite name when not written", () => {
    expect(createPlaywrightReader().suites).toEqual(["**/*.suite.*"])
    expect(
      createPlaywrightReader({ suites: ["e2e/shared/**"] }).suites,
    ).toEqual(["e2e/shared/**"])
  })
})
