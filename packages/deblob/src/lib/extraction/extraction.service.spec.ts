import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import { createOxcEngine } from "./adapters/oxc-extraction.adapter.ts"
import { createTsSuffixesFactoriesFlavor } from "./adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "./extraction.service.ts"
import type { ImportEdge, ImportGraph } from "./graph.model.ts"

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
]

const extractForms = () =>
  extractFixture({ fixture: "forms", files: FORMS_FILES })

const edgesFrom = (graph: ImportGraph, from: string): ImportEdge[] =>
  graph.edges.filter((edge) => edge.from === from)

describe("extractGraph over the forms fixture", () => {
  it("yields a runtime static edge for a plain import", () => {
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

  it("yields a type edge for an `import type` statement", () => {
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

  it("yields one runtime edge for a mixed `{ mk, type T }` statement", () => {
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

  it("dedupes type + runtime statements to the same target into one runtime edge", () => {
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

  it("yields a type edge for `export type ... from`", () => {
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

  it("yields a runtime edge for `export * from`", () => {
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

  it("yields a runtime re-export edge for `export { x } from`", () => {
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

  it("yields a runtime re-export edge for `export * as ns from`", () => {
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

  it("marks the indirect form `import { x } …; export { x }` as a re-export — the module record normalizes it", () => {
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

  it("merges a same-target import + re-export into one re-export edge", () => {
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

  it('yields a runtime edge for a side-effect `import "mod"`', () => {
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

  it("yields a runtime dynamic edge for `import()`", () => {
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

  it("surfaces a non-literal `import(expr)` as an unresolved diagnostic", () => {
    const graph = extractForms()
    expect(graph.unresolved).toContainEqual(
      expect.objectContaining({ from: "src/dynamic.ts", specifier: "path" }),
    )
  })

  it("surfaces a non-literal require(expr) as a diagnostic, skips argument-less require()", () => {
    const graph = extractForms()
    const fromRequires = graph.unresolved.filter(
      (entry) => entry.from === "src/requires.ts",
    )
    expect(fromRequires).toEqual([
      {
        from: "src/requires.ts",
        specifier: "name",
        reason: "non-literal import expression",
      },
    ])
  })

  it("yields a runtime require edge for `require()`", () => {
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

  it("extracts a file with no require through the prefilter negative path", () => {
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

  it("surfaces an unresolvable specifier as a diagnostic, not an edge", () => {
    const graph = extractForms()
    expect(edgesFrom(graph, "src/unresolvable.ts")).toEqual([])
    const diagnostics = graph.unresolved.filter(
      (entry) => entry.from === "src/unresolvable.ts",
    )
    expect(diagnostics).toHaveLength(1)
    expect(diagnostics[0]).toMatchObject({
      from: "src/unresolvable.ts",
      specifier: "./missing.js",
    })
  })

  it("keeps an unparseable file kind as a node and edge target without outgoing edges", () => {
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

  it("turns builtins, packages and exports subpaths into external leaves", () => {
    const targets = edgesFrom(extractForms(), "src/externals.ts").map(
      (edge) => edge.to,
    )
    expect(targets).toContainEqual({
      type: "external",
      specifier: "node:path",
      package: "node:path",
    })
    // unprefixed builtin: package is the resolver's normalized name
    expect(targets).toContainEqual({
      type: "external",
      specifier: "path",
      package: "node:path",
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "somepkg",
      package: "somepkg",
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "somepkg/thing",
      package: "somepkg",
    })
    expect(targets).toContainEqual({
      type: "external",
      specifier: "@scope/pkg",
      package: "@scope/pkg",
    })
  })

  it("never expands an external leaf into the module set", () => {
    const graph = extractForms()
    for (const path of graph.modules.keys()) {
      expect(path).not.toContain("node_modules")
    }
  })

  it("turns a file outside the coverage set into an external leaf with no package", () => {
    const edges = edgesFrom(extractForms(), "src/imports-outside.ts")
    expect(edges).toEqual([
      {
        from: "src/imports-outside.ts",
        to: { type: "external", specifier: "../outside.js", package: null },
        kind: "runtime",
        form: "static",
        reExport: false,
      },
    ])
  })

  it("classifies nodes through the flavor at graph build", () => {
    const graph = extractForms()
    expect(graph.modules.get("src/foo.model.ts")).toMatchObject({
      layer: "model",
    })
    expect(graph.modules.get("src/dep.ts")).toMatchObject({ layer: "blob" })
  })

  it("grants assembly through the designation matcher, on top of the flavor", () => {
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

  it("resolves a tsconfig paths alias to the in-set module", () => {
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

  it("resolves .cjs to .cts between .mts/.cts modules", () => {
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
})

describe("extractGraph failure modes", () => {
  it("throws loudly on a parse failure of a supported file kind", () => {
    expect(() =>
      extractFixture({ fixture: "broken", files: ["src/broken.ts"] }),
    ).toThrow()
  })

  it("throws when the flavor breaks its totality contract", () => {
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
