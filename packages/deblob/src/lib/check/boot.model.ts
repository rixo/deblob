/**
 * `check boot` — `boot-one-call`, its statements; its imports are the `layers`
 * cells. Canon: the boot is "the one module whose evaluation performs a call.
 * Two rights, nothing more" — it imports a single driver and calls its wiring
 * function exactly once, at module root, with no arguments; it defines nothing,
 * holds nothing, touches no tech. Every other fact is a violation of its own:
 * any statement but the one call, an argument handed to it, a driver imported
 * and never started, no call at all. The structure is the rule, so nothing here
 * waits on what a statement does: a statement the reader cannot read is still a
 * second statement. Pure: classified graph in, violation set out.
 */

import type {
  ImportGraph,
  ModuleNode,
  ReadCall,
  ReadStatement,
} from "../extraction/graph.model.ts"
import type { BootViolation } from "./violation.model.ts"

type Shape = DistributiveOmit<
  BootViolation,
  "check" | "ruleset" | "rules" | "file" | "serviceRoot" | "line"
>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** Whether a body makes a call, a branch's arms included. */
const hasCall = (statements: readonly ReadStatement[]): boolean =>
  statements.some(
    (statement) =>
      statement.kind === "call" ||
      (statement.kind === "control" && statement.arms.some(hasCall)),
  )

const judgeBoot = (node: ModuleNode, graph: ImportGraph): BootViolation[] => {
  const reading = node.reading
  if (reading === null) return []
  const violations: BootViolation[] = []
  const report = (line: number | null, shape: Shape): void => {
    violations.push({
      check: "boot",
      ruleset: "arch",
      rules: ["boot-one-call"],
      file: node.path,
      serviceRoot: node.serviceRoot,
      line,
      ...shape,
    } as BootViolation)
  }

  let oneCall: ReadCall | null = null
  let started: string | null = null
  for (const statement of reading.root) {
    if (statement.kind === "call") {
      const { call } = statement
      if (
        oneCall === null &&
        call.callee.kind === "wiring" &&
        call.site === null
      ) {
        oneCall = call
        started = call.callee.path
        const [first] = call.args
        if (first !== undefined)
          report(first.span.line, { shape: "argument", call: call.callee })
        continue
      }
      // a call on the one call's result is this call's red, not a second one
      // for the result used
      report(call.span.line, { shape: "call", callee: call.callee })
      continue
    }
    if (statement.kind === "definition") {
      const holds =
        statement.storedCall !== null &&
        statement.storedCall.start === oneCall?.span.start
      report(statement.span.line, {
        shape: holds ? "held" : "definition",
        name: statement.name,
      })
      continue
    }
    // a branch, a write, a return, a throw, a statement the reader does not
    // know: a second statement all the same
    report(statement.span.line, { shape: "statement", form: statement.kind })
  }
  // a function written at root is a definition too, read apart from the root
  for (const fn of reading.functions)
    report(fn.span.line, { shape: "definition", name: fn.name })

  // no call at all, a branch's arms included; a wrong one is already that
  // call's red, a conditional one the branch's
  if (!hasCall(reading.root)) report(null, { shape: "no-call" })
  // a driver imported and never started: the one driver is the started one
  for (const edge of graph.edges) {
    if (edge.from !== node.path || edge.to.type !== "module") continue
    if (graph.modules.get(edge.to.path)?.layer !== "driver") continue
    if (started !== null && edge.to.path !== started)
      report(null, { shape: "unstarted", driver: edge.to.path })
  }
  return violations
}

export const checkBoot = (graph: ImportGraph): BootViolation[] =>
  [...graph.modules.values()].flatMap((node) =>
    node.layer === "boot" ? judgeBoot(node, graph) : [],
  )
