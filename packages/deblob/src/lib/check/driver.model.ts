/**
 * `check driver` — the five driver rules. Canon: "The driver holds the tech and
 * fires the hexagon … kept so thin that nothing in it needs a test." It
 * connects a trigger to a use case: outside its hooks it only wires
 * (`wiring-outside-hooks`); each hook makes one unconditional use-case call and
 * translates nothing around it (`hook-one-call`); it calls services, assembly,
 * sub-driver wiring and its own tech, nothing else (`driver-calls-services`);
 * it defines its hooks and one wiring function (`driver-hooks-only`); a
 * sub-driver's wiring runs in the wiring, handed tech and instances
 * (`sub-driver-wiring`).
 *
 * Reads a driver's reading, and a test file's hooks — a test is assembly and
 * driver in one, its tech exempting the count and services-only. Two facts are
 * two violations: nothing here rides another. Pure: classified graph in,
 * violation set out.
 */

import type {
  ArgValue,
  CalleeKind,
  Exemption,
  ImportGraph,
  ModuleNode,
  ReadCall,
  ReadFunction,
  ReadHook,
  ReadStatement,
  Span,
} from "../extraction/graph.model.ts"
import type { RuleId } from "./rule.model.ts"
import type { DriverViolation } from "./violation.model.ts"

type Shape = DistributiveOmit<
  DriverViolation,
  | "check"
  | "ruleset"
  | "rules"
  | "file"
  | "serviceRoot"
  | "line"
  | "unknown"
  | "subject"
  | "cause"
>

type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

/** Every call in a body, branch arms included. */
const callsIn = (statements: readonly ReadStatement[]): ReadCall[] =>
  statements.flatMap((statement) =>
    statement.kind === "call"
      ? [statement.call]
      : statement.kind === "control"
        ? statement.arms.flatMap(callsIn)
        : [],
  )

const within = (inner: Span, outer: Span): boolean =>
  outer.start <= inner.start && inner.end <= outer.end

/**
 * The callees a driver may call anywhere: a use case, an assembly's factory, a
 * sub-driver's wiring, its own tech — and an import the layer rules judge.
 */
const isDriversCall = (callee: CalleeKind): boolean =>
  callee.kind === "use-case" ||
  callee.kind === "wiring" ||
  callee.kind === "tech" ||
  callee.kind === "forbidden-import" ||
  (callee.kind === "factory" && callee.layer === "assembly")

/** A value a driver may hand on: a tech value, an instance, a literal. */
const isHandable = (value: ArgValue): boolean =>
  value.kind === "tech" || value.kind === "instance" || value.kind === "literal"

/**
 * The wiring function: the first exported — what is not exported, nothing
 * outside calls. Every other function is a definition beside it.
 */
const wiringFunctionOf = (
  functions: readonly ReadFunction[],
): ReadFunction | undefined => functions.find((fn) => fn.exported)

const judgeDriver = (
  node: ModuleNode,
  graph: ImportGraph,
): DriverViolation[] => {
  const reading = node.reading
  if (reading === null) return []
  const exempts = new Set<Exemption>(reading.exempts)
  const violations: DriverViolation[] = []
  const report = (
    rule: RuleId,
    span: Span,
    shape: Shape,
    unknown: DriverViolation["unknown"] = null,
  ): void => {
    violations.push({
      check: "driver",
      ruleset: "arch",
      rules: [rule],
      file: node.path,
      serviceRoot: node.serviceRoot,
      line: span.line,
      unknown,
      subject: span,
      cause: null,
      ...shape,
    } as DriverViolation)
  }

  /** A callee no driver calls: the services-only rule, unless exempt. */
  const judgeCallee = (call: ReadCall, where: "wiring" | "hook"): void => {
    if (isDriversCall(call.callee) || exempts.has("services-only")) return
    report(
      "driver-calls-services",
      call.span,
      { shape: "call", callee: call.callee, where },
      call.callee.kind === "unknown" ? { kind: "callee" } : null,
    )
  }

  const useCaseAt = (span: Span | null, calls: readonly ReadCall[]) =>
    span === null
      ? false
      : calls.some(
          (call) =>
            call.callee.kind === "use-case" &&
            call.span.start === span.start &&
            call.span.end === span.end,
        )

  /** Outside the hooks: wiring, and nothing else. */
  const judgeWiring = (body: readonly ReadStatement[]): void => {
    const calls = callsIn(body)
    const walk = (statements: readonly ReadStatement[]): void => {
      for (const statement of statements) {
        switch (statement.kind) {
          case "call": {
            const { call } = statement
            if (call.callee.kind === "use-case")
              report("wiring-outside-hooks", call.span, {
                shape: "call",
                callee: call.callee,
                where: "wiring",
              })
            judgeCallee(call, "wiring")
            for (const arg of call.args) {
              if (arg.received || isHandable(arg)) continue
              // a function handed to the tech is a hook
              if (arg.kind === "function" && call.callee.kind === "tech")
                continue
              const shape: Shape = {
                shape: "argument",
                callee: call.callee,
                value: arg.kind,
                where: "wiring",
              }
              // a sub-driver handed data from the hexagon
              if (call.callee.kind === "wiring" && useCaseAt(arg.from, calls)) {
                report("sub-driver-wiring", arg.span, shape)
                continue
              }
              report(
                "wiring-outside-hooks",
                arg.span,
                shape,
                arg.kind === "unknown"
                  ? { kind: "value", form: "argument", name: null }
                  : null,
              )
            }
            break
          }
          case "control":
            report("wiring-outside-hooks", statement.span, {
              shape: "branch",
              where: "wiring",
              conditional: false,
            })
            walk(statement.arms.flat())
            break
          case "assignment":
          case "other":
            report("wiring-outside-hooks", statement.span, {
              shape: "statement",
              where: "wiring",
            })
            break
          case "definition":
            // a local holding tech or an instance is wiring; one holding
            // functions is a table of lambdas, a service without a contract
            if (!statement.inlined && statement.value === "function")
              report("driver-hooks-only", statement.span, {
                shape: "definition",
                name: statement.name,
                at: "local",
              })
            break
        }
      }
    }
    walk(body)
  }

  /**
   * PROVISIONAL (ruled 2026-09-26, revisited by the chapter's
   * `04/05_test-rules` — must not outlive it): the test tech's exemption of the
   * hook count is read as `hook-one-call` whole. Canon's letter exempts the
   * count alone; applied to test bodies, the rest judges a use case's result
   * and leaves a model function's free — a split with no reason in a test.
   */
  const oneCall = !exempts.has("call-count")
  const reportHook = (
    span: Span,
    shape: Shape,
    unknown: DriverViolation["unknown"] = null,
  ): void => {
    if (oneCall) report("hook-one-call", span, shape, unknown)
  }

  /**
   * A hook: one use-case call, unconditional, translating nothing around it.
   * What a branch in the hook holds is the branch's translation, the use case
   * aside; a call the driver may not make is still that rule's.
   */
  const judgeHook = (hook: ReadHook): void => {
    const calls = callsIn(hook.body)
    const useCases = calls.filter((call) => call.callee.kind === "use-case")
    if (useCases.length !== 1)
      reportHook(hook.span, {
        shape: "call-count",
        count: useCases.length,
      })
    // where the use cases' results are written into tech-held state
    const assigned = useCases.flatMap((call) =>
      call.result.flatMap((use) =>
        use.kind === "assigned" && use.target === "tech" ? [use.span] : [],
      ),
    )
    const judgeUseCase = (call: ReadCall): void => {
      for (const arg of call.args) {
        if (isHandable(arg)) continue
        reportHook(
          arg.span,
          {
            shape: "argument",
            callee: call.callee,
            value: arg.kind,
            where: "hook",
          },
          arg.kind === "unknown"
            ? { kind: "value", form: "argument", name: null }
            : null,
        )
      }
      for (const use of call.result) {
        switch (use.kind) {
          case "returned":
          case "discarded":
          // tested by a branch: the branch's
          case "condition":
            continue
          case "argument":
            if (use.to.kind === "tech") continue
            break
          // written into a member: the assignment's, judged as a statement
          case "assigned":
            continue
        }
        reportHook(use.span, { shape: "result", use: use.kind })
      }
    }
    const walk = (
      statements: readonly ReadStatement[],
      inBranch: boolean,
    ): void => {
      for (const statement of statements) {
        switch (statement.kind) {
          case "call": {
            const { call } = statement
            judgeCallee(call, "hook")
            if (call.callee.kind === "use-case") judgeUseCase(call)
            else if (call.callee.kind === "wiring")
              report("sub-driver-wiring", call.span, {
                shape: "call",
                callee: call.callee,
                where: "hook",
              })
            else if (
              call.callee.kind === "tech" &&
              !inBranch &&
              // wiring in the hook: its result feeds what the hook builds
              call.result.every((use) => use.kind === "discarded") &&
              // the tech the use case's result is handed to
              !call.args.some((arg) => useCaseAt(arg.from, calls))
            )
              reportHook(call.span, {
                shape: "call",
                callee: call.callee,
                where: "hook",
              })
            break
          }
          case "control":
            if (!inBranch)
              reportHook(statement.span, {
                shape: "branch",
                where: "hook",
                conditional: callsIn(statement.arms.flat()).some(
                  (call) => call.callee.kind === "use-case",
                ),
              })
            walk(statement.arms.flat(), true)
            break
          case "assignment":
          case "other":
            // the result written whole into tech-held state is handing it on
            if (
              inBranch ||
              (statement.kind === "assignment" &&
                statement.target === "tech" &&
                assigned.some((span) => within(span, statement.span)))
            )
              break
            reportHook(statement.span, {
              shape: "statement",
              where: "hook",
            })
            break
        }
      }
    }
    walk(hook.body, false)
    hook.hooks.forEach(judgeHook)
  }

  reading.hooks.forEach(judgeHook)
  if (node.layer === "test") return violations

  // the only definitions: its hooks and one wiring function
  for (const statement of reading.root)
    if (statement.kind === "definition" && !statement.inlined)
      report("driver-hooks-only", statement.span, {
        shape: "definition",
        name: statement.name,
        at: "root",
      })
  const wiring = wiringFunctionOf(reading.functions)
  for (const fn of reading.functions) {
    if (fn !== wiring) {
      report("driver-hooks-only", fn.span, {
        shape: "definition",
        name: fn.name,
        at: "function",
      })
      continue
    }
    // a root driver's `main()` takes nothing and reads its tech itself; a
    // sub-driver's wiring function — a driver another driver or a test
    // imports — is handed tech and instances
    const isSubDriver = graph.edges.some(
      (edge) =>
        edge.to.type === "module" &&
        edge.to.path === node.path &&
        (graph.modules.get(edge.from)?.layer === "driver" ||
          graph.modules.get(edge.from)?.layer === "test"),
    )
    if (fn.params.length > 0 && !isSubDriver)
      report("driver-hooks-only", fn.span, {
        shape: "parameter",
        name: fn.name,
      })
    judgeWiring(fn.body)
    fn.hooks.forEach(judgeHook)
  }
  return violations
}

export const checkDriver = (graph: ImportGraph): DriverViolation[] =>
  [...graph.modules.values()].flatMap((node) =>
    node.layer === "driver" || node.layer === "test"
      ? judgeDriver(node, graph)
      : [],
  )
