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
 * Reads a driver's reading. A test file takes one of these rules, the one that
 * asks for a reader (`driver-reader`): a test is not a driver, it builds what
 * it checks and fires it. Two facts are two violations: nothing here rides
 * another. Pure: classified graph in, violation set out.
 */

import type {
  ArgValue,
  CalleeKind,
  FileReading,
  ImportGraph,
  ModuleNode,
  ReadCall,
  ReadFunction,
  ReadHook,
  ReadStatement,
  Span,
} from "../extraction/graph.model.ts"
import { mergeCallers } from "./callers.model.ts"
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

/**
 * The callees a driver may call anywhere: a use case, an assembly's factory, a
 * sub-driver's wiring, its own tech. An import the layer rules forbid is not
 * one: its call is a fact beside the import's.
 */
const isDriversCall = (callee: CalleeKind): boolean =>
  callee.kind === "use-case" ||
  callee.kind === "wiring" ||
  callee.kind === "tech" ||
  (callee.kind === "factory" && callee.layer === "assembly")

/** A value a driver may hand on: a tech value, an instance, a literal. */
const isHandable = (value: ArgValue): boolean =>
  value.kind === "tech" || value.kind === "instance" || value.kind === "literal"

/**
 * A value a hook may hand its use case: the event as received, the host whole,
 * an instance, a literal — nothing read off a tech value (`opts.files`,
 * `process.env`), no tech call's result (`process.cwd()`).
 */
const isHandableInHook = (value: ArgValue): boolean =>
  value.kind === "tech"
    ? value.path.length === 0 && value.from === null
    : isHandable(value)

/** Every call a reading makes: at root, in its functions, in every hook. */
const readingCalls = (reading: FileReading): ReadCall[] => {
  const ofHooks = (hooks: readonly ReadHook[]): ReadCall[] =>
    hooks.flatMap((hook) => [...callsIn(hook.body), ...ofHooks(hook.hooks)])
  return [
    ...callsIn(reading.root),
    ...ofHooks(reading.hooks),
    ...reading.functions.flatMap((fn) => [
      ...callsIn(fn.body),
      ...ofHooks(fn.hooks),
    ]),
  ]
}

/**
 * The wiring function: the one its importers call — the boot's `main()`, a
 * parent driver's `registerCheckCommands(…)`, read as wiring calls; for a
 * driver nothing calls, the first exported one that registers hooks, then the
 * first exported. Every other function is a definition beside it, its hooks
 * judged all the same: no export order hides a hook.
 */
const wiringFunctionOf = (
  node: ModuleNode,
  functions: readonly ReadFunction[],
  graph: ImportGraph,
): ReadFunction | undefined => {
  const called = new Set<string>()
  for (const edge of graph.edges) {
    if (edge.to.type !== "module" || edge.to.path !== node.path) continue
    // an importer is read: an unparsed file carries no edges
    const importer = graph.modules.get(edge.from)?.reading as FileReading
    for (const call of readingCalls(importer))
      if (call.callee.kind === "wiring" && call.callee.path === node.path)
        called.add(call.callee.name)
  }
  return (
    functions.find((fn) => fn.exported && called.has(fn.name ?? "default")) ??
    functions.find((fn) => fn.exported && fn.hooks.length > 0) ??
    functions.find((fn) => fn.exported)
  )
}

const judgeDriver = (
  node: ModuleNode,
  graph: ImportGraph,
): DriverViolation[] => {
  const reading = node.reading
  if (reading === null) {
    // a driver or test file no reader reads: its premises do not cover it —
    // red, its way out a binding (04/07 ruling 8, 14); one a reader counts as
    // blob on purpose, or one the engine could not parse, is not this rule's
    if (!node.parsed || node.asBlob === true) return []
    return [
      {
        check: "driver",
        ruleset: "arch",
        rules: ["driver-reader"],
        file: node.path,
        serviceRoot: node.serviceRoot,
        line: null,
        unknown: null,
        subject: { line: 1, column: 1, start: 0, end: 0 },
        cause: null,
        shape: "unread",
        kind: node.layer === "test" ? "test" : "driver",
      },
    ]
  }
  // a test is not a driver: read, it takes no other rule of these
  if (node.layer === "test") return []
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
    })
  }

  /** A callee no driver calls: the services-only rule. */
  const judgeCallee = (call: ReadCall, where: "wiring" | "hook"): void => {
    if (isDriversCall(call.callee)) return
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
              // a function handed to the tech is a hook — and to what nobody
              // claims, cut the same (GUESS: D8): the call's red says it once
              if (
                arg.kind === "function" &&
                (call.callee.kind === "tech" ||
                  call.callee.kind === "unclaimed")
              )
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

  const reportHook = (
    span: Span,
    shape: Shape,
    unknown: DriverViolation["unknown"] = null,
  ): void => {
    report("hook-one-call", span, shape, unknown)
  }

  /**
   * A hook: one use-case call, unconditional, handed the event as received, its
   * value returned at most, and nothing else. What a branch in the hook holds
   * is the branch's translation, the use case aside; a call the driver may not
   * make is still that rule's.
   */
  const judgeHook = (hook: ReadHook): void => {
    const calls = callsIn(hook.body)
    const useCases = calls.filter((call) => call.callee.kind === "use-case")
    if (useCases.length !== 1)
      reportHook(hook.span, {
        shape: "call-count",
        count: useCases.length,
      })
    const judgeUseCase = (call: ReadCall): void => {
      for (const arg of call.args) {
        if (isHandableInHook(arg)) continue
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
            // the tech's or an assembly's: a call the driver makes in its
            // wiring, not in a hook
            else if (
              !inBranch &&
              (call.callee.kind === "tech" ||
                (call.callee.kind === "factory" &&
                  call.callee.layer === "assembly"))
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
            if (inBranch) break
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

  // a sub-driver is imported only to call its wiring function: a name of it
  // used as a value — handed as a hook, stored, read off — is red where used
  for (const used of reading.driverValues)
    report("sub-driver-wiring", used.span, { shape: "value", name: used.name })

  // the only definitions: its hooks and one wiring function
  for (const statement of reading.root)
    if (statement.kind === "definition" && !statement.inlined)
      report("driver-hooks-only", statement.span, {
        shape: "definition",
        name: statement.name,
        at: "root",
      })
  const wiring = wiringFunctionOf(node, reading.functions, graph)
  for (const fn of reading.functions) {
    if (fn !== wiring) {
      report("driver-hooks-only", fn.span, {
        shape: "definition",
        name: fn.name,
        at: "function",
      })
      fn.hooks.forEach(judgeHook)
      continue
    }
    // a root driver's `main()` takes nothing and reads its tech itself; a
    // sub-driver's wiring function — a driver another driver or a test
    // imports, at runtime: a type calls nothing — is handed tech and instances
    const isSubDriver = graph.edges.some(
      (edge) =>
        edge.kind !== "type" &&
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
    // judged once per caller: a function bound at several sites is read as
    // each hands it, and a red not every caller gets names the one it holds
    // for; one nothing binds is read once
    const name = fn.name ?? "default"
    const worlds = node.readings.filter(({ world }) => world.name === name)
    if (worlds.length === 0) {
      judgeWiring(fn.body)
      fn.hooks.forEach(judgeHook)
      continue
    }
    const found = worlds.map(({ world, reading: bound }) => {
      const from = violations.length
      // the same file read again: the function is there by name
      const boundFn = bound.functions.find(
        (candidate) => (candidate.name ?? "default") === name,
      ) as ReadFunction
      judgeWiring(boundFn.body)
      boundFn.hooks.forEach(judgeHook)
      return { world, violations: violations.splice(from) }
    })
    violations.push(...mergeCallers(found))
  }
  return violations
}

export const checkDriver = (graph: ImportGraph): DriverViolation[] =>
  [...graph.modules.values()].flatMap((node) =>
    node.layer === "driver" || node.layer === "test"
      ? judgeDriver(node, graph)
      : [],
  )
