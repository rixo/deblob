import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import { cutExports } from "./exports-reader.model.ts"

/** The statement of a one-statement source, as the parser gives it. */
const statementOf = (source: string) => {
  const [statement] = parseSync("file.ts", source).program.body
  if (statement === undefined) throw new Error(`no statement: ${source}`)
  return statement
}

describe("cutExports", () => {
  it("points at the function an export statement defines, by name or by default", () => {
    for (const source of [
      `export const GET = (event) => answer(event)`,
      `export function GET(event) {}`,
      `export default (event) => answer(event)`,
    ])
      expect(cutExports({ node: statementOf(source) })).toHaveLength(1)
  })

  it("answers nothing for an export that defines no function, and for a statement that exports nothing", () => {
    for (const source of [
      `export default 42`,
      `export class Route {}`,
      `export const prerender = true`,
      `export { GET }`,
      `answer()`,
    ])
      expect(cutExports({ node: statementOf(source) })).toBeNull()
  })
})
