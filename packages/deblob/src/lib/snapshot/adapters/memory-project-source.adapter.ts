/**
 * The world in memory: projects keyed by directory, each with its resolved
 * config, its coverage set, its sizes and its manifest name; a fixed clock. An
 * unknown directory fails the way a missing project would; a file without a
 * size is a fixture bug and fails naming it.
 */

import type { ResolvedConfig } from "../../config/config.service.ts"
import type { ProjectSource } from "../ports/project-source.port.ts"

export type MemoryProject = {
  config: ResolvedConfig
  /** The coverage set as the filesystem would list it — any order. */
  files: readonly string[]
  sizes: Readonly<Record<string, number>>
  /** The manifest's name; `null` for a project without one. */
  name: string | null
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
    loadConfig: async (dir) => projectAt(dir).config,
    scanCoverage: async (config) => projectAt(config.root).files,
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
    now: () => now,
  }
}
