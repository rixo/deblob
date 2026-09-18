/**
 * The resolver over the fs port — what a case's tree of strings resolves
 * through. Deliberately the smaller resolver: relative and absolute specifiers
 * with the script extensions, the `.js` → `.ts` aliases and `index`; a builtin
 * under its `node:` name; a bare specifier by the nearest `node_modules` in the
 * tree (its manifest's `main`, else `index`). No tsconfig paths, no exports
 * maps, no symlinks: a case needing them is a node-run case, and no rule
 * depends on how a specifier resolves, only on where it lands.
 */

import { isBuiltin } from "node:module"
import { dirname, extname, isAbsolute, join, resolve } from "node:path"

import type { Fs } from "../../fs/fs.port.ts"
import { packageNameOf } from "../graph.model.ts"
import type { Resolution, Resolver } from "../ports/resolver.port.ts"

const EXTENSIONS = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".json",
]

/** A written extension that may stand for a TypeScript source next to it. */
const ALIASES: Readonly<Record<string, readonly string[]>> = {
  ".js": [".ts", ".tsx", ".js"],
  ".jsx": [".tsx", ".jsx"],
  ".mjs": [".mts", ".mjs"],
  ".cjs": [".cts", ".cjs"],
}

/** The files a path may name, in the order the node resolver tries them. */
const candidatesOf = (path: string): string[] => {
  const written = extname(path)
  const aliased = (ALIASES[written] ?? []).map(
    (extension) => path.slice(0, -written.length) + extension,
  )
  return [
    path,
    ...aliased,
    ...EXTENSIONS.map((extension) => path + extension),
    ...EXTENSIONS.map((extension) => join(path, `index${extension}`)),
  ]
}

export const createFsResolver = ({
  fs,
}: {
  fs: Pick<Fs, "exists" | "stat" | "readFile">
}): Resolver => {
  const fileAt = async (path: string): Promise<string | null> => {
    for (const candidate of candidatesOf(path)) {
      if ((await fs.stat(candidate)) !== null) return candidate
    }
    return null
  }

  const landing = async (
    path: string,
    specifier: string,
  ): Promise<Resolution> => {
    const found = await fileAt(path)
    return found === null
      ? { kind: "unresolved", reason: `${specifier} names no file in the tree` }
      : { kind: "file", path: found }
  }

  /** The nearest `node_modules/<name>` up from `dir`, or `null`. */
  const packageDirOf = async (
    dir: string,
    name: string,
  ): Promise<string | null> => {
    for (;;) {
      const candidate = join(dir, "node_modules", name)
      if (await fs.exists(candidate)) return candidate
      const parent = dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  }

  const resolveSpecifier = async (
    fromAbsolutePath: string,
    specifier: string,
  ): Promise<Resolution> => {
    if (isBuiltin(specifier)) {
      return {
        kind: "builtin",
        specifier: specifier.startsWith("node:")
          ? specifier
          : `node:${specifier}`,
      }
    }
    const from = dirname(fromAbsolutePath)
    if (specifier.startsWith(".") || isAbsolute(specifier)) {
      return landing(resolve(from, specifier), specifier)
    }
    // bare by the guard above, so the package name is never null
    const name = packageNameOf(specifier) as string
    const packageDir = await packageDirOf(from, name)
    if (packageDir === null) {
      return {
        kind: "unresolved",
        reason: `${specifier} names no package in the tree`,
      }
    }
    const subpath = specifier.slice(name.length + 1)
    if (subpath !== "") return landing(join(packageDir, subpath), specifier)
    const manifest = await fs.readFile(join(packageDir, "package.json"))
    const main =
      manifest === null
        ? undefined
        : (JSON.parse(manifest) as { main?: unknown }).main
    return landing(
      join(packageDir, typeof main === "string" ? main : "index"),
      specifier,
    )
  }

  return { resolve: resolveSpecifier }
}
