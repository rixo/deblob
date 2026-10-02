import { describe, expect, it } from "vitest"

import { isTechFile, isTechPackage } from "./tech.model.ts"

describe("isTechPackage", () => {
  it("names a listed package, its subpaths included", () => {
    const tech = ["cac", "@scope/pkg"]
    expect(isTechPackage(tech, "cac")).toBe(true)
    expect(isTechPackage(tech, "cac/deno")).toBe(true)
    expect(isTechPackage(tech, "@scope/pkg/sub")).toBe(true)
  })

  it("names no package that is not listed, and no relative path", () => {
    const tech = ["cac", "./src/router.ts"]
    expect(isTechPackage(tech, "commander")).toBe(false)
    expect(isTechPackage(tech, "@scope/pkg")).toBe(false)
    expect(isTechPackage(tech, "./cac")).toBe(false)
    expect(isTechPackage(tech, "./src/router.ts")).toBe(false)
  })
})

describe("isTechFile", () => {
  it("names a listed project file by its root-relative path, the ./ spelling", () => {
    const tech = ["./src/lib/router/router.service.ts"]
    expect(isTechFile(tech, "src/lib/router/router.service.ts")).toBe(true)
  })

  it("names no file that is not listed, and no package spelled as a path", () => {
    const tech = ["cac", "./src/router.ts"]
    expect(isTechFile(tech, "src/other.ts")).toBe(false)
    expect(isTechFile(tech, "cac")).toBe(false)
    expect(isTechFile(tech, "./src/router.ts")).toBe(false)
  })
})
