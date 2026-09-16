import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import type {
  CalleeKind,
  FileReading,
  ReadCall,
  ReadStatement,
} from "./graph.model.ts"
import type { ImportTargetKind, ReadInput } from "./reader.model.ts"
import { readModule } from "./reader.model.ts"

const fixture = (name: string): string =>
  fileURLToPath(new URL(`./__fixtures__/reader/${name}`, import.meta.url))

/** Where the fixtures' specifiers land — the graph's word, faked by name. */
const TARGETS: Readonly<Record<string, ImportTargetKind>> = {
  "./thing.service.ts": {
    kind: "module",
    path: "src/thing.service.ts",
    layer: "service",
  },
  "./helper.model.ts": {
    kind: "module",
    path: "src/helper.model.ts",
    layer: "model",
  },
  "./store.adapter.ts": {
    kind: "module",
    path: "src/store.adapter.ts",
    layer: "adapters",
  },
  "./sub.driver.ts": {
    kind: "module",
    path: "src/sub.driver.ts",
    layer: "driver",
  },
  "./x.port.ts": { kind: "module", path: "src/x.port.ts", layer: "ports" },
  "./dyn.assembly.ts": {
    kind: "module",
    path: "src/dyn.assembly.ts",
    layer: "assembly",
  },
  "./req.service.ts": {
    kind: "module",
    path: "src/req.service.ts",
    layer: "service",
  },
  "./side.ts": { kind: "module", path: "src/side.ts", layer: "blob" },
  "some-tech": { kind: "external", package: "some-tech", claim: "tech" },
  "pure-lib": { kind: "external", package: "pure-lib", claim: "model" },
  "unclaimed-lib": {
    kind: "external",
    package: "unclaimed-lib",
    claim: "unclaimed",
  },
  // a resolved file outside coverage: no package name, concrete, the tech's
  "./outside.ts": { kind: "external", package: null, claim: "tech" },
}

const engine = createOxcEngine()

/** Test factory: a fixture read as the given kind with the given tech. */
const read = (
  name: string,
  overrides: Partial<Omit<ReadInput, "program" | "source">> = {},
): FileReading => {
  const extraction = engine.extract(fixture(name))
  if (extraction === null) throw new Error(`no extraction for ${name}`)
  return readModule({
    program: extraction.program,
    source: extraction.source,
    layer: "driver",
    tech: { name: "plain-ts", exempts: [] },
    importTargetOf: (specifier) => TARGETS[specifier] ?? { kind: "unresolved" },
    ...overrides,
  })
}

/** Every call in a body, nested arms included, evaluation order. */
const callsOf = (statements: readonly ReadStatement[]): ReadCall[] =>
  statements.flatMap((statement) =>
    statement.kind === "call"
      ? [statement.call]
      : statement.kind === "control"
        ? statement.arms.flatMap(callsOf)
        : [],
  )

const callAt = (calls: readonly ReadCall[], line: number): ReadCall => {
  const found = calls.find((call) => call.span.line === line)
  if (!found) throw new Error(`no call on line ${line}`)
  return found
}

const controls = (statements: readonly ReadStatement[]) =>
  statements.flatMap((statement) =>
    statement.kind === "control" ? [statement] : [],
  )

describe("readModule — the shapes fixture as a driver", () => {
  const reading = read("shapes.ts")
  const main = reading.functions.find((fn) => fn.name === "main")
  if (!main) throw new Error("main not read")
  const calls = callsOf(main.body)
  const callee = (line: number): CalleeKind => callAt(calls, line).callee

  test("cuts every top-level function definition, exported or not, named or default", () => {
    expect(
      reading.functions.map((fn) => [fn.name, fn.exported, fn.params.length]),
    ).toEqual([
      ["main", true, 3],
      ["decl", true, 1],
      ["arrow", true, 0],
      [null, true, 0],
    ])
    expect(reading.root).toEqual([])
    expect(reading.tech).toBe("plain-ts")
  })

  test("the kinds table — one callee kind per import target, the language, the host", () => {
    expect(callee(20)).toEqual({
      kind: "factory",
      layer: "service",
      path: "src/thing.service.ts",
      name: "createThing",
    })
    expect(callee(22)).toEqual({
      kind: "factory",
      layer: "adapters",
      path: "src/store.adapter.ts",
      name: "createStore",
    })
    expect(callee(31)).toEqual({
      kind: "model",
      path: "src/helper.model.ts",
      name: "helper",
    })
    expect(callee(44)).toEqual({
      kind: "wiring",
      path: "src/sub.driver.ts",
      name: "wire",
    })
    expect(callee(45)).toEqual({
      kind: "forbidden-import",
      layer: "ports",
      path: "src/x.port.ts",
    })
    expect(callee(23)).toEqual({ kind: "tech", package: null })
    expect(callee(46)).toEqual({
      kind: "model",
      path: "pure-lib",
      name: "pureFn",
    })
    expect(callee(40)).toEqual({ kind: "unclaimed", package: "unclaimed-lib" })
    expect(callee(47)).toEqual({ kind: "unknown" })
    // `JSON.stringify`, `new Map()`: the language
    expect(callee(24)).toEqual({ kind: "language" })
    expect(callee(25)).toEqual({ kind: "language" })
    // an unbound tag, `process.on`: the host is the tech
    expect(callee(26)).toEqual({ kind: "tech", package: null })
    expect(callee(56)).toEqual({ kind: "tech", package: null })
    // a prototype method on a tech value: the language
    expect(callee(55)).toEqual({ kind: "language" })
    // a member of a computed value, a call on a literal
    expect(callee(42)).toEqual({ kind: "language" })
    expect(callee(57)).toEqual({ kind: "language" })
  })

  test("a member called on an instance is a use case, with the factory it came from", () => {
    expect(callee(21)).toEqual({
      kind: "use-case",
      member: "run",
      origin: {
        path: "src/thing.service.ts",
        name: "createThing",
        layer: "service",
      },
    })
  })

  test("a call's result called inline, `this`: unknown, listed open", () => {
    expect(
      calls.filter((call) => call.span.line === 58).map((c) => c.callee.kind),
    ).toEqual(["factory", "unknown"])
    expect(callee(59)).toEqual({ kind: "unknown" })
    expect(
      reading.open
        .filter((part) => part.why === "unknown-callee")
        .map((part) => part.span.line),
    ).toEqual([47, 58, 59, 71])
  })

  test("a shadowing local wins over the import — a local definition", () => {
    expect(callee(50)).toEqual({ kind: "local", name: "createThing" })
  })

  test("dynamic import and bound require read as imports of their target", () => {
    expect(callee(35)).toEqual({
      kind: "factory",
      layer: "assembly",
      path: "src/dyn.assembly.ts",
      name: "d",
    })
    expect(callee(37)).toEqual({
      kind: "factory",
      layer: "service",
      path: "src/req.service.ts",
      name: "createReq",
    })
  })

  test("argument kinds: a literal, a record joined to its least allowed entry, the tech, an instance", () => {
    const kinds = (line: number) =>
      callAt(calls, line).args.map((arg) => arg.kind)
    expect(kinds(20)).toEqual(["tech"])
    expect(kinds(23)).toEqual(["literal"])
    expect(kinds(44)).toEqual(["tech", "instance"])
    expect(kinds(56)).toEqual(["literal", "function"])
    // an instance argument carries where it came from
    expect(callAt(calls, 44).args[1]).toEqual({
      kind: "instance",
      origin: {
        path: "src/thing.service.ts",
        name: "createThing",
        layer: "service",
      },
      path: [],
    })
  })

  test("result flow: every context a bound result reaches, in order", () => {
    // `instance`: destructured record entry, `.run` called, `if (instance)`, handed to wiring
    expect(callAt(calls, 20).result).toEqual([
      { kind: "member" },
      { kind: "computed" },
      { kind: "condition" },
      { kind: "argument", to: callee(44) },
    ])
    // `bound`: stringified, `.ok` branched on, returned
    expect(callAt(calls, 21).result).toEqual([
      { kind: "argument", to: { kind: "language" } },
      { kind: "member" },
      { kind: "condition" },
      { kind: "returned" },
    ])
    // an unbound call: its own position
    expect(callAt(calls, 25).result).toEqual([{ kind: "discarded" }])
    expect(callAt(calls, 28).result).toEqual([{ kind: "member" }])
    expect(callAt(calls, 53).result).toEqual([{ kind: "computed" }])
  })

  test("controls: what the test reads off — a parameter, an instance, a computed value", () => {
    expect(
      controls(main.body).map((control) => [
        control.span.line,
        control.testOrigin,
        control.test,
      ]),
    ).toEqual([
      [29, "parameter", "unknown"],
      [30, "instance", "computed"],
      [31, "instance", "instance"],
      [32, "parameter", "unknown"],
      [33, "parameter", "unknown"],
    ])
    // arms hold the arms' calls — the conditional and logical expressions too
    expect(
      controls(main.body)[3]?.arms.map((arm) =>
        callsOf(arm).map((c) => c.callee.kind),
      ),
    ).toEqual([["factory"], ["tech"]])
  })

  test("definitions carry their value kind; a reassigned let is computed", () => {
    const definitions = main.body.flatMap((statement) =>
      statement.kind === "definition"
        ? [[statement.name, statement.form, statement.value]]
        : [],
    )
    expect(definitions).toEqual(
      expect.arrayContaining([
        ["literal", "const", "literal"],
        ["template", "const", "literal"],
        ["holes", "const", "computed"],
        ["instance", "const", "instance"],
        ["parsed", "const", "tech"],
        ["destructured", "const", "instance"],
        ["mutable", "let", "computed"],
        ["createThing", "const", "function"],
      ]),
    )
    // a call on the reassigned binding is a language call, not a use case
    expect(callee(54)).toEqual({ kind: "language" })
  })

  test("the cut: a function handed to a tech callee is a hook; to the language, uncut and open", () => {
    expect(
      main.hooks.map((hook) => [hook.span.line, hook.registeredBy.callee]),
    ).toEqual([[56, { kind: "tech", package: null }]])
    expect(
      reading.open
        .filter((part) => part.why === "uncut-callback")
        .map((part) => part.span.line),
    ).toEqual([57])
  })

  test("parameters are unknown until a call site binds them — listed open, once each", () => {
    expect(main.params).toEqual([
      { name: "param", kind: "unknown" },
      { name: "b", kind: "unknown" },
      { name: "c", kind: "unknown" },
    ])
    expect(
      reading.open.filter((part) => part.why === "unbound-parameter"),
    ).toHaveLength(4)
  })

  test("the return statement carries the returned value's kind", () => {
    expect(main.body.at(-1)).toMatchObject({
      kind: "return",
      value: "computed",
    })
  })

  test("spans carry line and column, 1-based", () => {
    expect(callAt(calls, 20).span).toMatchObject({ line: 20, column: 20 })
  })
})

describe("readModule — the root forms", () => {
  test("an inside kind: root statements only, functions as definitions, no cut", () => {
    const reading = read("root-forms.ts", { layer: "model", tech: null })
    expect(reading.tech).toBeNull()
    expect(reading.functions).toEqual([])
    const shapes = reading.root.map((statement) =>
      statement.kind === "definition"
        ? `${statement.form}:${statement.name}:${statement.value}`
        : statement.kind === "call"
          ? `call:${statement.call.callee.kind}`
          : statement.kind === "control"
            ? `control:${statement.testOrigin}:${statement.arms.length}`
            : statement.kind,
    )
    expect(shapes).toEqual([
      "const:fn:function",
      "function:declared:function",
      "let:counter:computed",
      "other",
      "class:Klass:function",
      "enum:Color:literal",
      "call:language",
      "const:frozen:computed",
      "call:factory",
      "call:tech",
      "control:other:2",
      "control:other:1",
      "control:other:1",
      "call:language",
      "other",
      "default:null:literal",
    ])
  })

  test("a test kind: functions cut, and the hooks registered at root, nested", () => {
    const reading = read("root-forms.ts", {
      layer: "test",
      tech: { name: "test-runner", exempts: ["registration"] },
    })
    expect(reading.exempts).toEqual(["registration"])
    expect(reading.functions.map((fn) => fn.name)).toEqual(["fn", "declared"])
    expect(reading.hooks).toHaveLength(1)
    const [describeHook] = reading.hooks
    expect(describeHook?.registeredBy.callee).toEqual({
      kind: "tech",
      package: null,
    })
    expect(describeHook?.hooks).toHaveLength(1)
    expect(
      callsOf(describeHook?.hooks[0]?.body ?? []).map((c) => c.callee.kind),
    ).toEqual(["factory"])
  })
})

describe("readModule — total over the tree", () => {
  test("tripwire: a node type the reader has never seen is walked for its calls, never a throw", () => {
    const extraction = engine.extract(fixture("root-forms.ts"))
    if (extraction === null) throw new Error("no extraction")
    // wrap the first root call in a synthetic statement carrying a synthetic expression
    const body = extraction.program.body as unknown as Record<string, unknown>[]
    const call = body.find(
      (statement) =>
        statement["type"] === "ExpressionStatement" &&
        (statement["expression"] as { type: string }).type === "CallExpression",
    )
    if (!call) throw new Error("no expression statement in the fixture")
    const synthetic = {
      type: "SomeMadeUpStatement",
      start: call["start"],
      end: call["end"],
      inner: {
        type: "SomeMadeUpExpression",
        start: call["start"],
        end: call["end"],
        wrapped: call["expression"],
        typed: { type: "TSMadeUpType", start: 0, end: 0 },
      },
      block: { ...call },
    }
    body.splice(body.indexOf(call), 1, synthetic)
    const reading = readModule({
      program: extraction.program,
      source: extraction.source,
      layer: "model",
      tech: null,
      importTargetOf: () => ({ kind: "unresolved" }),
    })
    const index = reading.root.findIndex(
      (statement) =>
        statement.kind === "other" && statement.span.start === call["start"],
    )
    expect(index).toBeGreaterThan(-1)
    // the synthetic statement is listed as other, the expression inside it is
    // walked for its call, and the statement inside it is walked as one
    expect(reading.root[index + 1]).toMatchObject({ kind: "call" })
    expect(reading.root[index + 2]).toMatchObject({ kind: "call" })
  })
})

describe("readModule — binding patterns, odd roots, test origins, assignments", () => {
  const reading = read("bindings-and-roots.ts")
  const main = reading.functions.find((fn) => fn.name === "main")
  if (!main) throw new Error("main not read")
  const calls = callsOf(main.body)
  const callee = (line: number): CalleeKind => callAt(calls, line).callee

  test("an instance called bare is a use case named by its binding; a namespace called bare, a parameter, a tech value, a bare let: by their kinds", () => {
    expect(callee(9)).toEqual({
      kind: "use-case",
      member: "inst",
      origin: {
        path: "src/thing.service.ts",
        name: "createThing",
        layer: "service",
      },
    })
    expect(callee(10)).toEqual({ kind: "unknown" })
    expect(callee(11)).toEqual({ kind: "unknown" })
    expect(callee(13)).toEqual({ kind: "tech", package: null })
    expect(callee(18)).toEqual({ kind: "language" })
  })

  test("a binding cycle resolves unknown; a member destructured from a computed value is computed", () => {
    expect(callee(16)).toEqual({ kind: "unknown" })
    expect(callee(20)).toEqual({ kind: "language" })
  })

  test("a computed member is read as `[]`: a use case on an instance keeps its origin", () => {
    expect(callee(22)).toMatchObject({ kind: "use-case", member: "[]" })
    expect(callee(24)).toEqual({
      kind: "factory",
      layer: "assembly",
      path: "src/dyn.assembly.ts",
      name: "d",
    })
    // a member on the imported export is a member of an instance
    expect(callee(25)).toMatchObject({ kind: "use-case", member: "e" })
  })

  test("a shadowed `require` is a local, not an import", () => {
    expect(callee(27)).toEqual({ kind: "local", name: "require" })
    expect(callee(28)).toEqual({ kind: "language" })
  })

  test("a hook registered after its first use is cut once, when its statement is walked", () => {
    expect(main.hooks.map((hook) => hook.span.line)).toEqual([30])
  })

  test("spread arguments are computed", () => {
    expect(callAt(calls, 31).args.map((arg) => arg.kind)).toEqual(["computed"])
  })

  test("test origins through unary, binary, an unbound name, a literal root, a use-case call, and an else arm", () => {
    expect(
      controls(main.body)
        .filter((control) => control.span.line < 57)
        .map((control) => [
          control.span.line,
          control.testOrigin,
          control.arms.length,
        ]),
    ).toEqual([
      [32, "instance", 1],
      [33, "instance", 1],
      [34, "other", 1],
      [35, "other", 1],
      [36, "instance", 1],
      [37, "parameter", 2],
      [49, "other", 1],
      [51, "other", 1],
    ])
  })

  test("values: the literal globals, a language global, a member of a literal, a member of an instance, spreads and holes", () => {
    const definitions = Object.fromEntries(
      main.body.flatMap((statement) =>
        statement.kind === "definition"
          ? [[statement.name, statement.value]]
          : [],
      ),
    )
    expect(definitions).toMatchObject({
      u: "literal",
      j: "computed",
      len: "computed",
      sub: "instance",
      spread: "computed",
      holes: "computed",
      bare: "computed",
    })
    expect(main.body.at(-1)).toMatchObject({
      kind: "return",
      value: "instance",
    })
  })

  test("assignments to members and destructuring targets are statements of their own, never calls", () => {
    const others = main.body
      .filter((statement) => statement.kind === "other")
      .map((statement) => statement.span.line)
    expect(others).toEqual([45, 47, 48, 65, 66, 90])
  })

  test("binding patterns: rest, computed and string keys, a hole, an empty pattern; a tech or a literal destructured keeps its kind", () => {
    const definitions = Object.fromEntries(
      main.body.flatMap((statement) =>
        statement.kind === "definition"
          ? [[statement.name, statement.value]]
          : [],
      ),
    )
    expect(definitions).toMatchObject({
      restObj: "computed",
      comp: "computed",
      strKey: "computed",
      second: "literal",
      t1: "tech",
      lit: "literal",
      js: "computed",
    })
    // the tech destructured, called: still the tech
    expect(callee(61)).toEqual({ kind: "tech", package: null })
  })

  test("bare calls on odd roots: a file outside coverage is the tech; an inline import with no member, a non-literal one, an expression: unknown", () => {
    expect(callee(67)).toEqual({ kind: "tech", package: "./outside.ts" })
    // a prototype method on a tech-held value
    expect(callee(68)).toEqual({ kind: "language" })
    expect(callee(69)).toEqual({ kind: "unknown" })
    expect(callee(70)).toEqual({ kind: "unknown" })
    expect(callee(71)).toEqual({ kind: "unknown" })
    // `require` shadowed by a local: the local's result, not an import
    expect(
      main.body.find(
        (statement) =>
          statement.kind === "definition" && statement.name === "notImport",
      ),
    ).toMatchObject({ value: "computed" })
    // a construction on an instance member is a use case
    expect(callee(73)).toMatchObject({ kind: "use-case", member: "Klass" })
  })

  test("test origins: a bound construction on an instance, a model call's member, a model call, a parameter compared, a loop with no test", () => {
    expect(
      controls(main.body)
        .filter((control) => control.span.line >= 74 && control.span.line < 89)
        .map((control) => [control.span.line, control.testOrigin]),
    ).toEqual([
      [74, "instance"],
      [75, "other"],
      [76, "other"],
      [77, "parameter"],
      [78, "other"],
    ])
  })

  test("a conditional initializer: both arms' calls share the binding's result flow, and a use-case arm makes the test an instance's", () => {
    expect(
      controls(main.body)
        .filter((control) => control.span.line >= 89)
        .map((control) => [control.span.line, control.testOrigin]),
    ).toEqual([
      [89, "other"],
      [93, "parameter"],
      [94, "other"],
      [95, "parameter"],
      [96, "instance"],
    ])
    const arms = calls.filter((call) => call.span.line === 93)
    expect(arms.map((call) => call.callee.kind)).toEqual(["factory", "model"])
    expect(arms[0]?.result).toBe(arms[1]?.result)
    expect(arms[0]?.result).toEqual([{ kind: "condition" }])
  })

  test("root declarations that are not one function each stay root definitions; a function exported by specifier, an anonymous default", () => {
    expect(reading.functions.map((fn) => [fn.name, fn.exported])).toEqual([
      ["main", true],
      ["viaSpecifier", true],
      ["named", true],
    ])
    expect(
      reading.root.map((statement) =>
        statement.kind === "definition" ? statement.name : statement.kind,
      ),
    ).toEqual(["a", "b", "first"])
  })
})
