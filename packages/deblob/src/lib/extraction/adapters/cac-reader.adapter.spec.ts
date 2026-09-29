import { describe, expect, it } from "vitest"

import { createCacReader } from "./cac-reader.adapter.ts"

describe("createCacReader", () => {
  it("claims cac by package, subpaths included, and nothing else", () => {
    const reader = createCacReader()
    expect(reader.name).toBe("cac")
    expect(reader.claims("cac")).toBe(true)
    expect(reader.claims("cac/deno")).toBe(true)
    expect(reader.claims("commander")).toBe(false)
  })

  it("takes a binding over its default", () => {
    expect(createCacReader({ include: ["src/cli.ts"] }).include).toEqual([
      "src/cli.ts",
    ])
  })
})
