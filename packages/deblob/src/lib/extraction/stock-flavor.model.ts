/**
 * The stock flavor's knowledge that others read without the flavor: its name
 * (the config defaulting to it and the adapter registering under it both import
 * it, so neither service reaches into the other — `no-service-cycle`, the
 * tool's own first dogfood catch of the dag detector), its suffix table, and
 * its naming rule over an exports subpath.
 */

import type { FlavorLayer } from "./graph.model.ts"

/** The stock flavor's name. */
export const STOCK_FLAVOR_NAME = "ts-suffixes-factories"

/**
 * Suffix → kind, inside and outside the hexagon alike. The outside kinds
 * (assembly, driver, boot) are named by suffix like the inside ones; a
 * framework that owns the file name declares its files by config glob instead.
 */
export const LAYER_BY_SUFFIX: Readonly<Record<string, FlavorLayer>> = {
  model: "model",
  port: "ports",
  service: "service",
  adapter: "adapters",
  assembly: "assembly",
  driver: "driver",
  boot: "boot",
}

/**
 * The stock naming rule over an exports subpath or specifier tail — the
 * cross-package half of the flavor (`classifyEntry`): extensionless suffix
 * matching on the tail segment. `./checkout.service`, `checkout.service.js`,
 * `nested/checkout.service.d.ts` all say service; an unsuffixed tail (the bare
 * root included) claims nothing. A model, not the adapter's: `check` and the
 * package claims read producers by the stock rule, whatever flavor is local,
 * and neither may import an adapter.
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
