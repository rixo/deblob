import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import { createTsSuffixesFactoriesFlavor } from "./adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "./extraction.service.ts"
import type { ImportEdge, ImportGraph } from "./graph.model.ts"
import type { ExtractionEngine } from "./ports/extraction.port.ts"

const fixtureRoot = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/${name}/`, import.meta.url))

/** Test factory: real adapters over an on-disk fixture repo. */
const extractFixture = ({
  fixture,
  files,
  isAssembly,
}: {
  fixture: string
  files: readonly string[]
  isAssembly?: (path: string) => boolean
}): ImportGraph => {
  const root = fixtureRoot(fixture)
  const extraction = createExtraction({
    engine: createOxcEngine({ tsconfigPath: `${root}tsconfig.json` }),
    flavor: createTsSuffixesFactoriesFlavor(),
  })
  return extraction.extractGraph({
    root,
    files,
    ...(isAssembly ? { isAssembly } : {}),
  })
}

const FORMS_FILES = [
  "src/dep.ts",
  "src/side-effect.ts",
  "src/static-runtime.ts",
  "src/type-statement.ts",
  "src/mixed.ts",
  "src/two-statements.ts",
  "src/export-type-from.ts",
  "src/export-star.ts",
  "src/export-named-from.ts",
  "src/export-star-as.ts",
  "src/import-and-reexport.ts",
  "src/local-reexport.ts",
  "src/dynamic.ts",
  "src/requires.ts",
  "src/no-require.ts",
  "src/unresolvable.ts",
  "src/widget.svelte",
  "src/app.ts",
  "src/externals.ts",
  "src/foo.model.ts",
  "src/imports-outside.ts",
  "src/runtime-content.ts",
  "src/types-only.ts",
  "src/default-fn.ts",
  "src/default-class.ts",
]

const extractForms = () =>
  extractFixture({ fixture: "forms", files: FORMS_FILES })

const edgesFrom = (graph: ImportGraph, from: string): ImportEdge[] =>
  graph.edges.filter((edge) => edge.from === from)

describe("extractGraph over the forms fixture", () => {
  test("yields a runtime static edge for a plain import", () => {
    const edges = edgesFrom(extractForms(), "src/static-runtime.ts")
    expect(edges).toEqual([
      {
        from: "src/static-runtime.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("yields a type edge for an `import type` statement", () => {
    const edges = edgesFrom(extractForms(), "src/type-statement.ts")
    expect(edges).toEqual([
      {
        from: "src/type-statement.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "type",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("yields one runtime edge for a mixed `{ mk, type T }` statement", () => {
    const edges = edgesFrom(extractForms(), "src/mixed.ts")
    expect(edges).toEqual([
      {
        from: "src/mixed.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("dedupes type + runtime statements to the same target into one runtime edge", () => {
    const edges = edgesFrom(extractForms(), "src/two-statements.ts")
    expect(edges).toEqual([
      {
        from: "src/two-statements.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("yields a type edge for `export type ... from`", () => {
    const edges = edgesFrom(extractForms(), "src/export-type-from.ts")
    expect(edges).toEqual([
      {
        from: "src/export-type-from.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "type",
        form: "static",
        reExport: true,
      },
    ])
  })

  test("yields a runtime edge for `export * from`", () => {
    const edges = edgesFrom(extractForms(), "src/export-star.ts")
    expect(edges).toEqual([
      {
        from: "src/export-star.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: true,
      },
    ])
  })

  test("yields a runtime re-export edge for `export { x } from`", () => {
    const edges = edgesFrom(extractForms(), "src/export-named-from.ts")
    expect(edges).toEqual([
      {
        from: "src/export-named-from.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: true,
      },
    ])
  })

  test("yields a runtime re-export edge for `export * as ns from`", () => {
    const edges = edgesFrom(extractForms(), "src/export-star-as.ts")
    expect(edges).toEqual([
      {
        from: "src/export-star-as.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: true,
      },
    ])
  })

  test("marks the indirect form `import { x } …; export { x }` as a re-export — the module record normalizes it", () => {
    const edges = edgesFrom(extractForms(), "src/local-reexport.ts")
    expect(edges).toEqual([
      {
        from: "src/local-reexport.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: true,
      },
    ])
  })

  test("merges a same-target import + re-export into one re-export edge", () => {
    const edges = edgesFrom(extractForms(), "src/import-and-reexport.ts")
    expect(edges).toEqual([
      {
        from: "src/import-and-reexport.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: true,
      },
    ])
  })

  test('yields a runtime edge for a side-effect `import "mod"`', () => {
    const edges = edgesFrom(extractForms(), "src/side-effect.ts")
    expect(edges).toEqual([
      {
        from: "src/side-effect.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("yields a runtime dynamic edge for `import()`", () => {
    const edges = edgesFrom(extractForms(), "src/dynamic.ts")
    expect(edges).toEqual([
      {
        from: "src/dynamic.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "dynamic",
        reExport: false,
      },
    ])
  })

  test("surfaces a non-literal `import(expr)` as an unresolved diagnostic", () => {
    const graph = extractForms()
    expect(graph.unresolved).toContainEqual(
      expect.objectContaining({ from: "src/dynamic.ts", specifier: "path" }),
    )
  })

  test("surfaces a non-literal require(expr) as a diagnostic, skips argument-less require()", () => {
    const graph = extractForms()
    const fromRequires = graph.unresolved.filter(
      (entry) => entry.from === "src/requires.ts",
    )
    expect(fromRequires).toEqual([
      {
        from: "src/requires.ts",
        specifier: "name",
        reason: "non-literal import expression",
        literal: false,
      },
    ])
  })

  test("yields a runtime require edge for `require()`", () => {
    const edges = edgesFrom(extractForms(), "src/requires.ts")
    expect(edges).toEqual([
      {
        from: "src/requires.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "require",
        reExport: false,
      },
    ])
  })

  test("extracts a file with no require through the prefilter negative path", () => {
    const edges = edgesFrom(extractForms(), "src/no-require.ts")
    expect(edges).toEqual([
      {
        from: "src/no-require.ts",
        to: { type: "module", path: "src/dep.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("surfaces an unresolvable specifier as a diagnostic, not an edge", () => {
    const graph = extractForms()
    expect(edgesFrom(graph, "src/unresolvable.ts")).toEqual([])
    const diagnostics = graph.unresolved.filter(
      (entry) => entry.from === "src/unresolvable.ts",
    )
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      from: "src/unresolvable.ts",
      specifier: "./missing.js",
      // resolver-failed literal — the fatal class (exit 2), unlike non-literal
      literal: true,
    })
  })

  test("keeps an unparseable file kind as a node and edge target without outgoing edges", () => {
    const graph = extractForms()
    expect(graph.modules.get("src/widget.svelte")).toMatchObject({
      parsed: false,
    })
    expect(edgesFrom(graph, "src/widget.svelte")).toEqual([])
    expect(edgesFrom(graph, "src/app.ts")).toEqual([
      {
        from: "src/app.ts",
        to: { type: "module", path: "src/widget.svelte" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("turns builtins, packages and exports subpaths into external leaves", () => {
    const targets = edgesFrom(extractForms(), "src/externals.ts").map(
      (edge) => edge.to,
    )
    expect(targets).toContainEqual({
      type: "external",
      specifier: "node:path",
      package: "node:path",
      declared: false,
      layer: null,
    })
    // unprefixed builtin: package is the resolver's normalized name
    expect(targets).toContainEqual({
      type: "external",
      specifier: "path",
      package: "node:path",
      declared: false,
      layer: null,
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "somepkg",
      package: "somepkg",
      declared: false,
      layer: null,
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "somepkg/thing",
      package: "somepkg",
      declared: false,
      layer: null,
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "@scope/pkg",
      package: "@scope/pkg",
      declared: false,
      layer: null,
    })
  })

  test("never expands an external leaf into the module set", () => {
    const graph = extractForms()
    for (const path of graph.modules.keys()) {
      expect(path).not.toContain("node_modules")
    }
  })

  test("turns a file outside the coverage set into an external leaf with no package", () => {
    const edges = edgesFrom(extractForms(), "src/imports-outside.ts")
    expect(edges).toEqual([
      {
        from: "src/imports-outside.ts",
        to: {
          type: "external",
          specifier: "../outside.js",
          package: null,
          declared: false,
          layer: null,
        },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("classifies nodes through the flavor at graph build", () => {
    const graph = extractForms()
    expect(graph.modules.get("src/foo.model.ts")).toMatchObject({
      layer: "model",
    })
    expect(graph.modules.get("src/dep.ts")).toMatchObject({ layer: "blob" })
  })

  describe("runtime content — the fact ports-types-only reads", () => {
    test("collects every non-erasable top-level entry, statement order", () => {
      const graph = extractForms()
      expect(
        graph.modules.get("src/runtime-content.ts")?.runtimeContent,
      ).toEqual([
        { form: "const", name: "SOME_MADE_UP_CONST", exported: true },
        { form: "const", name: "a", exported: true },
        { form: "const", name: "b", exported: true },
        { form: "function", name: "helper", exported: true },
        { form: "class", name: "Thing", exported: true },
        { form: "enum", name: "Mode", exported: true },
        // const enum is still a value binding — fires like a plain enum
        { form: "enum", name: "ConstMode", exported: true },
        { form: "namespace", name: "NS", exported: true },
        { form: "const", name: "local", exported: false },
        // destructuring declarator: no single name to carry
        { form: "const", name: null, exported: false },
        { form: "statement", name: null, exported: false },
        { form: "default", name: null, exported: true },
      ])
    })

    test("yields no entries for erasable forms — types, ambients, export clauses", () => {
      const graph = extractForms()
      expect(graph.modules.get("src/types-only.ts")?.runtimeContent).toEqual([])
    })

    test("carries a default-exported declaration's keyword, and its name where one exists", () => {
      const graph = extractForms()
      expect(graph.modules.get("src/default-fn.ts")?.runtimeContent).toEqual([
        { form: "function", name: "makeThing", exported: true },
      ])
      // anonymous: the grammar gives no name to carry
      expect(graph.modules.get("src/default-class.ts")?.runtimeContent).toEqual(
        [{ form: "class", name: null, exported: true }],
      )
    })

    test("never lists import or re-export statements — those are edge facts", () => {
      const graph = extractForms()
      expect(
        graph.modules.get("src/export-named-from.ts")?.runtimeContent,
      ).toEqual([])
      expect(
        graph.modules.get("src/local-reexport.ts")?.runtimeContent,
      ).toEqual([])
      // the side-effect import contributes nothing; only the declaration shows
      expect(graph.modules.get("src/side-effect.ts")?.runtimeContent).toEqual([
        { form: "const", name: "done", exported: true },
      ])
    })

    test("claims nothing for an unparseable file kind", () => {
      const graph = extractForms()
      expect(graph.modules.get("src/widget.svelte")?.runtimeContent).toEqual([])
    })
  })

  test("grants assembly through the designation matcher, on top of the flavor", () => {
    const graph = extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      isAssembly: (path) => path === "src/app.ts",
    })
    expect(graph.modules.get("src/app.ts")).toMatchObject({ layer: "assembly" })
  })
})

describe("extractGraph over the resolution fixture", () => {
  const RESOLUTION_FILES = [
    "src/uses-alias.ts",
    "src/app/util.ts",
    "src/esm.mts",
    "src/cjs.cts",
  ]

  const extractResolution = () =>
    extractFixture({ fixture: "resolution", files: RESOLUTION_FILES })

  test("resolves a tsconfig paths alias to the in-set module", () => {
    const edges = edgesFrom(extractResolution(), "src/uses-alias.ts")
    expect(edges).toEqual([
      {
        from: "src/uses-alias.ts",
        to: { type: "module", path: "src/app/util.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("resolves .cjs to .cts between .mts/.cts modules", () => {
    const edges = edgesFrom(extractResolution(), "src/esm.mts")
    expect(edges).toEqual([
      {
        from: "src/esm.mts",
        to: { type: "module", path: "src/cjs.cts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  test("resolves a config alias to the in-set module — bundler-only aliases teach the resolver", () => {
    const root = fixtureRoot("resolution")
    const extraction = createExtraction({
      engine: createOxcEngine({
        alias: { "some-made-up-alias": [`${root}src/app`] },
      }),
      flavor: createTsSuffixesFactoriesFlavor(),
    })
    const graph = extraction.extractGraph({
      root,
      files: [...RESOLUTION_FILES, "src/uses-made-up-alias.ts"],
    })
    expect(edgesFrom(graph, "src/uses-made-up-alias.ts")).toEqual([
      {
        from: "src/uses-made-up-alias.ts",
        to: { type: "module", path: "src/app/util.ts" },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })
})

describe("extractGraph — declared external specifiers", () => {
  /**
   * In-memory engine: files carry literal imports only; every resolution fails
   * and is recorded — a declared hit must never reach `resolve`.
   */
  type FakeImport = string | { specifier: string; typeOnly: boolean }
  type FakeFiles = Record<string, readonly FakeImport[]>

  const fakeEngine = (imports: FakeFiles) => {
    const resolved: string[] = []
    const engine: ExtractionEngine = {
      extract: (absolutePath) => {
        const file = Object.keys(imports).find((name) =>
          absolutePath.endsWith(name),
        )
        if (!file) return null
        return {
          imports: (imports[file] as readonly FakeImport[]).map((entry) => {
            const { specifier, typeOnly } =
              typeof entry === "string"
                ? { specifier: entry, typeOnly: false }
                : entry
            return {
              specifier,
              typeOnly,
              form: "static" as const,
              reExport: false,
              literal: true,
            }
          }),
          runtimeContent: [],
        }
      },
      resolve: (_from, specifier) => {
        resolved.push(specifier)
        return { kind: "unresolved", reason: "fake: nothing resolves" }
      },
    }
    return { engine, resolved }
  }

  const extractDeclared = (
    imports: FakeFiles,
    external?: (specifier: string) => string | null,
  ) => {
    const { engine, resolved } = fakeEngine(imports)
    const graph = createExtraction({
      engine,
      flavor: createTsSuffixesFactoriesFlavor(),
    }).extractGraph({
      root: "/made-up-root",
      files: Object.keys(imports),
      ...(external ? { external } : {}),
    })
    return { graph, resolved }
  }

  const themeMatcher = (specifier: string): string | null =>
    specifier.startsWith("$theme:") ? "$theme:*" : null

  test("turns a matched specifier into a declared external leaf, bypassing the resolver", () => {
    const { graph, resolved } = extractDeclared(
      { "src/a.model.ts": ["$theme:config.scss"] },
      themeMatcher,
    )
    expect(graph.edges).toEqual([
      {
        from: "src/a.model.ts",
        to: {
          type: "external",
          specifier: "$theme:config.scss",
          package: "$theme:*",
          declared: true,
          layer: null,
        },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
    expect(graph.unresolved).toEqual([])
    expect(resolved).toEqual([])
  })

  test("leaves an unmatched specifier to the resolver — unresolved as before", () => {
    const { graph, resolved } = extractDeclared(
      { "src/a.model.ts": ["$other:config.scss"] },
      themeMatcher,
    )
    expect(graph.edges).toEqual([])
    expect(graph.unresolved).toMatchObject([
      { specifier: "$other:config.scss", literal: true },
    ])
    expect(resolved).toEqual(["$other:config.scss"])
  })

  test("without a matcher nothing is declared external", () => {
    const { graph } = extractDeclared({ "src/a.model.ts": ["$theme:x.scss"] })
    expect(graph.edges).toEqual([])
    expect(graph.unresolved).toHaveLength(1)
  })

  test("lands a tail no fixture or list names — the set is open (tripwire)", () => {
    const { graph } = extractDeclared(
      { "src/a.model.ts": ["$theme:zz-unseen-tail.scss"] },
      themeMatcher,
    )
    expect(graph.edges[0]?.to).toMatchObject({
      declared: true,
      layer: null,
      specifier: "$theme:zz-unseen-tail.scss",
    })
  })

  test("merges type + runtime occurrences into one runtime edge, like every external", () => {
    const { graph } = extractDeclared(
      {
        "src/a.model.ts": [
          { specifier: "$theme:x.scss", typeOnly: true },
          { specifier: "$theme:x.scss", typeOnly: false },
        ],
      },
      themeMatcher,
    )
    expect(graph.edges).toHaveLength(1)
    expect(graph.edges[0]).toMatchObject({ kind: "runtime" })
  })
})

describe("extractGraph failure modes", () => {
  test("throws loudly on a parse failure of a supported file kind", () => {
    expect(() =>
      extractFixture({ fixture: "broken", files: ["src/broken.ts"] }),
    ).toThrow()
  })

  test("throws when the flavor breaks its totality contract", () => {
    const extraction = createExtraction({
      engine: createOxcEngine(),
      flavor: { classify: () => new Map() },
    })
    expect(() =>
      extraction.extractGraph({
        root: fixtureRoot("forms"),
        files: ["src/dep.ts"],
      }),
    ).toThrow(/flavor broke its contract/)
  })
})

describe("externalLayerOf — the crossed layer carrier on external leaves", () => {
  /** One file importing the given specifiers; resolution by convention. */
  const extractCrossed = (
    specifiers: readonly string[],
    externalLayerOf?: (
      specifier: string,
    ) => import("./graph.model.ts").Layer | null,
    external?: (specifier: string) => string | null,
  ): ImportGraph => {
    const engine: ExtractionEngine = {
      extract: (absolutePath) =>
        absolutePath.endsWith("src/a.model.ts")
          ? {
              imports: specifiers.map((specifier) => ({
                specifier,
                typeOnly: false,
                form: "static" as const,
                reExport: false,
                literal: true,
              })),
              runtimeContent: [],
            }
          : null,
      resolve: (_from, specifier) =>
        specifier.startsWith("node:")
          ? { kind: "builtin", specifier }
          : specifier.startsWith(".")
            ? { kind: "file", path: `/made-up-elsewhere/${specifier.slice(2)}` }
            : {
                kind: "file",
                path: `/made-up-root/node_modules/${specifier}.ts`,
              },
    }
    return createExtraction({
      engine,
      flavor: createTsSuffixesFactoriesFlavor(),
    }).extractGraph({
      root: "/made-up-root",
      files: ["src/a.model.ts"],
      ...(external ? { external } : {}),
      ...(externalLayerOf ? { externalLayerOf } : {}),
    })
  }

  const layerByConvention = (specifier: string) =>
    specifier.endsWith(".service") ? ("service" as const) : null

  test("stamps the layer on package, builtin, and out-of-coverage leaves — one operation, every leaf kind", () => {
    const graph = extractCrossed(
      [
        "@made-up/billing/checkout.service",
        "node:made-up.service",
        "../outside/thing.service",
        "@made-up/billing",
      ],
      layerByConvention,
    )
    const layers = new Map(
      graph.edges.map((edge) => [
        (edge.to as { specifier: string }).specifier,
        (edge.to as { layer: unknown }).layer,
      ]),
    )
    expect(layers.get("@made-up/billing/checkout.service")).toBe("service")
    expect(layers.get("node:made-up.service")).toBe("service")
    expect(layers.get("../outside/thing.service")).toBe("service")
    expect(layers.get("@made-up/billing")).toBe(null)
  })

  test("consults the carrier for declared externals too — a pattern hit can carry a patched layer", () => {
    const graph = extractCrossed(
      ["$made-up:checkout.service"],
      layerByConvention,
      (specifier) => (specifier.startsWith("$made-up:") ? "$made-up:*" : null),
    )
    expect(graph.edges[0]?.to).toMatchObject({
      declared: true,
      package: "$made-up:*",
      layer: "service",
    })
  })

  test("without the carrier every leaf stays layer: null — today's behavior", () => {
    const graph = extractCrossed(["@made-up/billing/checkout.service"])
    expect(graph.edges[0]?.to).toMatchObject({ layer: null })
  })
})
