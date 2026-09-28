import { describe, expect, it } from "vitest"

import { exportsKeyFor, exportsSubpathsOf } from "./exports-map.model.ts"

describe("exportsSubpathsOf", () => {
  it("flattens a dot-keyed map — conditions and arrays to string leaves, ./ stripped", () => {
    expect(
      exportsSubpathsOf({
        ".": { types: "./dist/index.d.ts", import: "./dist/index.js" },
        "./legacy": ["./dist/legacy.js", "./dist/legacy.cjs"],
        "./gone": null,
        "./*": "./dist/*.js",
      }),
    ).toEqual([
      { subpath: ".", targets: ["dist/index.d.ts", "dist/index.js"] },
      { subpath: "./legacy", targets: ["dist/legacy.js", "dist/legacy.cjs"] },
      { subpath: "./gone", targets: [] },
      { subpath: "./*", targets: ["dist/*.js"] },
    ])
  })

  it("reads a string, or a condition tree without dot keys, as the root", () => {
    expect(exportsSubpathsOf("./src/index.ts")).toEqual([
      { subpath: ".", targets: ["src/index.ts"] },
    ])
    expect(
      exportsSubpathsOf({ import: "./dist/index.js", require: "./dist/x.cjs" }),
    ).toEqual([{ subpath: ".", targets: ["dist/index.js", "dist/x.cjs"] }])
  })

  it("yields no entries for a scalar that is not a path", () => {
    expect(exportsSubpathsOf(42)).toEqual([])
    expect(exportsSubpathsOf(null)).toEqual([])
  })
})

describe("exportsKeyFor — Node's key resolution", () => {
  const keyFor = exportsKeyFor([
    ".",
    "./index",
    "./*",
    "./legacy/*",
    "./legacy/*.js",
    "./*/*",
  ])

  it("picks an exact literal key over any pattern", () => {
    expect(keyFor(".")).toBe(".")
    expect(keyFor("./index")).toBe("./index")
  })

  it("picks the most specific pattern — longest base, then longest key", () => {
    expect(keyFor("./checkout.service")).toBe("./*")
    expect(keyFor("./legacy/x")).toBe("./legacy/*")
    expect(keyFor("./legacy/x.js")).toBe("./legacy/*.js")
  })

  it("binds the star to a non-empty string, slashes included", () => {
    expect(keyFor("./deep/a/b")).toBe("./*")
    expect(keyFor("./")).toBe(null)
  })

  it("never matches a two-star key — dead in Node, dead here (tripwire)", () => {
    expect(exportsKeyFor(["./*/*"])("./a/b")).toBe(null)
  })

  it("returns null off the surface", () => {
    expect(exportsKeyFor(["./checkout.service"])("./src/totals.model")).toBe(
      null,
    )
    expect(exportsKeyFor([])(".")).toBe(null)
  })
})
