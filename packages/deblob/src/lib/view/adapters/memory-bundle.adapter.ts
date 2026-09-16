/**
 * A bundle held in memory: the files the caller names and nothing else, their
 * contents as text. Every read is logged, so a spec can show that a refused
 * target never reached the files at all.
 */

import type { BundleFiles } from "../ports/bundle.port.ts"

export const createMemoryBundle = (
  contents: Readonly<Record<string, string>>,
) => {
  const encoder = new TextEncoder()
  const reads: string[] = []
  const files: BundleFiles = {
    read: async (file) => {
      reads.push(file)
      const content = contents[file]
      return content === undefined ? null : encoder.encode(content)
    },
  }
  return { files, reads: reads as readonly string[] }
}
