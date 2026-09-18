import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { createVitestTestingApi } from "../../test/adapters/vitest-testing-api.adapter.ts"
import { FS_TREE, createFsTestSuite } from "../fs-test-suite.service.ts"
import { createNodeFs } from "./node-fs.adapter.ts"

const roots: string[] = []
afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))),
)

/** The tree on disk, in a temp dir removed after. */
const onDisk = async (): Promise<string> => {
  const root = await mkdtemp(join(tmpdir(), "deblob-node-fs-"))
  roots.push(root)
  for (const [path, content] of Object.entries(FS_TREE)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  return root
}

createFsTestSuite({ api: createVitestTestingApi() }).run({
  name: "createNodeFs",
  make: async () => ({ fs: createNodeFs(), root: await onDisk() }),
})

describe("createNodeFs", () => {
  it("lets any failure but a missing path fly — a directory read as a file, a name too long", async () => {
    const root = await onDisk()
    const fs = createNodeFs()
    await expect(fs.readFile(join(root, "src"))).rejects.toThrow(/EISDIR/)
    const overlong = join(root, "x".repeat(300))
    await expect(fs.stat(overlong)).rejects.toThrow(/ENAMETOOLONG/)
    await expect(fs.readFile(overlong)).rejects.toThrow(/ENAMETOOLONG/)
  })
})
