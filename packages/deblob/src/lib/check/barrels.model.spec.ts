import { describe, expect, test } from "vitest"

import type {
  EdgeForm,
  EdgeKind,
  EdgeTarget,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import { checkBarrels } from "./barrels.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
}

type EdgeSpec = {
  from: string
  to: EdgeTarget
  kind?: EdgeKind
  form?: EdgeForm
  reExport?: boolean
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
        isPrivate: false,
        parsed: true,
        runtimeContent: [],
      },
    ]),
  ),
  edges: edges.map(({ from, to, kind, form, reExport }) => ({
    from,
    to,
    kind: kind ?? "runtime",
    form: form ?? "static",
    reExport: reExport ?? false,
  })),
  unresolved: [],
})

const mod = (path: string): EdgeTarget => ({ type: "module", path })

const lib = (specifier: string): EdgeTarget => ({
  type: "external",
  specifier,
  package: specifier,
  declared: false,
  layer: null,
})

describe("checkBarrels", () => {
  describe("barrel-file fires — an index re-exporting layered files (`layer-in-path`)", () => {
    test("fires at the index for a re-exported service file — the catalog line", () => {
      const g = graph(
        {
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
          "invoice/pdf-render.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "invoice/index.ts",
            to: mod("invoice/pdf-render.service.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        {
          check: "barrels",
          ruleset: "arch",
          rules: ["layer-in-path"],
          file: "invoice/index.ts",
          serviceRoot: "invoice",
          target: mod("invoice/pdf-render.service.ts"),
          shape: "barrel-file",
        },
      ])
    })

    test("fires for a re-exported model file", () => {
      const g = graph(
        {
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
          "invoice/invoice.model.ts": {
            layer: "model",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "invoice/index.ts",
            to: mod("invoice/invoice.model.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        expect.objectContaining({
          shape: "barrel-file",
          file: "invoice/index.ts",
          target: mod("invoice/invoice.model.ts"),
        }),
      ])
    })

    test("fires on a type-only re-export — `layer-in-path` is kind-blind", () => {
      const g = graph(
        {
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
          "invoice/invoice.model.ts": {
            layer: "model",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "invoice/index.ts",
            to: mod("invoice/invoice.model.ts"),
            kind: "type",
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        expect.objectContaining({
          shape: "barrel-file",
          rules: ["layer-in-path"],
        }),
      ])
    })

    test.each(["index.tsx", "index.mjs"])(
      "recognizes the %s extension variant",
      (basename) => {
        const g = graph(
          {
            [`invoice/${basename}`]: { layer: "blob", serviceRoot: "invoice" },
            "invoice/invoice.model.ts": {
              layer: "model",
              serviceRoot: "invoice",
            },
          },
          [
            {
              from: `invoice/${basename}`,
              to: mod("invoice/invoice.model.ts"),
              reExport: true,
            },
          ],
        )
        expect(checkBarrels(g)).toEqual([
          expect.objectContaining({
            shape: "barrel-file",
            file: `invoice/${basename}`,
          }),
        ])
      },
    )
  })

  describe("barrel-file stays green", () => {
    test("lets an index re-export blob only — no guarantee erased", () => {
      const g = graph(
        {
          "utils/index.ts": { layer: "blob" },
          "utils/strings.ts": { layer: "blob" },
        },
        [
          {
            from: "utils/index.ts",
            to: mod("utils/strings.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("lets an index that only imports — no re-export edge, no barrel", () => {
      const g = graph(
        {
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
          "invoice/invoice.model.ts": {
            layer: "model",
            serviceRoot: "invoice",
          },
        },
        [{ from: "invoice/index.ts", to: mod("invoice/invoice.model.ts") }],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("exempts an assembly-classified index — the package-entry designation", () => {
      const g = graph(
        {
          "index.ts": { layer: "assembly", serviceRoot: "." },
          "invoice/invoice.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
        },
        [
          {
            from: "index.ts",
            to: mod("invoice/invoice.service.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("lets a non-index file re-export layered files — the layer stays visible in its path", () => {
      const g = graph(
        {
          "invoice/invoice.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
          "invoice/totals.model.ts": { layer: "model", serviceRoot: "invoice" },
        },
        [
          {
            from: "invoice/invoice.service.ts",
            to: mod("invoice/totals.model.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("ignores index.model.ts — a layered basename is not an index", () => {
      const g = graph(
        {
          "invoice/index.model.ts": { layer: "model", serviceRoot: "invoice" },
          "invoice/totals.model.ts": { layer: "model", serviceRoot: "invoice" },
        },
        [
          {
            from: "invoice/index.model.ts",
            to: mod("invoice/totals.model.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([])
    })
  })

  describe("index-import fires — a labeled layer importing through an index (`layer-in-path`)", () => {
    test("fires at the importer for a service's directory import — the catalog line", () => {
      const g = graph(
        {
          "billing/refund.service.ts": {
            layer: "service",
            serviceRoot: "billing",
          },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
        },
        [
          {
            from: "billing/refund.service.ts",
            to: mod("invoice/index.ts"),
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        {
          check: "barrels",
          ruleset: "arch",
          rules: ["layer-in-path"],
          file: "billing/refund.service.ts",
          serviceRoot: "billing",
          target: mod("invoice/index.ts"),
          shape: "index-import",
        },
      ])
    })

    test("fires for a model importer", () => {
      const g = graph(
        {
          "billing/b.model.ts": { layer: "model", serviceRoot: "billing" },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
        },
        [{ from: "billing/b.model.ts", to: mod("invoice/index.ts") }],
      )
      expect(checkBarrels(g)).toEqual([
        expect.objectContaining({
          shape: "index-import",
          file: "billing/b.model.ts",
        }),
      ])
    })

    test.each([
      { kind: "type", form: "static" },
      { kind: "runtime", form: "dynamic" },
    ] as const)("fires on a $kind $form edge", ({ kind, form }) => {
      const g = graph(
        {
          "billing/b.service.ts": { layer: "service", serviceRoot: "billing" },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
        },
        [
          {
            from: "billing/b.service.ts",
            to: mod("invoice/index.ts"),
            kind,
            form,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        expect.objectContaining({
          shape: "index-import",
          rules: ["layer-in-path"],
        }),
      ])
    })
  })

  describe("index-import stays green", () => {
    test("exempts a blob importer — `layer-in-path` binds guarantees, blob makes none", () => {
      const g = graph(
        {
          "lib/helpers.ts": { layer: "blob" },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
        },
        [{ from: "lib/helpers.ts", to: mod("invoice/index.ts") }],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("exempts an assembly importer — assembly claims nothing", () => {
      const g = graph(
        {
          "main.spec.ts": { layer: "assembly" },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
        },
        [{ from: "main.spec.ts", to: mod("invoice/index.ts") }],
      )
      expect(checkBarrels(g)).toEqual([])
    })

    test("never fires on an external target — a bare specifier is the package's API", () => {
      const g = graph(
        {
          "billing/b.service.ts": { layer: "service", serviceRoot: "billing" },
        },
        [{ from: "billing/b.service.ts", to: lib("somepkg") }],
      )
      expect(checkBarrels(g)).toEqual([])
    })
  })

  describe("both shapes at once — separately attributable", () => {
    test("fires the importer and the index each for their own fact", () => {
      const g = graph(
        {
          "billing/refund.service.ts": {
            layer: "service",
            serviceRoot: "billing",
          },
          "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
          "invoice/pdf-render.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
        },
        [
          { from: "billing/refund.service.ts", to: mod("invoice/index.ts") },
          {
            from: "invoice/index.ts",
            to: mod("invoice/pdf-render.service.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([
        expect.objectContaining({
          shape: "index-import",
          file: "billing/refund.service.ts",
        }),
        expect.objectContaining({
          shape: "barrel-file",
          file: "invoice/index.ts",
        }),
      ])
    })
  })

  describe("tolerateBlobReexport — the brownfield opt-out", () => {
    const nodes: Record<string, NodeSpec> = {
      "billing/refund.service.ts": {
        layer: "service",
        serviceRoot: "billing",
      },
      "invoice/index.ts": { layer: "blob", serviceRoot: "invoice" },
      "invoice/pdf-render.service.ts": {
        layer: "service",
        serviceRoot: "invoice",
      },
    }

    test("silences barrel-file", () => {
      const g = graph(nodes, [
        {
          from: "invoice/index.ts",
          to: mod("invoice/pdf-render.service.ts"),
          reExport: true,
        },
      ])
      expect(checkBarrels(g, { tolerateBlobReexport: true })).toEqual([])
    })

    test("keeps index-import firing on the same graph — claimants stay bound", () => {
      const g = graph(nodes, [
        { from: "billing/refund.service.ts", to: mod("invoice/index.ts") },
        {
          from: "invoice/index.ts",
          to: mod("invoice/pdf-render.service.ts"),
          reExport: true,
        },
      ])
      expect(checkBarrels(g, { tolerateBlobReexport: true })).toEqual([
        expect.objectContaining({
          shape: "index-import",
          file: "billing/refund.service.ts",
        }),
      ])
    })
  })

  describe("ground state", () => {
    test("keeps an all-blob graph with an index and directory imports clean", () => {
      const g = graph(
        {
          "src/app.ts": { layer: "blob" },
          "utils/index.ts": { layer: "blob" },
          "utils/strings.ts": { layer: "blob" },
        },
        [
          { from: "src/app.ts", to: mod("utils/index.ts") },
          {
            from: "utils/index.ts",
            to: mod("utils/strings.ts"),
            reExport: true,
          },
        ],
      )
      expect(checkBarrels(g)).toEqual([])
    })
  })

  describe("contract breaches are loud", () => {
    test("throws when an edge references a module missing from the graph", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: mod("ghost.ts") }],
      )
      expect(() => checkBarrels(g)).toThrow(/ghost\.ts/)
    })
  })
})
