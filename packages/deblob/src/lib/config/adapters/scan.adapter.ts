/**
 * Coverage scan — `include`/`exclude` made real under the full-scan model: glob
 * the governed subtree, gate to what the graph can node (a script extension, a
 * designated file, a file a reader binds — the config's `covers`), and hand
 * `extractGraph` its file list. No roots, no discovery-by-import — every
 * covered file enters the graph, orphans included. Hidden paths (dot-segments)
 * never enter coverage. The disk is the fs port's.
 */

import { join } from "node:path"

import type { Fs } from "../../fs/fs.port.ts"
import type { ResolvedConfig } from "../config.service.ts"

export const createCoverageScan = ({
  fs,
}: {
  fs: Pick<Fs, "glob" | "globDirs" | "stat">
}) => {
  /** Root-relative POSIX paths, sorted — `extractGraph`'s `files` input. */
  const scanCoverage = async (
    config: Pick<ResolvedConfig, "root" | "include" | "exclude" | "covers">,
  ): Promise<readonly string[]> => {
    const paths = await fs.glob(config.include, {
      cwd: config.root,
      ignore: config.exclude,
    })
    return paths.filter(config.covers).sort()
  }

  /**
   * The directories coverage spans: the same patterns matched against
   * directories, pruned the same way — a directory under `include` is listed
   * whether or not it holds a covered file yet. Root-relative POSIX paths, no
   * trailing slash, sorted; the root itself is not among them.
   */
  const scanCoverageDirs = async (
    config: Pick<ResolvedConfig, "root" | "include" | "exclude">,
  ): Promise<readonly string[]> => {
    const dirs = await fs.globDirs(config.include, {
      cwd: config.root,
      ignore: config.exclude,
    })
    return dirs.sort()
  }

  /**
   * Byte size per covered file — the bare command's blob-% input. Stat only,
   * never a content read: bare stays at glob speed. A covered file is one the
   * scan just listed; one gone since is a race, not a case, and flies.
   */
  const statSizes = (
    root: string,
    files: readonly string[],
  ): Promise<{ path: string; size: number }[]> =>
    Promise.all(
      files.map(async (path) => {
        const stats = await fs.stat(join(root, path))
        if (stats === null) throw new Error(`covered file vanished: ${path}`)
        return { path, size: stats.size }
      }),
    )

  return { scanCoverage, scanCoverageDirs, statSizes }
}
