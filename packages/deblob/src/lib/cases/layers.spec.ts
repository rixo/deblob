import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

const ROWS: readonly Row[] = [
  {
    name: "a model importing a service is inward-deps on the import line, and runtime-import: as a type it would pass",
    files: {
      "src/totals.service.ts": `
        export const createTotals = () => ({ sum: (xs: number[]) => xs.length })
      `,
      "src/report.model.ts": `
        import { createTotals } from "./totals.service.ts" // red inward-deps, runtime-import: a model reaching outward
        export const report = () => createTotals().sum([])
      `,
    },
    checks: ["layers"],
  },
  {
    name: "a bare import lands in the tree's node_modules and reads through its manifest: concrete in a service is service-purity",
    files: {
      "node_modules/made-up-pkg/package.json": JSON.stringify({
        name: "made-up-pkg",
        main: "./index.js",
      }),
      "node_modules/made-up-pkg/index.js": "module.exports = {}",
      "src/app.service.ts": `
        import pkg from "made-up-pkg" // red service-purity, runtime-import: a concrete package in a service
        export const createApp = () => pkg
      `,
    },
    checks: ["layers"],
  },
]

describe("layers", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    expect(await judge(row)).toEqual(AS_MARKED)
  })
})
