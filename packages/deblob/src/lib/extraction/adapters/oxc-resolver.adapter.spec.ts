import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { createVitestTestingApi } from "../../test/adapters/vitest-testing-api.adapter.ts"
import {
  RESOLVER_TREE,
  createResolverTestSuite,
} from "../resolver-test-suite.service.ts"
import { createNodeFs } from "../../fs/adapters/node-fs.adapter.ts"
import {
  createOxcResolver,
  createTsconfigLocator,
} from "./oxc-resolver.adapter.ts"

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

describe("createTsconfigLocator", () => {
  const { tsconfigPathOf } = createTsconfigLocator({ fs: createNodeFs() })
  const roots: string[] = []
  const makeRoot = async (withTsconfig: boolean): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), "deblob-tsconfig-"))
    roots.push(root)
    if (withTsconfig) await writeFile(join(root, "tsconfig.json"), "{}\n")
    return root
  }
  afterAll(() =>
    Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    ),
  )

  it("discovers tsconfig.json at the root when undeclared", async () => {
    const root = await makeRoot(true)
    expect(await tsconfigPathOf({ root, tsconfig: undefined })).toBe(
      join(root, "tsconfig.json"),
    )
  })

  it("yields null when undeclared and the root has none", async () => {
    const root = await makeRoot(false)
    expect(await tsconfigPathOf({ root, tsconfig: undefined })).toBeNull()
  })

  it("disables discovery on false, even when the file exists", async () => {
    const root = await makeRoot(true)
    expect(await tsconfigPathOf({ root, tsconfig: false })).toBeNull()
  })

  it("returns a declared path that exists", async () => {
    const root = await makeRoot(true)
    const declared = join(root, "tsconfig.json")
    expect(await tsconfigPathOf({ root, tsconfig: declared })).toBe(declared)
  })

  it("throws a teaching error on a declared-but-missing path — declared means load-bearing", async () => {
    const root = await makeRoot(false)
    await expect(
      tsconfigPathOf({ root, tsconfig: join(root, "tsconfig.json") }),
    ).rejects.toThrowError(/"tsconfig".*does not exist/s)
  })
})
