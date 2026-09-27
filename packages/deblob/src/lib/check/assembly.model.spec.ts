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
 * case refuse its tree — no tree reaches one. And a call the import rules
 * judge, its result handed on: a tree reaches it only through an import already
 * red under another check (a boot, a test file, a port's runtime export), so no
 * row carries it; since the lens step it is the one green call whose result is
 * computed.
 */

const SPAN = { start: 40, end: 50, line: 3, column: 8 } as const

const NODE_DEFAULTS = {
  path: "src/notes.assembly.ts",
  layer: "assembly",
  serviceRoot: null,
  isPrivate: false,
  parsed: true,
  runtimeContent: [],
  readings: [],
} as unknown as ModuleNode

const READING: FileReading = {
  tech: null,
  exempts: [],
  root: [],
  hooks: [],
  functions: [],
  open: [],
}

const graphOf = (reading: FileReading | null): ImportGraph =>
  ({
    modules: new Map([[NODE_DEFAULTS.path, { ...NODE_DEFAULTS, reading }]]),
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
          handsRunner: false,
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

  it("leaves a forbidden import's call, its result handed on, to the import rules", () => {
    const FROM_BOOT = { start: 60, end: 70, line: 3, column: 30 } as const
    const reading = assemblyFunction([
      {
        kind: "call",
        call: {
          span: FROM_BOOT,
          callee: {
            kind: "forbidden-import",
            layer: "boot",
            path: "src/cli.boot.ts",
          },
          args: [],
          result: [
            {
              kind: "argument",
              to: {
                kind: "factory",
                layer: "adapters",
                path: "src/notes/adapters/fs-store.adapter.ts",
                name: "createFsStore",
              },
              span: FROM_BOOT,
            },
          ],
          load: null,
          registration: false,
          handsRunner: false,
          site: null,
          calleeCall: null,
        },
      },
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
              kind: "computed",
              origin: null,
              path: [],
              entries: null,
              from: FROM_BOOT,
              received: false,
              host: false,
              span: FROM_BOOT,
            },
          ],
          result: [{ kind: "returned", span: SPAN }],
          load: null,
          registration: false,
          handsRunner: false,
          site: null,
          calleeCall: null,
        },
      },
    ])
    expect(checkAssembly(graphOf(reading))).toEqual([])
  })
})
