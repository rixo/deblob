/**
 * The fold from one extraction run to the viewer's `Snapshot`: pure knowledge
 * over the graph, the file sizes, and the run's provenance. The stats are the
 * CLI's own headline numbers, computed by the same functions.
 */

import type { Snapshot } from "@deblob/viewer/snapshot.model"

import {
  provenanceOf,
  serviceCountOf,
  sizeStatsOf,
} from "../cli/render.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import type { ImportGraph, ModuleNode } from "../extraction/graph.model.ts"

/**
 * A config path as the project sees it — relative to its root when under it, as
 * given otherwise. A string strip, not a path operation: both come from the
 * same discovery, same separators.
 */
const underRoot = (root: string, path: string | null): string | null =>
  path !== null && path.startsWith(`${root}/`)
    ? path.slice(root.length + 1)
    : path

export const snapshotFrom = ({
  config,
  graph,
  sizes,
  name,
  generatedAt,
}: {
  config: Pick<
    ResolvedConfig,
    "root" | "configPath" | "localPath" | "flavorName"
  >
  graph: ImportGraph
  sizes: readonly { path: string; size: number }[]
  name: string | null
  generatedAt: string
}): Snapshot => {
  const modules = [...graph.modules.values()]
  const { totalBytes, blobPercent } = sizeStatsOf(
    sizes.map(({ path, size }) => ({
      size,
      // every covered file is a graph node — extraction's contract
      blob: (graph.modules.get(path) as ModuleNode).layer === "blob",
    })),
  )
  return {
    generatedAt,
    project: {
      root: config.root,
      name,
      provenance: provenanceOf(
        {
          configPath: underRoot(config.root, config.configPath),
          localPath: underRoot(config.root, config.localPath),
        },
        config.flavorName,
      ),
    },
    stats: {
      files: modules.length,
      bytes: totalBytes,
      blobPercent,
      services: serviceCountOf(modules.map((node) => node.serviceRoot)),
    },
    modules: modules.map(({ path, layer, serviceRoot, isPrivate, parsed }) => ({
      path,
      layer,
      serviceRoot,
      isPrivate,
      parsed,
    })),
    edges: graph.edges,
    unresolved: graph.unresolved,
  }
}
