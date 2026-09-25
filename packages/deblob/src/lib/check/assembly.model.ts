/**
 * `check assembly` — `assembly-builds-only`. Canon: "A file that may import
 * anything must be allowed to do almost nothing with it, or it becomes the
 * place where logic hides." Every call builds; what the assembly builds is
 * passed on or returned, never computed with or member-accessed; arguments are
 * literals, tech values received as parameters — never the host, found — or
 * instances; no use-case call but a declared load; a branch or loop is wiring
 * on a parameter or a loaded value; nothing is defined but assembly functions,
 * and nothing sits at root but imports; no adapter is returned to a caller that
 * is not a test.
 *
 * Reads an assembly file's `reading`. One violation per clause a statement
 * breaks; an argument that came out of a red call written in the same
 * expression carries it as `cause`, and rides with it (`grouping.model.ts`) —
 * through a binding, on another statement, it stands alone (ruled 2026-09-25:
 * no grouping across lines). Pure: classified graph in, violation set out.
 */

import type {
  ArgValue,
  ImportGraph,
  ModuleNode,
  ReadCall,
  ReadFunction,
  ReadStatement,
  Span,
  UnknownCondition,
} from "../extraction/graph.model.ts"
import type { AssemblyViolation } from "./violation.model.ts"

type Verdict = "green" | "red" | "unknown"

/** Branches and loops flattened: an arm's statements are its function's. */
const flattenControls = (
  statements: readonly ReadStatement[],
): readonly ReadStatement[] =>
  statements.flatMap((statement) =>
    statement.kind === "control"
      ? [statement, ...flattenControls(statement.arms.flat())]
      : [statement],
  )

const keyOf = (span: Span): string => `${span.start}-${span.end}`

/** One written inside the other: one expression, one fix. */
const nests = (a: Span, b: Span): boolean =>
  (a.start <= b.start && b.end <= a.end) ||
  (b.start <= a.start && a.end <= b.end)

/**
 * A call, judged by what it reaches. A factory call builds, any layer's — an
 * assembly's included; a model call builds on the same terms, its result judged
 * by where it goes; a declared load is the one use case allowed. Everything
 * else is there to do something other than build.
 */
const judgeCall = (call: ReadCall): Verdict => {
  switch (call.callee.kind) {
    case "factory":
    case "model":
    // the import rules judge these edges; the call adds nothing to them
    case "forbidden-import":
      return "green"
    case "use-case":
      return call.load === null ? "red" : "green"
    case "unknown":
      return "unknown"
    default:
      return "red"
  }
}

/**
 * What a call's result is when it is not something the assembly built: a tech
 * value — a load's, the tech's — or what a package nothing claims gave. Canon:
 * "A tech value may be read — a field, a destructured part — and is still a
 * tech value."
 */
const resultIsTech = (call: ReadCall): boolean =>
  call.load !== null ||
  call.callee.kind === "tech" ||
  call.callee.kind === "unclaimed"

const judgeAssembly = (node: ModuleNode): AssemblyViolation[] => {
  const reading = node.reading
  if (reading === null) return []
  const at = (span: Span, subject: Span = span) => ({
    check: "assembly" as const,
    ruleset: "arch" as const,
    rules: ["assembly-builds-only" as const],
    file: node.path,
    serviceRoot: node.serviceRoot,
    line: span.line,
    unknown: null,
    subject,
    cause: null,
  })
  const bodies = reading.functions.map((fn) => flattenControls(fn.body))
  const root = flattenControls(reading.root)
  const calls = [...root, ...bodies.flat()].flatMap((statement) =>
    statement.kind === "call" ? [statement.call] : [],
  )
  const verdicts = new Map(
    calls.map((call) => [keyOf(call.span), judgeCall(call)]),
  )
  /** A call's verdict; `undefined` for none, or a call this file does not hold. */
  const verdictAt = (span: Span | null): Verdict | undefined =>
    span === null ? undefined : verdicts.get(keyOf(span))
  /**
   * The call an argument came out of, when red or unknown and written with the
   * call it is handed to: one expression, one fix.
   */
  const causeOf = (from: Span, site: Span): Span | null =>
    verdictAt(from) !== "green" && nests(from, site) ? from : null

  const violations: AssemblyViolation[] = []

  // nothing sits at root but imports
  for (const statement of root) {
    if (statement.kind === "definition") {
      if (statement.inlined) continue
      violations.push({
        ...at(statement.span),
        // a binding storing a root call's result: the same statement, one fix
        cause: statement.storedCall,
        shape: "definition",
        name: statement.name,
        at: "root",
      })
    } else {
      // a branch at root is a statement, and so is each one in its arms
      const { span } = statement.kind === "call" ? statement.call : statement
      violations.push({ ...at(span), shape: "root-statement" })
    }
  }

  /** An argument, or a record argument's entry, judged. */
  const judgeValue = (
    call: ReadCall,
    value: ArgValue,
    key: string | null,
  ): AssemblyViolation[] => {
    if (value.received) return []
    // a record handed: each entry as it is passed
    if (value.entries !== null)
      return value.entries.flatMap((entry) =>
        judgeValue(call, entry.value, entry.key),
      )
    const argument = (
      verdict: "red" | "unknown",
      cause: Span | null,
    ): AssemblyViolation => ({
      ...at(value.span),
      cause,
      unknown: verdict === "unknown" ? unknownOf(value) : null,
      shape: "argument",
      callee: call.callee,
      key,
      value: value.kind,
    })
    switch (value.kind) {
      case "literal":
      case "instance":
        return []
      case "tech":
        // tech values arrive as parameters: the host read here was found
        return value.host ? [argument("red", null)] : []
      case "function": {
        // handed to a call that is itself red, or unknown: that call's fix
        const verdict = verdictAt(call.span) as Verdict
        return [
          argument(
            verdict === "unknown" ? "unknown" : "red",
            verdict === "green" ? null : call.span,
          ),
        ]
      }
      case "computed":
      case "unknown": {
        // a call's result passed on is that call's to answer for
        const from = verdictAt(value.from)
        if (from === "green") return []
        const verdict = from ?? (value.kind === "computed" ? "red" : "unknown")
        return [
          argument(
            verdict,
            value.from === null ? null : causeOf(value.from, call.span),
          ),
        ]
      }
    }
  }

  const judgeUses = (call: ReadCall): AssemblyViolation[] => {
    if (resultIsTech(call)) return []
    return call.result.flatMap((use): AssemblyViolation[] => {
      // a `condition` sits in a branch's test by construction: the branch's
      // clause owns it
      if (
        use.kind !== "member" &&
        use.kind !== "computed" &&
        use.kind !== "reassigned"
      )
        return []
      return [
        {
          ...at(use.span),
          shape: "result-use",
          use: use.kind,
          callee: call.callee,
        },
      ]
    })
  }

  /** The function a non-test file calls: its production worlds. */
  const calledInProduction = (fn: ReadFunction): boolean =>
    node.readings.some(({ world }) => world.name === fn.name)

  reading.functions.forEach((fn, index) => {
    const body = bodies[index] as readonly ReadStatement[]
    const builds = body.some(
      (statement) =>
        statement.kind === "call" && statement.call.callee.kind === "factory",
    )
    if (!builds)
      violations.push({
        ...at(fn.span),
        shape: "definition",
        name: fn.name,
        at: "function",
      })
    for (const statement of body) {
      switch (statement.kind) {
        case "call": {
          const { call } = statement
          const verdict = judgeCall(call)
          if (verdict !== "green")
            violations.push({
              ...at(call.span),
              unknown: verdict === "unknown" ? { kind: "callee" } : null,
              shape: "call",
              callee: call.callee,
            })
          violations.push(
            ...call.args.flatMap((arg) => judgeValue(call, arg, null)),
            ...judgeUses(call),
          )
          break
        }
        case "control":
          if (
            statement.testOrigin === "instance" ||
            statement.testOrigin === "other"
          )
            violations.push({
              ...at(statement.span),
              shape: "branch",
              testOrigin: statement.testOrigin,
            })
          break
        case "return":
          if (statement.record === null || !calledInProduction(fn)) break
          // the adapter whole: a member of one is a field read, its own red
          for (const { key, value } of statement.record)
            if (value.origin?.layer === "adapters" && value.path.length === 0)
              violations.push({
                ...at(value.span),
                shape: "adapter-returned",
                key,
                origin: value.origin,
              })
          break
      }
    }
  })
  return violations
}

/** What the reader could not see in an argument. */
const unknownOf = (value: ArgValue): UnknownCondition =>
  value.from === null
    ? { kind: "value", form: "argument", name: null }
    : { kind: "call-result", callee: null, construct: false }

export const checkAssembly = (graph: ImportGraph): AssemblyViolation[] =>
  [...graph.modules.values()].flatMap((node) =>
    node.layer === "assembly" ? judgeAssembly(node) : [],
  )
