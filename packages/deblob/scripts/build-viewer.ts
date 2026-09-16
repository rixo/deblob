/**
 * Build stage: copies the built viewer into dist/viewer, which is what `deblob
 * view` serves. The bundle ships inside this package (SPEC 05's packaging
 * ruling: one published package, nothing resolved at runtime), so `files:
 * ["dist"]` carries it with no further wiring.
 *
 * The viewer is built by its own package; this only copies. Run via `pnpm
 * build` (or `pnpm build:viewer`), and in a workspace-wide `pnpm -r build` the
 * dependency orders the two.
 */

import { cpSync, existsSync, rmSync } from "node:fs"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const source = join(packageRoot, "..", "viewer", "dist")
const target = join(packageRoot, "dist", "viewer")

if (!existsSync(join(source, "index.html"))) {
  console.error(
    `no viewer bundle at ${source} — build it first: pnpm --filter @deblob/viewer build`,
  )
  process.exit(1)
}

rmSync(target, { recursive: true, force: true })
cpSync(source, target, { recursive: true })
