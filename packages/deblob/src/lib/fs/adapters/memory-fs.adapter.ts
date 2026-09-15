/**
 * The fs port over a record of path → content: a tree of strings, no disk. A
 * directory exists when a file sits under it, or when `dirs` names it — the way
 * to hold an empty one; `glob` is picomatch over the file keys, the same dot
 * rule as the node adapter's. The files are exposed for assertions.
 */

import picomatch from "picomatch"

import type { Fs } from "../fs.port.ts"

export const createMemoryFs = (
  files: Readonly<Record<string, string>>,
  { dirs = [] }: { dirs?: readonly string[] } = {},
): Fs & { readonly files: ReadonlyMap<string, string> } => {
  const map = new Map(Object.entries(files))
  const encoder = new TextEncoder()
  const hasFile = (path: string): boolean => map.has(path)
  const hasDir = (path: string): boolean => {
    if (dirs.includes(path)) return true
    const prefix = `${path}/`
    for (const key of [...map.keys(), ...dirs])
      if (key.startsWith(prefix)) return true
    return false
  }
  /** The paths under `cwd`, as cwd-relative paths. */
  const relativeTo = (cwd: string, paths: Iterable<string>): string[] => {
    const prefix = `${cwd}/`
    return [...paths]
      .filter((path) => path.startsWith(prefix))
      .map((path) => path.slice(prefix.length))
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
    glob: async (patterns, { cwd, ignore = [] }) =>
      relativeTo(cwd, map.keys()).filter(selecting(patterns, ignore)),
    globDirs: async (patterns, { cwd, ignore = [] }) => {
      // every named directory under cwd and every ancestor of a path, short of cwd
      const found = new Set<string>(relativeTo(cwd, dirs))
      for (const relative of relativeTo(cwd, [...map.keys(), ...dirs])) {
        const segments = relative.split("/").slice(0, -1)
        segments.forEach((_, index) =>
          found.add(segments.slice(0, index + 1).join("/")),
        )
      }
      return [...found].filter(selecting(patterns, ignore))
    },
  }
}

/** The one selection both globs share: a pattern matches, no ignore does. */
const selecting = (
  patterns: readonly string[],
  ignore: readonly string[],
): ((relative: string) => boolean) => {
  const matches = picomatch([...patterns], { dot: false })
  const ignored =
    ignore.length > 0 ? picomatch([...ignore], { dot: true }) : () => false
  return (relative) => matches(relative) && !ignored(relative)
}
