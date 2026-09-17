import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, test } from "vitest"

import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
import { createNodeFs } from "./adapters/node-fs.adapter.ts"
import type { Fs } from "./fs.port.ts"

/** One tree, read through both adapters — the contract is what they share. */
const TREE: Readonly<Record<string, string>> = {
  "src/app.model.ts": "export const SOME_MADE_UP_CONST = 1\n",
  "src/deep/util.ts": "é",
  "src/.hidden/secret.ts": "",
  "node_modules/made-up-dep/index.js": "",
  "notes.md": "# made up\n",
}

const roots: string[] = []
afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))),
)

/** The node adapter over the tree materialized in a temp dir, removed after. */
const nodeCase = async (): Promise<{ fs: Fs; root: string }> => {
  const root = await mkdtemp(join(tmpdir(), "deblob-fs-"))
  roots.push(root)
  for (const [path, content] of Object.entries(TREE)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return { fs: createNodeFs(), root }
}

const memoryCase = async (): Promise<{ fs: Fs; root: string }> => {
  const root = "/made-up-root"
  return {
    fs: createMemoryFs(
      Object.fromEntries(
        Object.entries(TREE).map(([path, content]) => [
          join(root, path),
          content,
        ]),
      ),
    ),
    root,
  }
}

describe("Fs", () => {
  for (const [name, make] of [
    ["node-fs", nodeCase],
    ["memory-fs", memoryCase],
  ] as const) {
    describe(name, () => {
      test("readFile: the contents as UTF-8; null for a missing path or one through a file", async () => {
        const { fs, root } = await make()
        expect(await fs.readFile(join(root, "src/app.model.ts"))).toBe(
          "export const SOME_MADE_UP_CONST = 1\n",
        )
        expect(await fs.readFile(join(root, "src/deep/util.ts"))).toBe("é")
        expect(await fs.readFile(join(root, "src/SOME_MISSING.ts"))).toBeNull()
        expect(
          await fs.readFile(join(root, "src/app.model.ts/inside.ts")),
        ).toBeNull()
      })

      test("exists: a file, a directory; not a missing path or one through a file", async () => {
        const { fs, root } = await make()
        expect(await fs.exists(join(root, "src/app.model.ts"))).toBe(true)
        expect(await fs.exists(join(root, "src/deep"))).toBe(true)
        expect(await fs.exists(join(root, "src/SOME_MISSING.ts"))).toBe(false)
        expect(await fs.exists(join(root, "src/none"))).toBe(false)
        expect(await fs.exists(join(root, "notes.md/x"))).toBe(false)
      })

      test("stat: a file's byte size; null for a missing path", async () => {
        const { fs, root } = await make()
        expect(await fs.stat(join(root, "src/app.model.ts"))).toEqual({
          size: 36,
        })
        // two bytes: size is bytes, never characters
        expect(await fs.stat(join(root, "src/deep/util.ts"))).toEqual({
          size: 2,
        })
        expect(await fs.stat(join(root, "src/SOME_MISSING.ts"))).toBeNull()
      })

      test("glob: cwd-relative POSIX paths matching the patterns, ignores out, hidden segments never", async () => {
        const { fs, root } = await make()
        expect(
          (
            await fs.glob(["**"], {
              cwd: root,
              ignore: ["**/node_modules/**"],
            })
          ).sort(),
        ).toEqual(["notes.md", "src/app.model.ts", "src/deep/util.ts"])
        expect((await fs.glob(["src/**/*.ts"], { cwd: root })).sort()).toEqual([
          "src/app.model.ts",
          "src/deep/util.ts",
        ])
        expect(
          await fs.glob(["src/**"], { cwd: join(root, "src/none") }),
        ).toEqual([])
      })
    })
  }

  test("node-fs: any failure but a missing path flies — a directory read as a file, a name too long", async () => {
    const { fs, root } = await nodeCase()
    await expect(fs.readFile(join(root, "src"))).rejects.toThrow(/EISDIR/)
    const overlong = join(root, "x".repeat(300))
    await expect(fs.stat(overlong)).rejects.toThrow(/ENAMETOOLONG/)
    await expect(fs.readFile(overlong)).rejects.toThrow(/ENAMETOOLONG/)
  })

  test("memory-fs exposes its files for assertions", () => {
    const fs = createMemoryFs({ "/made-up-root/a.ts": "" })
    expect([...fs.files.keys()]).toEqual(["/made-up-root/a.ts"])
  })
})
