import { join } from "node:path"

import { describe, expect, it } from "vitest"

import { createVitestTestingApi } from "../../test/adapters/vitest-testing-api.adapter.ts"
import {
  FS_EMPTY_DIRS,
  FS_TREE,
  createFsTestSuite,
} from "../fs-test-suite.service.ts"
import { createMemoryFs } from "./memory-fs.adapter.ts"

const ROOT = "/made-up-root"

createFsTestSuite({ api: createVitestTestingApi() }).run({
  name: "createMemoryFs",
  make: async () => ({
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
  }),
})

describe("createMemoryFs", () => {
  it("exposes its files for assertions", () => {
    const fs = createMemoryFs({ "/made-up-root/a.ts": "" })
    expect([...fs.files.keys()]).toEqual(["/made-up-root/a.ts"])
  })
})
