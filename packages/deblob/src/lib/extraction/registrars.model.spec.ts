import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import { createRegistrars } from "./registrars.model.ts"

/** Files by path, each import landing on the project file of that name. */
const registrarsOf = (sources: Readonly<Record<string, string | null>>) =>
  createRegistrars(
    new Map(
      Object.entries(sources).map(([file, source]) => [
        file,
        {
          program:
            source === null ? null : parseSync(`${file}.ts`, source).program,
          fileOf: (specifier: string) =>
            specifier.startsWith("./") && specifier.slice(2) in sources
              ? specifier.slice(2)
              : null,
        },
      ]),
    ),
  )

describe("createRegistrars", () => {
  describe("originOf", () => {
    it("gives the import a declared export was made on, with the member called", () => {
      const { originOf } = registrarsOf({
        a: `
          import { test as base } from "vitest"
          export const test = base.extend<{ n: number }>({ n: 1 })
        `,
      })
      expect(originOf("a", "test")).toEqual({
        file: "a",
        specifier: "vitest",
        imported: "test",
        derived: [["extend"]],
      })
    })

    it("reads a member called through members and calls, down to the name", () => {
      const { originOf } = registrarsOf({
        a: `
          import { test } from "vitest"
          export const eachSkipped = test.skip.each([1])
          export const eachOnLinux = test.runIf(true).each([1])
        `,
      })
      expect(originOf("a", "eachSkipped")?.derived).toEqual([["skip", "each"]])
      expect(originOf("a", "eachOnLinux")?.derived).toEqual([["runIf", "each"]])
    })

    it("follows another name, an export by name and a re-export, through the files", () => {
      const { originOf } = registrarsOf({
        a: `
          import { test as base } from "vitest"
          const made = base.extend({})
          const it = made
          export { it as "spec" }
        `,
        b: `export { spec as test } from "./a"`,
        c: `
          import { test as base } from "./b"
          export const test = base.extend({})
        `,
      })
      expect(originOf("c", "test")).toEqual({
        file: "a",
        specifier: "vitest",
        imported: "test",
        derived: [["extend"], ["extend"]],
      })
    })

    it("gives the import as written when it lands on a project file's own export", () => {
      const { originOf } = registrarsOf({
        a: `export const test = () => {}`,
        b: `export { test } from "./a"`,
      })
      expect(originOf("b", "test")).toEqual({
        file: "b",
        specifier: "./a",
        imported: "test",
        derived: [],
      })
    })

    it.each([
      ["a name the file does not export", `const test = 1`],
      ["a function", `export function test() {}`],
      ["a `let`", `import { test as t } from "vitest"\nexport let test = t`],
      ["a value", `export const test = 1`],
      [
        "a call on no member",
        `import { make } from "x"\nexport const test = make()`,
      ],
      [
        "a call's result called",
        `import { make } from "x"\nexport const test = make()()`,
      ],
      [
        "a computed member",
        `import { test as t } from "vitest"\nexport const test = t["extend"]({})`,
      ],
      [
        "a member of a member",
        `import * as v from "vitest"\nexport const test = v.test.extend({})`,
      ],
      ["a namespace", `import * as test from "vitest"\nexport { test }`],
      ["a default import", `import test from "vitest"\nexport { test }`],
      ["a type import", `import type { test } from "vitest"\nexport { test }`],
      ["a type export", `import { test } from "vitest"\nexport type { test }`],
      ["a name bound to itself", `export const test = test`],
      ["a name not declared", `export { test }`],
      [
        "a name taken out of an object",
        `import { runner } from "vitest"\nexport const { test } = runner`,
      ],
      [
        "a type among the names passed on",
        `export { type test, other } from "vitest"`,
      ],
    ])("says nothing of %s", (_, source) => {
      expect(registrarsOf({ a: source }).originOf("a", "test")).toBeNull()
    })

    it("says nothing of a file it has no program of", () => {
      const { originOf } = registrarsOf({ a: null })
      expect(originOf("a", "test")).toBeNull()
      expect(originOf("nowhere", "test")).toBeNull()
    })

    it("stops where re-exports come back to where they started", () => {
      const { originOf } = registrarsOf({
        a: `export { test } from "./b"`,
        b: `export { test } from "./a"`,
      })
      expect(originOf("a", "test")).toEqual({
        file: "b",
        specifier: "./a",
        imported: "test",
        derived: [],
      })
    })
  })
})
