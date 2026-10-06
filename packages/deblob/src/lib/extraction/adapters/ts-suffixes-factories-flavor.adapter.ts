import { LAYER_BY_SUFFIX, STOCK_FLAVOR_NAME } from "../stock-flavor.model.ts"
import type { FlavorLayer } from "../graph.model.ts"
import type { FlavorClassification, FlavorResolver } from "../flavor.model.ts"

/**
 * The stock flavor: suffix naming + factory injection. Path-only rules — layer
 * from the file suffix, service roots from where layer files sit, grouping dirs
 * (`ports/`, `private/`, …) attributing to their nearest real service
 * directory.
 */

const LAYER_SUFFIX =
  /\.(model|port|service|adapter|assembly|driver|boot)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/**
 * The hexagon's own kinds mark a service root where they sit; the outside kinds
 * build and fire services without being one, so a driver directory is no
 * service root.
 */
const ROOT_MARKING_SUFFIX =
  /\.(?:model|port|service|adapter)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/** Layer/visibility grouping dirs — filing, never service roots. */
const GROUPING_DIRS: ReadonlySet<string> = new Set([
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

/**
 * Test naming — `*.spec.*`, `*.test.*`, `*.e2e.*` over the script extensions.
 * The flavor names every kind (04/07 ruling 5); a file under `__tests__/` with
 * no such name is blob.
 */
const TEST_SUFFIX = /\.(?:spec|test|e2e)\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/

/** The suffix's word: a test name first, then the layer suffix. */
const layerOf = (path: string): FlavorLayer => {
  if (TEST_SUFFIX.test(path)) return "test"
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

/**
 * The stock naming rule over an export name — the "factories" half of this
 * flavor's name, the implementation guide's `create<Name><Kind>`: `create`
 * followed by a capital. Not `create` alone, not `createdAt`. `init<Name>` is
 * the guide's assembly entrypoint, a factory by file kind already, so the rule
 * does not list it.
 */
const FACTORY_NAME = /^create[A-Z]/

export const isStockFactoryName = (name: string): boolean =>
  FACTORY_NAME.test(name)

/**
 * Stock flavor registry — name → factory, built by assembly and injected into
 * the config unit (a flavor is an adapter; neither the model nor another
 * adapter may import one). A factory, not a constant: an assembly hands on what
 * it builds. One entry today; a second stock flavor gets its own adapter file,
 * and the registry moves to whoever may import them both.
 */
export const createStockFlavors = (): Readonly<
  Record<string, () => FlavorResolver>
> => ({
  [STOCK_FLAVOR_NAME]: () => createTsSuffixesFactoriesFlavor(),
})

export const createTsSuffixesFactoriesFlavor = (): FlavorResolver => ({
  isFactory: ({ name }) => isStockFactoryName(name),
  classify: ({ files }) => {
    const roots = new Set<string>()
    for (const file of files) {
      if (ROOT_MARKING_SUFFIX.test(file)) roots.add(markedRootOf(file))
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
