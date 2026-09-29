/**
 * Release gate: the published package can serve the viewer. Packs the tarball,
 * unpacks it somewhere else, lends it the workspace's node_modules for its
 * runtime dependencies, and runs `deblob view` out of it against a throwaway
 * project — the only place the packaging ruling (the bundle ships inside this
 * package) is proven rather than asserted.
 *
 * Not part of `pnpm test`: it needs `dist`, and the suite builds nothing. Run
 * via `pnpm verify:pack`, after `pnpm build`.
 */

import { execFileSync, spawn } from "node:child_process"
import {
  mkdirSync,
  mkdtempSync,
  readdirSync,
  rmSync,
  symlinkSync,
  writeFileSync,
} from "node:fs"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

const packageRoot = fileURLToPath(new URL("..", import.meta.url))
const temp = mkdtempSync(join(tmpdir(), "deblob-pack-"))

const fail = (message: string): never => {
  console.error(`verify:pack — ${message}`)
  rmSync(temp, { recursive: true, force: true })
  process.exit(1)
}

const tarball = join(temp, "deblob.tgz")
// `prepack` runs the build, so the tarball is whatever a publish would ship
execFileSync("pnpm", ["pack", "--out", tarball], {
  cwd: packageRoot,
  stdio: "inherit",
})
execFileSync("tar", ["-xzf", tarball, "-C", temp], { stdio: "inherit" })

const installed = join(temp, "package")
const shipped = execFileSync("tar", ["-tzf", tarball], { encoding: "utf8" })
if (!shipped.includes("package/dist/viewer/index.html")) {
  fail("the tarball ships no viewer bundle — dist/viewer/index.html is missing")
}

// The runtime dependencies, borrowed rather than installed: what is proven
// here is the package's own layout, not npm's resolver. `@deblob/*` is left
// out on purpose — the viewer is a devDependency, so an installed deblob never
// has it, and the served bundle must come from inside this package.
const modules = join(installed, "node_modules")
mkdirSync(modules)
for (const entry of readdirSync(join(packageRoot, "node_modules"))) {
  if (entry === "@deblob") continue
  symlinkSync(join(packageRoot, "node_modules", entry), join(modules, entry))
}

// a project for it to look at: no config, so the directory is the project
const project = join(temp, "FAKE_PROJECT", "src")
mkdirSync(project, { recursive: true })
writeFileSync(join(project, "FAKE.model.ts"), "export const FAKE_VALUE = 1\n")

const view = spawn(
  process.execPath,
  [join(installed, "dist", "drivers", "cli", "bin.js"), "view", "--port", "0"],
  { cwd: join(temp, "FAKE_PROJECT") },
)

let out = ""
view.stdout.on("data", (chunk: Buffer) => (out += String(chunk)))
view.stderr.on("data", (chunk: Buffer) => (out += String(chunk)))

const urlOf = async (): Promise<string> => {
  for (let waited = 0; waited < 300; waited += 1) {
    const url = /(http:\/\/127\.0\.0\.1:\d+)/.exec(out)?.[1]
    if (url !== undefined) return url
    await new Promise((resolve) => setTimeout(resolve, 100))
  }
  return fail(`the packed CLI never printed a URL:\n${out}`)
}

const url = await urlOf()
const page = await fetch(url)
const body = await page.text()
view.kill("SIGINT")

if (page.status !== 200 || !body.includes("<script")) {
  fail(`the packed CLI served no page: ${page.status}\n${body.slice(0, 200)}`)
}

rmSync(temp, { recursive: true, force: true })
console.log(`verify:pack — the packed package serves the viewer (${url})`)
