/**
 * Each directory's `README.md`, read through the fs port: the texts the map's
 * READMEs come from. A path join, a read, absent when nothing is there. POSIX
 * paths: the scan's directories are root-relative POSIX, the root absolute.
 */

import type { Fs } from "../../fs/fs.port.ts"
import type { ReadmeTexts } from "../ports/readme-texts.port.ts"

export const createFsReadmeTexts = ({
  fs,
}: {
  fs: Pick<Fs, "readFile">
}): ReadmeTexts => ({
  readmeTextsOf: async (root, dirs) => {
    const texts: Record<string, string> = {}
    for (const dir of dirs) {
      const text = await fs.readFile(
        dir === "." ? `${root}/README.md` : `${root}/${dir}/README.md`,
      )
      if (text !== null) texts[dir] = text
    }
    return texts
  },
})
