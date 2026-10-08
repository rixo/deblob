import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import { cutMethods } from "./hook-object-reader.model.ts"

/** The statement a function's body holds, as the parser gives it. */
const bodyStatementOf = (statement: string) => {
  const [fn] = parseSync("file.ts", `function wire() { ${statement} }`).program
    .body
  if (fn?.type !== "FunctionDeclaration" || fn.body === null)
    throw new Error(`not a function body: ${statement}`)
  const [only] = fn.body.body
  if (only === undefined) throw new Error(`no statement: ${statement}`)
  return only
}

describe("cutMethods", () => {
  it("points at each function the returned object holds, and at no other entry", () => {
    const cut = cutMethods({
      node: bodyStatementOf(
        `return { name: "plugin", load: (id) => read(id), transform(code) {} }`,
      ),
    })
    expect(cut).toHaveLength(2)
  })

  it("answers nothing for a returned object that holds no function, a return of anything else, and any other statement", () => {
    for (const statement of [
      `return { name: "plugin" }`,
      `return plugin`,
      `return`,
      `plugin()`,
    ])
      expect(cutMethods({ node: bodyStatementOf(statement) })).toBeNull()
  })
})
