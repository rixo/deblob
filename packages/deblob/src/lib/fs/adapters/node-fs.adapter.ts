/**
 * The fs port over the real disk: `node:fs/promises` for the reads, tinyglobby
 * for the scan. A missing path reads as `null` or `false`, never a throw; every
 * other failure (permissions, a directory read as a file) flies.
 */

import { readFile, stat } from "node:fs/promises"

import { glob } from "tinyglobby"

import type { Fs } from "../fs.port.ts"

/** ENOENT, or a path that runs through a file (ENOTDIR): nothing is there. */
const isMissing = (error: unknown): boolean => {
  const code = (error as { code?: unknown }).code
  return code === "ENOENT" || code === "ENOTDIR"
}

export const createNodeFs = (): Fs => {
  const statOrNull = async (path: string) => {
    try {
      return await stat(path)
    } catch (error) {
      if (isMissing(error)) return null
      throw error
    }
  }

  return {
    readFile: async (path) => {
      try {
        return await readFile(path, "utf8")
      } catch (error) {
        if (isMissing(error)) return null
        throw error
      }
    },
    exists: async (path) => (await statOrNull(path)) !== null,
    stat: async (path) => {
      const stats = await statOrNull(path)
      return stats === null ? null : { size: stats.size }
    },
    glob: (patterns, { cwd, ignore = [] }) =>
      glob([...patterns], {
        cwd,
        ignore: [...ignore],
        dot: false,
        onlyFiles: true,
      }),
  }
}
