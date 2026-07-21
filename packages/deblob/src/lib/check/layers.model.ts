/**
 * `check layers` — the dependency matrix by layer, runtime imports only by
 * default (rule 8). Pure: classified graph in, violation set out — no IO, no
 * formatting, no ordering.
 */

import type {
  ImportEdge,
  ImportGraph,
  Layer,
  ModuleNode,
} from "../extraction/graph.model.ts"
import type { LayersViolation, TargetClass } from "./violation.model.ts"

export type CheckLayersOptions = {
  /**
   * Third-party packages the config ratifies as pure (rule 4 carve-out).
   * Unlisted ⇒ concrete — the unclassified violation is the surfacing
   * mechanism, never a census of known libs.
   */
  pureLibs?: readonly string[]
  /**
   * Rule-8 stance: `true` (default) keeps type-only edges out of scope; `false`
   * is the strict opt-out — knobs only tighten canon.
   */
  typeOnlyExempt?: boolean
}

/**
 * The shipped builtin baseline: Node builtins are concrete by default; this
 * curated set is the pure exception — string-only, deterministic modules.
 */
const PURE_BUILTINS: ReadonlySet<string> = new Set([
  "node:path",
  "node:querystring",
])

type NonAssembly = Exclude<Layer, "assembly">

type ExternalClass = "pure" | "concrete" | "unclassified"

const classifyExternal = (
  pkg: string | null,
  pureLibs: ReadonlySet<string>,
): ExternalClass => {
  // a resolved file outside the coverage set: ungoverned, undeclared ⇒ concrete
  if (pkg === null) return "concrete"
  if (pkg.startsWith("node:"))
    return PURE_BUILTINS.has(pkg) ? "pure" : "concrete"
  return pureLibs.has(pkg) ? "pure" : "unclassified"
}

/**
 * Rules cited for a forbidden module cell, `null` for a legal one. The rule-8
 * hint (6+8, "import type is fine") only holds while the exemption is active.
 */
const moduleCellRules = (
  importer: NonAssembly,
  target: Layer,
  typeOnlyExempt: boolean,
): readonly number[] | null => {
  const serviceSeal = typeOnlyExempt ? [6, 8] : [6]
  switch (importer) {
    case "model":
      if (target === "model") return null
      return target === "blob" ? [5] : [1]
    case "ports":
      if (target === "model" || target === "ports") return null
      return target === "blob" ? [5] : [1]
    case "service":
      if (target === "model" || target === "ports") return null
      if (target === "service") return serviceSeal
      return target === "blob" ? [5] : [1]
    case "adapters":
      if (target === "model" || target === "ports") return null
      if (target === "service") return serviceSeal
      if (target === "adapters") return [7]
      return target === "blob" ? [5] : [1]
    case "blob":
      // blob binds under the composition seals only (rules 6, 7)
      if (target === "service") return serviceSeal
      return target === "adapters" ? [7] : null
  }
}

/** Rule 9: service/adapters import freely from their own service's `private/`. */
const isOwnPrivate = (importer: ModuleNode, target: ModuleNode): boolean => {
  if (importer.layer !== "service" && importer.layer !== "adapters")
    return false
  if (!target.isPrivate || importer.serviceRoot === null) return false
  const privateDir =
    importer.serviceRoot === "."
      ? "private/"
      : `${importer.serviceRoot}/private/`
  return target.path.startsWith(privateDir)
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

const matrixCell = (
  importer: ModuleNode,
  edge: ImportEdge,
  targetClass: TargetClass,
  rules: readonly number[],
): LayersViolation => ({
  check: "layers",
  ruleset: "arch",
  rules,
  file: importer.path,
  serviceRoot: importer.serviceRoot,
  importerLayer: importer.layer,
  target: edge.to,
  shape: "matrix-cell",
  targetClass,
})

export const checkLayers = (
  graph: ImportGraph,
  options: CheckLayersOptions = {},
): LayersViolation[] => {
  const pureLibs = new Set(options.pureLibs ?? [])
  const typeOnlyExempt = options.typeOnlyExempt ?? true
  const violations: LayersViolation[] = []

  for (const edge of graph.edges) {
    if (typeOnlyExempt && edge.kind === "type") continue

    const importer = moduleOf(graph, edge.from)
    const importerLayer = importer.layer
    if (importerLayer === "assembly") continue

    if (edge.to.type === "module") {
      const target = moduleOf(graph, edge.to.path)
      if (isOwnPrivate(importer, target)) continue
      const rules = moduleCellRules(importerLayer, target.layer, typeOnlyExempt)
      if (rules)
        violations.push(matrixCell(importer, edge, target.layer, rules))
      continue
    }

    // externals bind the pure layers only: model, ports, service
    if (
      importerLayer !== "model" &&
      importerLayer !== "ports" &&
      importerLayer !== "service"
    ) {
      continue
    }
    const externalClass = classifyExternal(edge.to.package, pureLibs)
    if (externalClass === "pure") continue
    if (externalClass === "unclassified") {
      violations.push({
        check: "layers",
        ruleset: "arch",
        rules: [4],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        importerLayer,
        target: edge.to,
        shape: "unclassified-lib",
      })
      continue
    }
    const rules = importerLayer === "service" ? [4] : [1, 4]
    violations.push(matrixCell(importer, edge, "concrete", rules))
  }

  return violations
}
