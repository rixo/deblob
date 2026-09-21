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
        kind: "red",
        file: "src/a.model.ts",
        line: 1,
        slug: "inward-deps",
        why: "a model importing a service",
      },
      {
        kind: "red",
        file: "src/a.model.ts",
        line: 3,
        slug: "private-sealed",
        why: null,
      },
      {
        kind: "red",
        file: "src/a.model.ts",
        line: 3,
        slug: "inward-deps",
        why: null,
      },
      {
        kind: "red",
        file: "src/a.model.ts",
        line: 4,
        slug: "inward-deps",
        why: null,
      },
    ])
  })

  it("reads `// via <slug>` as a trigger marker, same form", () => {
    expect(
      markersOf(
        "src/a.model.ts",
        "export const N: number = helper() // via inert-modules: runs helper on import",
      ),
    ).toEqual([
      {
        kind: "via",
        file: "src/a.model.ts",
        line: 1,
        slug: "inert-modules",
        why: "runs helper on import",
      },
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
        'import { x } from "./x.ts" // red inward-deps: why\nconst a = 1 // kept\nrun() //red private-sealed\nhelper() // via inert-modules',
      ),
    ).toBe('import { x } from "./x.ts"\nconst a = 1 // kept\nrun()\nhelper()')
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
      { file: "src/a.ts", line: null, slugs: ["private-sealed"], via: [] },
    ])
  })

  it("carries a violation's triggers, so each matches its `via` marker", () => {
    const violation = {
      check: "modules",
      rules: ["inert-modules"],
      file: "src/a.model.ts",
      line: 2,
      via: [{ file: "src/a.model.ts", line: 5 }],
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      {
        file: "src/a.model.ts",
        line: 2,
        slugs: ["inert-modules"],
        via: [{ file: "src/a.model.ts", line: 5 }],
      },
    ])
  })

  it("names a statement-level violation's line, so it matches its marker there and nowhere else", () => {
    const violation = {
      check: "modules",
      rules: ["inert-modules"],
      file: "src/a.model.ts",
      line: 4,
      via: [],
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      { file: "src/a.model.ts", line: 4, slugs: ["inert-modules"], via: [] },
    ])
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.model.ts",
            line: 3,
            slug: "inert-modules",
            why: null,
          },
        ],
        reportedOf(violation),
      ),
    ).toEqual({
      missing: ["src/a.model.ts:3 inert-modules"],
      unexpected: ["src/a.model.ts:4 inert-modules"],
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
        [
          {
            kind: "red",
            file: "src/a.ts",
            line: 3,
            slug: "inward-deps",
            why: null,
          },
        ],
        [{ file: "src/a.ts", line: 3, slugs: ["inward-deps"], via: [] }],
      ),
    ).toEqual({ missing: [], unexpected: [] })
  })

  it("matches a report without a line to its file's marker by slug, once", () => {
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.ts",
            line: 3,
            slug: "inward-deps",
            why: null,
          },
          {
            kind: "red",
            file: "src/a.ts",
            line: 9,
            slug: "inward-deps",
            why: null,
          },
        ],
        [
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
        ],
      ),
    ).toEqual({ missing: [], unexpected: ["src/a.ts inward-deps"] })
  })

  it("lists both directions, sorted: marked-not-reported and reported-not-marked", () => {
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/b.ts",
            line: 1,
            slug: "private-sealed",
            why: null,
          },
          {
            kind: "red",
            file: "src/a.ts",
            line: 3,
            slug: "inward-deps",
            why: null,
          },
        ],
        [
          {
            file: "src/a.ts",
            line: 3,
            slugs: ["inward-deps", "runtime-import"],
            via: [],
          },
          { file: "src/c.ts", line: 7, slugs: ["layer-in-path"], via: [] },
        ],
      ),
    ).toEqual({
      missing: ["src/b.ts:1 private-sealed"],
      unexpected: ["src/a.ts:3 runtime-import", "src/c.ts:7 layer-in-path"],
    })
  })

  it("holds a red's triggers to the `via` markers both ways: an unmarked trigger is unexpected, an unreported one missing", () => {
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.ts",
            line: 2,
            slug: "inert-modules",
            why: null,
          },
          {
            kind: "via",
            file: "src/a.ts",
            line: 5,
            slug: "inert-modules",
            why: null,
          },
          {
            kind: "via",
            file: "src/a.ts",
            line: 8,
            slug: "inert-modules",
            why: null,
          },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["inert-modules"],
            via: [
              { file: "src/a.ts", line: 5 },
              { file: "src/b.ts", line: 1 },
            ],
          },
        ],
      ),
    ).toEqual({
      missing: ["src/a.ts:8 via inert-modules"],
      unexpected: ["src/b.ts:1 via inert-modules"],
    })
  })

  it("a red on the trigger's line does not stand for its `via` marker, nor the reverse", () => {
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.ts",
            line: 5,
            slug: "inert-modules",
            why: null,
          },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["inert-modules"],
            via: [{ file: "src/a.ts", line: 5 }],
          },
        ],
      ),
    ).toEqual({
      missing: ["src/a.ts:5 inert-modules"],
      unexpected: ["src/a.ts:2 inert-modules", "src/a.ts:5 via inert-modules"],
    })
  })

  it("matches a trigger shared by two reds of one slug to its one marker", () => {
    const trigger = { file: "src/a.ts", line: 9 }
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.ts",
            line: 2,
            slug: "inert-modules",
            why: null,
          },
          {
            kind: "red",
            file: "src/a.ts",
            line: 4,
            slug: "inert-modules",
            why: null,
          },
          { kind: "via", ...trigger, slug: "inert-modules", why: null },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["inert-modules"],
            via: [trigger],
          },
          {
            file: "src/a.ts",
            line: 4,
            slugs: ["inert-modules"],
            via: [trigger],
          },
        ],
      ),
    ).toEqual({ missing: [], unexpected: [] })
  })
})
