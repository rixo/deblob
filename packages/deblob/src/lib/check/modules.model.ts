/**
 * `check modules` — `stable-root`, module discipline. A module's evaluation
 * creates no mutable state and performs no side effect, so importing a file
 * does nothing and the file can be tested in its own right. What is red at
 * module root follows from that sentence, and canon's shapes are the known
 * ones, not a closed list.
 *
 * This detector holds two of them. A root statement that is neither a call nor
 * a definition and still does something when the module is evaluated — an
 * assignment, a `delete`: whatever sits at root runs on import, so a statement
 * that only makes sense at run time is a side effect at load time. And a root
 * binding that holds state: one whose immutability the syntax does not prove,
 * or one storing a value read from the tech, which captures the machine's state
 * at load time whatever its type. The call shape comes with a later clause.
 *
 * Reads a file's `reading`, the first check to do so. Pure: classified graph
 * in, violation set out — no IO, no formatting, no ordering.
 */

import type {
  ImportGraph,
  ModuleNode,
  ReadStatement,
  Span,
} from "../extraction/graph.model.ts"
import type { ModulesViolation } from "./violation.model.ts"

export type CheckModulesOptions = {
  /**
   * The codebase accepts module state: lifts the binding shape and nothing else
   * — a statement or a call at root does something, state or not.
   */
  mutableModuleState?: boolean
}

/**
 * Root statements a branch or loop holds, flattened — neither is a shelter,
 * their bodies are root code and run on import like everything else at root.
 */
const flattenBranches = (
  statements: readonly ReadStatement[],
): readonly ReadStatement[] =>
  statements.flatMap((statement) =>
    statement.kind === "control"
      ? flattenBranches(statement.arms.flat())
      : [statement],
  )

/**
 * The statement kinds that do something on evaluation. `call` and `definition`
 * are judged by the clauses that own them; `return` cannot appear at a module's
 * root; a `throw` changes nothing and is the author's crash to write. `other`
 * is a `delete` or an increment. A statement the reader does not recognise
 * (`unread`) is judged apart: an unknown, not a proven red.
 */
const runsOnImport = (
  statement: ReadStatement,
): statement is Extract<ReadStatement, { kind: "assignment" | "other" }> =>
  statement.kind === "assignment" || statement.kind === "other"

/**
 * Blob is exempt, like every rule that is not there to protect another layer's
 * claim (`blob-quarantine` is, and reaches in for that reason). What this rule
 * buys — importing a file does nothing, the file can be tested in its own right
 * — is a claim about the file itself, and blob claims none. A side effect in
 * blob does leak to whoever imports it, but quarantine already bounds that to
 * assembly and test: containment, not a second rule reaching in.
 */
const judgeModule = (
  node: ModuleNode,
  options: CheckModulesOptions,
): ModulesViolation[] => {
  if (node.layer === "blob" || node.reading === null) return []
  const at = (statement: { span: Span }) => ({
    check: "modules" as const,
    ruleset: "arch" as const,
    rules: ["stable-root" as const],
    file: node.path,
    serviceRoot: node.serviceRoot,
    line: statement.span.line,
    via: [],
  })
  return flattenBranches(node.reading.root).flatMap(
    (statement): ModulesViolation[] => {
      if (runsOnImport(statement)) {
        return [{ ...at(statement), shape: "root-statement", unknown: null }]
      }
      // a statement the reader cannot name is one it cannot clear either
      if (statement.kind === "unread") {
        return [
          {
            ...at(statement),
            shape: "root-statement",
            unknown: { kind: "statement", form: statement.form },
          },
        ]
      }
      // a root callback's body runs on import, but its locals are each run's
      if (
        statement.kind !== "definition" ||
        statement.inlined ||
        options.mutableModuleState
      ) {
        return []
      }
      // a read of the machine first: no annotation proves what it held; a
      // call's result is not one — the call is judged where it sits
      if (statement.storesMachineRead) {
        return [
          {
            ...at(statement),
            shape: "root-binding",
            holds: "machine",
            by: null,
            unknown: null,
          },
        ]
      }
      const { immutability } = statement
      // a broken line gets no verdict: the run lists it and cannot certify
      return immutability.proof === "readonly" ||
        immutability.proof === "broken"
        ? []
        : [
            {
              ...at(statement),
              shape: "root-binding",
              holds: "state",
              by:
                immutability.proof === "mutable"
                  ? { form: immutability.form, name: immutability.name }
                  : null,
              unknown:
                immutability.proof === "unknown"
                  ? immutability.condition
                  : null,
            },
          ]
    },
  )
}

export const checkModules = (
  graph: ImportGraph,
  options: CheckModulesOptions = {},
): ModulesViolation[] =>
  [...graph.modules.values()].flatMap((node) => judgeModule(node, options))
