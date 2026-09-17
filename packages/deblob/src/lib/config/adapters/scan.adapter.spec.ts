import { fileURLToPath } from "node:url"

import { describe, expect, test } from "vitest"

import {
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
  hasCoverageExtension,
} from "../config.model.ts"
import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import { createNodeFs } from "../../fs/adapters/node-fs.adapter.ts"
import { createCoverageScan } from "./scan.adapter.ts"

const { scanCoverage, statSizes } = createCoverageScan({ fs: createNodeFs() })

const root = fileURLToPath(
  new URL("../__fixtures__/scan-tree", import.meta.url),
)

const scan = (
  overrides: Partial<{
    include: string[]
    exclude: string[]
    covers: (path: string) => boolean
  }> = {},
) =>
  scanCoverage({
    root,
    include: overrides.include ?? [...DEFAULT_INCLUDE],
    exclude: [...EXCLUDE_BASELINE, ...(overrides.exclude ?? [])],
    covers: overrides.covers ?? hasCoverageExtension,
  })

describe("scanCoverage", () => {
  test("covers the whole tree by default — baseline out, the gate applied, hidden skipped, sorted", async () => {
    expect(await scan()).toEqual([
      "scripts/task.js",
      "src/app.model.ts",
      "src/app.ts",
    ])
    // absent by construction: node_modules/ and dist/ (baseline),
    // .hidden-tool/ (dot-segment), styles.css, notes.md and widget.svelte
    // (the gate: a script extension, or named by a designation or a binding)
  })

  test("the gate is the config's: a file named by a designation or a binding enters whatever its extension", async () => {
    expect(
      await scan({
        covers: (path) =>
          hasCoverageExtension(path) || path === "src/widget.svelte",
      }),
    ).toEqual([
      "scripts/task.js",
      "src/app.model.ts",
      "src/app.ts",
      "src/widget.svelte",
    ])
  })

  test("appended user excludes remove more", async () => {
    expect(await scan({ exclude: ["scripts/**"] })).toEqual([
      "src/app.model.ts",
      "src/app.ts",
    ])
  })

  test("a tightened include narrows coverage", async () => {
    expect(await scan({ include: ["src/**"] })).toEqual([
      "src/app.model.ts",
      "src/app.ts",
    ])
  })
})

describe("statSizes", () => {
  test("returns the byte size per covered file, paths preserved", async () => {
    const files = await scan({ include: ["src/**"] })
    const sizes = await statSizes(root, files)
    expect(sizes.map((entry) => entry.path)).toEqual([...files])
    for (const entry of sizes) {
      expect(entry.size).toBeGreaterThan(0)
    }
  })

  test("a covered file gone since the scan is a race, not a case — loud", async () => {
    const scan = createCoverageScan({ fs: createMemoryFs({}) })
    await expect(
      scan.statSizes("/made-up-root", ["src/app.ts"]),
    ).rejects.toThrow(/vanished: src\/app\.ts/)
  })
})

describe("over the memory fs", () => {
  test("the scan is the port's: a tree of strings lists like the disk, gated and sorted", async () => {
    const scan = createCoverageScan({
      fs: createMemoryFs({
        "/made-up-root/src/app.ts": "",
        "/made-up-root/src/app.model.ts": "",
        "/made-up-root/src/notes.md": "",
        "/made-up-root/node_modules/dep/index.js": "",
      }),
    })
    const files = await scan.scanCoverage({
      root: "/made-up-root",
      include: [...DEFAULT_INCLUDE],
      exclude: [...EXCLUDE_BASELINE],
      covers: hasCoverageExtension,
    })
    expect(files).toEqual(["src/app.model.ts", "src/app.ts"])
    expect(await scan.statSizes("/made-up-root", files)).toEqual([
      { path: "src/app.model.ts", size: 0 },
      { path: "src/app.ts", size: 0 },
    ])
  })
})
