/**
 * The reader revealer's second reader (`longshot/revealer/README.md`): a tech
 * that is handed no callback and dispatches nothing in the driver — it takes an
 * object and calls its methods (a bundler's plugin). Read by a cut of its own,
 * as a project would write one in its config.
 *
 * The cut: the object a wiring function returns is what the tech is handed;
 * each of its entries holding a function is a hook, that function's parameters
 * its event. Nothing picks a hook here: the tech does.
 */

import type { Node } from "@oxc-project/types"

import type { Cut } from "../extraction/reading.model.ts"

export const cutMethods = (statement: Node): Cut | null => {
  if (statement.type !== "ReturnStatement") return null
  const returned = statement.argument
  if (returned?.type !== "ObjectExpression") return null
  const hooks = returned.properties.flatMap((property) =>
    property.type === "Property" &&
    (property.value.type === "FunctionExpression" ||
      property.value.type === "ArrowFunctionExpression")
      ? [{ fn: property.value }]
      : [],
  )
  return hooks.length === 0 ? null : hooks
}

/** The reader as a config writes it: the tech's package, and its cut. */
export const HOOK_OBJECT = {
  name: "hook-object",
  tech: ["vite"],
  cut: cutMethods,
} as const
