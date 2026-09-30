import { describe, expect, it } from "vitest"

import type { Violation } from "../../check/violation.model.ts"
import type { ResolvedConfig } from "../../config/config.service.ts"
import type {
  BrokenSite,
  ImportGraph,
  UnresolvedImport,
} from "../../extraction/graph.model.ts"
import { AS_MARKED } from "./markers.model.ts"
import { createRunner } from "./runner.service.ts"

/**
 * The runner over a chain answering a fixed report: the config resolution
 * records the raw value and the root, the judge the checks it was asked; the
 * graph carries only what the runner reads, the broken sites and the unresolved
 * imports.
 */
const fakeChain = (
  violations: readonly Violation[],
  broken: readonly BrokenSite[] = [],
  unresolved: readonly UnresolvedImport[] = [],
) => {
  const resolved: { raw: unknown; root: string }[] = []
  const judged: (readonly string[] | undefined)[] = []
  const runner = createRunner({
    root: "/made-up-case",
    config: {
      resolve: (raw, root) => {
        resolved.push({ raw, root })
        return {} as ResolvedConfig
      },
    },
    judge: {
      judge: async (_config, checks) => {
        judged.push(checks)
        return {
          files: [],
          graph: { unresolved, broken } as unknown as ImportGraph,
          surface: null,
          surfaceReport: {
            violations: [],
            unverified: [],
            checked: 0,
            disclosed: 0,
          },
          violations: [...violations],
        }
      },
    },
  })
  return { ...runner, resolved, judged }
}

const reported = (file: string, ...rules: string[]): Violation =>
  ({ check: "layers", rules, file }) as unknown as Violation

describe("createRunner", () => {
  it("judges a broken run like any other: where it breaks and every verdict it reaches, each claimed", async () => {
    const { judge } = fakeChain(
      [reported("src/a.model.ts", "inward-deps")],
      [{ file: "src/a.model.ts", line: 2, reason: "a reason" }],
    )
    expect(
      await judge({
        files: {
          "src/a.model.ts": `import { x } from "./x.service.ts"\nexport const B: ReadonlyMap = new Map() // broken -- why\n// red: inward-deps`,
        },
      }),
    ).toEqual({ ...AS_MARKED, expectedFailures: [] })
  })

  it("judges a row as marked when the chain reports exactly what its markers claim", async () => {
    const { judge } = fakeChain([reported("src/a.model.ts", "inward-deps")])
    expect(
      await judge({
        files: {
          "src/a.model.ts": `import { x } from "./x.service.ts"\nexport const A = x\n// red: inward-deps`,
        },
      }),
    ).toEqual({ ...AS_MARKED, expectedFailures: [] })
  })

  it("lists what the chain reports beyond the markers, and what the markers claim beyond the chain", async () => {
    const { judge } = fakeChain([reported("src/a.model.ts", "inward-deps")])
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
    const { judge } = fakeChain([])
    await expect(
      judge({
        files: { "src/a.model.ts": `export const A = 1 // red inward-deps` },
      }),
    ).rejects.toThrow(/src\/a\.model\.ts:1: malformed marker/)
  })

  it("resolves the row's config at the case's root, and asks the checks it names, every check when it names none", async () => {
    const { judge, resolved, judged } = fakeChain([])
    await judge({ files: {}, config: { pure: ["made-up"] }, checks: ["dag"] })
    await judge({ files: {} })
    expect(resolved).toEqual([
      { raw: { pure: ["made-up"] }, root: "/made-up-case" },
      { raw: {}, root: "/made-up-case" },
    ])
    expect(judged).toEqual([["dag"], undefined])
  })

  it("fails a case a literal import of which does not resolve — never a green line", async () => {
    const { judge } = fakeChain(
      [],
      [],
      [
        {
          from: "src/a.model.ts",
          specifier: "./made-up.ts",
          reason: "a reason",
          literal: true,
        } as UnresolvedImport,
      ],
    )
    await expect(judge({ files: {} })).rejects.toThrow(
      "the case does not resolve: src/a.model.ts → ./made-up.ts (a reason)",
    )
  })
})
