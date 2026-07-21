/**
 * `check barrels` — rule 2, layer visibility in the import path. Two shapes: an
 * index re-exporting layered files fires at the index (`barrel-file`), a
 * labeled layer importing through an index fires at the importer
 * (`index-import`). Kind- and form-blind (rule 8 exempts composition rules
 * only). Pure: classified graph in, violation set out — no IO, no formatting,
 * no ordering.
 */

import type {
  ImportGraph,
  Layer,
  ModuleNode,
} from "../extraction/graph.model.ts"
import type { BarrelsViolation } from "./violation.model.ts"

/**
 * Basename `index` + the parseable extension set — the files a directory import
 * resolves to. `index.model.ts` is not an index: the resolver never lands on
 * it, and its layer is visible. Duplicates the engine's extension list rather
 * than importing it — a model may not reach into adapters.
 */
const INDEX_BASENAME = /^index\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

const isIndex = (path: string): boolean => {
  const slash = path.lastIndexOf("/")
  return INDEX_BASENAME.test(slash === -1 ? path : path.slice(slash + 1))
}

/** The layers whose visibility rule 2 protects — closed union. */
const LAYERED: ReadonlySet<Layer> = new Set([
  "model",
  "ports",
  "service",
  "adapters",
])

const moduleOf = (graph: ImportGraph, path: string): ModuleNode => {
  const node = graph.modules.get(path)
  if (!node) {
    throw new Error(
      `extraction broke its contract: edge references ${path}, absent from the graph`,
    )
  }
  return node
}

export type CheckBarrelsOptions = {
  /**
   * Brownfield opt-out: `true` silences `barrel-file` — canon's letter prices
   * blob re-export by the blob metric rather than banning it; `index-import`
   * still fires, claimants stay bound. Default `false`: a fresh barrel over
   * already-extracted layers is almost certainly a mistake.
   */
  tolerateBlobReexport?: boolean
}

export const checkBarrels = (
  graph: ImportGraph,
  options: CheckBarrelsOptions = {},
): BarrelsViolation[] => {
  const tolerateBlobReexport = options.tolerateBlobReexport ?? false
  const violations: BarrelsViolation[] = []

  for (const edge of graph.edges) {
    // an external target is the package's API, not path indirection
    if (edge.to.type !== "module") continue

    const importer = moduleOf(graph, edge.from)
    const target = moduleOf(graph, edge.to.path)

    // barrel-file: an index re-exporting a layered file erases its layer from
    // every consumer's path; an assembly-classified index is the packaging
    // boundary, deliberate by designation
    if (
      !tolerateBlobReexport &&
      edge.reExport &&
      isIndex(importer.path) &&
      importer.layer !== "assembly" &&
      LAYERED.has(target.layer)
    ) {
      violations.push({
        check: "barrels",
        ruleset: "arch",
        rules: [2],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        target: edge.to,
        shape: "barrel-file",
      })
    }

    // index-import: a labeled layer reaching through an index hides the layer
    // it binds to; blob and assembly claim nothing and stay exempt
    if (LAYERED.has(importer.layer) && isIndex(target.path)) {
      violations.push({
        check: "barrels",
        ruleset: "arch",
        rules: [2],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        target: edge.to,
        shape: "index-import",
      })
    }
  }

  return violations
}
