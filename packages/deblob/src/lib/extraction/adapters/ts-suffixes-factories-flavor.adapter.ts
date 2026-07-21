import type { FlavorLayer } from "../graph.model.ts"
import type {
  FlavorClassification,
  FlavorResolver,
} from "../ports/flavor.port.ts"

/**
 * The stock flavor: suffix naming + factory injection. Path-only rules — layer
 * from the file suffix, service roots from where layer files sit, grouping dirs
 * (`ports/`, `private/`, …) attributing to their nearest real service
 * directory.
 */

const LAYER_BY_SUFFIX: Record<string, FlavorLayer> = {
  model: "model",
  port: "ports",
  service: "service",
  adapter: "adapters",
}

const LAYER_SUFFIX =
  /\.(model|port|service|adapter)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/**
 * Rule 16 — test setup is assembly; test naming is this flavor's opinion (same
 * extension set as layer suffixes). Closed carve-out: `__tests__/` and other
 * directory conventions stay to the config's `assembly` escape hatch.
 */
const TEST_SUFFIX = /\.(?:spec|test)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/** Layer/visibility grouping dirs — filing, never service roots. */
const GROUPING_DIRS = new Set([
  "model",
  "ports",
  "service",
  "adapters",
  "private",
])

const parentOf = (path: string): string => {
  const slash = path.lastIndexOf("/")
  return slash === -1 ? "." : path.slice(0, slash)
}

const baseOf = (dir: string): string => {
  const slash = dir.lastIndexOf("/")
  return slash === -1 ? dir : dir.slice(slash + 1)
}

const layerOf = (path: string): FlavorLayer => {
  if (TEST_SUFFIX.test(path)) return "assembly"
  const match = LAYER_SUFFIX.exec(path)
  if (!match) return "blob"
  // the regex alternation and the record keys are the same set
  return LAYER_BY_SUFFIX[match[1]!] as FlavorLayer
}

/** The service dir a layer file marks: its dir, collapsed through grouping dirs. */
const markedRootOf = (path: string): string => {
  let dir = parentOf(path)
  while (dir !== "." && GROUPING_DIRS.has(baseOf(dir))) dir = parentOf(dir)
  return dir
}

const nearestRootOf = (
  path: string,
  roots: ReadonlySet<string>,
): string | null => {
  for (let dir = parentOf(path); ; dir = parentOf(dir)) {
    if (roots.has(dir)) return dir
    if (dir === ".") return null
  }
}

export const createTsSuffixesFactoriesFlavor = (): FlavorResolver => ({
  classify: (files) => {
    const roots = new Set<string>()
    for (const file of files) {
      if (LAYER_SUFFIX.test(file)) roots.add(markedRootOf(file))
    }

    const classifications = new Map<string, FlavorClassification>()
    for (const file of files) {
      classifications.set(file, {
        layer: layerOf(file),
        serviceRoot: nearestRootOf(file, roots),
        isPrivate: file.split("/").slice(0, -1).includes("private"),
      })
    }
    return classifications
  },
})
