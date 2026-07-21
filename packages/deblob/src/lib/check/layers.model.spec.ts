import { describe, expect, it } from "vitest"

import type {
  EdgeKind,
  EdgeTarget,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import { checkLayers } from "./layers.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
  isPrivate?: boolean
}

type EdgeSpec = {
  from: string
  to: EdgeTarget
  kind?: EdgeKind
}

const graph = (
  nodes: Record<string, NodeSpec>,
  edges: EdgeSpec[],
): ImportGraph => ({
  root: "/repo",
  modules: new Map(
    Object.entries(nodes).map(([path, spec]) => [
      path,
      {
        path,
        layer: spec.layer,
        serviceRoot: spec.serviceRoot ?? null,
        isPrivate: spec.isPrivate ?? false,
        parsed: true,
        runtimeContent: [],
      },
    ]),
  ),
  edges: edges.map(({ from, to, kind }) => ({
    from,
    to,
    kind: kind ?? "runtime",
    form: "static",
    reExport: false,
  })),
  unresolved: [],
})

const mod = (path: string): EdgeTarget => ({ type: "module", path })

const lib = (specifier: string): EdgeTarget => ({
  type: "external",
  specifier,
  package: specifier,
})

/** A resolved file outside the coverage set — no package name. */
const outsideFile = (specifier: string): EdgeTarget => ({
  type: "external",
  specifier,
  package: null,
})

describe("checkLayers", () => {
  describe("model and ports stay pure and inward (rules 1, 4)", () => {
    it("fires 1+4 (8 hint) when model imports a concrete builtin", () => {
      const g = graph(
        {
          "invoice/model/totals.ts": { layer: "model", serviceRoot: "invoice" },
        },
        [{ from: "invoice/model/totals.ts", to: lib("node:fs") }],
      )
      expect(checkLayers(g)).toEqual([
        {
          check: "layers",
          ruleset: "arch",
          rules: [1, 4, 8],
          file: "invoice/model/totals.ts",
          serviceRoot: "invoice",
          importerLayer: "model",
          target: lib("node:fs"),
          shape: "matrix-cell",
          targetClass: "concrete",
        },
      ])
    })

    it("fires 1 when model imports service, adapters, assembly, or ports", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "a/fs.adapter.ts": { layer: "adapters", serviceRoot: "a" },
          "main.spec.ts": { layer: "assembly" },
          "a/ports/p.ts": { layer: "ports", serviceRoot: "a" },
        },
        [
          { from: "a/x.model.ts", to: mod("a/a.service.ts") },
          { from: "a/x.model.ts", to: mod("a/fs.adapter.ts") },
          { from: "a/x.model.ts", to: mod("main.spec.ts") },
          { from: "a/x.model.ts", to: mod("a/ports/p.ts") },
        ],
      )
      // 8 hint rides composition-unit targets only — assembly and ports type
      // variants bind too, so their citations stay plain
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ rules: [1, 8], targetClass: "service" }),
        expect.objectContaining({ rules: [1, 8], targetClass: "adapters" }),
        expect.objectContaining({ rules: [1], targetClass: "assembly" }),
        expect.objectContaining({ rules: [1], targetClass: "ports" }),
      ])
    })

    it("fires 1 when ports import outward", () => {
      const g = graph(
        {
          "invoice/ports/renderer.ts": {
            layer: "ports",
            serviceRoot: "invoice",
          },
          "invoice/pdf-render.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "invoice/ports/renderer.ts",
            to: mod("invoice/pdf-render.service.ts"),
          },
        ],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({
          rules: [1, 8],
          file: "invoice/ports/renderer.ts",
          shape: "matrix-cell",
          targetClass: "service",
        }),
      ])
    })

    it("fires 1+4 (8 hint) when ports import a concrete builtin", () => {
      const g = graph(
        { "a/ports/p.ts": { layer: "ports", serviceRoot: "a" } },
        [{ from: "a/ports/p.ts", to: lib("node:fs") }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({
          rules: [1, 4, 8],
          shape: "matrix-cell",
          targetClass: "concrete",
        }),
      ])
    })
  })

  describe("service purity (rule 4)", () => {
    it("fires 4 (8 hint) when service imports a concrete builtin", () => {
      const g = graph(
        {
          "invoice/pdf-render.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
        },
        [{ from: "invoice/pdf-render.service.ts", to: lib("node:fs") }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({
          rules: [4, 8],
          file: "invoice/pdf-render.service.ts",
          shape: "matrix-cell",
          targetClass: "concrete",
        }),
      ])
    })

    it("fires 1 (8 hint) when service imports an adapter", () => {
      const g = graph(
        {
          "invoice/pdf-render.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
          "invoice/fs-store.adapter.ts": {
            layer: "adapters",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "invoice/pdf-render.service.ts",
            to: mod("invoice/fs-store.adapter.ts"),
          },
        ],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({
          rules: [1, 8],
          shape: "matrix-cell",
          targetClass: "adapters",
        }),
      ])
    })

    it("fires 1 when service or adapters import assembly", () => {
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "a/fs.adapter.ts": { layer: "adapters", serviceRoot: "a" },
          "wire.spec.ts": { layer: "assembly" },
        },
        [
          { from: "a/a.service.ts", to: mod("wire.spec.ts") },
          { from: "a/fs.adapter.ts", to: mod("wire.spec.ts") },
        ],
      )
      const found = checkLayers(g)
      expect(found).toHaveLength(2)
      for (const violation of found) {
        expect(violation).toMatchObject({
          rules: [1],
          shape: "matrix-cell",
          targetClass: "assembly",
        })
      }
    })
  })

  describe("composition seals (rules 6, 7 — rule 8 hint)", () => {
    it.each(["service", "adapters", "blob"] as const)(
      "fires 6+8 when %s runtime-imports a service file",
      (importerLayer) => {
        const g = graph(
          {
            "billing/client.ts": {
              layer: importerLayer,
              serviceRoot: "billing",
            },
            "invoice/pdf-render.service.ts": {
              layer: "service",
              serviceRoot: "invoice",
            },
          },
          [
            {
              from: "billing/client.ts",
              to: mod("invoice/pdf-render.service.ts"),
            },
          ],
        )
        expect(checkLayers(g)).toEqual([
          expect.objectContaining({
            rules: [6, 8],
            file: "billing/client.ts",
            importerLayer,
            shape: "matrix-cell",
            targetClass: "service",
          }),
        ])
      },
    )

    it.each(["adapters", "blob"] as const)(
      "fires 7 (8 hint) when %s runtime-imports an adapter file",
      (importerLayer) => {
        const g = graph(
          {
            "invoice/store.ts": {
              layer: importerLayer,
              serviceRoot: "invoice",
            },
            "billing/stripe.adapter.ts": {
              layer: "adapters",
              serviceRoot: "billing",
            },
          },
          [{ from: "invoice/store.ts", to: mod("billing/stripe.adapter.ts") }],
        )
        expect(checkLayers(g)).toEqual([
          expect.objectContaining({
            rules: [7, 8],
            importerLayer,
            shape: "matrix-cell",
            targetClass: "adapters",
          }),
        ])
      },
    )
  })

  describe("blob seal (rule 5)", () => {
    it.each(["model", "ports", "service", "adapters"] as const)(
      "fires 5 when %s imports blob",
      (importerLayer) => {
        const g = graph(
          {
            "invoice/x.ts": { layer: importerLayer, serviceRoot: "invoice" },
            "lib/helpers.ts": { layer: "blob" },
          },
          [{ from: "invoice/x.ts", to: mod("lib/helpers.ts") }],
        )
        expect(checkLayers(g)).toEqual([
          expect.objectContaining({
            rules: [5],
            importerLayer,
            shape: "matrix-cell",
            targetClass: "blob",
          }),
        ])
      },
    )
  })

  describe("concrete classification (rule 4, default-concrete)", () => {
    it("fires the unclassified violation for an unlisted lib from model", () => {
      const g = graph(
        {
          "invoice/model/schedule.ts": {
            layer: "model",
            serviceRoot: "invoice",
          },
        },
        [{ from: "invoice/model/schedule.ts", to: lib("luxon") }],
      )
      expect(checkLayers(g)).toEqual([
        {
          check: "layers",
          ruleset: "arch",
          rules: [4, 8],
          file: "invoice/model/schedule.ts",
          serviceRoot: "invoice",
          importerLayer: "model",
          target: lib("luxon"),
          shape: "unclassified-lib",
        },
      ])
    })

    it("fires the unclassified violation for an unlisted lib from service", () => {
      const g = graph(
        { "a/a.service.ts": { layer: "service", serviceRoot: "a" } },
        [{ from: "a/a.service.ts", to: lib("axios") }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ rules: [4, 8], shape: "unclassified-lib" }),
      ])
    })

    it("fires for a never-seen bare specifier — unlisted ⇒ concrete, no census (tripwire)", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: lib("@nobody/heard-of-this-one") }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ shape: "unclassified-lib" }),
      ])
    })

    it("stays green for a pureLibs-listed lib from model", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: lib("luxon") }],
      )
      expect(checkLayers(g, { pureLibs: ["luxon"] })).toEqual([])
    })

    it("stays green for a curated pure builtin from model", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: lib("node:path") }],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("treats a resolved file outside the coverage set as concrete", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: outsideFile("../../outside.ts") }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({
          rules: [1, 4],
          shape: "matrix-cell",
          targetClass: "concrete",
        }),
      ])
    })
  })

  describe("rule 8 — per-cell type exemption and the strict opt-out", () => {
    it("ignores type-only imports of service and adapter files by default", () => {
      const g = graph(
        {
          "billing/b.service.ts": { layer: "service", serviceRoot: "billing" },
          "invoice/i.service.ts": { layer: "service", serviceRoot: "invoice" },
          "invoice/fs.adapter.ts": {
            layer: "adapters",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "billing/b.service.ts",
            to: mod("invoice/i.service.ts"),
            kind: "type",
          },
          {
            from: "billing/b.service.ts",
            to: mod("invoice/fs.adapter.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("lets model type-import a service — rule 8's example, legal anywhere", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "icons/icons.service.ts": { layer: "service", serviceRoot: "icons" },
        },
        [
          {
            from: "a/x.model.ts",
            to: mod("icons/icons.service.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("ignores type-only imports of externals by default — published types are the contract", () => {
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
        },
        [
          { from: "a/a.service.ts", to: lib("node:fs"), kind: "type" },
          { from: "a/x.model.ts", to: lib("luxon"), kind: "type" },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it.each(["model", "ports", "service", "adapters"] as const)(
      "fires 5 when %s type-imports blob — no contract shape to depend on",
      (importerLayer) => {
        const g = graph(
          {
            "invoice/x.ts": { layer: importerLayer, serviceRoot: "invoice" },
            "lib/helpers.ts": { layer: "blob" },
          },
          [{ from: "invoice/x.ts", to: mod("lib/helpers.ts"), kind: "type" }],
        )
        expect(checkLayers(g)).toEqual([
          expect.objectContaining({
            rules: [5],
            importerLayer,
            targetClass: "blob",
          }),
        ])
      },
    )

    it("fires 1 when model type-imports assembly — wiring exports no contract", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "main.spec.ts": { layer: "assembly" },
        },
        [{ from: "a/x.model.ts", to: mod("main.spec.ts"), kind: "type" }],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ rules: [1], targetClass: "assembly" }),
      ])
    })

    it("fires 1+4 when model type-imports a file outside the coverage set — not a package, no contract", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [
          {
            from: "a/x.model.ts",
            to: outsideFile("../../outside.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ rules: [1, 4], targetClass: "concrete" }),
      ])
    })

    it("pulls type edges into scope with typeOnlyExempt: false, citing 6 alone", () => {
      const g = graph(
        {
          "billing/b.service.ts": { layer: "service", serviceRoot: "billing" },
          "invoice/i.service.ts": { layer: "service", serviceRoot: "invoice" },
        },
        [
          {
            from: "billing/b.service.ts",
            to: mod("invoice/i.service.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkLayers(g, { typeOnlyExempt: false })).toEqual([
        expect.objectContaining({
          rules: [6],
          shape: "matrix-cell",
          targetClass: "service",
        }),
      ])
    })

    it("cites 6 alone on runtime edges too under typeOnlyExempt: false", () => {
      const g = graph(
        {
          "lib/helpers.ts": { layer: "blob" },
          "invoice/i.service.ts": { layer: "service", serviceRoot: "invoice" },
        },
        [{ from: "lib/helpers.ts", to: mod("invoice/i.service.ts") }],
      )
      expect(checkLayers(g, { typeOnlyExempt: false })).toEqual([
        expect.objectContaining({ rules: [6] }),
      ])
    })

    it("binds the exempt cells under typeOnlyExempt: false, plain citations", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "icons/icons.service.ts": { layer: "service", serviceRoot: "icons" },
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
        },
        [
          {
            from: "a/x.model.ts",
            to: mod("icons/icons.service.ts"),
            kind: "type",
          },
          { from: "a/a.service.ts", to: lib("node:fs"), kind: "type" },
          { from: "a/x.model.ts", to: lib("luxon"), kind: "type" },
        ],
      )
      expect(checkLayers(g, { typeOnlyExempt: false })).toEqual([
        expect.objectContaining({ rules: [1], targetClass: "service" }),
        expect.objectContaining({ rules: [4], targetClass: "concrete" }),
        expect.objectContaining({ rules: [4], shape: "unclassified-lib" }),
      ])
    })
  })

  describe("own-service private/ (rule 9)", () => {
    it.each(["service", "adapters"] as const)(
      "lets %s import from its own service's private/",
      (importerLayer) => {
        const g = graph(
          {
            "icons/user.ts": { layer: importerLayer, serviceRoot: "icons" },
            "icons/private/scoring.service.ts": {
              layer: "service",
              serviceRoot: "icons",
              isPrivate: true,
            },
          },
          [
            {
              from: "icons/user.ts",
              to: mod("icons/private/scoring.service.ts"),
            },
          ],
        )
        expect(checkLayers(g)).toEqual([])
      },
    )

    it("lets a root-level service import from the root private/", () => {
      const g = graph(
        {
          "app.service.ts": { layer: "service", serviceRoot: "." },
          "private/helper.service.ts": {
            layer: "service",
            serviceRoot: ".",
            isPrivate: true,
          },
        },
        [{ from: "app.service.ts", to: mod("private/helper.service.ts") }],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("still fires on a foreign service's private composition unit", () => {
      const g = graph(
        {
          "billing/stripe.adapter.ts": {
            layer: "adapters",
            serviceRoot: "billing",
          },
          "invoice/private/totals.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "billing/stripe.adapter.ts",
            to: mod("invoice/private/totals.service.ts"),
          },
        ],
      )
      expect(checkLayers(g)).toEqual([
        expect.objectContaining({ rules: [6, 8] }),
      ])
    })
  })

  describe("non-violations — deliberately legal shapes stay green", () => {
    it("blob importing blob, model, or ports", () => {
      const g = graph(
        {
          "lib/a.ts": { layer: "blob" },
          "lib/b.ts": { layer: "blob" },
          "icons/x.model.ts": { layer: "model", serviceRoot: "icons" },
          "icons/ports/p.ts": { layer: "ports", serviceRoot: "icons" },
        },
        [
          { from: "lib/a.ts", to: mod("lib/b.ts") },
          { from: "lib/a.ts", to: mod("icons/x.model.ts") },
          { from: "lib/a.ts", to: mod("icons/ports/p.ts") },
          { from: "lib/a.ts", to: lib("node:fs") },
          { from: "lib/a.ts", to: lib("axios") },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("adapter importing concrete and unlisted libs — that's its job", () => {
      const g = graph(
        { "icons/fs.adapter.ts": { layer: "adapters", serviceRoot: "icons" } },
        [
          { from: "icons/fs.adapter.ts", to: lib("node:fs") },
          { from: "icons/fs.adapter.ts", to: lib("pg") },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("cross-service model→model — the matrix is layers, not packaging", () => {
      const g = graph(
        {
          "orders/x.model.ts": { layer: "model", serviceRoot: "orders" },
          "billing/y.model.ts": { layer: "model", serviceRoot: "billing" },
        },
        [{ from: "orders/x.model.ts", to: mod("billing/y.model.ts") }],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it.each(["ports", "service", "adapters"] as const)(
      "%s importing model and ports",
      (importerLayer) => {
        const g = graph(
          {
            "a/importer.ts": { layer: importerLayer, serviceRoot: "a" },
            "a/x.model.ts": { layer: "model", serviceRoot: "a" },
            "a/ports/p.ts": { layer: "ports", serviceRoot: "a" },
          },
          [
            { from: "a/importer.ts", to: mod("a/x.model.ts") },
            { from: "a/importer.ts", to: mod("a/ports/p.ts") },
          ],
        )
        expect(checkLayers(g)).toEqual([])
      },
    )

    it("assembly importing anything — bottom row of the matrix", () => {
      const g = graph(
        {
          "main.spec.ts": { layer: "assembly" },
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "a/fs.adapter.ts": { layer: "adapters", serviceRoot: "a" },
          "lib/helpers.ts": { layer: "blob" },
        },
        [
          { from: "main.spec.ts", to: mod("a/a.service.ts") },
          { from: "main.spec.ts", to: mod("a/fs.adapter.ts") },
          { from: "main.spec.ts", to: mod("lib/helpers.ts") },
          { from: "main.spec.ts", to: lib("node:fs") },
          { from: "main.spec.ts", to: lib("axios") },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })

    it("an all-blob graph runs clean — the brownfield ground state", () => {
      const g = graph(
        {
          "src/a.ts": { layer: "blob" },
          "src/b.ts": { layer: "blob" },
          "src/c.ts": { layer: "blob" },
        },
        [
          { from: "src/a.ts", to: mod("src/b.ts") },
          { from: "src/b.ts", to: mod("src/c.ts") },
          { from: "src/c.ts", to: mod("src/a.ts") },
          { from: "src/a.ts", to: lib("express") },
        ],
      )
      expect(checkLayers(g)).toEqual([])
    })
  })

  describe("contract breaches are loud", () => {
    it("throws when an edge references a module missing from the graph", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: mod("ghost.ts") }],
      )
      expect(() => checkLayers(g)).toThrow(/ghost\.ts/)
    })
  })
})
