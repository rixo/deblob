/**
 * A reader for a tech that calls a file's exports — a framework that loads a
 * route file and calls its `GET`: no callback is handed to anything, and no
 * call in the file to answer on. Its cut points at the function an export
 * statement defines: `export const GET = (event) => …`, `export function GET`,
 * `export default (event) => …`. One shape: a function written in the export
 * statement. As a project would write it in its config; the reading learns
 * nothing of it.
 */

import type { Node } from "@oxc-project/types"

import type { Cut } from "../extraction/cut.model.ts"

const isFunction = (node: Node | null | undefined): node is Node =>
  node?.type === "ArrowFunctionExpression" ||
  node?.type === "FunctionExpression" ||
  node?.type === "FunctionDeclaration"

export const cutExports = ({ node }: { node: Node }): Cut | null => {
  if (node.type === "ExportDefaultDeclaration")
    return isFunction(node.declaration) ? [{ fn: node.declaration }] : null
  if (node.type !== "ExportNamedDeclaration" || node.declaration === null)
    return null
  const declaration = node.declaration
  if (declaration.type === "FunctionDeclaration") return [{ fn: declaration }]
  if (declaration.type !== "VariableDeclaration") return null
  const hooks = declaration.declarations.flatMap(({ init }) =>
    isFunction(init) ? [{ fn: init }] : [],
  )
  return hooks.length === 0 ? null : hooks
}

/** The reader as a config writes it: its files, the tech's package, its cut. */
export const ROUTE_EXPORTS = {
  name: "route-exports",
  include: ["src/routes/**/+server.ts"],
  tech: ["made-up-kit"],
  cut: cutExports,
} as const
