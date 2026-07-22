/**
 * Coverage scan — `include`/`exclude` made real under the full-scan model: glob
 * the governed subtree, gate to the extensions the graph can node, and hand
 * `extractGraph` its file list. No roots, no discovery-by-import — every
 * covered file enters the graph, orphans included. Hidden paths (dot-segments)
 * never enter coverage.
 */

import { statSync } from "node:fs"
import { join } from "node:path"

import { glob } from "tinyglobby"

import { hasCoverageExtension } from "../config.model.ts"
import type { ResolvedConfig } from "../config.service.ts"

/** Root-relative POSIX paths, sorted — `extractGraph`'s `files` input. */
export const scanCoverage = async (
  config: Pick<ResolvedConfig, "root" | "include" | "exclude">,
): Promise<readonly string[]> => {
  const paths = await glob([...config.include], {
    cwd: config.root,
    ignore: [...config.exclude],
    dot: false,
    onlyFiles: true,
  })
  return paths.filter(hasCoverageExtension).sort()
}

/**
 * Byte size per covered file — the bare command's blob-% input. Stat only,
 * never a content read: bare stays at glob speed.
 */
export const statSizes = (
  root: string,
  files: readonly string[],
): { path: string; size: number }[] =>
  files.map((path) => ({ path, size: statSync(join(root, path)).size }))
