/**
 * `check layers` — the dependency matrix by layer. `runtime-import` applies per
 * cell, not as a kind gate: a type-only edge is exempt iff its target owns a
 * contract shape (composition units in-set, builtins/packages external); blob
 * and assembly targets bind every kind. An external leaf carrying a layer (a
 * sibling package's declared subpath) enters the same matrix as a target of
 * that layer; only an unlabeled external falls to the purity trichotomy. Pure:
 * classified graph in, violation set out — no IO, no formatting, no ordering.
 */

import type {
  EdgeTarget,
  ImportEdge,
  ImportGraph,
  Layer,
  ModuleNode,
} from "../extraction/graph.model.ts"
import { externalPurityOf } from "../extraction/graph.model.ts"
import type { RuleId } from "./rule.model.ts"
import type { LayersViolation, TargetClass } from "./violation.model.ts"

export type CheckLayersOptions = {
  /**
   * Third-party packages the config ratifies as pure (`service-purity`
   * carve-out). Unlisted ⇒ concrete — the unclassified violation is the
   * surfacing mechanism, never a census of known libs.
   */
  pure?: readonly string[]
  /**
   * The type-only stance (`runtime-import`): `true` (default) exempts type-only
   * edges to targets owning a contract shape; `false` is the strict opt-out
   * binding every kind — knobs only tighten canon.
   */
  typeOnlyExempt?: boolean
}

/**
 * The in-set targets whose types are a contract (`runtime-import`'s "contract's
 * shape"): the composition units. Blob's shape is its implementation and
 * assembly is wiring — neither owns a contract, both bind type edges.
 */
const TYPE_EXEMPT_TARGETS: ReadonlySet<Layer> = new Set(["service", "adapters"])

/**
 * The outside kinds, outermost last: `assembly < driver < boot`. The test kind
 * is outside too — assembly and driver in one — but sits in no chain: it is
 * imported by nothing, and that rule has no slug in `RULE_IDS` until the
 * outside rules land (driver-layer chapter, steps 03 and 06).
 */
const OUTSIDE_RANK = { assembly: 0, driver: 1, boot: 2 } as const
type ChainedOutsideKind = keyof typeof OUTSIDE_RANK

const outsideRankOf = (layer: Layer): number | null =>
  layer in OUTSIDE_RANK ? OUTSIDE_RANK[layer as ChainedOutsideKind] : null

/**
 * An import from an outside kind that points outward — assembly to driver,
 * driver to boot: `inward-deps`. Toward the test kind the chain says nothing,
 * and the "imported by nothing" rule waits for its slug. (The inside rows cite
 * `inward-deps` for every outside target themselves, test included: from the
 * inside, every outside kind is outward.)
 */
const outwardRules = (
  importer: ChainedOutsideKind,
  target: Layer,
): readonly RuleId[] | null => {
  const to = outsideRankOf(target)
  return to !== null && OUTSIDE_RANK[importer] < to ? ["inward-deps"] : null
}

/**
 * Rules cited for a forbidden module cell, `null` for a legal one — base
 * citations; the `runtime-import` hint ("only import type is allowed") is
 * appended by the caller wherever the cell's type variant is exempt. Total over
 * `Layer` by the compiler. The driver and boot rows cite what `RULE_IDS` names
 * today: the composition seals and `blob-quarantine`. A driver importing model,
 * or a boot importing anything but its driver, is canon's letter with no slug
 * yet (`driver-calls-services-only`, `boot-one-call` — steps 03 and 06 of the
 * driver-layer chapter), so those cells read legal here until then.
 */
const moduleCellRules = (
  importer: Layer,
  target: Layer,
): readonly RuleId[] | null => {
  switch (importer) {
    case "model":
      if (target === "model") return null
      return target === "blob" ? ["blob-quarantine"] : ["inward-deps"]
    case "ports":
      if (target === "model" || target === "ports") return null
      return target === "blob" ? ["blob-quarantine"] : ["inward-deps"]
    case "service":
      if (target === "model" || target === "ports") return null
      if (target === "service") return ["service-assembly-only"]
      return target === "blob" ? ["blob-quarantine"] : ["inward-deps"]
    case "adapters":
      if (target === "model" || target === "ports") return null
      if (target === "service") return ["service-assembly-only"]
      if (target === "adapters") return ["adapter-assembly-only"]
      return target === "blob" ? ["blob-quarantine"] : ["inward-deps"]
    case "assembly":
      // imports anything inside, blob included; never outward
      return outwardRules("assembly", target)
    case "driver":
      if (target === "service") return ["service-assembly-only"]
      if (target === "adapters") return ["adapter-assembly-only"]
      if (target === "blob") return ["blob-quarantine"]
      return outwardRules("driver", target)
    case "boot":
      if (target === "service") return ["service-assembly-only"]
      if (target === "adapters") return ["adapter-assembly-only"]
      if (target === "blob") return ["blob-quarantine"]
      return null
    case "test":
      // imports anything, blob included
      return null
    case "blob":
      // blob binds under the composition seals only
      if (target === "service") return ["service-assembly-only"]
      return target === "adapters" ? ["adapter-assembly-only"] : null
  }
}

/**
 * `public-unit`: service/adapters import freely from their own service's
 * `private/`.
 */
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
  rules: readonly RuleId[],
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
  const pure = new Set(options.pure ?? [])
  const typeOnlyExempt = options.typeOnlyExempt ?? true
  const violations: LayersViolation[] = []

  for (const edge of graph.edges) {
    const typeEdge = edge.kind === "type"

    const importer = moduleOf(graph, edge.from)
    const importerLayer = importer.layer

    if (edge.to.type === "module") {
      const target = moduleOf(graph, edge.to.path)
      const cellExempt = typeOnlyExempt && TYPE_EXEMPT_TARGETS.has(target.layer)
      if (typeEdge && cellExempt) continue
      if (isOwnPrivate(importer, target)) continue
      const rules = moduleCellRules(importerLayer, target.layer)
      if (rules) {
        // the `runtime-import` hint: "only import type is allowed" — only where
        // the cell's type variant is exempt
        const cited: readonly RuleId[] = cellExempt
          ? [...rules, "runtime-import"]
          : rules
        violations.push(matrixCell(importer, edge, target.layer, cited))
      }
      continue
    }

    // matrix crossing — an external leaf carrying a layer routes through the
    // in-set cell for that target layer, every importer row (blob stays bound
    // by the composition seals only, as in-set). A legal cell is the end of
    // it: a crossed model/ports is pure for the importer — trust is the
    // dependency model, the provider's gate verified the claim — so the
    // purity trichotomy is never consulted. A blob or absent claim falls
    // through to today's trichotomy.
    const crossed = edge.to.layer
    if (crossed !== null && crossed !== "blob") {
      const cellExempt = typeOnlyExempt && TYPE_EXEMPT_TARGETS.has(crossed)
      if (typeEdge && cellExempt) continue
      const rules = moduleCellRules(importerLayer, crossed)
      if (rules) {
        const cited: readonly RuleId[] = cellExempt
          ? [...rules, "runtime-import"]
          : rules
        violations.push(matrixCell(importer, edge, crossed, cited))
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
    const externalClass = externalPurityOf(edge.to, pure)
    if (externalClass === "pure") continue
    if (externalClass === "unclassified") {
      violations.push({
        check: "layers",
        ruleset: "arch",
        rules: externalExempt
          ? ["service-purity", "runtime-import"]
          : ["service-purity"],
        file: importer.path,
        serviceRoot: importer.serviceRoot,
        importerLayer,
        target: edge.to,
        shape: "unclassified-lib",
      })
      continue
    }
    const rules: readonly RuleId[] =
      importerLayer === "service"
        ? ["service-purity"]
        : ["inward-deps", "service-purity"]
    violations.push(
      matrixCell(
        importer,
        edge,
        "concrete",
        externalExempt ? [...rules, "runtime-import"] : rules,
      ),
    )
  }

  return violations
}
