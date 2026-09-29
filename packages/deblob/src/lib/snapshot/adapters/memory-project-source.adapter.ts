/**
 * The world in memory: projects keyed by directory, each with its resolved
 * config, its coverage set and the directories it spans, its sizes, its
 * manifest name and its README texts; a fixed clock. An unknown directory fails
 * the way a missing project would; a file without a size is a fixture bug and
 * fails naming it.
 */

import type { ResolvedConfig } from "../../config/config.service.ts"
import type { ProjectSource } from "../ports/project-source.port.ts"

export type MemoryProject = {
  config: ResolvedConfig
  /** The coverage set as the filesystem would list it — any order. */
  files: readonly string[]
  /** The directories coverage spans, root-relative, the root itself absent. */
  dirs: readonly string[]
  sizes: Readonly<Record<string, number>>
  /** The manifest's name; `null` for a project without one. */
  name: string | null
  /** README texts by directory (`.` = the root); none when absent. */
  readmes?: Readonly<Record<string, string>>
}

export const createMemoryProjectSource = ({
  projects,
  now,
}: {
  projects: Readonly<Record<string, MemoryProject>>
  now: string
}): ProjectSource => {
  const projectAt = (dir: string): MemoryProject => {
    const project = projects[dir]
    if (project === undefined) {
      throw new Error(`memory project source: no project at ${dir}`)
    }
    return project
  }
  return {
    // no hierarchy in memory: a directory is a project or nothing
    loadConfig: async (dir) => projectAt(dir).config,
    loadConfigAt: async (root) => projectAt(root).config,
    scanCoverage: async (config) => projectAt(config.root).files,
    scanCoverageDirs: async (config) => projectAt(config.root).dirs,
    sizesOf: async (root, files) => {
      const { sizes } = projectAt(root)
      return files.map((path) => {
        const size = sizes[path]
        if (size === undefined) {
          throw new Error(`memory project source: no size for ${path}`)
        }
        return { path, size }
      })
    },
    manifestNameOf: async (root) => projects[root]?.name ?? null,
    readmeTextsOf: async (root, dirs) => {
      const readmes = projectAt(root).readmes ?? {}
      return Object.fromEntries(
        dirs.flatMap((dir) => {
          const text = readmes[dir]
          return text === undefined ? [] : [[dir, text]]
        }),
      )
    },
    now: () => now,
  }
}
