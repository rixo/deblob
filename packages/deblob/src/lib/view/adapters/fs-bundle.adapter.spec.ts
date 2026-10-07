import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"

import { describe, expect, test as base } from "vitest"

import { createFsBundle } from "./fs-bundle.adapter.ts"

const FAKE_INDEX = "<!doctype html>FAKE INDEX"

/**
 * The bundle on disk, made once for the file by the runner and removed after:
 * `root` holds an index and an empty `assets`, a file sits beside it, outside.
 */
const test = base.extend<{ root: string }>({
  root: [
    async ({}, use) => {
      const dir = await mkdtemp(join(tmpdir(), "deblob-bundle-"))
      const root = join(dir, "bundle")
      await mkdir(join(root, "assets"), { recursive: true })
      await writeFile(join(root, "index.html"), FAKE_INDEX)
      await writeFile(join(dir, "OUTSIDE.txt"), "FAKE SECRET")
      await use(root)
      await rm(dir, { recursive: true, force: true })
    },
    { scope: "file" },
  ],
})

describe("createFsBundle", () => {
  test("a file in the bundle reads back", async ({ root }) => {
    const files = createFsBundle({ root })
    const body = await files.read("index.html")
    expect(new TextDecoder().decode(body as Uint8Array)).toBe(FAKE_INDEX)
  })

  test("a file the bundle does not hold is null", async ({ root }) => {
    const files = createFsBundle({ root })
    await expect(files.read("assets/FAKE.js")).resolves.toBeNull()
  })

  test("a directory is not a file, so it is null too", async ({ root }) => {
    const files = createFsBundle({ root })
    await expect(files.read("assets")).resolves.toBeNull()
  })

  test("a name resolving outside the root is refused, not read", async ({
    root,
  }) => {
    const files = createFsBundle({ root })
    await expect(files.read("../OUTSIDE.txt")).resolves.toBeNull()
  })

  test("a root that is not a directory is the server's failure, not an answer", async ({
    root,
  }) => {
    const files = createFsBundle({ root: join(root, "index.html") })
    await expect(files.read("index.html")).rejects.toThrow()
  })
})
