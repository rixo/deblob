import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

const ROWS: readonly Row[] = [
  {
    name: "two services importing each other is no-service-cycle on both closing lines, type-only included",
    files: {
      "src/a/a.model.ts": `
        import { B } from "../b/b.model.ts" // red no-service-cycle
        export const A = B + 1
      `,
      "src/b/b.model.ts": `
        import type { A } from "../a/a.model.ts" // red no-service-cycle: type-only still counts for the service DAG
        export const B = 1 as unknown as typeof A
      `,
    },
    checks: ["dag"],
  },
  {
    name: "a runtime module cycle inside one service is no-runtime-cycle on every file of it",
    files: {
      "src/app/x.model.ts": `
        import { Y } from "./y.model.ts" // red no-runtime-cycle
        export const X = () => Y
      `,
      "src/app/y.model.ts": `
        import { X } from "./x.model.ts" // red no-runtime-cycle
        export const Y = () => X
      `,
    },
    checks: ["dag"],
  },
]

describe("dag", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    expect(await judge(row)).toEqual(AS_MARKED)
  })
})
