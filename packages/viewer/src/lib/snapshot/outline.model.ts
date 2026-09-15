/**
 * The service list as the page shows it: each service root with its files
 * grouped by layer. Services by root, the top-level files (no service) last;
 * layers in `LAYERS` order, empty ones omitted; files in snapshot order.
 */

import { LAYERS, type Layer, type ModuleRef } from "./snapshot.model.ts"

export type OutlineLayer = {
  readonly layer: Layer
  readonly files: readonly ModuleRef[]
}

export type OutlineService = {
  /** The service root; `null` for the files outside every service. */
  readonly root: string | null
  readonly layers: readonly OutlineLayer[]
}

const layersOf = (files: readonly ModuleRef[]): OutlineLayer[] =>
  LAYERS.map((layer) => ({
    layer,
    files: files.filter((file) => file.layer === layer),
  })).filter(({ files }) => files.length > 0)

export const outlineOf = (
  modules: readonly ModuleRef[],
): readonly OutlineService[] => {
  const roots = new Set(modules.map((module) => module.serviceRoot))
  const services = [...roots]
    .filter((root) => root !== null)
    .sort()
    .map((root) => ({
      root,
      layers: layersOf(modules.filter((module) => module.serviceRoot === root)),
    }))
  const topLevel = modules.filter((module) => module.serviceRoot === null)
  return topLevel.length === 0
    ? services
    : [...services, { root: null, layers: layersOf(topLevel) }]
}
