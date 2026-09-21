import { describe, expect, it } from "vitest"

import type { Violation } from "../../check/violation.model.ts"
import {
  markersOf,
  matchVerdicts,
  reportedOf,
  stripMarkers,
} from "./markers.model.ts"

describe("markersOf", () => {
  it("reads `// red <slug>` at a line's end, several slugs, an optional why; other comments are not markers", () => {
    const source = [
      'import { x } from "./x.ts" // red inward-deps: a model importing a service',
      "const a = 1 // not a marker",
      "run() //red private-sealed, inward-deps",
      "// red inward-deps",
    ].join("\n")
    expect(markersOf("src/a.model.ts", source)).toEqual([
      {
        file: "src/a.model.ts",
        line: 1,
        slug: "inward-deps",
        why: "a model importing a service",
      },
      { file: "src/a.model.ts", line: 3, slug: "private-sealed", why: null },
      { file: "src/a.model.ts", line: 3, slug: "inward-deps", why: null },
      { file: "src/a.model.ts", line: 4, slug: "inward-deps", why: null },
    ])
  })

  it("throws on a marker naming no rule, with the line", () => {
    expect(() =>
      markersOf("src/a.ts", "x()\ny() // red some-made-up-rule"),
    ).toThrow(/src\/a\.ts:2: marker names no rule: some-made-up-rule/)
  })
})

describe("stripMarkers", () => {
  it("removes exactly the markers, other comments and code untouched", () => {
    expect(
      stripMarkers(
        'import { x } from "./x.ts" // red inward-deps: why\nconst a = 1 // kept\nrun() //red private-sealed',
      ),
    ).toBe('import { x } from "./x.ts"\nconst a = 1 // kept\nrun()')
  })
})

describe("reportedOf", () => {
  it("names the violation's file, without a line", () => {
    const violation = {
      check: "private",
      rules: ["private-sealed"],
      file: "src/a.ts",
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      { file: "src/a.ts", line: null, slugs: ["private-sealed"] },
    ])
  })

  it("names a statement-level violation's line, so it matches its marker there and nowhere else", () => {
    const violation = {
      check: "modules",
      rules: ["stateless-modules"],
      file: "src/a.model.ts",
      line: 4,
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      { file: "src/a.model.ts", line: 4, slugs: ["stateless-modules"] },
    ])
    expect(
      matchVerdicts(
        [
          {
            file: "src/a.model.ts",
            line: 3,
            slug: "stateless-modules",
            why: null,
          },
        ],
        reportedOf(violation),
      ),
    ).toEqual({
      missing: ["src/a.model.ts:3 stateless-modules"],
      unexpected: ["src/a.model.ts:4 stateless-modules"],
    })
  })

  it("names every file closing a cycle: a service cycle's hops by importer, a module cycle's files", () => {
    const serviceCycle = {
      check: "dag",
      rules: ["no-service-cycle"],
      shape: "service-cycle",
      hops: [
        { via: { from: "src/a/a.ts", to: "src/b/b.ts" } },
        { via: { from: "src/b/b.ts", to: "src/a/a.ts" } },
      ],
    } as unknown as Violation
    expect(reportedOf(serviceCycle).map((r) => r.file)).toEqual([
      "src/a/a.ts",
      "src/b/b.ts",
    ])
    const moduleCycle = {
      check: "dag",
      rules: ["no-runtime-cycle"],
      shape: "module-cycle",
      files: ["src/x.ts", "src/y.ts"],
    } as unknown as Violation
    expect(reportedOf(moduleCycle).map((r) => r.file)).toEqual([
      "src/x.ts",
      "src/y.ts",
    ])
  })
})

describe("matchVerdicts", () => {
  it("is as marked when every marker is reported and nothing more", () => {
    expect(
      matchVerdicts(
        [{ file: "src/a.ts", line: 3, slug: "inward-deps", why: null }],
        [{ file: "src/a.ts", line: 3, slugs: ["inward-deps"] }],
      ),
    ).toEqual({ missing: [], unexpected: [] })
  })

  it("matches a report without a line to its file's marker by slug, once", () => {
    expect(
      matchVerdicts(
        [
          { file: "src/a.ts", line: 3, slug: "inward-deps", why: null },
          { file: "src/a.ts", line: 9, slug: "inward-deps", why: null },
        ],
        [
          { file: "src/a.ts", line: null, slugs: ["inward-deps"] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"] },
        ],
      ),
    ).toEqual({ missing: [], unexpected: ["src/a.ts inward-deps"] })
  })

  it("lists both directions, sorted: marked-not-reported and reported-not-marked", () => {
    expect(
      matchVerdicts(
        [
          { file: "src/b.ts", line: 1, slug: "private-sealed", why: null },
          { file: "src/a.ts", line: 3, slug: "inward-deps", why: null },
        ],
        [
          {
            file: "src/a.ts",
            line: 3,
            slugs: ["inward-deps", "runtime-import"],
          },
          { file: "src/c.ts", line: 7, slugs: ["layer-in-path"] },
        ],
      ),
    ).toEqual({
      missing: ["src/b.ts:1 private-sealed"],
      unexpected: ["src/a.ts:3 runtime-import", "src/c.ts:7 layer-in-path"],
    })
  })
})
