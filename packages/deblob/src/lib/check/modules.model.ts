/**
 * `check modules` — `inert-modules`, module discipline. A module's evaluation
 * creates no mutable state and performs no side effect, so importing a file
 * does nothing and the file can be tested in its own right. What is red at
 * module root follows from that sentence, and canon's shapes are the known
 * ones, not a closed list.
 *
 * This detector holds one of them: a root statement that is neither a call nor
 * a definition and still does something when the module is evaluated — an
 * assignment, a `delete`, a `throw`. Whatever sits at root runs on import, so a
 * statement that only makes sense at run time is a side effect at load time.
 * The binding and call shapes come with later clauses.
 *
 * Reads a file's `reading`, the first check to do so. Pure: classified graph
 * in, violation set out — no IO, no formatting, no ordering.
 */

import type {
  ImportGraph,
  ModuleNode,
  ReadStatement,
} from "../extraction/graph.model.ts"
import type { ModulesViolation } from "./violation.model.ts"

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
 * is a `delete`, an increment, and every statement the reader does not
 * recognise — which is why it counts here: at root, a statement the reader
 * cannot name is one it cannot clear either.
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
const judgeModule = (node: ModuleNode): ModulesViolation[] => {
  if (node.layer === "blob" || node.reading === null) return []
  return flattenBranches(node.reading.root)
    .filter(runsOnImport)
    .map((statement) => ({
      check: "modules" as const,
      ruleset: "arch" as const,
      rules: ["inert-modules" as const],
      file: node.path,
      serviceRoot: node.serviceRoot,
      line: statement.span.line,
      shape: "root-statement" as const,
    }))
}

export const checkModules = (graph: ImportGraph): ModulesViolation[] =>
  [...graph.modules.values()].flatMap(judgeModule)
