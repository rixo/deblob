/**
 * The cut: where a technology hands control to a driver. A cut is asked on
 * every statement and every call of a file a reader reads, and answers with the
 * hooks that node holds, pointed at; the reading turns a pointer into a hook —
 * the event, a hook that only hands the dispatch on, nothing picked inside a
 * hook — the same for every cut. A cut may also say that a call into its tech
 * is the tech calling a sub-driver for the driver (`RelayedCall`).
 *
 * Every reader's stack ends with the one cut written here, `cutCallbacks`: a
 * function handed to a tech is a hook. A reader's own (`cut`, on its port)
 * stands beside it, for a tech whose hooks are not callbacks. Pure.
 */

import type { Node } from "@oxc-project/types"

/**
 * A hook, pointed at: what a cut answers. Two forms.
 *
 * A function (`fn`) — a callback handed to the tech, a method of an object the
 * tech is handed: the hook is the function, its parameters the event. It is
 * read as a hook where the reading meets it; what stands around it reads as it
 * is. Functions nest: a hook may hold another.
 *
 * Statements picked (`body`, `on`) — a case of a dispatch the driver writes:
 * what one trigger runs, whole (what runs together is one hook), where it sits,
 * and the expression that picked it. The tech value at `on`'s root — the result
 * of a call into the pointing reader's tech, or what the function received of
 * it — is the event; the statement reads as its hooks. Pointed off any other
 * value, the statement reads as the statement it is. Nothing is picked inside a
 * hook: picking is the wiring's. Answered on a statement only.
 */
export type HookPointer =
  { fn: Node } | { start: number; end: number; body: readonly Node[]; on: Node }

/**
 * A call the tech makes for the driver, pointed at: the tech is handed a module
 * to load and calls one of its exports itself — a unit loaded on demand, as a
 * framework loads a route file. `load` is the `import()` that names the module,
 * `name` the export the tech calls, `args` what it calls it with. Where the
 * import is of a literal path and the export is a sub-driver's wiring function,
 * the call reads as that function called there by the driver, with those
 * arguments — judged as any call to a sub-driver's wiring function is. Anywhere
 * else the answer says nothing, and the call reads as the call it is. Answered
 * on a call into the pointing reader's tech only.
 */
export type RelayedCall = {
  relayed: { load: Node; name: string; args: readonly Node[] }
}

/** A cut's answer on one node: the hooks it holds, the call it relays. */
export type Cut = readonly (HookPointer | RelayedCall)[]

/**
 * What a cut may ask the reading, which follows what the file binds: whose a
 * call's callee is — a tech's (`package`: the package or project file a reader
 * claims, `null` for the host's), nobody's (`unclaimed`), or anything else.
 */
export type CutContext = {
  calleeOf: (
    call: Node,
  ) =>
    | { kind: "tech"; package: string | null }
    | { kind: "unclaimed" }
    | { kind: "other" }
}

/** A cut's answer as the reading takes it: with what the cut's reader claims. */
export type CutAnswer = { cut: Cut; claims: (target: string) => boolean }

/** A node past what wraps it without changing what it is: `(x)`, `x as T`. */
const WRAPPERS: ReadonlySet<string> = new Set([
  "ParenthesizedExpression",
  "TSAsExpression",
  "TSSatisfiesExpression",
  "TSNonNullExpression",
  "TSTypeAssertion",
  "TSInstantiationExpression",
  "ChainExpression",
  "AwaitExpression",
])

export const unwrapNode = (node: Node): Node => {
  let current = node as Node & { expression?: Node; argument?: Node }
  while (WRAPPERS.has(current.type))
    // every wrapper carries the one or the other
    current = (current.expression ?? current.argument) as typeof current
  return current
}

/**
 * The default cut: a function handed to a tech is a hook. Handed to what nobody
 * claims it is cut as one too: the missing premise is red once, at the call
 * (GUESS: D8), never again as the callback's calls read into the wiring.
 */
export const cutCallbacks = (node: Node, about: CutContext): Cut | null => {
  const handed =
    node.type === "CallExpression" || node.type === "NewExpression"
      ? node.arguments
      : node.type === "TaggedTemplateExpression"
        ? node.quasi.expressions
        : null
  if (handed === null || about.calleeOf(node).kind === "other") return null
  const hooks = handed
    .map(unwrapNode)
    .filter(
      (handedNode) =>
        handedNode.type === "ArrowFunctionExpression" ||
        handedNode.type === "FunctionExpression",
    )
    .map((fn) => ({ fn }))
  return hooks.length === 0 ? null : hooks
}

/** The default cut's answer, as the reading takes one: it claims nothing. */
export const answerCallbacks = (node: Node, about: CutContext): CutAnswer[] => {
  const cut = cutCallbacks(node, about)
  return cut === null ? [] : [{ cut, claims: () => false }]
}
