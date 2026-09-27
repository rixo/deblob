import { describe, expect, it, test } from "vitest"

import { createGoodEnoughTestsReader } from "./good-enough-tests-reader.adapter.ts"

describe("createGoodEnoughTestsReader", () => {
  test("binds the test naming, reads the test kind only, claims the runners it knows by package, exempts the four", () => {
    const reader = createGoodEnoughTestsReader()
    expect(reader.name).toBe("good-enough-tests")
    expect(reader.files).toEqual([
      "**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
      "**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
    ])
    expect(reader.kinds).toEqual(["test"])
    expect(reader.claims("vitest")).toBe(true)
    expect(reader.claims("@jest/globals")).toBe(true)
    expect(reader.claims("node:test")).toBe(true)
    expect(reader.claims("vitest/config")).toBe(true)
    expect(reader.claims("some-made-up-runner")).toBe(false)
    expect(reader.claims("./local.ts")).toBe(false)
    expect(reader.exempts).toEqual([
      "registration",
      "call-count",
      "services-only",
      "definitions",
    ])
  })

  describe("roleOf", () => {
    const { roleOf } = createGoodEnoughTestsReader()

    it("translates the runners' names into roles, a setup or teardown with its scope", () => {
      expect(
        [
          ["describe"],
          ["suite"],
          ["it"],
          ["test"],
          ["beforeEach"],
          ["beforeAll"],
          ["before"],
          ["afterEach"],
          ["afterAll"],
          ["after"],
          ["vi", "mock"],
          ["jest", "mock"],
        ].map(roleOf),
      ).toEqual([
        { kind: "group" },
        { kind: "group" },
        { kind: "behavior" },
        { kind: "verification" },
        { kind: "setup", scope: "each" },
        { kind: "setup", scope: "all" },
        { kind: "setup", scope: "all" },
        { kind: "teardown", scope: "each" },
        { kind: "teardown", scope: "all" },
        { kind: "teardown", scope: "all" },
        { kind: "mock" },
        { kind: "mock" },
      ])
    })

    it("reads a chain by the longest listed name it starts with: modifiers keep the role", () => {
      expect(roleOf(["it", "skip", "each"])).toEqual({ kind: "behavior" })
      expect(roleOf(["describe", "each"])).toEqual({ kind: "group" })
      expect(roleOf(["vi", "mock"])).toEqual({ kind: "mock" })
    })

    test.each([
      ["a runner name not listed", ["bench"]],
      ["an unlisted member of a listed name's root (`vi.fn`)", ["vi", "fn"]],
      ["a name every object inherits", ["constructor"]],
      ["an inherited name as a member (`vi.toString`)", ["vi", "toString"]],
      ["no name at all", []],
    ])("tripwire: %s maps to no role", (_, chain) => {
      expect(roleOf(chain)).toBeNull()
    })
  })
})
