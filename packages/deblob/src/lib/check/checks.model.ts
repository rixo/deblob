/**
 * The graph checks in one table — every check that judges the import graph
 * alone, `surface` aside (it reads the package's manifest too). One place for
 * the CLI, the corpus and the viewer's snapshot, which each held a copy.
 */

import { checkAssembly } from "./assembly.model.ts"
import { checkBarrels } from "./barrels.model.ts"
import { checkBoot } from "./boot.model.ts"
import { checkDag } from "./dag.model.ts"
import { checkDriver } from "./driver.model.ts"
import { checkLayers } from "./layers.model.ts"
import { checkModules } from "./modules.model.ts"
import { checkPorts } from "./ports.model.ts"
import { checkPrivate } from "./private.model.ts"
import type { Violation } from "./violation.model.ts"
import type { ImportGraph } from "../extraction/graph.model.ts"

/** The graph checks, in the CLI's run order. */
export const GRAPH_CHECKS = [
  "dag",
  "layers",
  "private",
  "barrels",
  "ports",
  "modules",
  "assembly",
  "driver",
  "boot",
] as const

export type GraphCheck = (typeof GRAPH_CHECKS)[number]

/** What the checks read off the resolved config. */
export type CheckOptions = {
  readonly pure: readonly string[]
  readonly typeOnlyExempt: boolean
  readonly mutableModuleState: boolean
}

/** One graph check's violations. */
export const runGraphCheck = (
  name: GraphCheck,
  graph: ImportGraph,
  options: CheckOptions,
): Violation[] => {
  switch (name) {
    case "dag":
      return checkDag(graph)
    case "layers":
      return checkLayers(graph, {
        pure: options.pure,
        typeOnlyExempt: options.typeOnlyExempt,
      })
    case "private":
      return checkPrivate(graph)
    case "barrels":
      return checkBarrels(graph)
    case "ports":
      return checkPorts(graph)
    case "modules":
      return checkModules(graph, {
        mutableModuleState: options.mutableModuleState,
      })
    case "assembly":
      return checkAssembly(graph)
    case "driver":
      return checkDriver(graph)
    case "boot":
      return checkBoot(graph)
  }
}
