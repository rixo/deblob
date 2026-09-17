import { STOCK_FLAVOR_NAME } from "../stock-flavor.model.ts"
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

/**
 * Suffix → kind, inside and outside the hexagon alike. The outside kinds
 * (assembly, driver, boot) are named by suffix like the inside ones; a
 * framework that owns the file name declares its files by config glob instead.
 */
const LAYER_BY_SUFFIX: Record<string, FlavorLayer> = {
  model: "model",
  port: "ports",
  service: "service",
  adapter: "adapters",
  assembly: "assembly",
  driver: "driver",
  boot: "boot",
}

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

/**
 * The suffix's word; test naming is not this flavor's — a test file is one the
 * test runner's binding names (canon: "spec files by the test globs"), and a
 * `.spec.ts` file reads blob here until recognition asks the reader.
 */
const layerOf = (path: string): FlavorLayer => {
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
 * The stock naming rule over an exports subpath or specifier tail — the
 * cross-package half of the flavor (`classifyEntry`): extensionless suffix
 * matching on the tail segment. `./checkout.service`, `checkout.service.js`,
 * `nested/checkout.service.d.ts` all say service; an unsuffixed tail (the bare
 * root included) claims nothing. Exported by name so assembly can wire the
 * boundary lookup without holding a resolver instance.
 */
export const classifyStockEntry = (subpath: string): FlavorLayer | null => {
  const tail = subpath.slice(subpath.lastIndexOf("/") + 1)
  const extensionless = tail
    .replace(/\.d\.(?:ts|mts|cts)$/, "")
    .replace(/\.(?:ts|tsx|mts|cts|js|jsx|mjs|cjs)$/, "")
  const dot = extensionless.lastIndexOf(".")
  if (dot === -1) return null
  // the record keys are the suffix set — one lookup, no second list to drift
  return LAYER_BY_SUFFIX[extensionless.slice(dot + 1)] ?? null
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
 * Stock flavor registry — name → factory, injected into `resolveConfig` by
 * assembly (a flavor is an adapter; neither the model nor another adapter may
 * import one). One entry today; a second stock flavor gets its own adapter
 * file, and the map moves to whoever may import them both.
 */
export const STOCK_FLAVORS: Readonly<Record<string, () => FlavorResolver>> = {
  [STOCK_FLAVOR_NAME]: () => createTsSuffixesFactoriesFlavor(),
}

export const createTsSuffixesFactoriesFlavor = (): FlavorResolver => ({
  classifyEntry: classifyStockEntry,
  isFactory: isStockFactoryName,
  classify: (files) => {
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
