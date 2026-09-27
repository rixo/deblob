import { describe, expect, it } from "vitest"

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import { checkBoot } from "./boot.model.ts"

/**
 * The corpus (`cases/boot.spec.ts`) is what pins this rule's verdicts; this
 * file covers the branch no case can reach: a boot no reader read — every
 * outside kind is bound by a stock reader, so a covered boot with a null
 * reading cannot be built out of a case's tree of strings.
 */

describe("checkBoot", () => {
  it("says nothing about a boot that carries no reading", () => {
    const node = {
      path: "src/cli.boot.ts",
      layer: "boot",
      serviceRoot: null,
      isPrivate: false,
      parsed: true,
      runtimeContent: [],
      reading: null,
      readings: [],
    } as unknown as ModuleNode
    const graph = {
      modules: new Map([[node.path, node]]),
      edges: [],
    } as unknown as ImportGraph
    expect(checkBoot(graph)).toEqual([])
  })
})
