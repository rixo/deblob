import { parseSync } from "oxc-parser"
import { describe, expect, it } from "vitest"

import type { CutContext } from "./cut.model.ts"
import { cutCallbacks, unwrapNode } from "./cut.model.ts"

/** The expression of a one-statement source, as the parser gives it. */
const expressionOf = (source: string) => {
  const [statement] = parseSync("file.ts", source).program.body
  if (statement?.type !== "ExpressionStatement")
    throw new Error(`not an expression statement: ${source}`)
  return statement.expression
}

const aboutOf = (callee: ReturnType<CutContext["calleeOf"]>): CutContext => ({
  calleeOf: () => callee,
})

/** The reading saying of any call: its callee is the tech's. */
const techCallee = (): CutContext => aboutOf({ kind: "tech", package: "cac" })

describe("cutCallbacks", () => {
  it("points at each function handed to a tech's callee — an arrow, a function expression — and at nothing else handed", () => {
    const call = expressionOf(
      `parser.on("check", (opts) => run(opts), function named() {}, other)`,
    )
    const cut = cutCallbacks({ node: call, context: techCallee() })
    expect(cut?.map((pointer) => "fn" in pointer && pointer.fn.type)).toEqual([
      "ArrowFunctionExpression",
      "FunctionExpression",
    ])
  })

  it("points at a function handed to a callee nobody claims too, and to the host's", () => {
    const call = expressionOf(`register(() => run())`)
    expect(
      cutCallbacks({ node: call, context: aboutOf({ kind: "unclaimed" }) }),
    ).toHaveLength(1)
    expect(
      cutCallbacks({
        node: call,
        context: aboutOf({ kind: "tech", package: null }),
      }),
    ).toHaveLength(1)
  })

  it("answers nothing for a callee that is neither: a function handed to the language or a service is no hook", () => {
    const call = expressionOf(`items.forEach((item) => run(item))`)
    expect(
      cutCallbacks({ node: call, context: aboutOf({ kind: "other" }) }),
    ).toBeNull()
  })

  it("answers nothing for a call that hands no function, and for a node that is no call", () => {
    expect(
      cutCallbacks({
        node: expressionOf(`parser.parse(argv)`),
        context: techCallee(),
      }),
    ).toBeNull()
    expect(
      cutCallbacks({
        node: expressionOf(`parser.name`),
        context: techCallee(),
      }),
    ).toBeNull()
  })

  it("points at the function past what wraps it, at a constructor's and at a tagged template's", () => {
    const wrapped = expressionOf(
      `parser.on((((opts) => run(opts)) as Handler)!)`,
    )
    expect(cutCallbacks({ node: wrapped, context: techCallee() })).toHaveLength(
      1,
    )
    expect(
      cutCallbacks({
        node: expressionOf(`new Watcher(() => run())`),
        context: techCallee(),
      }),
    ).toHaveLength(1)
    expect(
      cutCallbacks({
        node: expressionOf("tag`a ${() => run()} b`"),
        context: techCallee(),
      }),
    ).toHaveLength(1)
  })
})

describe("unwrapNode", () => {
  it("gives the node past parentheses and type wrappers, and a bare node as it is", () => {
    expect(unwrapNode(expressionOf(`((x as T)!)`)).type).toBe("Identifier")
    const bare = expressionOf(`x`)
    expect(unwrapNode(bare)).toBe(bare)
  })
})
