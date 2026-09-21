import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

const ROWS: readonly Row[] = [
  {
    name: "two services importing each other is no-service-cycle on both closing files, type-only included",
    files: {
      "src/a/a.model.ts": `
        import { B } from "../b/b.model.ts"
        export const A = B + 1
        // red: no-service-cycle -- the import of b
      `,
      "src/b/b.model.ts": `
        import type { A } from "../a/a.model.ts"
        export const B = 1 as unknown as typeof A
        // red: no-service-cycle -- the import of a: type-only still counts for the service DAG
      `,
    },
    checks: ["dag"],
  },
  {
    name: "a runtime module cycle inside one service is no-runtime-cycle on every file of it",
    files: {
      "src/app/x.model.ts": `
        import { Y } from "./y.model.ts"
        export const X = () => Y
        // red: no-runtime-cycle -- the import of y
      `,
      "src/app/y.model.ts": `
        import { X } from "./x.model.ts"
        export const Y = () => X
        // red: no-runtime-cycle -- the import of x
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
