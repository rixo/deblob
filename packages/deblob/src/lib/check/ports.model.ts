/**
 * `check ports` — rule 10 read whole: ports are inert, so runtime content in a
 * port file and runtime edges incident to one — either end — are defects. No
 * options: rule 10 has no exemption axis. Pure: classified graph in, violation
 * set out — no IO, no formatting, no ordering.
 */

import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"
import type { PortsViolation } from "./violation.model.ts"

const moduleOf = (graph: ImportGraph, path: string): ModuleNode => {
  const node = graph.modules.get(path)
  if (!node) {
    throw new Error(
      `extraction broke its contract: edge references ${path}, absent from the graph`,
    )
  }
  return node
}

export const checkPorts = (graph: ImportGraph): PortsViolation[] => {
  const violations: PortsViolation[] = []

  for (const node of graph.modules.values()) {
    if (node.layer !== "ports") continue
    for (const entry of node.runtimeContent) {
      violations.push({
        check: "ports",
        ruleset: "arch",
        rules: [10],
        file: node.path,
        serviceRoot: node.serviceRoot,
        shape: "runtime-export",
        form: entry.form,
        name: entry.name,
        exported: entry.exported,
      })
    }
  }

  for (const edge of graph.edges) {
    if (edge.kind !== "runtime") continue
    const importer = moduleOf(graph, edge.from)
    const target =
      edge.to.type === "module" ? moduleOf(graph, edge.to.path) : null

    // one shape per edge: the acting port owns it; the importer answers
    // otherwise
    if (importer.layer === "ports") {
      violations.push({
        check: "ports",
        ruleset: "arch",
        rules: [10],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        shape: "runtime-import",
        target: edge.to,
      })
    } else if (target?.layer === "ports") {
      violations.push({
        check: "ports",
        ruleset: "arch",
        rules: [10],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        shape: "runtime-import-of-port",
        target: edge.to,
      })
    }
  }

  return violations
}
