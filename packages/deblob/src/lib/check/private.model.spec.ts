import { describe, expect, it } from "vitest"

import type {
  EdgeForm,
  EdgeKind,
  EdgeTarget,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import { checkPrivate } from "./private.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
  isPrivate?: boolean
}

type EdgeSpec = {
  from: string
  to: EdgeTarget
  kind?: EdgeKind
  form?: EdgeForm
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
      },
    ]),
  ),
  edges: edges.map(({ from, to, kind, form }) => ({
    from,
    to,
    kind: kind ?? "runtime",
    form: form ?? "static",
  })),
  unresolved: [],
})

const mod = (path: string): EdgeTarget => ({ type: "module", path })

const lib = (specifier: string): EdgeTarget => ({
  type: "external",
  specifier,
  package: specifier,
})

describe("checkPrivate", () => {
  describe("foreign private/ imports fire (rule 12)", () => {
    it("fires when another service reaches into a private/ subtree", () => {
      const g = graph(
        {
          "billing/stripe.adapter.ts": {
            layer: "adapters",
            serviceRoot: "billing",
          },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "billing/stripe.adapter.ts",
            to: mod("invoice/private/totals.ts"),
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([
        {
          check: "private",
          ruleset: "arch",
          rules: [12],
          file: "billing/stripe.adapter.ts",
          serviceRoot: "billing",
          target: mod("invoice/private/totals.ts"),
          boundary: "invoice/private",
          owner: "invoice",
        },
      ])
    })

    it("fires for a top-level blob importer — blob binds under rule 12", () => {
      const g = graph(
        {
          "lib/helpers.ts": { layer: "blob" },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [{ from: "lib/helpers.ts", to: mod("invoice/private/totals.ts") }],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({
          rules: [12],
          file: "lib/helpers.ts",
          serviceRoot: null,
          boundary: "invoice/private",
        }),
      ])
    })

    it("fires for a foreign assembly — matrix privilege does not reach visibility", () => {
      const g = graph(
        {
          "main.spec.ts": { layer: "assembly" },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [{ from: "main.spec.ts", to: mod("invoice/private/totals.ts") }],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({ rules: [12], file: "main.spec.ts" }),
      ])
    })

    it("fires when a nested child service imports its parent's private/", () => {
      const g = graph(
        {
          "invoice/manifest/m.adapter.ts": {
            layer: "adapters",
            serviceRoot: "invoice/manifest",
          },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "invoice/manifest/m.adapter.ts",
            to: mod("invoice/private/totals.ts"),
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({
          rules: [12],
          boundary: "invoice/private",
          owner: "invoice",
        }),
      ])
    })

    it("fires on a private/ nested under a grouping dir — still the service's boundary", () => {
      const g = graph(
        {
          "billing/x.service.ts": { layer: "service", serviceRoot: "billing" },
          "invoice/ports/private/shared.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "billing/x.service.ts",
            to: mod("invoice/ports/private/shared.ts"),
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({
          boundary: "invoice/ports/private",
          owner: "invoice",
        }),
      ])
    })
  })

  describe("every edge kind and form fires — packaging rule, rule 8 does not apply", () => {
    it.each(["runtime", "type"] as const)("fires on a %s edge", (kind) => {
      const g = graph(
        {
          "billing/b.service.ts": { layer: "service", serviceRoot: "billing" },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "billing/b.service.ts",
            to: mod("invoice/private/totals.ts"),
            kind,
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({ rules: [12] }),
      ])
    })

    it.each(["dynamic", "require"] as const)("fires on a %s edge", (form) => {
      const g = graph(
        {
          "lib/helpers.ts": { layer: "blob" },
          "invoice/private/totals.ts": {
            layer: "blob",
            serviceRoot: "invoice",
            isPrivate: true,
          },
        },
        [
          {
            from: "lib/helpers.ts",
            to: mod("invoice/private/totals.ts"),
            form,
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({ rules: [12] }),
      ])
    })
  })

  describe("own-service access stays green", () => {
    it.each(["model", "ports", "service", "adapters"] as const)(
      "lets the owning service's %s file into its private/",
      (layer) => {
        const g = graph(
          {
            "icons/user.ts": { layer, serviceRoot: "icons" },
            "icons/private/helper.ts": {
              layer: "blob",
              serviceRoot: "icons",
              isPrivate: true,
            },
          },
          [{ from: "icons/user.ts", to: mod("icons/private/helper.ts") }],
        )
        expect(checkPrivate(g)).toEqual([])
      },
    )

    it("lets a root-level service into the root private/", () => {
      const g = graph(
        {
          "app.service.ts": { layer: "service", serviceRoot: "." },
          "private/helper.ts": {
            layer: "blob",
            serviceRoot: ".",
            isPrivate: true,
          },
        },
        [{ from: "app.service.ts", to: mod("private/helper.ts") }],
      )
      expect(checkPrivate(g)).toEqual([])
    })

    it("lets siblings compose within one private/ subtree", () => {
      const g = graph(
        {
          "icons/private/a.ts": {
            layer: "blob",
            serviceRoot: "icons",
            isPrivate: true,
          },
          "icons/private/deep/b.ts": {
            layer: "blob",
            serviceRoot: "icons",
            isPrivate: true,
          },
        },
        [{ from: "icons/private/a.ts", to: mod("icons/private/deep/b.ts") }],
      )
      expect(checkPrivate(g)).toEqual([])
    })

    it("lets the owner reach a public file of a service nested under its own private/", () => {
      // the isPrivate-flag trap: the target's flag is true (segment present)
      // and the serviceRoots differ, yet the edge crosses only the owner's
      // own boundary — a flag-based detector fires here wrongly
      const g = graph(
        {
          "icons/icons.service.ts": { layer: "service", serviceRoot: "icons" },
          "icons/private/manifest/m.model.ts": {
            layer: "model",
            serviceRoot: "icons/private/manifest",
            isPrivate: true,
          },
        },
        [
          {
            from: "icons/icons.service.ts",
            to: mod("icons/private/manifest/m.model.ts"),
          },
        ],
      )
      expect(checkPrivate(g)).toEqual([])
    })

    it("keeps an ownerless private/ inert — the all-blob ground state runs clean", () => {
      const g = graph(
        {
          "src/a.ts": { layer: "blob" },
          "src/private/b.ts": { layer: "blob", isPrivate: true },
        },
        [
          { from: "src/a.ts", to: mod("src/private/b.ts") },
          { from: "src/a.ts", to: lib("express") },
        ],
      )
      expect(checkPrivate(g)).toEqual([])
    })
  })

  describe("fractal nesting — the operation, not a case census", () => {
    const nodes: Record<string, NodeSpec> = {
      "other/y.ts": { layer: "blob", serviceRoot: "other" },
      "other/o.service.ts": { layer: "service", serviceRoot: "other" },
      "s/s.service.ts": { layer: "service", serviceRoot: "s" },
      "s/private/child/c.service.ts": {
        layer: "service",
        serviceRoot: "s/private/child",
        isPrivate: true,
      },
      "s/private/child/private/x.ts": {
        layer: "blob",
        serviceRoot: "s/private/child",
        isPrivate: true,
      },
    }

    it("reports the outermost violated boundary once for an outsider", () => {
      const g = graph(nodes, [
        { from: "other/y.ts", to: mod("s/private/child/private/x.ts") },
      ])
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({ boundary: "s/private", owner: "s" }),
      ])
    })

    it("keeps the child's own files green on its inner private/", () => {
      const g = graph(nodes, [
        {
          from: "s/private/child/c.service.ts",
          to: mod("s/private/child/private/x.ts"),
        },
      ])
      expect(checkPrivate(g)).toEqual([])
    })

    it("fires the inner boundary on the owner service — nesting confers no privilege", () => {
      const g = graph(nodes, [
        { from: "s/s.service.ts", to: mod("s/private/child/private/x.ts") },
      ])
      expect(checkPrivate(g)).toEqual([
        expect.objectContaining({
          boundary: "s/private/child/private",
          owner: "s/private/child",
        }),
      ])
    })

    it("lets the owner reach the child's public surface under its own private/", () => {
      const g = graph(nodes, [
        { from: "s/s.service.ts", to: mod("s/private/child/c.service.ts") },
      ])
      expect(checkPrivate(g)).toEqual([])
    })
  })

  describe("contract breaches are loud", () => {
    it("throws when an edge references a module missing from the graph", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: mod("ghost.ts") }],
      )
      expect(() => checkPrivate(g)).toThrow(/ghost\.ts/)
    })
  })
})
