/**
 * `check modules` — `stable-root`, module discipline. A module's evaluation
 * creates no mutable state and performs no side effect, so importing a file
 * does nothing and the file can be tested in its own right. What is red at
 * module root follows from that sentence, and canon's shapes are the known
 * ones, not a closed list.
 *
 * This detector holds three of them. A root statement that is neither a call
 * nor a definition and still does something when the module is evaluated — an
 * assignment, a `delete`: whatever sits at root runs on import, so a statement
 * that only makes sense at run time is a side effect at load time. A root
 * binding that holds state: one whose immutability the syntax does not prove,
 * or one storing a value read from the tech, which captures the machine's state
 * at load time whatever its type. And a root call that reaches the tech, runs a
 * use case, or goes into a function of a file whose layer may touch the tech: a
 * property read is presumed free of side effects, a call is not. Exempt by
 * kind, a closed list: the boot's one call, a spec file's registrations into
 * its runner.
 *
 * Reads a file's `reading`, the first check to do so. Pure: classified graph
 * in, violation set out — no IO, no formatting, no ordering.
 */

import type {
  ImportGraph,
  Layer,
  ModuleNode,
  ReadCall,
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
 * The layers whose code may touch the tech: a function of one of their files,
 * called at root, cannot be ruled free of side effects (canon: "a local
 * function of a file whose layer may touch the tech — an adapter's, a
 * blob's").
 */
const TOUCHES_TECH: ReadonlySet<Layer> = new Set([
  "adapters",
  "blob",
  "assembly",
  "driver",
  "boot",
  "test",
])

type CallVerdict =
  | { verdict: "green" }
  | {
      verdict: "red" | "unknown"
      reaches: Extract<ModulesViolation, { shape: "root-call" }>["reaches"]
      name: string | null
    }

const GREEN: CallVerdict = { verdict: "green" }

/**
 * What a root call reaches, judged. A factory call is the lane, not the crime —
 * what it binds is judged as a binding; a language or model call is free. A
 * call into the tech, a use case, or a function of a file that may touch the
 * tech is presumed to act; a callee the reader cannot place is an unknown.
 */
const judgeCall = (call: ReadCall, layer: Layer): CallVerdict => {
  const { callee } = call
  switch (callee.kind) {
    case "language":
    case "model":
    // the import rules judge these edges; the call adds nothing to them
    case "forbidden-import":
      return GREEN
    case "factory":
      return callee.layer === "adapters" || callee.layer === "blob"
        ? { verdict: "red", reaches: "function", name: callee.name }
        : GREEN
    case "local":
      return TOUCHES_TECH.has(layer)
        ? { verdict: "red", reaches: "function", name: callee.name }
        : GREEN
    case "tech":
      return { verdict: "red", reaches: "tech", name: callee.package }
    case "use-case":
      return { verdict: "red", reaches: "use-case", name: callee.member }
    case "unclaimed":
      return { verdict: "red", reaches: "unclaimed", name: callee.package }
    case "wiring":
      return { verdict: "red", reaches: "wiring", name: callee.name }
    case "unknown":
      return { verdict: "unknown", reaches: null, name: null }
  }
}

/**
 * The exemptions by kind, a closed list: a spec file's registrations into its
 * runner — a driver's wiring function handed the runner's tech included, the
 * shared matcher canon names — and the boot's one call to its driver's wiring
 * function.
 */
const isExempt = (
  call: ReadCall,
  layer: Layer,
  bootCallMade: boolean,
): boolean => {
  if (call.registration) return true
  if (call.callee.kind !== "wiring") return false
  if (layer === "boot") return !bootCallMade
  return layer === "test" && call.handsRunner
}

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
    subject: statement.span,
    cause: null,
  })
  const statements = flattenBranches(node.reading.root)
  // the calls first, in order: the boot's one call is its first to the wiring
  const calls: { call: ReadCall; verdict: CallVerdict }[] = []
  let bootCallMade = false
  for (const statement of statements) {
    if (statement.kind !== "call") continue
    const { call } = statement
    const exempt = isExempt(call, node.layer, bootCallMade)
    if (call.callee.kind === "wiring" && node.layer === "boot")
      bootCallMade = true
    calls.push({ call, verdict: exempt ? GREEN : judgeCall(call, node.layer) })
  }
  /**
   * The red call a subject is the result of, from the call at `span`: that call
   * when red, else the red call its callee came out of, through the chain —
   * `connect().then(…)` stored is `connect()`'s result, a green link between —
   * what the subject's violation derives from, the same fix, grouped
   * downstream.
   */
  const redCallAt = (span: Span | null): Span | null => {
    if (span === null) return null
    const found = calls.find(
      ({ call }) =>
        call.span.start === span.start && call.span.end === span.end,
    )
    if (found === undefined) return null
    return found.verdict.verdict === "red"
      ? span
      : redCallAt(found.call.calleeCall)
  }
  const callViolations = calls.flatMap(
    ({ call, verdict }): ModulesViolation[] =>
      verdict.verdict === "green"
        ? []
        : [
            {
              ...at(call),
              cause: redCallAt(call.calleeCall),
              via:
                call.site === null
                  ? []
                  : [{ file: node.path, line: call.site.line }],
              shape: "root-call",
              reaches: verdict.reaches,
              name: verdict.name,
              unknown:
                verdict.verdict === "unknown" ? { kind: "callee" } : null,
            },
          ],
  )
  return [
    ...callViolations,
    ...statements.flatMap((statement): ModulesViolation[] => {
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
      const { immutability } = statement
      // what a binding holds, stored from a call judged red, is the call's
      // result: the same fix — a read made on the way to the callee included;
      // a `let`, a `var` or a writable static is state whatever it holds, a
      // fix of its own
      const reassignable =
        immutability.proof === "mutable" &&
        (immutability.form === "let" ||
          immutability.form === "var" ||
          immutability.form === "static")
      const cause = reassignable ? null : redCallAt(statement.storedCall)
      // a read of the machine first: no annotation proves what it held; a
      // call's result is not one — the call is judged where it sits
      if (statement.storesMachineRead) {
        return [
          {
            ...at(statement),
            cause,
            shape: "root-binding",
            holds: "machine",
            by: null,
            unknown: null,
          },
        ]
      }
      // a broken line gets no verdict: the run lists it and cannot certify
      return immutability.proof === "readonly" ||
        immutability.proof === "broken"
        ? []
        : [
            {
              ...at(statement),
              cause,
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
    }),
  ]
}

export const checkModules = (
  graph: ImportGraph,
  options: CheckModulesOptions = {},
): ModulesViolation[] =>
  [...graph.modules.values()].flatMap((node) => judgeModule(node, options))
