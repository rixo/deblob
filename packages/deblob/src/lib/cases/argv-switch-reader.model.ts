/**
 * The reader revealer's reader (`longshot/revealer/README.md`): a tech that
 * takes no callback — it reads the command line, the driver dispatches with a
 * `switch` — read by a cut of its own, as a project would write one in its
 * config. All the reader knows of `switch` is here; the reading learns none of
 * it.
 *
 * The cut: a `switch` statement is where the tech hands control, on its
 * discriminant; each case's statements are a hook, `default` included. Labels
 * with no statements of their own share the next body (two labels, one hook); a
 * body that does not end the case runs into the next, so the two are one hook —
 * one trigger, both bodies. A closing `break` is the switch's, not the hook's.
 *
 * The lazy seam: the tech's `lazy` handed a thunk that is an `import()` loads
 * that module and calls its `dispatch` — the tech calling a sub-driver for the
 * driver.
 */

import type { Node, Statement, SwitchCase } from "@oxc-project/types"

import type { Cut } from "../extraction/cut.model.ts"
import { unwrapNode } from "../extraction/cut.model.ts"

/** Whether a case's statements end it: the last one leaves the switch. */
const endsCase = (statements: readonly Statement[]): boolean => {
  const last = statements.at(-1)?.type
  return (
    last === "ReturnStatement" ||
    last === "BreakStatement" ||
    last === "ThrowStatement"
  )
}

/** A hook's statements: the case's, its closing `break` left out. */
const bodyOf = (statements: readonly Statement[]): Statement[] =>
  statements.filter(
    (statement, index) =>
      !(index === statements.length - 1 && statement.type === "BreakStatement"),
  )

export const cutSwitch = (statement: Node): Cut | null => {
  if (statement.type !== "SwitchStatement") return null
  const on = statement.discriminant
  const hooks: Cut[number][] = []
  let open: { first: SwitchCase; body: Statement[] } | null = null
  for (const switchCase of statement.cases) {
    open ??= { first: switchCase, body: [] }
    open.body.push(...bodyOf(switchCase.consequent))
    const last = switchCase === statement.cases.at(-1)
    if (!endsCase(switchCase.consequent) && !last) continue
    hooks.push({
      start: open.first.start,
      end: switchCase.end,
      body: open.body,
      on,
    })
    open = null
  }
  return hooks
}

/**
 * The `import()` a thunk is, and nothing else: `() => import("./x")`, written
 * as an arrow or a function, with a body that only returns it, awaited or not.
 */
const loadOf = (handed: Node): Node | null => {
  const thunk = unwrapNode(handed)
  if (
    (thunk.type !== "ArrowFunctionExpression" &&
      thunk.type !== "FunctionExpression") ||
    thunk.body === null
  )
    return null
  const body = thunk.body as Node
  let returned: Node | null = body
  if (body.type === "BlockStatement") {
    const [only] = body.body
    returned =
      only?.type === "ReturnStatement" && body.body.length === 1
        ? only.argument
        : null
  }
  if (returned === null) return null
  const load = unwrapNode(returned)
  return load.type === "ImportExpression" ? load : null
}

/**
 * The lazy seam: `lazy(() => import("./unit"), …rest)` is the tech loading the
 * unit and calling its `dispatch` with the rest. A thunk that is anything but
 * its `import()` is no seam: a function handed to the tech, as any. Whether
 * `lazy` is this reader's tech is the reading's to check.
 */
export const cutLazy = (node: Node): Cut | null => {
  if (
    node.type !== "CallExpression" ||
    node.callee.type !== "Identifier" ||
    node.callee.name !== "lazy"
  )
    return null
  const [thunk, ...args] = node.arguments
  const load = thunk === undefined ? null : loadOf(thunk)
  return load === null ? null : [{ relayed: { load, name: "dispatch", args } }]
}

/** The reader as a config writes it: the tech's file, and its cut. */
export const ARGV_SWITCH = {
  name: "argv-switch",
  tech: ["./src/lib/argv/argv.model.ts"],
  cut: (node: Node) => cutSwitch(node) ?? cutLazy(node),
} as const
