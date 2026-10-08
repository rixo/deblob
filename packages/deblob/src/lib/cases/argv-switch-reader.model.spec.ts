import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import { cutLazy } from "./argv-switch-reader.model.ts"

/** The expression of a one-statement source, as the parser gives it. */
const expressionOf = (source: string) => {
  const [statement] = parseSync("file.ts", source).program.body
  if (statement?.type !== "ExpressionStatement")
    throw new Error(`not an expression statement: ${source}`)
  return statement.expression
}

describe("cutLazy", () => {
  it("relays to the unit a thunk imports, with the rest of what it is handed", () => {
    for (const source of [
      `lazy(() => import("./unit"), argv)`,
      `lazy(async function () { return await import("./unit") }, argv)`,
    ]) {
      const cut = cutLazy({ node: expressionOf(source) })
      expect(cut).toHaveLength(1)
      expect(cut?.[0]).toMatchObject({
        relayed: { name: "dispatch", load: { type: "ImportExpression" } },
      })
    }
  })

  it("answers nothing for a thunk that is anything but its import, for no thunk, and for another call", () => {
    for (const source of [
      `lazy(() => unit, argv)`,
      `lazy(() => { prepare(); return import("./unit") })`,
      `lazy(unit)`,
      `lazy()`,
      `other(() => import("./unit"))`,
    ])
      expect(cutLazy({ node: expressionOf(source) })).toBeNull()
  })
})
