/**
 * The bundle as a directory on disk: one read per request, no listing, no
 * cache. A file the directory does not hold is `null` — and so is a name that
 * resolves outside the root, which the model already refuses: this is the last
 * place that could do the damage, so it checks for itself.
 */

import { readFile } from "node:fs/promises"
import { resolve, sep } from "node:path"

import type { BundleFiles } from "../ports/bundle.port.ts"

/** What a filesystem says for "there is nothing of that name here". */
const MISSING = new Set(["ENOENT", "EISDIR"])

const isMissing = (error: unknown): boolean =>
  MISSING.has(String((error as NodeJS.ErrnoException).code))

export const createFsBundle = ({ root }: { root: string }): BundleFiles => {
  const base = resolve(root)
  return {
    read: async (file) => {
      const path = resolve(base, file)
      if (!path.startsWith(`${base}${sep}`)) return null
      try {
        return await readFile(path)
      } catch (error) {
        // anything else — a root that is not a directory, a permission — is the
        // server's own failure to report, not an answer to the client
        if (!isMissing(error)) throw error
        return null
      }
    },
  }
}
