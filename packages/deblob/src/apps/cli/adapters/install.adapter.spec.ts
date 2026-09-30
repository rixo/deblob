import { describe, expect, it } from "vitest"

import { createMemoryFs } from "../../../lib/fs/adapters/memory-fs.adapter.ts"
import { createInstall } from "./install.adapter.ts"

describe("createInstall", () => {
  it("reads the version off the install's manifest, and anchors both roots there", async () => {
    const install = createInstall({
      fs: createMemoryFs({
        "/made-up/pkg/package.json": '{"version":"9.9.9"}',
      }),
      packageRoot: "/made-up/pkg",
    })
    expect(await install.version()).toBe("9.9.9")
    expect(install.contentRoot).toBe("/made-up/pkg/dist/content")
    expect(install.bundleRoot).toBe("/made-up/pkg/dist/viewer")
  })

  it("throws on an install without a manifest — a broken package, loud", async () => {
    const install = createInstall({
      fs: createMemoryFs({}),
      packageRoot: "/made-up/pkg",
    })
    await expect(install.version()).rejects.toThrow("no package.json")
  })

  it("defaults to the package it ships in", async () => {
    const install = createInstall({
      fs: createMemoryFs({}),
    })
    expect(install.contentRoot).toMatch(/packages\/deblob\/dist\/content$/)
  })
})
