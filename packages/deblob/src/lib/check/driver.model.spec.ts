import { describe, expect, it } from "vitest"

import type {
  ArgValue,
  FileReading,
  ImportGraph,
  ModuleNode,
  ReadCall,
} from "../extraction/graph.model.ts"
import { checkDriver } from "./driver.model.ts"

/**
 * The corpus (`cases/driver.spec.ts`) is what pins these rules' verdicts; this
 * file covers the branches no case can reach. A driver no reader read: every
 * outside kind is bound by a stock reader, so a covered driver with a null
 * reading cannot be built out of a case's tree of strings. And an argument the
 * reader cannot tell, in the wiring or to a hook's use case: a parameter no
 * site binds is received, an import that did not land makes a case refuse its
 * tree — no tree reaches one.
 */

const SPAN = { start: 40, end: 50, line: 3, column: 8 } as const

const NODE_PATH = "src/cli.driver.ts"

const nodeDefaults = (): ModuleNode =>
  ({
    path: NODE_PATH,
    layer: "driver",
    serviceRoot: null,
    isPrivate: false,
    parsed: true,
    runtimeContent: [],
    readings: [],
  }) as unknown as ModuleNode

const graphOf = (reading: FileReading | null): ImportGraph =>
  ({
    modules: new Map([[NODE_PATH, { ...nodeDefaults(), reading }]]),
    edges: [],
  }) as unknown as ImportGraph

const UNKNOWN_ARG: ArgValue = {
  kind: "unknown",
  origin: null,
  path: [],
  entries: null,
  from: null,
  received: false,
  host: false,
  span: SPAN,
} as const

const callOf = (callee: ReadCall["callee"]): ReadCall => ({
  span: SPAN,
  callee,
  args: [UNKNOWN_ARG],
  result: [{ kind: "returned", span: SPAN }],
  load: null,
  registration: false,
  handsRunner: false,
  site: null,
  calleeCall: null,
})

/** `main` whose body is `wiring`, with one hook whose body is `hooked`. */
const mainWith = (wiring: ReadCall, hooked: ReadCall): FileReading => ({
  tech: "plain-ts",
  root: [],
  hooks: [],
  functions: [
    {
      name: "main",
      exported: true,
      span: SPAN,
      params: [],
      body: [{ kind: "call", call: wiring }],
      hooks: [
        {
          span: SPAN,
          role: null,
          body: [{ kind: "call", call: hooked }],
          hooks: [],
        },
      ],
    },
  ],
  open: [],
  driverValues: [],
})

describe("checkDriver", () => {
  it("reds a parsed driver no reader reads, under driver-reader — about the file, no line", () => {
    expect(checkDriver(graphOf(null))).toEqual([
      expect.objectContaining({
        rules: ["driver-reader"],
        shape: "unread",
        kind: "driver",
        line: null,
      }),
    ])
  })

  it("answers unknown for an argument the reader cannot tell, in the wiring and to a hook's use case", () => {
    const reading = mainWith(
      callOf({ kind: "tech", package: "cac" }),
      callOf({ kind: "use-case", member: "cli.check", origin: null }),
    )
    const unknown = { kind: "value", form: "argument", name: null }
    expect(checkDriver(graphOf(reading))).toEqual([
      expect.objectContaining({
        rules: ["wiring-outside-hooks"],
        shape: "argument",
        unknown,
      }),
      expect.objectContaining({
        rules: ["hook-one-call"],
        shape: "argument",
        unknown,
      }),
    ])
  })

  it("judges a wiring function once per caller: a red one caller gets names its call site, a red every caller gets names none and is reported once", () => {
    const tech = { ...callOf({ kind: "tech", package: "cac" }), args: [] }
    const useCase = {
      ...callOf({ kind: "use-case", member: "cli.check", origin: null }),
      args: [],
    }
    const siteOf = (line: number) => ({
      name: "main",
      site: { path: "src/root.driver.ts", span: { ...SPAN, line } },
      args: [],
    })
    const graphOfWorlds = (readings: readonly FileReading[]): ImportGraph =>
      ({
        modules: new Map([
          [
            NODE_PATH,
            {
              ...nodeDefaults(),
              reading: readings[0],
              readings: readings.map((reading, index) => ({
                world: siteOf(7 + index),
                reading,
              })),
            },
          ],
        ]),
        edges: [],
      }) as unknown as ImportGraph
    const clean = mainWith(tech, useCase)
    const red = mainWith(useCase, useCase)

    const one = checkDriver(graphOfWorlds([clean, red]))
    expect(one).toEqual([
      expect.objectContaining({
        rules: ["wiring-outside-hooks"],
        calledFrom: { file: "src/root.driver.ts", line: 8 },
      }),
    ])

    const every = checkDriver(graphOfWorlds([red, red]))
    expect(every).toHaveLength(1)
    expect(every[0]).not.toHaveProperty("calledFrom")
  })
})
