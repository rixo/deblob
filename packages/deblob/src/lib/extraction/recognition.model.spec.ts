import { describe, expect, it } from "vitest"

import { createRecognition } from "./recognition.model.ts"

const PAGE = "src/routes/home/+page.ts"
const HELPER = "src/routes/home/helper.ts"
const CLI = "src/cli.driver.ts"

const pages = {
  name: "made-up-pages",
  include: ["src/routes/**/+page.ts"],
} as const
const stories = {
  name: "made-up-stories",
  include: ["src/**/+page.ts"],
} as const
const cli = { name: "made-up-cli" } as const

describe("createRecognition", () => {
  describe("kindOf", () => {
    it("takes the flavor's word when nothing claims the file", () => {
      const { kindOf } = createRecognition({ driver: [pages], test: [] })
      expect(kindOf(HELPER, "service")).toBe("service")
      expect(kindOf(HELPER, "blob")).toBe("blob")
    })

    it("gives a blob file the kind of the group whose written binding names it, or a designation's", () => {
      const { kindOf } = createRecognition({
        driver: [pages],
        test: [],
        isAssembly: (path) => path === HELPER,
      })
      expect(kindOf(PAGE, "blob")).toBe("driver")
      expect(kindOf(HELPER, "blob")).toBe("assembly")
    })

    it("lets a binding agree with the flavor", () => {
      const { kindOf } = createRecognition({
        driver: [{ name: "made-up-cli", include: ["src/*.driver.ts"] }],
        test: [],
      })
      expect(kindOf(CLI, "driver")).toBe("driver")
    })

    it("gives no kind by a binding left to its default: it reads the flavor's own files only", () => {
      const { kindOf } = createRecognition({ driver: [cli], test: [] })
      expect(kindOf(PAGE, "blob")).toBe("blob")
    })

    it("throws an ExtractionError when a binding disagrees with the flavor, naming the file, the flavor's kind and the claim", () => {
      const { kindOf } = createRecognition({ driver: [pages], test: [] })
      expect(() => kindOf(PAGE, "service")).toThrow(
        expect.objectContaining({
          name: "ExtractionError",
          code: "designation-conflict",
          message: `${PAGE} is named service by the flavor, but driver reader "made-up-pages" makes it driver — the flavor names the kind, a binding only adds one to an unnamed file; narrow the globs`,
        }),
      )
    })

    it("throws when readers of two groups, or a reader and a designation, claim one blob file", () => {
      const { kindOf } = createRecognition({
        driver: [pages],
        test: [stories],
        isBoot: () => true,
      })
      expect(() => kindOf(PAGE, "blob")).toThrow(
        expect.objectContaining({
          code: "designation-conflict",
          message: `${PAGE} is claimed by driver reader "made-up-pages" (driver) and test reader "made-up-stories" (test) and the "boot" designation (boot) — a file has one kind; narrow the globs`,
        }),
      )
    })
  })

  describe("driverReadersOf", () => {
    it("returns every driver reader that reads the file, in the order written — they stack", () => {
      const wide = { name: "made-up-wide", include: ["src/**"] }
      const { driverReadersOf } = createRecognition({
        driver: [cli, wide, pages],
        test: [],
      })
      expect(driverReadersOf(CLI, "driver")).toEqual([cli, wide])
      // the page is a driver by `pages`' binding: `cli`, left to its default,
      // reads the flavor's drivers only
      expect(driverReadersOf(PAGE, "blob")).toEqual([wide, pages])
    })

    it("leaves out an excluded file, and answers nothing for a kind other than driver", () => {
      const { driverReadersOf } = createRecognition({
        driver: [{ name: "made-up-cli", exclude: [CLI] }],
        test: [],
      })
      expect(driverReadersOf(CLI, "driver")).toEqual([])
      expect(driverReadersOf("src/other.assembly.ts", "assembly")).toEqual([])
    })
  })

  describe("testReadersOf", () => {
    it("returns the test readers of a test file, the default binding reading every one", () => {
      const runner = { name: "made-up-runner" }
      const { testReadersOf } = createRecognition({
        driver: [],
        test: [runner],
      })
      expect(testReadersOf("src/a.spec.ts", "test")).toEqual([runner])
      expect(testReadersOf("src/a.driver.ts", "driver")).toEqual([])
    })
  })

  describe("an empty include", () => {
    it("binds nothing, the default notwithstanding", () => {
      const none = { name: "made-up-none", include: [] }
      const { driverReadersOf, kindOf } = createRecognition({
        driver: [none],
        test: [],
      })
      expect(driverReadersOf(CLI, "driver")).toEqual([])
      expect(kindOf(PAGE, "blob")).toBe("blob")
    })
  })

  describe("boundOf", () => {
    it("binds every file by default, a written binding narrowing it", () => {
      const all = { name: "made-up-js" }
      const back = { name: "made-up-host", include: ["server/**"] }
      const { boundOf } = createRecognition({ driver: [], test: [] })
      expect(boundOf([all, back], "server/app.ts")).toEqual([all, back])
      expect(boundOf([all, back], "web/app.ts")).toEqual([all])
    })
  })
})
