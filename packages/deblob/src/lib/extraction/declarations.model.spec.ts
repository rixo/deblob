import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import { createDeclarations } from "./declarations.model.ts"

/**
 * The corpus is what pins where a type name is followed; this file covers what
 * its trees do not hold: a project file no engine reads.
 */

/**
 * Files by path, each import landing on the project file of that name; a file
 * named in `unread` is a project file an import lands on, with no table.
 */
const declarationsOf = (
  sources: Readonly<Record<string, string>>,
  unread: readonly string[] = [],
) =>
  createDeclarations(
    new Map(
      Object.entries(sources).map(([file, source]) => [
        file,
        {
          program: parseSync(`${file}.ts`, source).program,
          fileOf: (specifier: string) =>
            specifier.startsWith("./") &&
            (specifier.slice(2) in sources ||
              unread.includes(specifier.slice(2)))
              ? specifier.slice(2)
              : null,
        },
      ]),
    ),
  )

describe("createDeclarations", () => {
  describe("typeOf", () => {
    it("follows a name through an import to the file that declares it", () => {
      const { typeOf } = declarationsOf({
        a: `import type { Note } from "./b"\nexport const note: Note = { id: 1 }`,
        b: `export type Note = { id: number }`,
      })
      expect(typeOf("a", "Note")).toMatchObject({
        kind: "alias",
        file: "b",
        name: "Note",
      })
    })

    it("says nothing of a name imported from a project file no engine reads", () => {
      const { typeOf } = declarationsOf(
        { a: `import type { Note } from "./b"` },
        ["b"],
      )
      expect(typeOf("a", "Note")).toBeNull()
    })
  })
})
