import { describe, expect, test } from "vitest"

import { exportsKeyFor, exportsSubpathsOf } from "./exports-map.model.ts"

describe("exportsSubpathsOf", () => {
  test("flattens a dot-keyed map — conditions and arrays to string leaves, ./ stripped", () => {
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

  test("a string, or a condition tree without dot keys, is the root", () => {
    expect(exportsSubpathsOf("./src/index.ts")).toEqual([
      { subpath: ".", targets: ["src/index.ts"] },
    ])
    expect(
      exportsSubpathsOf({ import: "./dist/index.js", require: "./dist/x.cjs" }),
    ).toEqual([{ subpath: ".", targets: ["dist/index.js", "dist/x.cjs"] }])
  })

  test("a scalar that is not a path has no entries", () => {
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

  test("an exact literal key wins over any pattern", () => {
    expect(keyFor(".")).toBe(".")
    expect(keyFor("./index")).toBe("./index")
  })

  test("the most specific pattern wins — longest base, then longest key", () => {
    expect(keyFor("./checkout.service")).toBe("./*")
    expect(keyFor("./legacy/x")).toBe("./legacy/*")
    expect(keyFor("./legacy/x.js")).toBe("./legacy/*.js")
  })

  test("the star binds a non-empty string, slashes included", () => {
    expect(keyFor("./deep/a/b")).toBe("./*")
    expect(keyFor("./")).toBe(null)
  })

  test("a two-star key never matches — dead in Node, dead here (tripwire)", () => {
    expect(exportsKeyFor(["./*/*"])("./a/b")).toBe(null)
  })

  test("off the surface is null", () => {
    expect(exportsKeyFor(["./checkout.service"])("./src/totals.model")).toBe(
      null,
    )
    expect(exportsKeyFor([])(".")).toBe(null)
  })
})
