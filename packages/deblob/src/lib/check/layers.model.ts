/**
 * `check layers` — the dependency matrix by layer. Rule 8 applies per cell, not
 * as a kind gate: a type-only edge is exempt iff its target owns a contract
 * shape (composition units in-set, builtins/packages external); blob and
 * assembly targets bind every kind. Pure: classified graph in, violation set
 * out — no IO, no formatting, no ordering.
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
   * Rule-8 stance: `true` (default) exempts type-only edges to targets owning a
   * contract shape; `false` is the strict opt-out binding every kind — knobs
   * only tighten canon.
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

/**
 * The in-set targets whose types are a contract (rule 8's "contract's shape"):
 * the composition units. Blob's shape is its implementation and assembly is
 * wiring — neither owns a contract, both bind type edges.
 */
const TYPE_EXEMPT_TARGETS: ReadonlySet<Layer> = new Set(["service", "adapters"])

type ExternalClass = "pure" | "concrete" | "unclassified"

const classifyExternal = (
  pkg: string | null,
  pureLibs: ReadonlySet<string>,
): ExternalClass => {
  // a resolved file outside the coverage set: ungoverned, undeclared ⇒ concrete
  if (pkg === null) return "concrete"
  // pureLibs takes "package names and builtin specifiers" (ratified) — a
  // declared builtin is pure like a declared package; undeclared builtins are
  // enumerable and default concrete, never unclassified
  if (pkg.startsWith("node:"))
    return PURE_BUILTINS.has(pkg) || pureLibs.has(pkg) ? "pure" : "concrete"
  return pureLibs.has(pkg) ? "pure" : "unclassified"
}

/**
 * Rules cited for a forbidden module cell, `null` for a legal one — base
 * citations; the rule-8 hint ("import type is fine") is appended by the caller
 * wherever the cell's type variant is exempt.
 */
const moduleCellRules = (
  importer: NonAssembly,
  target: Layer,
): readonly number[] | null => {
  switch (importer) {
    case "model":
      if (target === "model") return null
      return target === "blob" ? [5] : [1]
    case "ports":
      if (target === "model" || target === "ports") return null
      return target === "blob" ? [5] : [1]
    case "service":
      if (target === "model" || target === "ports") return null
      if (target === "service") return [6]
      return target === "blob" ? [5] : [1]
    case "adapters":
      if (target === "model" || target === "ports") return null
      if (target === "service") return [6]
      if (target === "adapters") return [7]
      return target === "blob" ? [5] : [1]
    case "blob":
      // blob binds under the composition seals only (rules 6, 7)
      if (target === "service") return [6]
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
    const typeEdge = edge.kind === "type"

    const importer = moduleOf(graph, edge.from)
    const importerLayer = importer.layer
    if (importerLayer === "assembly") continue

    if (edge.to.type === "module") {
      const target = moduleOf(graph, edge.to.path)
      const cellExempt = typeOnlyExempt && TYPE_EXEMPT_TARGETS.has(target.layer)
      if (typeEdge && cellExempt) continue
      if (isOwnPrivate(importer, target)) continue
      const rules = moduleCellRules(importerLayer, target.layer)
      if (rules) {
        // the rule-8 hint: "import type is fine" — only where that is true
        const cited = cellExempt ? [...rules, 8] : rules
        violations.push(matrixCell(importer, edge, target.layer, cited))
      }
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
    // a builtin's or package's published types are its contract; a resolved
    // file outside the coverage set (package null) publishes nothing and binds
    const externalExempt = typeOnlyExempt && edge.to.package !== null
    if (typeEdge && externalExempt) continue
    const externalClass = classifyExternal(edge.to.package, pureLibs)
    if (externalClass === "pure") continue
    if (externalClass === "unclassified") {
      violations.push({
        check: "layers",
        ruleset: "arch",
        rules: externalExempt ? [4, 8] : [4],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        importerLayer,
        target: edge.to,
        shape: "unclassified-lib",
      })
      continue
    }
    const rules = importerLayer === "service" ? [4] : [1, 4]
    violations.push(
      matrixCell(
        importer,
        edge,
        "concrete",
        externalExempt ? [...rules, 8] : rules,
      ),
    )
  }

  return violations
}
