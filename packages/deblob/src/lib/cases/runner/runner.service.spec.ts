import { describe, expect, it } from "vitest"

import type { Violation } from "../../check/violation.model.ts"
import type { BrokenSite } from "../../extraction/graph.model.ts"
import { AS_MARKED } from "./markers.model.ts"
import type { Check } from "./ports/check.port.ts"
import { createRunner } from "./runner.service.ts"

/** A check port answering a fixed report, recording what it was asked. */
const fakeCheck = (
  violations: readonly Violation[],
  broken: readonly BrokenSite[] = [],
) => {
  const asked: Parameters<Check["run"]>[0][] = []
  const check: Check = {
    run: async (input) => {
      asked.push(input)
      return { violations: [...violations], broken }
    },
  }
  return { check, asked }
}

const reported = (file: string, ...rules: string[]): Violation =>
  ({ check: "layers", rules, file }) as unknown as Violation

describe("createRunner", () => {
  it("judges a broken run like any other: where it breaks and every verdict it reaches, each claimed", async () => {
    const { check } = fakeCheck(
      [reported("src/a.model.ts", "inward-deps")],
      [{ file: "src/a.model.ts", line: 2, reason: "a reason" }],
    )
    const { judge } = createRunner({ check })
    expect(
      await judge({
        files: {
          "src/a.model.ts": `import { x } from "./x.service.ts"\nexport const B: ReadonlyMap = new Map() // broken -- why\n// red: inward-deps`,
        },
      }),
    ).toEqual({ ...AS_MARKED, expectedFailures: [] })
  })

  it("judges a row as marked when the chain reports exactly what its markers claim", async () => {
    const { check } = fakeCheck([reported("src/a.model.ts", "inward-deps")])
    const { judge } = createRunner({ check })
    expect(
      await judge({
        files: {
          "src/a.model.ts": `import { x } from "./x.service.ts"\nexport const A = x\n// red: inward-deps`,
        },
      }),
    ).toEqual({ ...AS_MARKED, expectedFailures: [] })
  })

  it("lists what the chain reports beyond the markers, and what the markers claim beyond the chain", async () => {
    const { check } = fakeCheck([reported("src/a.model.ts", "inward-deps")])
    const { judge } = createRunner({ check })
    expect(
      await judge({
        files: {
          "src/a.model.ts": `export const A = 1`,
          "src/b.model.ts": `export const B = 1 // red: private-sealed -- not really`,
        },
      }),
    ).toEqual({
      missing: ["src/b.model.ts:1 private-sealed"],
      unexpected: ["src/a.model.ts inward-deps"],
      unexpectedPasses: [],
      expectedFailures: [],
    })
  })

  it("rejects a row whose marker does not parse, never judging it green", async () => {
    const { check } = fakeCheck([])
    const { judge } = createRunner({ check })
    await expect(
      judge({
        files: { "src/a.model.ts": `export const A = 1 // red inward-deps` },
      }),
    ).rejects.toThrow(/src\/a\.model\.ts:1: malformed marker/)
  })

  it("hands the port the row's config and the checks it names, every check when it names none", async () => {
    const { check, asked } = fakeCheck([])
    const { judge } = createRunner({ check })
    await judge({ files: {}, config: { pure: ["made-up"] }, checks: ["dag"] })
    await judge({ files: {} })
    expect(asked).toEqual([
      { config: { pure: ["made-up"] }, checks: ["dag"] },
      { config: {} },
    ])
  })
})
