import { describe, expect, it, test } from "vitest"

import type { RuleId } from "../../check/rule.model.ts"
import type { Violation } from "../../check/violation.model.ts"
import type { Marker, Reported } from "./markers.model.ts"
import {
  markersOf,
  matchVerdicts,
  reportedOf,
  stripMarkers,
} from "./markers.model.ts"

const red = (
  line: number | null,
  slug: RuleId,
  why: string | null = null,
): Marker => ({
  kind: "red",
  file: "src/a.ts",
  line,
  slug,
  why,
})

/**
 * The match of one file, `src/a.ts`, against the reader's reports, each `[line,
 * slug]`.
 */
const matchSource = (
  source: string,
  reports: readonly (readonly [number | null, RuleId])[],
) =>
  matchVerdicts(
    markersOf("src/a.ts", source),
    reports.map(([line, slug]) => ({
      file: "src/a.ts",
      line,
      slugs: [slug],
      via: [],
    })),
  )

describe("markersOf", () => {
  it("reads `// red: <slug>` at a line's end as a claim on that line, several slugs, an optional why; other comments are not markers", () => {
    const source = [
      'import { x } from "./x.ts" // red: inward-deps -- a model importing a service',
      "const a = 1 // not a marker",
      "run() // red: private-sealed, inward-deps",
    ].join("\n")
    expect(markersOf("src/a.ts", source)).toEqual([
      red(1, "inward-deps", "a model importing a service"),
      red(3, "private-sealed"),
      red(3, "inward-deps"),
    ])
  })

  it("counts a slug repeated in one marker as two violations", () => {
    expect(
      markersOf("src/a.ts", "run() // red: stable-root, stable-root"),
    ).toEqual([red(1, "stable-root"), red(1, "stable-root")])
  })

  it("claims the next code line for a marker alone on its line, past blanks and comments, each stacked marker with its own why", () => {
    const source = [
      "// red: stable-root -- the binding",
      "",
      "// a plain comment",
      "// red: stable-root -- the call",
      "const x = run() // red: ambient-access",
    ].join("\n")
    expect(markersOf("src/a.ts", source)).toEqual([
      red(5, "stable-root", "the binding"),
      red(5, "stable-root", "the call"),
      red(5, "ambient-access"),
    ])
  })

  it("claims the file for a marker alone with no code after it", () => {
    const source = [
      'import { x } from "./x.ts"',
      "// red: inward-deps -- the import of x",
      "",
    ].join("\n")
    expect(markersOf("src/a.ts", source)).toEqual([
      red(null, "inward-deps", "the import of x"),
    ])
  })

  it("reads `// via: <slug>` as a trigger marker, same form", () => {
    expect(
      markersOf(
        "src/a.ts",
        "export const N: number = helper() // via: stable-root -- runs helper on import",
      ),
    ).toEqual([
      {
        kind: "via",
        file: "src/a.ts",
        line: 1,
        slug: "stable-root",
        why: "runs helper on import",
      },
    ])
  })

  it("throws on a marker naming no rule, with the line", () => {
    expect(() =>
      markersOf("src/a.ts", "x()\ny() // red: some-made-up-rule"),
    ).toThrow(/src\/a\.ts:2: marker names no rule: some-made-up-rule/)
  })

  test.each([
    ["the old form, no colon", "run() // red inward-deps"],
    ["the old why", "run() // red: inward-deps: why"],
    ["no space after the slashes", "run() //red: inward-deps"],
    ["another case", "run() // Red: inward-deps"],
    ["no slug", "run() // red:"],
    ["an empty why", "run() // red: inward-deps --"],
    [
      "a second marker on the line",
      "run() // red: inward-deps // red: inward-deps",
    ],
    ["the old trigger form", "run() // via stable-root"],
  ])("throws on a malformed marker, with the line: %s", (_, text) => {
    expect(() => markersOf("src/a.ts", `x()\n${text}`)).toThrow(
      /src\/a\.ts:2: malformed marker/,
    )
  })

  it("throws on a marker after another comment, with the line", () => {
    expect(() =>
      markersOf("src/a.ts", "run() // a note // red: inward-deps"),
    ).toThrow(/src\/a\.ts:1: a marker after a comment/)
  })

  describe("confessions", () => {
    it("reads `// false red:` and `// missed red:` as a confession of each slug, with its why", () => {
      const source = [
        "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
        "export const X = f() // missed red: stable-root, ambient-access -- the call clause is not built",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toEqual([
        {
          kind: "red",
          confession: "false",
          file: "src/a.ts",
          line: 1,
          slug: "stable-root",
          why: "class types are not followed yet",
        },
        {
          kind: "red",
          confession: "missed",
          file: "src/a.ts",
          line: 2,
          slug: "stable-root",
          why: "the call clause is not built",
        },
        {
          kind: "red",
          confession: "missed",
          file: "src/a.ts",
          line: 2,
          slug: "ambient-access",
          why: "the call clause is not built",
        },
      ])
    })

    it("reads `// false via:` and `// missed via:` the same, on trigger lines", () => {
      const source = [
        "export const A = helper() // false via: stable-root -- the helper is not followed yet",
        "export const B = other() // missed via: stable-root -- the call clause is not built",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toMatchObject([
        { kind: "via", confession: "false", line: 1 },
        { kind: "via", confession: "missed", line: 2 },
      ])
    })

    it("places a confession as any marker: stacked above a line with a plain claim, alone at the end of the file for the file", () => {
      const source = [
        "// missed red: stable-root -- the call clause is not built",
        "export const X = f() // red: ambient-access",
        'import { y } from "./y.ts"',
        "// false red: inward-deps -- the import is type-only",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toMatchObject([
        { confession: "missed", line: 2, slug: "stable-root" },
        { confession: undefined, line: 2, slug: "ambient-access" },
        { confession: "false", line: null, slug: "inward-deps" },
      ])
    })

    test.each([
      [
        "a confession word with no marker",
        "run() // missed: stable-root -- why",
      ],
      ["a confession of green", "run() // false green: stable-root -- why"],
      ["both words", "run() // false missed red: stable-root -- why"],
      ["a confession without a why", "run() // false red: stable-root"],
      ["another case", "run() // False red: stable-root -- why"],
    ])("throws on a malformed confession, with the line: %s", (_, text) => {
      expect(() => markersOf("src/a.ts", `x()\n${text}`)).toThrow(
        /src\/a\.ts:2: malformed marker/,
      )
    })
  })
})

describe("stripMarkers", () => {
  it("removes exactly the markers, other comments and code untouched, a marker's own line left blank", () => {
    expect(
      stripMarkers(
        'import { x } from "./x.ts" // red: inward-deps -- why\nconst a = 1 // kept\n// red: private-sealed\nhelper() // via: stable-root',
      ),
    ).toBe('import { x } from "./x.ts"\nconst a = 1 // kept\n\nhelper()')
  })

  it("removes confessions the same way", () => {
    expect(
      stripMarkers(
        "run() // false red: stable-root -- why\n// missed via: stable-root -- why\nhelper()",
      ),
    ).toBe("run()\n\nhelper()")
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
      rules: ["stable-root"],
      file: "src/a.model.ts",
      line: 2,
      via: [{ file: "src/a.model.ts", line: 5 }],
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      {
        file: "src/a.model.ts",
        line: 2,
        slugs: ["stable-root"],
        via: [{ file: "src/a.model.ts", line: 5 }],
      },
    ])
  })

  it("names a statement-level violation's line, so it matches its marker there and nowhere else", () => {
    const violation = {
      check: "modules",
      rules: ["stable-root"],
      file: "src/a.model.ts",
      line: 4,
      via: [],
    } as unknown as Violation
    expect(reportedOf(violation)).toEqual([
      { file: "src/a.model.ts", line: 4, slugs: ["stable-root"], via: [] },
    ])
    expect(
      matchVerdicts(
        [
          {
            kind: "red",
            file: "src/a.model.ts",
            line: 3,
            slug: "stable-root",
            why: null,
          },
        ],
        reportedOf(violation),
      ),
    ).toEqual({
      missing: ["src/a.model.ts:3 stable-root"],
      unexpected: ["src/a.model.ts:4 stable-root"],
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

  it("matches a report without a line to a file claim, one claim per report", () => {
    expect(
      matchVerdicts(
        [red(null, "inward-deps"), red(null, "inward-deps")],
        [
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
        ],
      ),
    ).toEqual({ missing: [], unexpected: ["src/a.ts inward-deps"] })
  })

  it("never lets a line claim stand for a report without a line, nor the reverse", () => {
    expect(
      matchVerdicts(
        [red(3, "inward-deps"), red(null, "stable-root")],
        [
          { file: "src/a.ts", line: null, slugs: ["inward-deps"], via: [] },
          { file: "src/a.ts", line: 5, slugs: ["stable-root"], via: [] },
        ],
      ),
    ).toEqual({
      missing: ["src/a.ts stable-root", "src/a.ts:3 inward-deps"],
      unexpected: ["src/a.ts inward-deps", "src/a.ts:5 stable-root"],
    })
  })

  it("counts: a line marked twice needs two reports, and a second report needs a second marker", () => {
    const once: Reported = {
      file: "src/a.ts",
      line: 2,
      slugs: ["stable-root"],
      via: [],
    }
    expect(
      matchVerdicts([red(2, "stable-root"), red(2, "stable-root")], [once]),
    ).toEqual({ missing: ["src/a.ts:2 stable-root"], unexpected: [] })
    expect(matchVerdicts([red(2, "stable-root")], [once, once])).toEqual({
      missing: [],
      unexpected: ["src/a.ts:2 stable-root"],
    })
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
            slug: "stable-root",
            why: null,
          },
          {
            kind: "via",
            file: "src/a.ts",
            line: 5,
            slug: "stable-root",
            why: null,
          },
          {
            kind: "via",
            file: "src/a.ts",
            line: 8,
            slug: "stable-root",
            why: null,
          },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["stable-root"],
            via: [
              { file: "src/a.ts", line: 5 },
              { file: "src/b.ts", line: 1 },
            ],
          },
        ],
      ),
    ).toEqual({
      missing: ["src/a.ts:8 via stable-root"],
      unexpected: ["src/b.ts:1 via stable-root"],
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
            slug: "stable-root",
            why: null,
          },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["stable-root"],
            via: [{ file: "src/a.ts", line: 5 }],
          },
        ],
      ),
    ).toEqual({
      missing: ["src/a.ts:5 stable-root"],
      unexpected: ["src/a.ts:2 stable-root", "src/a.ts:5 via stable-root"],
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
            slug: "stable-root",
            why: null,
          },
          {
            kind: "red",
            file: "src/a.ts",
            line: 4,
            slug: "stable-root",
            why: null,
          },
          { kind: "via", ...trigger, slug: "stable-root", why: null },
        ],
        [
          {
            file: "src/a.ts",
            line: 2,
            slugs: ["stable-root"],
            via: [trigger],
          },
          {
            file: "src/a.ts",
            line: 4,
            slugs: ["stable-root"],
            via: [trigger],
          },
        ],
      ),
    ).toEqual({ missing: [], unexpected: [] })
  })

  describe("confessions", () => {
    it("lists a false red the reader still reports as confessed, and the row stays as marked", () => {
      expect(
        matchSource(
          "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: [],
        confessed: [
          "src/a.ts:1 false red stable-root -- class types are not followed yet",
        ],
      })
    })

    it("settles a false red the reader no longer reports: the row fails until the marker goes", () => {
      expect(
        matchSource(
          "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: ["src/a.ts:1 false red stable-root — remove the marker"],
        confessed: [],
      })
    })

    it("lists a missed red the reader still misses as confessed", () => {
      expect(
        matchSource(
          "export const X = f() // missed red: stable-root -- the call clause is not built",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: [],
        confessed: [
          "src/a.ts:1 missed red stable-root -- the call clause is not built",
        ],
      })
    })

    it("settles a missed red the reader now reports", () => {
      expect(
        matchSource(
          "export const X = f() // missed red: stable-root -- the call clause is not built",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: ["src/a.ts:1 missed red stable-root — remove the marker"],
        confessed: [],
      })
    })

    it("counts: two false reds of one slug on one line need two wrong reports", () => {
      expect(
        matchSource(
          "export const X = f() // false red: stable-root, stable-root -- why",
          [[1, "stable-root"]],
        ),
      ).toMatchObject({
        settled: ["src/a.ts:1 false red stable-root — remove the marker"],
        confessed: ["src/a.ts:1 false red stable-root -- why"],
      })
    })

    it("still catches a new error on a confessed line: another slug reported there is unexpected", () => {
      expect(
        matchSource(
          "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
          [
            [1, "stable-root"],
            [1, "ambient-access"],
          ],
        ),
      ).toMatchObject({
        unexpected: ["src/a.ts:1 ambient-access"],
        settled: [],
      })
    })

    it("gives a report to the plain claim first: a missed red of the same slug settles only on a second report", () => {
      const source = [
        "// missed red: stable-root -- the second one is not built",
        "export const X = f() // red: stable-root -- the first one",
      ].join("\n")
      expect(matchSource(source, [[2, "stable-root"]])).toMatchObject({
        missing: [],
        settled: [],
        confessed: [
          "src/a.ts:2 missed red stable-root -- the second one is not built",
        ],
      })
      expect(
        matchSource(source, [
          [2, "stable-root"],
          [2, "stable-root"],
        ]),
      ).toMatchObject({
        settled: ["src/a.ts:2 missed red stable-root — remove the marker"],
        confessed: [],
      })
    })

    it("confesses a report without a line with a confession alone at the end of the file", () => {
      expect(
        matchSource(
          'import { y } from "./y.ts"\n// false red: inward-deps -- the import is type-only',
          [[null, "inward-deps"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: [],
        confessed: [
          "src/a.ts false red inward-deps -- the import is type-only",
        ],
      })
    })

    it("confesses a wrong trigger with a false via", () => {
      expect(
        matchVerdicts(
          markersOf(
            "src/a.ts",
            "export const N = 1 // red: stable-root\nhelper() // false via: stable-root -- the helper is not followed yet",
          ),
          [
            {
              file: "src/a.ts",
              line: 1,
              slugs: ["stable-root"],
              via: [{ file: "src/a.ts", line: 2 }],
            },
          ],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        settled: [],
        confessed: [
          "src/a.ts:2 false via stable-root -- the helper is not followed yet",
        ],
      })
    })
  })
})
