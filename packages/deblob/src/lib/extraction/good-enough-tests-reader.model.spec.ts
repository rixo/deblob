import { describe, expect, it } from "vitest"

import { createGoodEnoughTestsReader } from "./good-enough-tests-reader.model.ts"
import { isTechPackage } from "./tech.model.ts"

describe("createGoodEnoughTestsReader", () => {
  it("binds the flavor's test files by default, claims the runners it knows by package", () => {
    const reader = createGoodEnoughTestsReader()
    expect(reader.name).toBe("good-enough-tests")
    expect(reader.include).toBeUndefined()
    expect(isTechPackage(reader.tech, "vitest")).toBe(true)
    expect(isTechPackage(reader.tech, "@jest/globals")).toBe(true)
    expect(isTechPackage(reader.tech, "node:test")).toBe(true)
    expect(isTechPackage(reader.tech, "vitest/config")).toBe(true)
    expect(isTechPackage(reader.tech, "some-made-up-runner")).toBe(false)
    expect(isTechPackage(reader.tech, "./local.ts")).toBe(false)
  })

  it("takes include and exclude over its default binding", () => {
    expect(
      createGoodEnoughTestsReader({
        include: ["e2e/**"],
        exclude: ["e2e/x.ts"],
      }),
    ).toMatchObject({ include: ["e2e/**"], exclude: ["e2e/x.ts"] })
  })

  describe("roleOf", () => {
    const reader = createGoodEnoughTestsReader()
    const roleOf = (chain: readonly string[]) => reader.roleOf({ chain })

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
      expect(roleOf(["test", "extend"])).toEqual({ kind: "extension" })
      expect(roleOf(["it", "extend"])).toEqual({ kind: "extension" })
    })

    it("reads a group registered as a member of the registering function", () => {
      expect(
        [
          ["test", "describe"],
          ["it", "describe"],
          ["test", "suite"],
          ["it", "suite"],
          ["test", "describe", "skip"],
        ].map(roleOf),
      ).toEqual(Array.from({ length: 5 }, () => ({ kind: "group" })))
    })

    it("says which members give a registering function back: a giving member last, on a name that registers", () => {
      const gives = (chain: readonly string[]) =>
        reader.givesRegistrar?.({ chain })
      expect(
        [
          ["test", "each"],
          ["it", "for"],
          ["describe", "skipIf"],
          ["test", "runIf"],
          ["it", "skip", "each"],
          ["test", "describe", "each"],
        ].map(gives),
      ).toEqual(Array.from({ length: 6 }, () => true))
      expect(
        [
          ["test"],
          ["each"],
          ["test", "each", "skip"],
          ["test", "extend"],
          ["vi", "mock", "each"],
          ["beforeEach", "each"],
          ["bench", "each"],
          [],
        ].map(gives),
      ).toEqual(Array.from({ length: 8 }, () => false))
    })

    it.each([
      ["a runner name not listed", ["bench"]],
      ["an unlisted member of a listed name's root (`vi.fn`)", ["vi", "fn"]],
      ["a name every object inherits", ["constructor"]],
      ["an inherited name as a member (`vi.toString`)", ["vi", "toString"]],
      ["no name at all", []],
    ])("maps %s to no role (tripwire)", (_, chain) => {
      expect(roleOf(chain)).toBeNull()
    })
  })
})
