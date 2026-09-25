import { describe, expect, it } from "vitest"

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import { checkModules } from "./modules.model.ts"

/**
 * The corpus (`cases/modules.spec.ts`) is what pins this rule's verdicts; it
 * runs the real chain and judges what a developer would see. This file covers
 * the branches no case can reach. A module whose file no reader read, so it
 * carries no reading at all: every outside kind is bound by a stock reader and
 * the coverage extensions are all JavaScript-family, so a covered module with a
 * null reading cannot be built out of a case's tree of strings today. And a
 * root call whose callee the reader cannot place, with the binding storing it:
 * the one such callee at root is an import that did not resolve, and a case
 * refuses a tree that does not resolve.
 */

const NODE_DEFAULTS = {
  layer: "model",
  serviceRoot: null,
  isPrivate: false,
  parsed: true,
  content: [],
  edges: [],
  readings: [],
} as unknown as ModuleNode

const buildGraph = (nodes: readonly ModuleNode[]): ImportGraph =>
  ({
    modules: new Map(nodes.map((node) => [node.path, node])),
  }) as unknown as ImportGraph

describe("checkModules", () => {
  it("says nothing about a module that carries no reading", () => {
    const graph = buildGraph([
      { ...NODE_DEFAULTS, path: "src/unread.driver.ts", reading: null },
    ])
    expect(checkModules(graph)).toEqual([])
  })

  it("answers unknown for a root call whose callee the reader cannot place, and leads no fix with it", () => {
    const span = { start: 16, end: 26, line: 2, column: 16 }
    const graph = buildGraph([
      {
        ...NODE_DEFAULTS,
        path: "src/boot.adapter.ts",
        layer: "adapters",
        reading: {
          tech: null,
          exempts: [],
          root: [
            {
              kind: "call",
              call: {
                span,
                callee: { kind: "unknown" },
                args: [],
                result: [{ kind: "discarded" }],
                load: null,
                registration: false,
                handsRunner: false,
                site: null,
                calleeCall: null,
              },
            },
            // the binding storing it: its verdict is its own, an unknown call
            // is not a red one a fix removes
            {
              kind: "definition",
              name: "HANDLE",
              form: "const",
              exported: false,
              value: "unknown",
              immutability: {
                proof: "unknown",
                condition: {
                  kind: "call-result",
                  callee: null,
                  construct: false,
                },
              },
              storesMachineRead: false,
              storedCall: span,
              inlined: false,
              span: { start: 6, end: 12, line: 2, column: 6 },
            },
          ],
          hooks: [],
          functions: [],
          open: [],
        },
      },
    ])
    expect(checkModules(graph)).toEqual([
      expect.objectContaining({
        line: 2,
        shape: "root-call",
        reaches: null,
        unknown: { kind: "callee" },
      }),
      expect.objectContaining({ shape: "root-binding", cause: null }),
    ])
  })
})
