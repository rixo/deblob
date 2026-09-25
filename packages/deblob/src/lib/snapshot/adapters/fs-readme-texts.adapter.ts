/**
 * Each directory's `README.md`, read through the fs port: the project-source
 * function the map's READMEs come from. A path join, a read, absent when
 * nothing is there. POSIX paths: the scan's directories are root-relative
 * POSIX, the root absolute.
 */

import type { Fs } from "../../fs/fs.port.ts"
import type { ProjectSource } from "../ports/project-source.port.ts"

export const createFsReadmeTexts = ({
  fs,
}: {
  fs: Pick<Fs, "readFile">
}): Pick<ProjectSource, "readmeTextsOf"> => ({
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
