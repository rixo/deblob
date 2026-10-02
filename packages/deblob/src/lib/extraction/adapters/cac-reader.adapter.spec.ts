import { describe, expect, it } from "vitest"

import { createCacReader } from "./cac-reader.adapter.ts"
import { isTechPackage } from "../tech.model.ts"

describe("createCacReader", () => {
  it("claims cac by package, subpaths included, and nothing else", () => {
    const reader = createCacReader()
    expect(reader.name).toBe("cac")
    expect(isTechPackage(reader.tech, "cac")).toBe(true)
    expect(isTechPackage(reader.tech, "cac/deno")).toBe(true)
    expect(isTechPackage(reader.tech, "commander")).toBe(false)
  })

  it("takes a binding over its default", () => {
    expect(createCacReader({ include: ["src/cli.ts"] }).include).toEqual([
      "src/cli.ts",
    ])
  })
})
