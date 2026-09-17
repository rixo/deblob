/**
 * The fs port over a record of path → content: a tree of strings, no disk. A
 * directory exists when a file sits under it; `glob` is picomatch over the
 * keys, the same dot rule as the node adapter's. The files are exposed for
 * assertions.
 */

import picomatch from "picomatch"

import type { Fs } from "../fs.port.ts"

export const createMemoryFs = (
  files: Readonly<Record<string, string>>,
): Fs & { readonly files: ReadonlyMap<string, string> } => {
  const map = new Map(Object.entries(files))
  const encoder = new TextEncoder()
  const hasFile = (path: string): boolean => map.has(path)
  const hasDir = (path: string): boolean => {
    const prefix = `${path}/`
    for (const key of map.keys()) if (key.startsWith(prefix)) return true
    return false
  }

  return {
    files: map,
    readFile: async (path) => map.get(path) ?? null,
    exists: async (path) => hasFile(path) || hasDir(path),
    stat: async (path) => {
      const content = map.get(path)
      return content === undefined
        ? null
        : { size: encoder.encode(content).length }
    },
    glob: async (patterns, { cwd, ignore = [] }) => {
      const matches = picomatch([...patterns], { dot: false })
      const ignored =
        ignore.length > 0 ? picomatch([...ignore], { dot: true }) : () => false
      const prefix = `${cwd}/`
      const found: string[] = []
      for (const key of map.keys()) {
        if (!key.startsWith(prefix)) continue
        const relative = key.slice(prefix.length)
        if (matches(relative) && !ignored(relative)) found.push(relative)
      }
      return found
    },
  }
}
