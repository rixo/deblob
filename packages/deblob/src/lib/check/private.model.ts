/**
 * `check private` — rule 12, the visibility boundary. Every `private` path
 * segment defines one boundary; boundaries are independent and fractal. A
 * packaging rule: every edge kind and form binds (rule 8 exempts composition
 * rules only), so the check takes no options. Pure: classified graph in,
 * violation set out — no IO, no formatting, no ordering.
 */

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import type { PrivateViolation } from "./violation.model.ts"

const parentOf = (dir: string): string => {
  const slash = dir.lastIndexOf("/")
  return slash === -1 ? "." : dir.slice(0, slash)
}

/**
 * The `…/private` ancestor directories of a path, outermost first — the
 * boundaries governing it.
 */
const boundariesOf = (path: string): string[] => {
  const segments = path.split("/")
  const boundaries: string[] = []
  for (let i = 0; i < segments.length - 1; i++) {
    if (segments[i] === "private")
      boundaries.push(segments.slice(0, i + 1).join("/"))
  }
  return boundaries
}

/**
 * The nearest service-root ancestor of a boundary dir — grouping dirs collapse
 * through, since they are never roots. `null` = ownerless: rule 12 speaks of a
 * service's `private/`; a blob-owned one makes no claim.
 */
const ownerOf = (
  boundary: string,
  roots: ReadonlySet<string>,
): string | null => {
  for (let dir = parentOf(boundary); ; dir = parentOf(dir)) {
    if (roots.has(dir)) return dir
    if (dir === ".") return null
  }
}

const moduleOf = (graph: ImportGraph, path: string): ModuleNode => {
  const node = graph.modules.get(path)
  if (!node) {
    throw new Error(
      `extraction broke its contract: edge references ${path}, absent from the graph`,
    )
  }
  return node
}

export const checkPrivate = (graph: ImportGraph): PrivateViolation[] => {
  const roots = new Set<string>()
  for (const node of graph.modules.values()) {
    if (node.serviceRoot !== null) roots.add(node.serviceRoot)
  }

  const violations: PrivateViolation[] = []

  for (const edge of graph.edges) {
    // externals cannot sit under a governed private/
    if (edge.to.type !== "module") continue

    const importer = moduleOf(graph, edge.from)
    const target = moduleOf(graph, edge.to.path)

    // outermost first; the first violated boundary is the finding — resolving
    // it resolves the deeper ones, the rest are echo
    for (const boundary of boundariesOf(target.path)) {
      // an importer inside the subtree crosses nothing at this boundary
      if (importer.path.startsWith(`${boundary}/`)) continue
      const owner = ownerOf(boundary, roots)
      if (owner === null) continue
      if (importer.serviceRoot === owner) continue
      violations.push({
        check: "private",
        ruleset: "arch",
        rules: [12],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        target: edge.to,
        boundary,
        owner,
      })
      break
    }
  }

  return violations
}
