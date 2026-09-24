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
 * slug]`, or `[line, slug, "unknown"]` for a red the reader cannot prove.
 */
const matchSource = (
  source: string,
  reports: readonly (
    | readonly [number | null, RuleId]
    | readonly [number | null, RuleId, "unknown"]
  )[],
) =>
  matchVerdicts(
    markersOf("src/a.ts", source),
    reports.map(([line, slug, unknown]) => ({
      file: "src/a.ts",
      line,
      slugs: [slug],
      via: [],
      ...(unknown === undefined ? {} : { unknown: true as const }),
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

  describe("expected failures", () => {
    it("reads `// false red:` and `// missed red:` as an expected failure of each slug, with its why", () => {
      const source = [
        "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
        "export const X = f() // missed red: stable-root, ambient-access -- the call shape is not built yet",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toEqual([
        {
          kind: "red",
          expectedFailure: "false",
          file: "src/a.ts",
          line: 1,
          slug: "stable-root",
          why: "class types are not followed yet",
        },
        {
          kind: "red",
          expectedFailure: "missed",
          file: "src/a.ts",
          line: 2,
          slug: "stable-root",
          why: "the call shape is not built yet",
        },
        {
          kind: "red",
          expectedFailure: "missed",
          file: "src/a.ts",
          line: 2,
          slug: "ambient-access",
          why: "the call shape is not built yet",
        },
      ])
    })

    it("reads `// false via:` and `// missed via:` the same, on trigger lines", () => {
      const source = [
        "export const A = helper() // false via: stable-root -- the helper is not followed yet",
        "export const B = other() // missed via: stable-root -- the call shape is not built yet",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toMatchObject([
        { kind: "via", expectedFailure: "false", line: 1 },
        { kind: "via", expectedFailure: "missed", line: 2 },
      ])
    })

    it("places an expected failure as any marker: stacked above a line with a plain claim, alone at the end of the file for the file", () => {
      const source = [
        "// missed red: stable-root -- the call shape is not built yet",
        "export const X = f() // red: ambient-access",
        'import { y } from "./y.ts"',
        "// false red: inward-deps -- the import is type-only",
      ].join("\n")
      const markers = markersOf("src/a.ts", source)
      expect(markers).toMatchObject([
        { expectedFailure: "missed", line: 2, slug: "stable-root" },
        { line: 2, slug: "ambient-access" },
        { expectedFailure: "false", line: null, slug: "inward-deps" },
      ])
      expect(markers[1]).not.toHaveProperty("expectedFailure")
    })

    test.each([
      [
        "`missed` with no `red` or `via`",
        "run() // missed: stable-root -- why",
      ],
      [
        "an expected failure of green",
        "run() // false green: stable-root -- why",
      ],
      ["both words", "run() // false missed red: stable-root -- why"],
      ["an expected failure without a why", "run() // false red: stable-root"],
      ["another case", "run() // False red: stable-root -- why"],
    ])(
      "throws on a malformed expected failure, with the line: %s",
      (_, text) => {
        expect(() => markersOf("src/a.ts", `x()\n${text}`)).toThrow(
          /src\/a\.ts:2: malformed marker/,
        )
      },
    )
  })

  describe("unknown", () => {
    it("reads `// stubborn unknown:` as a claim that the reader answers unknown there, a limit kept, with its why", () => {
      expect(
        markersOf(
          "src/a.ts",
          "export const CONFIG: SomeMadeUpConfig = {} // stubborn unknown: stable-root -- a package's type, and no engine in this setup",
        ),
      ).toEqual([
        {
          kind: "unknown",
          file: "src/a.ts",
          line: 1,
          slug: "stable-root",
          why: "a package's type, and no engine in this setup",
        },
      ])
    })

    it("reads `// false unknown:` as an expected failure: the reader answers unknown there, wrongly", () => {
      expect(
        markersOf(
          "src/a.ts",
          "export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet",
        ),
      ).toEqual([
        {
          kind: "unknown",
          expectedFailure: "false",
          file: "src/a.ts",
          line: 1,
          slug: "stable-root",
          why: "type names are not followed yet",
        },
      ])
    })

    it("stacks a `false unknown` above a line with a plain `red`: the truth is red, the reader answers unknown", () => {
      const source = [
        "// false unknown: stable-root -- type names are not followed yet",
        "export const LOOSE: Loose = { a: 1 } // red: stable-root -- the alias names a mutable record",
      ].join("\n")
      expect(markersOf("src/a.ts", source)).toMatchObject([
        { kind: "unknown", expectedFailure: "false", line: 2 },
        { kind: "red", line: 2 },
      ])
    })

    it("reads `// missed unknown:` as an expected failure: the truth is an unknown the reader does not report", () => {
      expect(
        markersOf(
          "src/a.ts",
          "const stores = names.map((name) => createStore(name)) // missed unknown: assembly-builds-only -- the assembly check is not built yet",
        ),
      ).toEqual([
        {
          kind: "unknown",
          expectedFailure: "missed",
          file: "src/a.ts",
          line: 1,
          slug: "assembly-builds-only",
          why: "the assembly check is not built yet",
        },
      ])
    })

    test.each([
      ["a bare unknown", "run() // unknown: stable-root -- why"],
      ["a stubborn red", "run() // stubborn red: stable-root -- why"],
      [
        "a missed unknown without a why",
        "run() // missed unknown: stable-root",
      ],
      ["a stubborn via", "run() // stubborn via: stable-root -- why"],
      [
        "a stubborn unknown without a why",
        "run() // stubborn unknown: stable-root",
      ],
      ["a false unknown without a why", "run() // false unknown: stable-root"],
      ["another case", "run() // Stubborn unknown: stable-root -- why"],
    ])("throws on a malformed unknown marker, with the line: %s", (_, text) => {
      expect(() => markersOf("src/a.ts", `x()\n${text}`)).toThrow(
        /src\/a\.ts:2: malformed marker/,
      )
    })
  })
  describe("broken", () => {
    it("reads `// broken -- <why>` as a claim that deblob cannot read the line, with no slug", () => {
      expect(
        markersOf(
          "src/a.ts",
          "export const BARE: ReadonlyMap = new Map() // broken -- ReadonlyMap without its type arguments",
        ),
      ).toEqual([
        {
          kind: "broken",
          file: "src/a.ts",
          line: 1,
          why: "ReadonlyMap without its type arguments",
        },
      ])
    })

    it("claims the file for a broken marker alone at the end of the file: a file that does not parse", () => {
      expect(
        markersOf(
          "src/a.ts",
          "export const X = \n// broken -- the file does not parse",
        ),
      ).toMatchObject([{ kind: "broken", line: null }])
    })

    test.each([
      ["a broken without a why", "run() // broken"],
      ["a broken with an empty why", "run() // broken --"],
      ["a broken naming a rule", "run() // broken: stable-root -- why"],
      ["another case", "run() // Broken -- why"],
    ])("throws on a malformed broken marker, with the line: %s", (_, text) => {
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

  it("removes expected failures the same way", () => {
    expect(
      stripMarkers(
        "run() // false red: stable-root -- why\n// missed via: stable-root -- why\nhelper()",
      ),
    ).toBe("run()\n\nhelper()")
  })

  it("removes unknown markers the same way", () => {
    expect(
      stripMarkers(
        "run() // stubborn unknown: stable-root -- why\n// false unknown: stable-root -- why\nhelper() // red: stable-root",
      ),
    ).toBe("run()\n\nhelper()")
  })

  it("removes broken markers the same way", () => {
    expect(stripMarkers("run() // broken -- why\n// broken -- why")).toBe(
      "run()\n",
    )
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
      unexpectedPasses: [],
      expectedFailures: [],
    })
  })

  it("carries a red the reader cannot prove as unknown, and a proven one without the mark", () => {
    const at = {
      check: "modules",
      rules: ["stable-root"],
      file: "src/a.model.ts",
      line: 4,
      via: [],
    }
    const unknown = {
      ...at,
      unknown: { kind: "type-name", name: "Table" },
    } as unknown as Violation
    const proven = { ...at, unknown: null } as unknown as Violation
    expect(reportedOf(unknown)).toEqual([
      {
        file: "src/a.model.ts",
        line: 4,
        slugs: ["stable-root"],
        via: [],
        unknown: true,
      },
    ])
    expect(reportedOf(proven)[0]).not.toHaveProperty("unknown")
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
    ).toEqual({
      missing: [],
      unexpected: [],
      unexpectedPasses: [],
      expectedFailures: [],
    })
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
    ).toEqual({
      missing: [],
      unexpected: ["src/a.ts inward-deps"],
      unexpectedPasses: [],
      expectedFailures: [],
    })
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
      unexpectedPasses: [],
      expectedFailures: [],
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
    ).toEqual({
      missing: ["src/a.ts:2 stable-root"],
      unexpected: [],
      unexpectedPasses: [],
      expectedFailures: [],
    })
    expect(matchVerdicts([red(2, "stable-root")], [once, once])).toEqual({
      missing: [],
      unexpected: ["src/a.ts:2 stable-root"],
      unexpectedPasses: [],
      expectedFailures: [],
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
      unexpectedPasses: [],
      expectedFailures: [],
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
      unexpectedPasses: [],
      expectedFailures: [],
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
      unexpectedPasses: [],
      expectedFailures: [],
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
    ).toEqual({
      missing: [],
      unexpected: [],
      unexpectedPasses: [],
      expectedFailures: [],
    })
  })

  describe("expected failures and unexpected passes", () => {
    it("lists a false red the reader still reports as an expected failure, and the row stays as marked", () => {
      expect(
        matchSource(
          "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:1 false red stable-root -- class types are not followed yet",
        ],
      })
    })

    it("turns a false red the reader no longer reports into an unexpected pass: the row fails until the marker goes", () => {
      expect(
        matchSource(
          "export const SPOT: Spot = new Spot() // false red: stable-root -- class types are not followed yet",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [
          "src/a.ts:1 false red stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("lists a missed red the reader still misses as an expected failure", () => {
      expect(
        matchSource(
          "export const X = f() // missed red: stable-root -- the call shape is not built yet",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:1 missed red stable-root -- the call shape is not built yet",
        ],
      })
    })

    it("turns a missed red the reader now reports into an unexpected pass", () => {
      expect(
        matchSource(
          "export const X = f() // missed red: stable-root -- the call shape is not built yet",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [
          "src/a.ts:1 missed red stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("counts: two false reds of one slug on one line need two wrong reports", () => {
      expect(
        matchSource(
          "export const X = f() // false red: stable-root, stable-root -- why",
          [[1, "stable-root"]],
        ),
      ).toMatchObject({
        unexpectedPasses: [
          "src/a.ts:1 false red stable-root — remove the marker",
        ],
        expectedFailures: ["src/a.ts:1 false red stable-root -- why"],
      })
    })

    it("still catches a new error on a line expected to fail: another slug reported there is unexpected", () => {
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
        unexpectedPasses: [],
      })
    })

    it("gives a report to the plain claim first: a missed red of the same slug passes unexpectedly only on a second report", () => {
      const source = [
        "// missed red: stable-root -- the second one is not built",
        "export const X = f() // red: stable-root -- the first one",
      ].join("\n")
      expect(matchSource(source, [[2, "stable-root"]])).toMatchObject({
        missing: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:2 missed red stable-root -- the second one is not built",
        ],
      })
      expect(
        matchSource(source, [
          [2, "stable-root"],
          [2, "stable-root"],
        ]),
      ).toMatchObject({
        unexpectedPasses: [
          "src/a.ts:2 missed red stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("expects a report without a line to fail with a marker alone at the end of the file", () => {
      expect(
        matchSource(
          'import { y } from "./y.ts"\n// false red: inward-deps -- the import is type-only',
          [[null, "inward-deps"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts false red inward-deps -- the import is type-only",
        ],
      })
    })

    it("expects a wrong trigger to fail with a false via", () => {
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
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:2 false via stable-root -- the helper is not followed yet",
        ],
      })
    })
  })

  describe("unknown", () => {
    it("never lets a plain red stand for an unknown report, nor the reverse", () => {
      expect(
        matchSource("export const T: Table = { a: 1 } // red: stable-root", [
          [1, "stable-root", "unknown"],
        ]),
      ).toEqual({
        missing: ["src/a.ts:1 stable-root"],
        unexpected: ["src/a.ts:1 unknown stable-root"],
        unexpectedPasses: [],
        expectedFailures: [],
      })
      expect(
        matchSource(
          "export let counter = 0 // stubborn unknown: stable-root -- why",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: ["src/a.ts:1 unknown stable-root"],
        unexpected: ["src/a.ts:1 stable-root"],
        unexpectedPasses: [],
        expectedFailures: [],
      })
    })

    it("matches a stubborn unknown to an unknown report, as a plain claim", () => {
      expect(
        matchSource(
          "export const CONFIG: SomeMadeUpConfig = {} // stubborn unknown: stable-root -- a package's type, and no engine",
          [[1, "stable-root", "unknown"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [],
      })
    })

    it("fails a stubborn unknown the reader now answers, either way: the stamp is out of date", () => {
      const source =
        "export const CONFIG: SomeMadeUpConfig = {} // stubborn unknown: stable-root -- a package's type, and no engine"
      expect(matchSource(source, [])).toMatchObject({
        missing: ["src/a.ts:1 unknown stable-root"],
      })
      expect(matchSource(source, [[1, "stable-root"]])).toMatchObject({
        missing: ["src/a.ts:1 unknown stable-root"],
        unexpected: ["src/a.ts:1 stable-root"],
      })
    })

    it("lists a false unknown the reader still answers as an expected failure: alone, the truth is green", () => {
      expect(
        matchSource(
          "export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet",
          [[1, "stable-root", "unknown"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:1 false unknown stable-root -- type names are not followed yet",
        ],
      })
    })

    it("turns a false unknown the reader no longer answers into an unexpected pass", () => {
      expect(
        matchSource(
          "export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [
          "src/a.ts:1 false unknown stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("lists a missed unknown the reader does not report as an expected failure", () => {
      expect(
        matchSource(
          "const stores = names.map(make) // missed unknown: assembly-builds-only -- not built yet",
          [],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:1 missed unknown assembly-builds-only -- not built yet",
        ],
      })
    })

    it("turns a missed unknown the reader now reports into an unexpected pass", () => {
      expect(
        matchSource(
          "const stores = names.map(make) // missed unknown: assembly-builds-only -- not built yet",
          [[1, "assembly-builds-only", "unknown"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [
          "src/a.ts:1 missed unknown assembly-builds-only — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("does not let a missed unknown stand for a proven red, nor hold one back", () => {
      expect(
        matchSource(
          "const stores = names.map(make) // missed unknown: assembly-builds-only -- not built yet",
          [[1, "assembly-builds-only"]],
        ),
      ).toMatchObject({
        unexpected: ["src/a.ts:1 assembly-builds-only"],
        expectedFailures: [
          "src/a.ts:1 missed unknown assembly-builds-only -- not built yet",
        ],
      })
      const stacked = [
        "// missed unknown: stable-root -- why",
        "export const T: Table = { a: 1 } // red: stable-root",
      ].join("\n")
      expect(matchSource(stacked, [])).toMatchObject({
        missing: ["src/a.ts:2 stable-root"],
      })
    })

    it("does not count the red stacked under a false unknown while the unknown holds", () => {
      const source = [
        "// false unknown: stable-root -- type names are not followed yet",
        "export const LOOSE: Loose = { a: 1 } // red: stable-root -- the alias names a mutable record",
      ].join("\n")
      expect(matchSource(source, [[2, "stable-root", "unknown"]])).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [
          "src/a.ts:2 false unknown stable-root -- type names are not followed yet",
        ],
      })
    })

    it("counts the red stacked under a false unknown once the reader proves it, and the false unknown passes unexpectedly", () => {
      const source = [
        "// false unknown: stable-root -- type names are not followed yet",
        "export const LOOSE: Loose = { a: 1 } // red: stable-root -- the alias names a mutable record",
      ].join("\n")
      expect(matchSource(source, [[2, "stable-root"]])).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [
          "src/a.ts:2 false unknown stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("catches a truth-green false unknown the reader now calls a proven red: the pass is unexpected, and so is the red", () => {
      expect(
        matchSource(
          "export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet",
          [[1, "stable-root"]],
        ),
      ).toEqual({
        missing: [],
        unexpected: ["src/a.ts:1 stable-root"],
        unexpectedPasses: [
          "src/a.ts:1 false unknown stable-root — remove the marker",
        ],
        expectedFailures: [],
      })
    })

    it("matches an unknown report's triggers to `via` markers, as a proven red's", () => {
      expect(
        matchVerdicts(
          markersOf(
            "src/a.ts",
            "export const N: Table = f() // stubborn unknown: stable-root -- why\nhelper() // via: stable-root",
          ),
          [
            {
              file: "src/a.ts",
              line: 1,
              slugs: ["stable-root"],
              via: [{ file: "src/a.ts", line: 2 }],
              unknown: true,
            } as Reported,
          ],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [],
      })
    })
  })

  describe("broken", () => {
    const brokenAt = (line: number | null) => ({
      file: "src/a.ts",
      line,
      reason: "a reason",
    })

    it("matches a broken marker to the place deblob could not read", () => {
      expect(
        matchVerdicts(
          markersOf(
            "src/a.ts",
            "export const B: ReadonlyMap = new Map() // broken -- why",
          ),
          [],
          [brokenAt(1)],
        ),
      ).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [],
      })
    })

    it("fails a row broken somewhere else, or not broken at all: where it breaks is the claim", () => {
      const markers = markersOf(
        "src/a.ts",
        "x()\nexport const B: ReadonlyMap = new Map() // broken -- why",
      )
      expect(matchVerdicts(markers, [], [brokenAt(1)])).toMatchObject({
        missing: ["src/a.ts:2 broken"],
        unexpected: ["src/a.ts:1 broken"],
      })
      expect(matchVerdicts(markers, [], [])).toMatchObject({
        missing: ["src/a.ts:2 broken"],
      })
    })

    it("matches a file that does not parse to a broken marker alone at the end of the file", () => {
      expect(
        matchVerdicts(
          markersOf(
            "src/a.ts",
            "export const X = \n// broken -- the file does not parse",
          ),
          [],
          [brokenAt(null)],
        ),
      ).toMatchObject({ missing: [], unexpected: [] })
    })

    it("matches a broken place and the verdicts beside it, each its own claim: a broken run still reports what it reaches", () => {
      const markers = [
        ...markersOf(
          "src/a.ts",
          "x() // broken -- why\nexport let n = 0 // red: stable-root",
        ),
      ]
      const red = {
        file: "src/a.ts",
        line: 2,
        slugs: ["stable-root"] as const,
        via: [],
      }
      expect(matchVerdicts(markers, [red], [brokenAt(1)])).toEqual({
        missing: [],
        unexpected: [],
        unexpectedPasses: [],
        expectedFailures: [],
      })
      expect(matchVerdicts(markers, [], [brokenAt(1)])).toMatchObject({
        missing: ["src/a.ts:2 stable-root"],
      })
    })
  })
})
