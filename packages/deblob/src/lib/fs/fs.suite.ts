/**
 * The fs port's own suite: what every adapter of `Fs` promises, stated once,
 * knowing no adapter. An adapter's spec materializes `FS_TREE` where its
 * adapter reads and calls `describeFs` with a function that makes the adapter:
 * the sentences register under the adapter's name. A suite: a file of the test
 * kind the runner does not collect.
 */

import { join } from "node:path"

import { describe, expect, it } from "vitest"

import type { Fs } from "./fs.port.ts"

/** Root-relative path → content: the tree every sentence below reads. */
export const FS_TREE: Readonly<Record<string, string>> = {
  "src/app.model.ts": "export const SOME_MADE_UP_CONST = 1\n",
  "src/deep/util.ts": "é",
  "src/.hidden/secret.ts": "",
  "node_modules/made-up-dep/index.js": "",
  "notes.md": "# made up\n",
}

/** Root-relative directories with nothing in them, created next to `FS_TREE`. */
export const FS_EMPTY_DIRS: readonly string[] = ["src/empty"]

export const describeFs = (
  /** The unit under test — the adapter's factory name. */
  name: string,
  /** The adapter over `FS_TREE` materialized under `root`. */
  make: () => Promise<{ fs: Fs; root: string }>,
): void => {
  describe(name, () => {
    const ready = async () => {
      const { fs, root } = await make()
      return { fs, at: (path: string) => join(root, path) }
    }

    it("reads a file's contents as UTF-8", async () => {
      const { fs, at } = await ready()
      expect(await fs.readFile(at("src/app.model.ts"))).toEqual(
        "export const SOME_MADE_UP_CONST = 1\n",
      )
      expect(await fs.readFile(at("src/deep/util.ts"))).toEqual("é")
    })

    it("reads null for a missing path, or a path through a file", async () => {
      const { fs, at } = await ready()
      expect(await fs.readFile(at("src/SOME_MISSING.ts"))).toEqual(null)
      expect(await fs.readFile(at("src/app.model.ts/inside.ts"))).toEqual(null)
    })

    it("says a file exists, and a directory, an empty one too", async () => {
      const { fs, at } = await ready()
      expect(await fs.exists(at("src/app.model.ts"))).toEqual(true)
      expect(await fs.exists(at("src/deep"))).toEqual(true)
      expect(await fs.exists(at("src/empty"))).toEqual(true)
    })

    it("says a missing path does not exist, nor a path through a file", async () => {
      const { fs, at } = await ready()
      expect(await fs.exists(at("src/SOME_MISSING.ts"))).toEqual(false)
      expect(await fs.exists(at("src/none"))).toEqual(false)
      expect(await fs.exists(at("notes.md/x"))).toEqual(false)
    })

    it("stats a file's size in bytes, never characters", async () => {
      const { fs, at } = await ready()
      expect(await fs.stat(at("src/app.model.ts"))).toEqual({ size: 36 })
      expect(await fs.stat(at("src/deep/util.ts"))).toEqual({ size: 2 })
    })

    it("stats null for a missing path, and for a directory", async () => {
      const { fs, at } = await ready()
      expect(await fs.stat(at("src/SOME_MISSING.ts"))).toEqual(null)
      expect(await fs.stat(at("src/deep"))).toEqual(null)
      expect(await fs.stat(at("src/empty"))).toEqual(null)
    })

    it("globs cwd-relative POSIX paths, ignores out, hidden segments never", async () => {
      const { fs, at } = await ready()
      expect(
        (
          await fs.glob(["**"], {
            cwd: at("."),
            ignore: ["**/node_modules/**"],
          })
        ).sort(),
      ).toEqual(["notes.md", "src/app.model.ts", "src/deep/util.ts"])
      expect((await fs.glob(["src/**/*.ts"], { cwd: at(".") })).sort()).toEqual(
        ["src/app.model.ts", "src/deep/util.ts"],
      )
    })

    it("globs nothing under a cwd that is not there", async () => {
      const { fs, at } = await ready()
      expect(await fs.glob(["src/**"], { cwd: at("src/none") })).toEqual([])
      expect(await fs.globDirs(["src/**"], { cwd: at("src/none") })).toEqual([])
    })

    it("globs directories the same way: no trailing slash, never cwd itself, a pattern's own directory among them, an empty one too", async () => {
      const { fs, at } = await ready()
      expect(
        (
          await fs.globDirs(["**"], {
            cwd: at("."),
            ignore: ["**/node_modules/**"],
          })
        ).sort(),
      ).toEqual(["src", "src/deep", "src/empty"])
      expect((await fs.globDirs(["**"], { cwd: at(".") })).sort()).toEqual([
        "node_modules",
        "node_modules/made-up-dep",
        "src",
        "src/deep",
        "src/empty",
      ])
      expect((await fs.globDirs(["src/**"], { cwd: at(".") })).sort()).toEqual([
        "src",
        "src/deep",
        "src/empty",
      ])
      expect(await fs.globDirs(["src/**/*.ts"], { cwd: at(".") })).toEqual([])
    })
  })
}
