import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll } from "vitest"

import { createVitestTestingApi } from "../../test/adapters/vitest-testing-api.adapter.ts"
import {
  RESOLVER_TREE,
  createResolverTestSuite,
} from "../resolver-test-suite.service.ts"
import { createOxcResolver } from "./oxc-resolver.adapter.ts"

const roots: string[] = []
afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))),
)

createResolverTestSuite({ api: createVitestTestingApi() }).run({
  name: "createOxcResolver",
  // the tree on disk: oxc-resolver reads nothing else
  make: async () => {
    const root = await mkdtemp(join(tmpdir(), "deblob-oxc-resolver-"))
    roots.push(root)
    for (const [path, content] of Object.entries(RESOLVER_TREE)) {
      await mkdir(dirname(join(root, path)), { recursive: true })
      await writeFile(join(root, path), content)
    }
    return { resolver: createOxcResolver(), root }
  },
})
