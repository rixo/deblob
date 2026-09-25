/**
 * The fold from one extraction run to the viewer's `Snapshot`: pure knowledge
 * over the graph, the file sizes, and the run's provenance. The stats are the
 * CLI's own headline numbers, computed by the same functions.
 */

import type {
  EdgeRef,
  MapData,
  ModuleRef,
  Snapshot,
} from "@deblob/viewer/snapshot.model"

import {
  provenanceOf,
  serviceCountOf,
  sizeStatsOf,
} from "../cli/render.model.ts"
import type { ResolvedConfig } from "../config/config.service.ts"
import type {
  ImportEdge,
  ImportGraph,
  ModuleNode,
} from "../extraction/graph.model.ts"

/**
 * A config path as the project sees it — relative to its root when under it, as
 * given otherwise. A string strip, not a path operation: both come from the
 * same discovery, same separators.
 */
const underRoot = (root: string, path: string | null): string | null =>
  path !== null && path.startsWith(`${root}/`)
    ? path.slice(root.length + 1)
    : path

/**
 * What a project's watch holds: its root — the config files sit there — and
 * every directory coverage spans, made absolute. A string join, not a path
 * operation: the scan's paths are POSIX under the root it was given.
 */
export const watchSetOf = (
  root: string,
  dirs: readonly string[],
): readonly string[] => [root, ...dirs.map((dir) => `${root}/${dir}`)]

/**
 * The directories whose README the map shows: the root (`.`), then every
 * directory holding a covered file and each one above it — every box the map
 * can draw is one of them. A string walk: the paths are POSIX, root-relative.
 */
export const readmeDirsOf = (paths: readonly string[]): readonly string[] => {
  const dirs = new Set<string>()
  for (const path of paths) {
    for (let end = path.lastIndexOf("/"); end > 0;) {
      dirs.add(path.slice(0, end))
      end = path.lastIndexOf("/", end - 1)
    }
  }
  return [".", ...[...dirs].sort()]
}

/** A graph module as the outline reads it: the contract's fields only. */
const moduleRefOf = ({
  path,
  layer,
  serviceRoot,
  isPrivate,
  parsed,
}: ModuleNode): ModuleRef => ({ path, layer, serviceRoot, isPrivate, parsed })

/** A graph edge as the outline reads it: its names ride in the map. */
const edgeRefOf = ({
  from,
  to,
  kind,
  form,
  reExport,
}: ImportEdge): EdgeRef => ({
  from,
  to,
  kind,
  form,
  reExport,
})

/**
 * The fold of one extraction run: the snapshot, its map's rows (modules and
 * edges with their symbol level) and nothing else of the map yet — the call
 * stacks and the READMEs are fed after.
 */
export type SnapshotRows = Omit<Snapshot, "map"> & {
  map: Pick<MapData, "modules" | "edges">
}

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
}): SnapshotRows => {
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
    modules: modules.map(moduleRefOf),
    edges: graph.edges.map(edgeRefOf),
    unresolved: graph.unresolved,
    // the map's rows: the same modules and edges, their symbol level added
    map: {
      modules: modules.map((node) => ({
        ...moduleRefOf(node),
        symbols: node.symbols,
        internalDeclarations: node.internalDeclarations,
      })),
      edges: graph.edges.map((edge) => ({
        ...edgeRefOf(edge),
        symbols: edge.names.map((symbol) => ({ name: symbol })),
      })),
    },
  }
}
