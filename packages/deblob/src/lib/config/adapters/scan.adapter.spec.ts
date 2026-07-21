import { fileURLToPath } from "node:url"

import { describe, expect, it } from "vitest"

import { DEFAULT_INCLUDE, EXCLUDE_BASELINE } from "../config.model.ts"
import { scanCoverage } from "./scan.adapter.ts"

const root = fileURLToPath(
  new URL("../__fixtures__/scan-tree", import.meta.url),
)

const scan = (
  overrides: Partial<{ include: string[]; exclude: string[] }> = {},
) =>
  scanCoverage({
    root,
    include: overrides.include ?? [...DEFAULT_INCLUDE],
    exclude: [...EXCLUDE_BASELINE, ...(overrides.exclude ?? [])],
  })

describe("scanCoverage", () => {
  it("covers the whole tree by default — baseline out, extensions gated, hidden skipped, sorted", async () => {
    expect(await scan()).toEqual([
      "scripts/task.js",
      "src/app.model.ts",
      "src/app.ts",
      "src/widget.svelte",
    ])
    // absent by construction: node_modules/ and dist/ (baseline),
    // .hidden-tool/ (dot-segment), styles.css and notes.md (extension gate)
  })

  it("appended user excludes remove more", async () => {
    expect(await scan({ exclude: ["scripts/**"] })).toEqual([
      "src/app.model.ts",
      "src/app.ts",
      "src/widget.svelte",
    ])
  })

  it("a tightened include narrows coverage", async () => {
    expect(await scan({ include: ["src/**"] })).toEqual([
      "src/app.model.ts",
      "src/app.ts",
      "src/widget.svelte",
    ])
  })
})
