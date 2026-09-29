import { describe, expect, it } from "vitest"

import { createBlobDriverReader } from "./blob-driver-reader.adapter.ts"

describe("createBlobDriverReader", () => {
  it("binds nothing by default, claims nothing, counts its files as blob", () => {
    const reader = createBlobDriverReader()
    expect(reader).toMatchObject({
      name: "blob-driver",
      include: [],
      blob: true,
    })
    expect(reader.claims("anything")).toBe(false)
    expect(
      createBlobDriverReader({ include: ["src/legacy/**"] }).include,
    ).toEqual(["src/legacy/**"])
  })
})
