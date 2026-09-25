import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { createNodeFs } from "../fs/adapters/node-fs.adapter.ts"
import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import { createOxcResolver } from "./adapters/oxc-resolver.adapter.ts"
import { createTsSuffixesFactoriesFlavor } from "./adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "./extraction.service.ts"
import { createPlainTsReader } from "./adapters/plain-ts-reader.adapter.ts"
import { createGoodEnoughTestsReader } from "./adapters/good-enough-tests-reader.adapter.ts"
import type {
  ImportEdge,
  ImportGraph,
  Layer,
  ReadCall,
  ReadStatement,
} from "./graph.model.ts"
import { asExtractionError, isExtractionError } from "./graph.model.ts"
import type { Reader } from "./ports/reader.port.ts"
import type { ExtractionEngine } from "./ports/extraction.port.ts"
import type { Resolver } from "./ports/resolver.port.ts"

/** A parsed nothing — what a fake engine hands the reader. */
const EMPTY_PROGRAM = {
  type: "Program",
  body: [],
  sourceType: "module",
  hashbang: null,
  start: 0,
  end: 0,
} as unknown as import("@oxc-project/types").Program

const fs = createNodeFs()

const fixtureRoot = (name: string) =>
  fileURLToPath(new URL(`./__fixtures__/${name}/`, import.meta.url))

/** Test factory: real adapters over an on-disk fixture repo. */
type Designations = {
  isAssembly?: (path: string) => boolean
  isDriver?: (path: string) => boolean
  isBoot?: (path: string) => boolean
}

const extractFixture = ({
  fixture,
  files,
  readers = [],
  ...designations
}: {
  fixture: string
  files: readonly string[]
  readers?: readonly Reader[]
} & Designations): Promise<ImportGraph> => {
  const root = fixtureRoot(fixture)
  const extraction = createExtraction({
    engine: createOxcEngine({ fs }),
    resolver: createOxcResolver({ tsconfigPath: `${root}tsconfig.json` }),
    flavor: createTsSuffixesFactoriesFlavor(),
    readers,
  })
  return extraction.extractGraph({ root, files, ...designations })
}

/** A reader of one kind over the files named — the binding that designates. */
const fakeReader = (kind: Layer, files: readonly string[]): Reader => ({
  name: "some-made-up-reader",
  files,
  kinds: [kind],
  claims: () => false,
  exempts: [],
})

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
  test("yields a runtime static edge for a plain import", async () => {
    const edges = edgesFrom(await extractForms(), "src/static-runtime.ts")
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

  test("yields a type edge for an `import type` statement", async () => {
    const edges = edgesFrom(await extractForms(), "src/type-statement.ts")
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

  test("yields one runtime edge for a mixed `{ mk, type T }` statement", async () => {
    const edges = edgesFrom(await extractForms(), "src/mixed.ts")
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

  test("dedupes type + runtime statements to the same target into one runtime edge", async () => {
    const edges = edgesFrom(await extractForms(), "src/two-statements.ts")
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

  test("yields a type edge for `export type ... from`", async () => {
    const edges = edgesFrom(await extractForms(), "src/export-type-from.ts")
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

  test("yields a runtime edge for `export * from`", async () => {
    const edges = edgesFrom(await extractForms(), "src/export-star.ts")
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

  test("yields a runtime re-export edge for `export { x } from`", async () => {
    const edges = edgesFrom(await extractForms(), "src/export-named-from.ts")
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

  test("yields a runtime re-export edge for `export * as ns from`", async () => {
    const edges = edgesFrom(await extractForms(), "src/export-star-as.ts")
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

  test("marks the indirect form `import { x } …; export { x }` as a re-export — the module record normalizes it", async () => {
    const edges = edgesFrom(await extractForms(), "src/local-reexport.ts")
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

  test("merges a same-target import + re-export into one re-export edge", async () => {
    const edges = edgesFrom(await extractForms(), "src/import-and-reexport.ts")
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

  test('yields a runtime edge for a side-effect `import "mod"`', async () => {
    const edges = edgesFrom(await extractForms(), "src/side-effect.ts")
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

  test("yields a runtime dynamic edge for `import()`", async () => {
    const edges = edgesFrom(await extractForms(), "src/dynamic.ts")
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

  test("surfaces a non-literal `import(expr)` as an unresolved diagnostic", async () => {
    const graph = await extractForms()
    expect(graph.unresolved).toContainEqual(
      expect.objectContaining({ from: "src/dynamic.ts", specifier: "path" }),
    )
  })

  test("surfaces a non-literal require(expr) as a diagnostic, skips argument-less require()", async () => {
    const graph = await extractForms()
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

  test("yields a runtime require edge for `require()`", async () => {
    const edges = edgesFrom(await extractForms(), "src/requires.ts")
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

  test("extracts a file with no require through the prefilter negative path", async () => {
    const edges = edgesFrom(await extractForms(), "src/no-require.ts")
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

  test("surfaces an unresolvable specifier as a diagnostic, not an edge", async () => {
    const graph = await extractForms()
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

  test("keeps an unparseable file kind as a node and edge target without outgoing edges", async () => {
    const graph = await extractForms()
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

  test("turns builtins, packages and exports subpaths into external leaves", async () => {
    const targets = edgesFrom(await extractForms(), "src/externals.ts").map(
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

  test("never expands an external leaf into the module set", async () => {
    const graph = await extractForms()
    for (const path of graph.modules.keys()) {
      expect(path).not.toContain("node_modules")
    }
  })

  test("turns a file outside the coverage set into an external leaf with no package", async () => {
    const edges = edgesFrom(await extractForms(), "src/imports-outside.ts")
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

  test("classifies nodes through the flavor at graph build", async () => {
    const graph = await extractForms()
    expect(graph.modules.get("src/foo.model.ts")).toMatchObject({
      layer: "model",
    })
    expect(graph.modules.get("src/dep.ts")).toMatchObject({ layer: "blob" })
  })

  describe("runtime content — the fact ports-types-only reads", () => {
    test("collects every non-erasable top-level entry, statement order", async () => {
      const graph = await extractForms()
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

    test("yields no entries for erasable forms — types, ambients, export clauses", async () => {
      const graph = await extractForms()
      expect(graph.modules.get("src/types-only.ts")?.runtimeContent).toEqual([])
    })

    test("carries a default-exported declaration's keyword, and its name where one exists", async () => {
      const graph = await extractForms()
      expect(graph.modules.get("src/default-fn.ts")?.runtimeContent).toEqual([
        { form: "function", name: "makeThing", exported: true },
      ])
      // anonymous: the grammar gives no name to carry
      expect(graph.modules.get("src/default-class.ts")?.runtimeContent).toEqual(
        [{ form: "class", name: null, exported: true }],
      )
    })

    test("never lists import or re-export statements — those are edge facts", async () => {
      const graph = await extractForms()
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

    test("claims nothing for an unparseable file kind", async () => {
      const graph = await extractForms()
      expect(graph.modules.get("src/widget.svelte")?.runtimeContent).toEqual([])
    })
  })

  test("grants assembly through the designation matcher, on top of the flavor", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      isAssembly: (path) => path === "src/app.ts",
    })
    expect(graph.modules.get("src/app.ts")).toMatchObject({ layer: "assembly" })
  })

  test("grants driver and boot through their designation matchers", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      isDriver: (path) => path === "src/app.ts",
      isBoot: (path) => path === "src/dep.ts",
    })
    expect(graph.modules.get("src/app.ts")).toMatchObject({ layer: "driver" })
    expect(graph.modules.get("src/dep.ts")).toMatchObject({ layer: "boot" })
  })

  test("a designation wins over the flavor's word — a layered file under the glob takes the kind", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      isDriver: (path) => path === "src/foo.model.ts",
    })
    expect(graph.modules.get("src/foo.model.ts")).toMatchObject({
      layer: "driver",
    })
  })

  test("a single-kind reader's binding designates its kind, over every designation — a test file is one wherever it sits", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      readers: [fakeReader("test", ["src/app.ts"])],
      isDriver: () => true,
    })
    expect(graph.modules.get("src/app.ts")).toMatchObject({ layer: "test" })
    expect(graph.modules.get("src/dep.ts")).toMatchObject({ layer: "driver" })
  })

  test("a reader of several kinds designates nothing — the file keeps the flavor's word", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      readers: [
        {
          ...fakeReader("driver", ["src/app.ts"]),
          kinds: ["driver", "boot"],
        },
      ],
    })
    expect(graph.modules.get("src/app.ts")).toMatchObject({ layer: "blob" })
  })

  test("an unparsed file takes its designated kind too — the web fence, recognized and open", async () => {
    const graph = await extractFixture({
      fixture: "forms",
      files: FORMS_FILES,
      isDriver: (path) => path === "src/widget.svelte",
    })
    expect(graph.modules.get("src/widget.svelte")).toMatchObject({
      layer: "driver",
      parsed: false,
    })
  })

  test("throws an ExtractionError naming the file and both keys when two designations claim one file", async () => {
    let thrown: unknown
    try {
      await extractFixture({
        fixture: "forms",
        files: FORMS_FILES,
        isAssembly: (path) => path === "src/app.ts",
        isBoot: (path) => path === "src/app.ts",
      })
    } catch (error) {
      thrown = error
    }
    expect(isExtractionError(thrown)).toBe(true)
    expect(thrown).toMatchObject({
      code: "designation-conflict",
      message: expect.stringMatching(
        /src\/app\.ts is designated "assembly" and "boot"/,
      ) as string,
    })
    // the guard is duck-typed on the name: a bare Error is not extraction's,
    // an instance from another realm with the name is
    expect(isExtractionError(new Error("parse failed"))).toBe(false)
    expect(
      isExtractionError(
        Object.assign(new Error("SOME_MADE_UP"), { name: "ExtractionError" }),
      ),
    ).toBe(true)
    // the presenting twin: extraction's own error comes back, a bug keeps flying
    expect(asExtractionError(thrown)).toBe(thrown)
    const bug = new Error("SOME_MADE_UP_BUG")
    expect(() => asExtractionError(bug)).toThrow(bug)
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

  test("resolves a tsconfig paths alias to the in-set module", async () => {
    const edges = edgesFrom(await extractResolution(), "src/uses-alias.ts")
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

  test("resolves .cjs to .cts between .mts/.cts modules", async () => {
    const edges = edgesFrom(await extractResolution(), "src/esm.mts")
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

  test("resolves a config alias to the in-set module — bundler-only aliases teach the resolver", async () => {
    const root = fixtureRoot("resolution")
    const extraction = createExtraction({
      engine: createOxcEngine({ fs }),
      resolver: createOxcResolver({
        alias: { "some-made-up-alias": [`${root}src/app`] },
      }),
      flavor: createTsSuffixesFactoriesFlavor(),
    })
    const graph = await extraction.extractGraph({
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
      extract: async (absolutePath) => {
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
          program: EMPTY_PROGRAM,
          source: "",
        }
      },
    }
    const resolver: Resolver = {
      resolve: async (_from, specifier) => {
        resolved.push(specifier)
        return { kind: "unresolved", reason: "fake: nothing resolves" }
      },
    }
    return { engine, resolver, resolved }
  }

  const extractDeclared = async (
    imports: FakeFiles,
    external?: (specifier: string) => string | null,
  ) => {
    const { engine, resolver, resolved } = fakeEngine(imports)
    const graph = await createExtraction({
      engine,
      resolver,
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

  test("turns a matched specifier into a declared external leaf, bypassing the resolver", async () => {
    const { graph, resolved } = await extractDeclared(
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

  test("leaves an unmatched specifier to the resolver — unresolved as before", async () => {
    const { graph, resolved } = await extractDeclared(
      { "src/a.model.ts": ["$other:config.scss"] },
      themeMatcher,
    )
    expect(graph.edges).toEqual([])
    expect(graph.unresolved).toMatchObject([
      { specifier: "$other:config.scss", literal: true },
    ])
    expect(resolved).toEqual(["$other:config.scss"])
  })

  test("without a matcher nothing is declared external", async () => {
    const { graph } = await extractDeclared({
      "src/a.model.ts": ["$theme:x.scss"],
    })
    expect(graph.edges).toEqual([])
    expect(graph.unresolved).toHaveLength(1)
  })

  test("lands a tail no fixture or list names — the set is open (tripwire)", async () => {
    const { graph } = await extractDeclared(
      { "src/a.model.ts": ["$theme:zz-unseen-tail.scss"] },
      themeMatcher,
    )
    expect(graph.edges[0]?.to).toMatchObject({
      declared: true,
      layer: null,
      specifier: "$theme:zz-unseen-tail.scss",
    })
  })

  test("merges type + runtime occurrences into one runtime edge, like every external", async () => {
    const { graph } = await extractDeclared(
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
  test("lists a file that does not parse as broken, with no line, and keeps it a node with nothing read", async () => {
    const graph = await extractFixture({
      fixture: "broken",
      files: ["src/broken.ts"],
    })
    expect(graph.broken).toEqual([
      { file: "src/broken.ts", line: null, reason: expect.any(String) },
    ])
    expect(graph.modules.get("src/broken.ts")).toMatchObject({
      parsed: false,
      reading: null,
    })
  })

  test("throws when a covered file is not there — the scan listed it, nothing else may answer for it", async () => {
    await expect(
      extractFixture({
        fixture: "forms",
        files: ["src/SOME_MADE_UP_MISSING.ts"],
      }),
    ).rejects.toThrow(/no such file/)
  })

  test("throws when the flavor breaks its totality contract", async () => {
    const extraction = createExtraction({
      engine: createOxcEngine({ fs }),
      resolver: createOxcResolver(),
      flavor: { classify: () => new Map() },
    })
    await expect(
      extraction.extractGraph({
        root: fixtureRoot("forms"),
        files: ["src/dep.ts"],
      }),
    ).rejects.toThrow(/flavor broke its contract/)
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
  ): Promise<ImportGraph> => {
    const engine: ExtractionEngine = {
      extract: async (absolutePath) =>
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
              program: EMPTY_PROGRAM,
              source: "",
            }
          : null,
    }
    const resolver: Resolver = {
      resolve: async (_from, specifier) =>
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
      resolver,
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

  test("stamps the layer on package, builtin, and out-of-coverage leaves — one operation, every leaf kind", async () => {
    const graph = await extractCrossed(
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

  test("consults the carrier for declared externals too — a pattern hit can carry a patched layer", async () => {
    const graph = await extractCrossed(
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

  test("without the carrier every leaf stays layer: null — today's behavior", async () => {
    const graph = await extractCrossed(["@made-up/billing/checkout.service"])
    expect(graph.edges[0]?.to).toMatchObject({ layer: null })
  })
})

describe("the reading on the graph — the reading fixture", () => {
  const READING_FILES = [
    "src/app/app.service.ts",
    "src/app/app.port.ts",
    "src/app/store.adapter.ts",
    "src/app/app.model.ts",
    "src/legacy.ts",
    "src/cli.assembly.ts",
    "src/cli.driver.ts",
    "src/sub.driver.ts",
    "src/cli.boot.ts",
    "src/group.assembly.ts",
    "src/other.driver.ts",
    "src/default.driver.ts",

    "src/opaque.assembly.ts",
    "src/const.assembly.ts",
    "src/default.assembly.ts",
    "src/app/app.service.spec.ts",
    "src/globals.spec.ts",
    "src/sub.driver.spec.ts",
    "src/routes/+page.svelte",
  ]

  /**
   * Test factory: the fixture project with both stock readers and the project's
   * claims.
   */
  const extractReading = (
    readers = [createPlainTsReader(), createGoodEnoughTestsReader()],
    configLoads: readonly { file: string; name: string }[] = [
      { file: "src/app/app.service.ts", name: "load" },
    ],
  ) => {
    const root = fixtureRoot("reading")
    const extraction = createExtraction({
      engine: createOxcEngine({ fs }),
      resolver: createOxcResolver({ tsconfigPath: `${root}tsconfig.json` }),
      flavor: createTsSuffixesFactoriesFlavor(),
      readers,
    })
    return extraction.extractGraph({
      root,
      files: READING_FILES,
      isDriver: (path) => path.endsWith("+page.svelte"),
      pure: ["pure-made-up-lib"],
      driverTech: (specifier) => specifier === "some-made-up-parser",
      configLoads,
    })
  }

  const readingOf = (graph: ImportGraph, path: string) => {
    const reading = graph.modules.get(path)?.reading
    if (!reading) throw new Error(`no reading for ${path}`)
    return reading
  }

  const callsOf = (statements: readonly ReadStatement[]): ReadCall[] =>
    statements.flatMap((statement) =>
      statement.kind === "call"
        ? [statement.call]
        : statement.kind === "control"
          ? statement.arms.flatMap(callsOf)
          : [],
    )

  const kindsOf = (calls: readonly ReadCall[]) =>
    calls.map((call) => call.callee.kind)

  test("chooses the reader by binding and kind: plain-ts for assembly, driver and boot; good-enough-tests for the files its naming binds; none inside", async () => {
    const graph = await extractReading()
    expect(readingOf(graph, "src/cli.assembly.ts").tech).toBe("plain-ts")
    expect(readingOf(graph, "src/cli.driver.ts").tech).toBe("plain-ts")
    expect(readingOf(graph, "src/cli.boot.ts").tech).toBe("plain-ts")
    expect(readingOf(graph, "src/app/app.service.spec.ts").tech).toBe(
      "good-enough-tests",
    )
    expect(readingOf(graph, "src/app/app.service.spec.ts").exempts).toEqual([
      "registration",
      "call-count",
      "services-only",
      "definitions",
    ])
    expect(readingOf(graph, "src/app/app.model.ts").tech).toBeNull()
    expect(readingOf(graph, "src/app/app.model.ts").functions).toEqual([])
    expect(
      callsOf(readingOf(graph, "src/app/app.model.ts").root).map(
        (c) => c.callee,
      ),
    ).toEqual([{ kind: "language" }])
  })

  test("an unparsed designated file has no reading — recognized and open", async () => {
    const graph = await extractReading()
    // the CLI driver calls its wiring function: a world for it, which no
    // reader reads — no reading in any world either
    expect(graph.modules.get("src/routes/+page.svelte")).toMatchObject({
      layer: "driver",
      parsed: false,
      reading: null,
      readings: [],
    })
  })

  test("tripwire: an outside kind no injected reader covers reads as null, no throw", async () => {
    const graph = await extractReading([createGoodEnoughTestsReader()])
    // the boot calls `main()`: a world for the driver, which no reader reads
    // in any world — no reading, and no world reading either
    expect(graph.modules.get("src/cli.driver.ts")).toMatchObject({
      layer: "driver",
      parsed: true,
      reading: null,
      readings: [],
    })
    expect(readingOf(graph, "src/globals.spec.ts").tech).toBe(
      "good-enough-tests",
    )
  })

  test("a configured binding comes first, and the kinds filter holds: plain-ts bound over the spec naming does not read a test file", async () => {
    const graph = await extractReading([
      { ...createPlainTsReader(), files: ["**/*.spec.ts"] },
      createGoodEnoughTestsReader(),
    ])
    // the runner's binding still designates the kind, plain-ts reads no test
    // kind, so the file falls to the runner — not to null
    expect(readingOf(graph, "src/globals.spec.ts").tech).toBe(
      "good-enough-tests",
    )
    expect(graph.modules.get("src/globals.spec.ts")?.layer).toBe("test")
    // a binding the runner gains from config reads with the four exemptions
    const bound = await extractReading([
      { ...createGoodEnoughTestsReader(), files: ["src/legacy.ts"] },
      createPlainTsReader(),
      createGoodEnoughTestsReader(),
    ])
    expect(bound.modules.get("src/legacy.ts")).toMatchObject({ layer: "test" })
    expect(readingOf(bound, "src/legacy.ts").exempts).toHaveLength(4)
    expect(bound.modules.get("src/globals.spec.ts")?.layer).toBe("test")
  })

  test("a driver: externals by claim, purity and complement; hooks cut, nested; the open part", async () => {
    const [main] = readingOf(
      await extractReading(),
      "src/cli.driver.ts",
    ).functions
    if (!main) throw new Error("main not read")
    const calls = callsOf(main.body)
    const at = (line: number) =>
      calls.filter((call) => call.span.line === line).map((call) => call.callee)
    // `driverTech` claims the parser; a concrete builtin is tech; a `pure` package is model; the rest is unclaimed
    expect(at(10)).toEqual([{ kind: "tech", package: "some-made-up-parser" }])
    expect(at(12)).toEqual([{ kind: "tech", package: "node:fs" }])
    expect(at(13)).toEqual([
      { kind: "model", path: "pure-made-up-lib", name: "pureThing" },
    ])
    expect(at(14)).toEqual([
      { kind: "unclaimed", package: "unclaimed-made-up-lib" },
    ])
    // the assembly call, its result an instance handed to the sub-driver's wiring
    expect(at(11)).toEqual([
      { kind: "tech", package: null },
      {
        kind: "factory",
        layer: "assembly",
        path: "src/cli.assembly.ts",
        name: "createCliAssembly",
      },
    ])
    expect(at(29)).toEqual([
      { kind: "wiring", path: "src/sub.driver.ts", name: "registerSub" },
    ])
    expect(
      calls.find((call) => call.span.line === 29)?.args.map((arg) => arg.kind),
    ).toEqual(["tech", "instance"])
    // the hooks: one use-case call each, through the assembly's returned record
    expect(main.hooks.map((hook) => hook.span.line)).toEqual([15, 19, 24, 34])
    // assignments in a hook: statements of their own, the target root's kind
    // — the hook's parameter and the host global are both tech-held
    expect(main.hooks[3]?.body).toEqual([
      { kind: "assignment", target: "tech", span: expect.anything() },
      { kind: "assignment", target: "tech", span: expect.anything() },
    ])
    expect(kindsOf(callsOf(main.hooks[0]?.body ?? []))).toEqual(["use-case"])
    expect(callsOf(main.hooks[0]?.body ?? [])[0]?.callee).toEqual({
      kind: "use-case",
      member: "app.check",
      origin: {
        path: "src/cli.assembly.ts",
        name: "createCliAssembly",
        layer: "assembly",
      },
    })
    expect(callsOf(main.hooks[0]?.body ?? [])[0]?.result).toEqual([
      { kind: "returned" },
    ])
    // the second hook translates: a branch on the result, a stringify, a console call
    expect(kindsOf(callsOf(main.hooks[1]?.body ?? []))).toEqual([
      "use-case",
      "tech",
      "language",
      "tech",
    ])
    expect(callsOf(main.hooks[1]?.body ?? [])[0]?.result).toEqual([
      { kind: "member" },
      { kind: "condition" },
      { kind: "argument", to: { kind: "language" } },
    ])
    // a hook inside a hook
    expect(main.hooks[2]?.hooks.map((hook) => hook.span.line)).toEqual([25])
    expect(kindsOf(callsOf(main.hooks[2]?.hooks[0]?.body ?? []))).toEqual([
      "use-case",
    ])
    // `.map` and `.then` callbacks: not hooks — read inline where they sit.
    // The use case hidden in the `.then` is a call of the wiring zone, its
    // result handed to the language; nothing open
    expect(at(31)).toEqual([{ kind: "language" }])
    expect(at(32)).toEqual([
      { kind: "language" },
      {
        kind: "use-case",
        member: "app.check",
        origin: {
          path: "src/cli.assembly.ts",
          name: "createCliAssembly",
          layer: "assembly",
        },
      },
      { kind: "language" },
    ])
    expect(
      calls.find(
        (call) => call.span.line === 32 && call.callee.kind === "use-case",
      )?.result,
    ).toEqual([{ kind: "argument", to: { kind: "language" } }])
    expect(readingOf(await extractReading(), "src/cli.driver.ts").open).toEqual(
      [],
    )
  })

  test("an assembly: factories by file kind, a use case on an instance, controls by their test", async () => {
    const [assembly] = readingOf(
      await extractReading(),
      "src/cli.assembly.ts",
    ).functions
    if (!assembly) throw new Error("assembly function not read")
    const calls = callsOf(assembly.body)
    expect(kindsOf(calls)).toEqual([
      "factory", // createMemoryStore
      "factory", // createAppService
      "use-case", // app.load()
      "factory", // createRegistry — a model export the stock flavor names
      "model", // normalize — a model function, bound by flow
      "factory", // createLegacyThing (blob)
      "factory",
      "factory",
      "use-case", // app.status(...).ok in a condition
      "factory",
      "factory", // createGroupAssembly
    ])
    expect(calls[5]?.callee).toMatchObject({ kind: "factory", layer: "blob" })
    // the stock flavor's word reaches the reader through the service
    expect(calls[3]?.callee).toEqual({
      kind: "factory",
      layer: "model",
      path: "src/app/app.model.ts",
      name: "createRegistry",
    })
    expect(calls[2]?.callee).toEqual({
      kind: "use-case",
      member: "load",
      origin: {
        path: "src/app/app.service.ts",
        name: "createAppService",
        layer: "service",
      },
    })
    // the declared load, traced to its factory in this file: matched, its
    // result a tech value, the branch on it wiring
    expect(calls[2]?.load).toEqual({
      file: "src/app/app.service.ts",
      name: "load",
    })
    expect(calls[2]?.result).toEqual([
      { kind: "member" },
      { kind: "condition" },
    ])
    expect(
      assembly.body.flatMap((statement) =>
        statement.kind === "control" ? [statement.testOrigin] : [],
      ),
    ).toEqual(["parameter", "load", "instance"])
    // the group assembly receives an instance and a record of tech values
    expect(calls[10]?.args).toEqual([
      {
        kind: "instance",
        origin: {
          path: "src/app/app.service.ts",
          name: "createAppService",
          layer: "service",
        },
        path: [],
      },
      { kind: "tech", origin: null, path: [] },
    ])
    // the returned record joins its entries: two instances, two computed values
    expect(assembly.body.at(-1)).toMatchObject({
      kind: "return",
      value: "computed",
    })
    // bound at the two drivers' call sites: both pass what the host hands
    expect(assembly.params).toEqual([
      { name: "cwd", kind: "tech" },
      { name: "env", kind: "tech" },
    ])
  })

  test("an undeclared use-case call in an assembly stays `load: null`", async () => {
    const [assembly] = readingOf(
      await extractReading(undefined, []),
      "src/cli.assembly.ts",
    ).functions
    expect(callsOf(assembly?.body ?? [])[2]?.load).toBeNull()
  })

  test("a group assembly: parameters bound at the root's call site, a load on a received instance matched by file", async () => {
    const [group] = readingOf(
      await extractReading(),
      "src/group.assembly.ts",
    ).functions
    if (!group) throw new Error("group assembly not read")
    expect(group.params).toEqual([
      { name: "app", kind: "instance" },
      { name: "cwd", kind: "tech" },
    ])
    const calls = callsOf(group.body)
    expect(calls[0]?.callee).toEqual({
      kind: "use-case",
      member: "load",
      origin: {
        path: "src/app/app.service.ts",
        name: "createAppService",
        layer: "service",
      },
    })
    expect(calls[0]?.load).toEqual({
      file: "src/app/app.service.ts",
      name: "load",
    })
    expect(
      group.body.flatMap((statement) =>
        statement.kind === "control" ? [statement.testOrigin] : [],
      ),
    ).toEqual(["load", "parameter"])
    expect(
      readingOf(await extractReading(), "src/group.assembly.ts").open,
    ).toEqual([])
  })

  test("a sub-driver exported as the default is bound under the default key", async () => {
    const [register] = readingOf(
      await extractReading(),
      "src/default.driver.ts",
    ).functions
    expect(register?.name).toBeNull()
    expect(register?.params).toEqual([{ name: "cli", kind: "tech" }])
    expect(register?.hooks).toHaveLength(1)
  })

  test("a load naming a file outside coverage is an ExtractionError, presented by the driver", async () => {
    let thrown: unknown
    try {
      await extractReading(undefined, [
        { file: "src/nowhere.service.ts", name: "load" },
      ])
    } catch (error) {
      thrown = error
    }
    expect(isExtractionError(thrown)).toBe(true)
    expect(thrown).toMatchObject({ code: "load-file-not-covered" })
  })

  test("a sub-driver called from two sites with different kinds: one reading per world, each judged as the only caller; `reading` binds from the first", async () => {
    const graph = await extractReading()
    const node = graph.modules.get("src/sub.driver.ts")
    expect(
      node?.readings.map(({ world }) => [
        world.name,
        world.site.path,
        world.site.span.line,
        world.args.map((arg) => arg.kind),
      ]),
    ).toEqual([
      ["registerSub", "src/cli.driver.ts", 29, ["tech", "instance"]],
      ["registerSub", "src/other.driver.ts", 11, ["literal", "instance"]],
      // the same kinds as the first, another origin for the instance
      ["registerSub", "src/other.driver.ts", 29, ["tech", "instance"]],
    ])
    expect(
      node?.readings.map(({ world }) => world.args[1]?.origin?.name),
    ).toEqual([
      "createCliAssembly",
      "createCliAssembly",
      "createOpaqueAssembly",
    ])
    // the spec file's site opens no world
    expect(
      node?.readings.some(({ world }) => world.site.path.endsWith(".spec.ts")),
    ).toBe(false)
    // `reading`, and the first world: the parser is tech, the hook is cut
    const [first] = readingOf(graph, "src/sub.driver.ts").functions
    expect(first?.params).toEqual([
      { name: "cli", kind: "tech" },
      { name: "services", kind: "instance" },
    ])
    expect(kindsOf(callsOf(first?.body ?? []))).toEqual(["tech", "tech"])
    expect(first?.hooks).toHaveLength(1)
    expect(node?.readings[0]?.reading.functions[0]?.params).toEqual(
      first?.params,
    )
    // the second world: the parser a literal, so `.command` and `.action`
    // are the language's, and the callback is no hook — read inline, its use
    // case a call of the wiring zone. Nothing unknown, nothing open
    const second = node?.readings[1]?.reading
    expect(second?.functions[0]?.params).toEqual([
      { name: "cli", kind: "literal" },
      { name: "services", kind: "instance" },
    ])
    expect(kindsOf(callsOf(second?.functions[0]?.body ?? []))).toEqual([
      "language",
      "use-case",
      "language",
    ])
    expect(second?.functions[0]?.hooks).toEqual([])
    expect(node?.readings.map(({ reading }) => reading.open)).toEqual([
      [],
      [],
      [],
    ])
    // a function nothing calls across files opens no world: one reading
    expect(graph.modules.get("src/other.driver.ts")?.readings).toEqual([])
  })

  test("a sub-driver with one agreeing site: the parser is tech, the hook is cut, the use case traced through the record", async () => {
    const root = fixtureRoot("reading")
    const extraction = createExtraction({
      engine: createOxcEngine({ fs }),
      resolver: createOxcResolver({ tsconfigPath: `${root}tsconfig.json` }),
      flavor: createTsSuffixesFactoriesFlavor(),
      readers: [createPlainTsReader(), createGoodEnoughTestsReader()],
    })
    // only cli.driver.ts calls it once other.driver.ts is left out
    const single = await extraction.extractGraph({
      root,
      files: READING_FILES.filter((file) => file !== "src/other.driver.ts"),
      driverTech: (specifier) => specifier === "some-made-up-parser",
    })
    const [register] = readingOf(single, "src/sub.driver.ts").functions
    // the spec file's site, handing two unknowns, is read but does not bind
    expect(
      callsOf(
        readingOf(single, "src/sub.driver.spec.ts").hooks[0]?.body ?? [],
      ).map((call) => call.callee.kind),
    ).toEqual(["wiring"])
    expect(register?.params).toEqual([
      { name: "cli", kind: "tech" },
      { name: "services", kind: "instance" },
    ])
    expect(kindsOf(callsOf(register?.body ?? []))).toEqual(["tech", "tech"])
    expect(register?.hooks).toHaveLength(1)
    expect(callsOf(register?.hooks[0]?.body ?? [])[0]?.callee).toEqual({
      kind: "use-case",
      member: "app.check",
      origin: {
        path: "src/cli.assembly.ts",
        name: "createCliAssembly",
        layer: "assembly",
      },
    })
    expect(readingOf(single, "src/sub.driver.ts").open).toEqual([])
  })

  test("a flavor without the factory naming rule names nothing: every model callee stays model", async () => {
    const root = fixtureRoot("reading")
    const stock = createTsSuffixesFactoriesFlavor()
    const extraction = createExtraction({
      engine: createOxcEngine({ fs }),
      resolver: createOxcResolver({ tsconfigPath: `${root}tsconfig.json` }),
      flavor: { classify: (files) => stock.classify(files) },
      readers: [createPlainTsReader()],
    })
    const graph = await extraction.extractGraph({ root, files: READING_FILES })
    const [assembly] = readingOf(graph, "src/cli.assembly.ts").functions
    expect(callsOf(assembly?.body ?? [])[3]?.callee).toEqual({
      kind: "model",
      path: "src/app/app.model.ts",
      name: "createRegistry",
    })
  })

  test("a boot: its root call is the driver's wiring function", async () => {
    const reading = readingOf(await extractReading(), "src/cli.boot.ts")
    expect(reading.functions).toEqual([])
    expect(callsOf(reading.root).map((call) => call.callee)).toEqual([
      { kind: "wiring", path: "src/cli.driver.ts", name: "main" },
    ])
  })

  test("a spec file: registration at root is a tech call, hooks cut from describe, test and beforeEach", async () => {
    const reading = readingOf(
      await extractReading(),
      "src/app/app.service.spec.ts",
    )
    expect(callsOf(reading.root).map((call) => call.callee)).toEqual([
      { kind: "tech", package: "vitest" },
    ])
    expect(reading.hooks).toHaveLength(1)
    const [describeHook] = reading.hooks
    expect(describeHook?.hooks.map((hook) => hook.span.line)).toEqual([10, 14])
    const testCalls = callsOf(describeHook?.hooks[1]?.body ?? [])
    expect(kindsOf(testCalls)).toEqual([
      "factory",
      "factory",
      "use-case",
      "use-case",
      "factory",
      "tech",
      "tech",
      "tech",
      "tech",
    ])
  })

  test("a globals-mode runner: the registration names are free globals, tech by complement", async () => {
    const reading = readingOf(await extractReading(), "src/globals.spec.ts")
    expect(callsOf(reading.root).map((call) => call.callee)).toEqual([
      { kind: "tech", package: null },
    ])
    expect(reading.hooks[0]?.hooks).toHaveLength(1)
  })
})
