import { join } from "node:path"
import { fileURLToPath } from "node:url"

import type { Fs } from "../../../lib/fs/fs.port.ts"
import type { Install } from "../install.port.ts"

/**
 * The install this file ships in, anchored at the package root: the same hop
 * works compiled (dist/apps/cli/adapters) and source-run
 * (src/apps/cli/adapters) — source-run needs the build's copies to exist, the
 * explain content and the viewer bundle alike. The day the viewer is published
 * and depended on instead, `bundleRoot` becomes `import.meta.resolve(…)` and
 * nothing else moves.
 */
export const createInstall = ({
  fs,
  packageRoot = fileURLToPath(new URL("../../../../", import.meta.url)),
}: {
  fs: Pick<Fs, "readFile">
  /** The package root to read — tests point it at a fixture. */
  packageRoot?: string
}): Install => ({
  version: async () => {
    const manifest = await fs.readFile(join(packageRoot, "package.json"))
    if (manifest === null)
      throw new Error(`no package.json at the install root ${packageRoot}`)
    return (JSON.parse(manifest) as { version: string }).version
  },
  contentRoot: join(packageRoot, "dist/content"),
  bundleRoot: join(packageRoot, "dist/viewer"),
})
