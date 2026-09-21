import { describe, expect, it } from "vitest"

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import { checkModules } from "./modules.model.ts"

/**
 * The corpus (`cases/modules.spec.ts`) is what pins this rule's verdicts; it
 * runs the real chain and judges what a developer would see. This file covers
 * the one branch no case can reach — a module whose file no reader read, so it
 * carries no reading at all. Every outside kind is bound by a stock reader and
 * the coverage extensions are all JavaScript-family, so a covered module with a
 * null reading cannot be built out of a case's tree of strings today.
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
})
