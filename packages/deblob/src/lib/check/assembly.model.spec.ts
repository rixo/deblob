import { describe, expect, it } from "vitest"

import type {
  FileReading,
  ImportGraph,
  ModuleNode,
  ReadStatement,
} from "../extraction/graph.model.ts"
import { checkAssembly } from "./assembly.model.ts"

/**
 * The corpus (`cases/assembly.spec.ts`) is what pins this rule's verdicts; it
 * runs the real chain and judges what a developer would see. This file covers
 * the branches no case can reach. An assembly no reader read: every outside
 * kind is bound by a stock reader, so a covered assembly with a null reading
 * cannot be built out of a case's tree of strings today. A local of a callback
 * run at an assembly's root: the call running it is the root's red, its locals
 * each run's. And an argument the reader cannot tell that no call handed back:
 * a parameter no site binds is received, an import that did not land makes a
 * case refuse its tree — no tree reaches one. And a computed argument out of a
 * green call: the reader hands a factory's result on as an instance and a
 * declared load's as a tech value, never computed — no tree reaches it since a
 * forbidden import's call went red (the sweep step).
 */

const SPAN = { start: 40, end: 50, line: 3, column: 8 } as const

const NODE_PATH = "src/notes.assembly.ts"

const nodeDefaults = (): ModuleNode =>
  ({
    path: NODE_PATH,
    layer: "assembly",
    serviceRoot: null,
    isPrivate: false,
    parsed: true,
    runtimeContent: [],
    readings: [],
  }) as unknown as ModuleNode

const READING: FileReading = {
  tech: null,
  root: [],
  hooks: [],
  functions: [],
  open: [],
  driverValues: [],
} as const

const graphOf = (reading: FileReading | null): ImportGraph =>
  ({
    modules: new Map([[NODE_PATH, { ...nodeDefaults(), reading }]]),
  }) as unknown as ImportGraph

const assemblyFunction = (body: readonly ReadStatement[]) => ({
  ...READING,
  functions: [
    {
      name: "createNotesAssembly",
      exported: true,
      span: SPAN,
      params: [],
      body,
      hooks: [],
    },
  ],
})

describe("checkAssembly", () => {
  it("says nothing about an assembly that carries no reading", () => {
    expect(checkAssembly(graphOf(null))).toEqual([])
  })

  it("leaves a root callback's local to the root call that runs it", () => {
    const reading: FileReading = {
      ...READING,
      root: [
        {
          kind: "definition",
          name: "port",
          form: "const",
          exported: false,
          value: "literal",
          immutability: { proof: "readonly" },
          storesMachineRead: false,
          storedCall: null,
          inlined: true,
          span: SPAN,
        },
      ],
    }
    expect(checkAssembly(graphOf(reading))).toEqual([])
  })

  it("answers unknown for an argument the reader cannot tell, handed back by no call", () => {
    const reading = assemblyFunction([
      {
        kind: "call",
        call: {
          span: SPAN,
          callee: {
            kind: "factory",
            layer: "adapters",
            path: "src/notes/adapters/fs-store.adapter.ts",
            name: "createFsStore",
          },
          args: [
            {
              kind: "unknown",
              origin: null,
              path: [],
              entries: null,
              from: null,
              received: false,
              host: false,
              span: SPAN,
            },
          ],
          result: [{ kind: "returned", span: SPAN }],
          load: null,
          registration: false,
          declares: false,
          site: null,
          calleeCall: null,
        },
      },
    ])
    expect(checkAssembly(graphOf(reading))).toEqual([
      expect.objectContaining({
        shape: "argument",
        value: "unknown",
        unknown: { kind: "value", form: "argument", name: null },
        cause: null,
      }),
    ])
  })

  it("leaves a computed argument out of a green call to that call", () => {
    const BUILT = { start: 60, end: 70, line: 3, column: 30 } as const
    const call = (
      span: typeof SPAN | typeof BUILT,
      name: string,
      args: readonly unknown[],
      result: readonly unknown[],
    ) => ({
      kind: "call",
      call: {
        span,
        callee: {
          kind: "factory",
          layer: "adapters",
          path: "src/notes/adapters/fs-store.adapter.ts",
          name,
        },
        args,
        result,
        load: null,
        registration: false,
        declares: false,
        site: null,
        calleeCall: null,
      },
    })
    const reading = assemblyFunction([
      call(BUILT, "createFsStore", [], [{ kind: "argument", span: BUILT }]),
      call(
        SPAN,
        "createCachedStore",
        [
          {
            kind: "computed",
            origin: null,
            path: [],
            entries: null,
            from: BUILT,
            received: false,
            host: false,
            span: BUILT,
          },
        ],
        [{ kind: "returned", span: SPAN }],
      ),
    ] as unknown as ReadStatement[])
    expect(checkAssembly(graphOf(reading))).toEqual([])
  })
})
