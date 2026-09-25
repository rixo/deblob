import { join } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { createNodeFs } from "../fs/adapters/node-fs.adapter.ts"
import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import type {
  CalleeKind,
  FileReading,
  ReadCall,
  ReadStatement,
} from "./graph.model.ts"
import type { ImportTargetKind, ReadInput } from "./reading.model.ts"
import { readModule } from "./reading.model.ts"

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

const fs = createNodeFs()
const engine = createOxcEngine({ fs })
const fixtureDir = fixture("")

/**
 * Every reader fixture parsed once, up front, so `read` stays a plain function
 * over a tree the cases share — the reading never writes to it.
 */
const extractions = new Map(
  await Promise.all(
    (await fs.glob(["*.ts"], { cwd: fixtureDir })).map(
      async (name) =>
        [name, await engine.extract(join(fixtureDir, name))] as const,
    ),
  ),
)

/** Test factory: a fixture read as the given kind with the given tech. */
const read = (
  name: string,
  overrides: Partial<Omit<ReadInput, "program" | "source">> = {},
): FileReading => {
  const extraction = extractions.get(name) ?? null
  if (extraction === null || "unparsed" in extraction)
    throw new Error(`no extraction for ${name}`)
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

describe("readModule", () => {
  describe("the shapes fixture as a driver", () => {
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
      expect(callee(40)).toEqual({
        kind: "unclaimed",
        package: "unclaimed-lib",
      })
      expect(callee(47)).toEqual({ kind: "unknown" })
      // `JSON.stringify`, `new Map()`: the language
      expect(callee(24)).toEqual({ kind: "language" })
      expect(callee(25)).toEqual({ kind: "language" })
      // an unbound tag, `process.on`: the host is the tech
      expect(callee(26)).toEqual({ kind: "tech", package: null })
      expect(callee(56)).toEqual({ kind: "tech", package: null })
      // a call on a tech value is the tech's, whatever its name
      // (`process.argv.slice(2)`): the name cannot prove what the value is
      expect(callee(55)).toEqual({ kind: "tech", package: null })
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

    test("a call's result called inline is classified by its value: a factory's result is an instance, so a use case with no member; `this` stays unknown, listed open", () => {
      expect(
        calls.filter((call) => call.span.line === 58).map((c) => c.callee.kind),
      ).toEqual(["factory", "use-case"])
      expect(
        calls.filter((call) => call.span.line === 58)[1]?.callee,
      ).toMatchObject({ kind: "use-case", member: "" })
      expect(callee(59)).toEqual({ kind: "unknown" })
      expect(
        reading.open
          .filter((part) => part.why === "unknown-callee")
          .map((part) => part.span.line),
      ).toEqual([47, 59, 71])
    })

    test("a shadowing local wins over the import — a local definition", () => {
      // no flavor's word given to the reader: nothing is a factory by name
      expect(callee(50)).toEqual({
        kind: "local",
        name: "createThing",
        factory: false,
      })
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

    test("the cut: a function handed to a tech callee is a hook; to the language, read inline where it sits — nothing open", () => {
      expect(
        main.hooks.map((hook) => [hook.span.line, hook.registeredBy.callee]),
      ).toEqual([[56, { kind: "tech", package: null }]])
      expect(callee(57)).toEqual({ kind: "language" })
      expect(reading.open.filter((part) => part.span.line === 57)).toEqual([])
    })

    // The reader's own word, with no `paramKinds`: unknown is for a function no
    // production site binds — nothing calls it, or it is read alone as here.
    // The graph pass reads a called file once per world (one per distinct
    // argument vector), never joining sites to unknown: step 03's open-part
    // checkpoint (history/20260913_driver-layer/03_outside-rules/SPEC.md § The
    // open part, audited, item 1), pinned in extraction.service.spec.ts.
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

  describe("the root forms", () => {
    test("an inside kind: one list of root statements, top-level functions in it as definitions, nothing lifted into `functions`", () => {
      const reading = read("root-forms.ts", { layer: "model", tech: null })
      expect(reading.tech).toBeNull()
      expect(reading.functions).toEqual([])
      // hooks are no concept of an inside kind: the root `describe` callback
      // and the `test` inside it are read inline, their calls root statements
      // where the modules check reads them
      expect(reading.hooks).toEqual([])
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
        "assignment",
        "class:Klass:function",
        "enum:Color:literal",
        "call:language",
        "const:frozen:computed",
        "call:factory",
        "call:factory",
        "call:tech",
        "call:tech",
        "control:other:2",
        "control:other:1",
        "control:other:1",
        "call:language",
        "throw",
        "default:null:literal",
      ])
    })

    test("a test kind: functions cut, and the hooks registered at root, nested", () => {
      const reading = read("root-forms.ts", {
        layer: "test",
        tech: { name: "good-enough-tests", exempts: ["registration"] },
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

  describe("total over the tree", () => {
    test("tripwire: a node type the reader has never seen is walked for its calls, never a throw", async () => {
      const extraction = await engine.extract(fixture("root-forms.ts"))
      if (extraction === null || "unparsed" in extraction)
        throw new Error("no extraction")
      // wrap the first root call in a synthetic statement carrying a synthetic
      // expression — in a list, as a node's children can be
      const body = extraction.program.body as unknown as Record<
        string,
        unknown
      >[]
      const call = body.find(
        (statement) =>
          statement["type"] === "ExpressionStatement" &&
          (statement["expression"] as { type: string }).type ===
            "CallExpression",
      )
      if (!call) throw new Error("no expression statement in the fixture")
      const synthetic = {
        type: "SomeMadeUpStatement",
        start: call["start"],
        end: call["end"],
        inner: [
          {
            type: "SomeMadeUpExpression",
            start: call["start"],
            end: call["end"],
            wrapped: call["expression"],
            typed: { type: "TSMadeUpType", start: 0, end: 0 },
          },
        ],
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
          statement.kind === "unread" &&
          statement.form === "SomeMadeUpStatement" &&
          statement.span.start === call["start"],
      )
      expect(index).toBeGreaterThan(-1)
      // the synthetic statement is listed as unread, the expression inside it
      // is walked for its call, and the statement inside it is walked as one
      const atCall = { kind: "call", call: { span: { start: call["start"] } } }
      expect(reading.root[index + 1]).toMatchObject(atCall)
      expect(reading.root[index + 2]).toMatchObject(atCall)
    })
  })

  describe("binding patterns, odd roots, test origins, assignments", () => {
    const reading = read("bindings-and-roots.ts")
    const main = reading.functions.find((fn) => fn.name === "main")
    if (!main) throw new Error("main not read")
    const calls = callsOf(main.body)
    // the outer call of its line: an `import()` on the way is a call too,
    // emitted first
    const callee = (line: number): CalleeKind =>
      callAt(calls.toReversed(), line).callee

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
      expect(callee(27)).toEqual({
        kind: "local",
        name: "require",
        factory: false,
      })
      expect(callee(28)).toEqual({ kind: "language" })
    })

    test("a hook registered after its first use is cut once, when its statement is walked", () => {
      expect(main.hooks.map((hook) => hook.span.line)).toEqual([30])
    })

    test("spread arguments are computed", () => {
      expect(callAt(calls, 31).args.map((arg) => arg.kind)).toEqual([
        "computed",
      ])
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

    test("assignments to members and destructuring targets are `assignment` statements carrying the target root's kind, never calls; an increment is `other`", () => {
      const assignments = main.body.flatMap((statement) =>
        statement.kind === "assignment"
          ? [[statement.span.line, statement.target]]
          : [],
      )
      // the target root's kind: an instance's member, patterns (computed), a
      // free name (the host's)
      expect(assignments).toEqual([
        [45, "instance"],
        [47, "computed"],
        [48, "computed"],
        [65, "computed"],
        [66, "computed"],
        [90, "tech"],
        // `this`: unknown, the reader's; a language global's member: computed
        [97, "unknown"],
        [98, "computed"],
      ])
      // an increment is `other`
      const others = main.body
        .filter((statement) => statement.kind === "other")
        .map((statement) => statement.span.line)
      expect(others).toEqual([64])
    })

    test("a block-bodied callback read inline: its statements are the enclosing body's, its returns go to the callee it was handed to, never a `return` statement of the function", () => {
      // the callback's branch on its (computed) parameter sits in main's body
      expect(
        controls(main.body).map((control) => [
          control.span.line,
          control.testOrigin,
        ]),
      ).toContainEqual([100, "other"])
      // `return helper()`: the call's result is an argument to the language
      expect(callAt(calls, 101).result).toEqual([
        { kind: "argument", to: { kind: "language" } },
      ])
      // main's own return is the only one
      expect(
        main.body.flatMap((statement) =>
          statement.kind === "return" ? [statement.span.line] : [],
        ),
      ).toEqual([103])
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

    test("bare calls on odd roots: a file outside coverage is the tech; a non-literal import or an expression called is the language; a module namespace called bare stays unknown", () => {
      expect(callee(67)).toEqual({ kind: "tech", package: "./outside.ts" })
      // a call on a tech-held value is the tech's, whatever its name
      expect(callee(68)).toEqual({ kind: "tech", package: null })
      // the promise of a module the reader cannot name: a computed value
      expect(callee(69)).toEqual({ kind: "language" })
      // a namespace is not callable — no export named, nothing to classify
      expect(callee(70)).toEqual({ kind: "unknown" })
      expect(callee(71)).toEqual({ kind: "language" })
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
          .filter(
            (control) => control.span.line >= 74 && control.span.line < 89,
          )
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
        // an inline callback's parameter is no parameter of the function
        [100, "other"],
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

  describe("the flavor's word on export names", () => {
    /** A test-side rule, the stock flavor's shape without the adapter. */
    const isFactory = (name: string) => /^create[A-Z]/.test(name)
    const reading = read("factories.ts", { layer: "assembly", isFactory })
    const main = reading.functions.find((fn) => fn.name === "main")
    if (!main) throw new Error("main not read")
    const calls = callsOf(main.body)
    const callee = (line: number): CalleeKind => callAt(calls, line).callee

    test("a model import the flavor names is a factory of layer model; one it does not name stays model", () => {
      expect(callee(10)).toEqual({
        kind: "factory",
        layer: "model",
        path: "src/helper.model.ts",
        name: "createHelper",
      })
      expect(callee(11)).toEqual({
        kind: "model",
        path: "src/helper.model.ts",
        name: "helper",
      })
      // a member called on the model instance is a use case with that origin
      expect(callee(17)).toEqual({
        kind: "use-case",
        member: "run",
        origin: {
          path: "src/helper.model.ts",
          name: "createHelper",
          layer: "model",
        },
      })
    })

    test("a pure package's export: the same rule, the path is the specifier", () => {
      expect(callee(12)).toEqual({
        kind: "factory",
        layer: "model",
        path: "pure-lib",
        name: "createPureFn",
      })
      expect(callee(13)).toEqual({
        kind: "model",
        path: "pure-lib",
        name: "pureFn",
      })
    })

    test("a local function the flavor names is a local factory, its instance untraced; one it does not name is a plain local", () => {
      expect(callee(14)).toEqual({
        kind: "local",
        name: "createLocalThing",
        factory: true,
      })
      expect(callee(15)).toEqual({
        kind: "local",
        name: "localFn",
        factory: false,
      })
      expect(callee(16)).toEqual({
        kind: "use-case",
        member: "run",
        origin: null,
      })
    })

    test("a root factory call named by the flavor: a root call with a factory callee, its definition an instance", () => {
      expect(
        reading.root.map((statement) =>
          statement.kind === "call"
            ? statement.call.callee.kind
            : statement.kind === "definition"
              ? [statement.name, statement.value]
              : statement.kind,
        ),
      ).toEqual([
        "factory",
        ["ROOT_INSTANCE", "instance"],
        ["LOCALS", "function"],
      ])
    })

    test("without the flavor's word, nothing is a factory by name — step 01's reading", () => {
      const plain = read("factories.ts", { layer: "assembly" })
      const kinds = callsOf(
        plain.functions.find((fn) => fn.name === "main")?.body ?? [],
      ).map((call) => call.callee.kind)
      expect(kinds).toEqual([
        "model",
        "model",
        "model",
        "model",
        "local",
        "local",
        "language",
        "language",
      ])
    })
  })

  describe("tracked locals — a non-exported function only ever called directly is read at its sites, as the site's own code", () => {
    const reading = read("tracked-locals.ts")
    const main = reading.functions.find((fn) => fn.name === "main")
    if (!main) throw new Error("main not read")
    const calls = callsOf(main.body)

    test("the tracked locals are no functions of the file; one passed as a value, or never called, stays one", () => {
      expect(reading.functions.map((fn) => fn.name)).toEqual([
        "passed",
        "dead",
        "main",
      ])
      // a multi-declarator `const` is no candidate: root definitions, as before
      expect(
        reading.root.map((statement) =>
          statement.kind === "definition" ? statement.name : statement.kind,
        ),
      ).toEqual(["one", "two"])
    })

    test("a helper registering a hook: the hook is main's, on the tech the site handed; at another site the same line is a use case on the instance handed, its callback read inline", () => {
      expect(
        main.hooks.map((hook) => [hook.span.line, hook.registeredBy.callee]),
      ).toEqual([
        [6, { kind: "tech", package: null }],
        [37, { kind: "tech", package: null }],
        [37, { kind: "tech", package: null }],
      ])
      const thingRun = {
        kind: "use-case",
        member: "run",
        origin: {
          path: "src/thing.service.ts",
          name: "createThing",
          layer: "service",
        },
      }
      expect(callsOf(main.hooks[0]?.body ?? [])[0]?.callee).toEqual(thingRun)
      // a record handed to a destructuring parameter binds by key: `cli` is
      // the tech, `services` the instance — not the record's joined kind
      expect(callsOf(main.hooks[1]?.body ?? [])[0]?.callee).toEqual(thingRun)
      // a string key binds too; a spread, a computed key and a key no
      // parameter names are evaluated and dropped; `services` unbound is
      // `undefined`, so its `.run()` is the language's
      expect(callsOf(main.hooks[2]?.body ?? [])[0]?.callee).toEqual({
        kind: "language",
      })
      expect(calls.map((call) => call.callee.kind)).toEqual([
        "factory", // createThing()
        "tech", // register(process, thing): process.on — the hook
        "tech", // register(thing, process): process.run in the inline callback
        "use-case", // thing.on
        "local", // twice calling itself
        "language", // [1].map(passed)
        "language", // register(): undefined.run
        "language", // undefined.on
        "use-case", // touch(thing): thing.run, a use case in the wiring zone
        "tech", // setup({ cli: process, services: thing }): process.command
        "tech", // .action — the second hook
        "language", // register(() => 1, ...[thing]): a function's .run
        "language", // a function's .on
        "use-case", // setup(thing): thing.cli.command — a member of the instance
        "use-case", // thing.services.run, in the callback read inline
        "language", // .action on a use case's result
        "tech", // setup({ ...process.env, "cli": process, … }): process.command
        "tech", // .action — the third hook
      ])
    })

    test("the return value is the call's: an instance handed back binds an instance; two returns bind computed; no argument is a literal", () => {
      const definitions = Object.fromEntries(
        main.body.flatMap((statement) =>
          statement.kind === "definition"
            ? [[statement.name, statement.value]]
            : [],
        ),
      )
      expect(definitions).toEqual({
        thing: "instance",
        bound: "instance",
        picked: "computed",
        none: "literal",
      })
      // no `return` statement of main but its own
      expect(
        main.body.flatMap((statement) =>
          statement.kind === "return" ? [statement.span.line] : [],
        ),
      ).toEqual([30])
    })

    test("what the inlined bodies do with an argument is recorded on the caller's binding — the inlined text's flow, never an argument to a second function", () => {
      expect(callAt(calls, 18).result).toEqual([
        { kind: "member" }, // register(process, thing): thing.run in the hook
        { kind: "computed" },
        { kind: "member" }, // register(thing, process): thing.on
        { kind: "computed" },
        { kind: "condition" }, // pick(thing, 1, 2): if (a)
        { kind: "member" }, // touch(thing): thing.run
        { kind: "computed" },
        { kind: "member" }, // setup({ services: thing }): services.run
        { kind: "computed" },
        { kind: "entry" }, // ...[thing]
        { kind: "member" }, // setup(thing): thing.cli.command
        { kind: "computed" },
        { kind: "member" }, // thing.services.run
        { kind: "computed" },
      ])
      expect(
        calls.some((call) =>
          call.result.some(
            (use) => use.kind === "argument" && use.to.kind === "local",
          ),
        ),
      ).toBe(false)
    })

    test("a tracked local calling itself reads the inner call as a local callee; a branch on its parameter is a branch on a parameter; nothing open", () => {
      expect(
        controls(main.body).map((control) => [
          control.span.line,
          control.testOrigin,
        ]),
      ).toEqual([
        [9, "parameter"],
        [13, "parameter"],
      ])
      expect(callAt(calls, 9).callee).toEqual({
        kind: "local",
        name: "twice",
        factory: false,
      })
      expect(reading.open).toEqual([])
    })
  })

  describe("tracked locals — what counts as a reference to the name", () => {
    const reading = read("tracked-locals-refs.ts")
    const main = reading.functions.find((fn) => fn.name === "main")
    if (!main) throw new Error("main not read")

    test("a property name, a key, a label, an import or export name, a function expression's own name and a type are no references: `named` is tracked and read at its one site", () => {
      expect(reading.functions.map((fn) => fn.name)).toEqual([
        "keyed",
        "g",
        "main",
      ])
      // `named()` read inline is a literal — nothing to emit
      expect(callsOf(main.body).map((call) => call.callee)).toEqual([
        { kind: "local", name: "keyed", factory: false },
      ])
      expect(reading.open).toEqual([])
    })

    test("a computed key is a reference: `keyed` is not tracked, its call reads `local`, and a function expression is a function of the file", () => {
      expect(reading.functions.map((fn) => fn.name)).toContain("keyed")
      expect(reading.functions.map((fn) => fn.name)).toContain("g")
    })
  })

  describe("tracked locals — an inlined body reads the scope it was written in", () => {
    const reading = read("tracked-local-scope.ts")
    /**
     * The callee the reader reports, flattened to one line — its `kind` and the
     * fields that identify the target. No interpretation: `local` says a local
     * function binding, not which one or whose scope it is in.
     */
    const reaches = (callee: CalleeKind): string =>
      callee.kind === "factory"
        ? `factory ${callee.path}`
        : callee.kind === "tech"
          ? `tech ${callee.package ?? "host"}`
          : callee.kind === "local"
            ? `local ${callee.name}`
            : callee.kind === "use-case"
              ? `use-case ${callee.member} of ${callee.origin?.name ?? "(no origin)"}`
              : callee.kind
    const bodyOf = (name: string): readonly ReadStatement[] => {
      const fn = reading.functions.find((read) => read.name === name)
      if (!fn) throw new Error(`${name} not read`)
      return fn.body
    }
    const readsIn = (name: string): string[] =>
      callsOf(bodyOf(name)).map((call) => reaches(call.callee))
    /** Every statement of the body, the arms of its branches included. */
    const deep = (
      statements: readonly ReadStatement[],
    ): readonly ReadStatement[] =>
      statements.flatMap((statement) =>
        statement.kind === "control"
          ? [statement, ...deep(statement.arms.flat())]
          : [statement],
      )
    /** What each branch tests, and where that value came from. */
    const branchesIn = (name: string): string[] =>
      controls(deep(bodyOf(name))).map(
        (branch) => `${branch.test} / ${branch.testOrigin}`,
      )
    /** The value kind of what each assignment writes to. */
    const writesIn = (name: string): string[] =>
      deep(bodyOf(name)).flatMap((statement) =>
        statement.kind === "assignment" ? [statement.target] : [],
      )

    const SITES = [
      "plainSite",
      "shadowedByLocals",
      "shadowedByParams",
      "shadowedDeep",
    ]

    test('`helper` is no function of the file: it is read at its sites, so only the four sites are functions — `readsIn("helper")` has nothing to find', () => {
      expect(reading.functions.map((fn) => fn.name)).toEqual([
        "plainSite",
        "shadowedByLocals",
        "shadowedByParams",
        "shadowedDeep",
      ])
      expect(() => readsIn("helper")).toThrow()
    })

    /**
     * What `helper`'s own lines read as, wherever it is inlined. They land in a
     * site's call list in place of the `helper()` call, which is why each
     * expectation below carries more entries than the site has written calls.
     *
     * Established by the control site, which rebinds nothing — so these are
     * helper's reading of its own text, not an artefact of a shadowing site,
     * and every shadowed site is compared against a known value.
     */
    const HELPERS_LINES = [
      "factory src/thing.service.ts", // createThing()
      "tech some-tech", // work()
      "tech host", // process.exit()
      "tech host", // siteOnly(): helper's scope binds it nowhere
      "factory src/thing.service.ts", // const thing = createThing()
      "use-case run of createThing", // thing.run()
      "use-case run of createThing", // if (mode) thing.run()
    ]

    test("the control: at a site that rebinds nothing, helper's lines are all there is to read", () => {
      expect(readsIn("plainSite")).toEqual(HELPERS_LINES)
    })

    test("a use case's origin is the instance built in the body, never a binding of the same name at the site", () => {
      // the site's `thing` is an object literal and carries no origin, so an
      // origin read at the site would be `(no origin)`, not this factory
      expect(
        SITES.map((site) => readsIn(site).filter((r) => r.includes("of"))),
      ).toEqual(
        SITES.map(() => [
          "use-case run of createThing",
          "use-case run of createThing",
        ]),
      )
    })

    test("a branch tests the module's value, not the literal the site binds to that name", () => {
      // `mode` is `process.env.MODE` where helper is written and a plain `0`
      // at every site: reading the site's would give `literal / other`
      expect(SITES.map(branchesIn)).toEqual([
        ["tech / other"],
        ["tech / other"],
        ["tech / other"],
        // `shadowedDeep` branches on its own `createThing` first — its local
        // function, read in its own scope — then helper's branch inside it
        ["function / other", "tech / other"],
      ])
    })

    test("an assignment writes to the module's reassignable binding, not to the literal the site binds to that name", () => {
      // `tally` is a root `let` where helper is written, a `const` string at
      // every site: reading the site's would give `literal`
      expect(SITES.map(writesIn)).toEqual(SITES.map(() => ["computed"]))
    })

    test("the same four names read as the import, the package and the host inside the inlined body, and as the site's own bindings on the site's own lines", () => {
      expect(readsIn("shadowedByLocals")).toEqual([
        // helper()        — the call itself is gone, its body read here
        ...HELPERS_LINES,
        // createThing()   — the site's `const`, not the import
        "local createThing",
        // work()          — the site's `const`, not some-tech
        "local work",
        // process.exit()  — a member on a local object, no tech value
        "language",
        // siteOnly()      — the site's `const`, in reach here and nowhere else
        "local siteOnly",
      ])
    })

    test("parameters rebind exactly as locals do: the body is unmoved, the site's own lines read the parameters", () => {
      expect(readsIn("shadowedByParams")).toEqual([
        // helper()
        ...HELPERS_LINES,
        // the site's own four lines: unbound parameters, so open — and in no
        // case the import, the package or the host that helper's lines read
        "unknown",
        "unknown",
        "unknown",
        "unknown",
      ])
    })

    test("the site's depth does not matter: rebindings spread over a function, a block and a callback capture nothing", () => {
      expect(readsIn("shadowedDeep")).toEqual([
        // helper(), from inside the innermost callback
        ...HELPERS_LINES,
        // the site's own four lines, reading the three nested rebindings
        "local createThing",
        "local work",
        "language",
        "local siteOnly",
        // `[1].forEach(…)` itself, emitted after the callback it was handed
        "language",
      ])
    })
  })

  describe("readonly, the syntactic fact on root definitions", () => {
    const reading = read("readonly-forms.ts", { layer: "model", tech: null })
    const byName = new Map(
      reading.root.flatMap((statement) =>
        statement.kind === "definition"
          ? [
              [
                statement.name ?? "default",
                statement.immutability.proof === "readonly",
              ] as const,
            ]
          : [],
      ),
    )
    const readonlyOf = (...names: string[]) =>
      names.map((name) => [name, byName.get(name)])
    const all = (names: string[], expected: boolean) =>
      names.map((name) => [name, expected])

    test("code is readonly: a function, class or enum declaration", () => {
      const names = ["fnDecl", "ClassDecl", "EnumDecl"]
      expect(readonlyOf(...names)).toEqual(all(names, true))
    })

    test("a const whose initializer's form is immutable: primitives and their operators, functions, `as const`, `Object.freeze`, an assertion to a readonly type, through TS wrappers", () => {
      const names = [
        "primitive",
        "str",
        "bigint",
        "regex",
        "template",
        "unary",
        "binary",
        "logical",
        "conditional",
        "undef",
        "nul",
        "arrow",
        "classExpr",
        "asConst",
        "angleConst",
        "frozen",
        "asReadonly",
        "satisfiesPrimitive",
        "parenthesized",
      ]
      expect(readonlyOf(...names)).toEqual(all(names, true))
    })

    test("a const whose annotation is readonly at its top: `Readonly*`, `readonly T[]`, a primitive keyword, a literal type, unions and parentheses of those", () => {
      const names = [
        "annotatedReadonly",
        "annotatedArray",
        "annotatedMap",
        "annotatedSet",
        "annotatedString",
        "annotatedLiteral",
        "annotatedUnion",
        "annotatedParens",
      ]
      expect(readonlyOf(...names)).toEqual(all(names, true))
    })

    test("a destructured const reads the whole declarator's form", () => {
      expect(readonlyOf("d1", "d2", "d3")).toEqual([
        ["d1", true],
        ["d2", true],
        ["d3", false],
      ])
    })

    test("not readonly: let and var, a record, array, `new`, call or member initializer, a mutable assertion, an alias annotation, a mixed union, an awaited value, a default-exported record", () => {
      const names = [
        "letBinding",
        "varBinding",
        "record",
        "array",
        "map",
        "call",
        "member",
        "asMutable",
        "annotatedAlias",
        "annotatedMixedUnion",
        "logicalBindings",
        "awaited",
        "default",
      ]
      expect(readonlyOf(...names)).toEqual(all(names, false))
    })

    test("the census is total over the fixture: every root definition has the fact", () => {
      expect(byName.size).toBe(47)
      // `REFS` closes with `as const` — readonly, and the fixture's own guard
      expect(byName.get("REFS")).toBe(true)
    })
  })
})
