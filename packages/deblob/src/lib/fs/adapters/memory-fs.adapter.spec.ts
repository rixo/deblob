import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { FS_EMPTY_DIRS, FS_TREE, describeFs } from "../fs.suite.ts"
import { createMemoryFs } from "./memory-fs.adapter.ts"

const ROOT = "/made-up-root"

describeFs("createMemoryFs", async () => ({
  fs: createMemoryFs(
    Object.fromEntries(
      Object.entries(FS_TREE).map(([path, content]) => [
        join(ROOT, path),
        content,
      ]),
    ),
    { dirs: FS_EMPTY_DIRS.map((dir) => join(ROOT, dir)) },
  ),
  root: ROOT,
}))

describe("createMemoryFs", () => {
  it("exposes its files for assertions", () => {
    const fs = createMemoryFs({ "/made-up-root/a.ts": "" })
    expect([...fs.files.keys()]).toEqual(["/made-up-root/a.ts"])
  })

  it("places a tree written relative to a root under it", async () => {
    const fs = createMemoryFs({ "src/a.ts": "A" }, { root: "/made-up-root" })
    expect([...fs.files.keys()]).toEqual(["/made-up-root/src/a.ts"])
    expect(await fs.readFile("/made-up-root/src/a.ts")).toBe("A")
  })
})
