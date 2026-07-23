import { describe, expect, it } from "vitest"

import type {
  EdgeForm,
  EdgeKind,
  EdgeTarget,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import { checkDag } from "./dag.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
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
        isPrivate: false,
        parsed: true,
        runtimeContent: [],
      },
    ]),
  ),
  edges: edges.map(({ from, to, kind, form }) => ({
    from,
    to,
    kind: kind ?? "runtime",
    form: form ?? "static",
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

describe("checkDag", () => {
  describe("service cycles (rule 13)", () => {
    it("fires a 2-node runtime cycle with both carrying edges quoted", () => {
      const g = graph(
        {
          "orders/checkout.service.ts": {
            layer: "service",
            serviceRoot: "orders",
          },
          "billing/ports/payment.ts": {
            layer: "ports",
            serviceRoot: "billing",
          },
          "billing/refund.service.ts": {
            layer: "service",
            serviceRoot: "billing",
          },
          "orders/model/order.ts": { layer: "model", serviceRoot: "orders" },
        },
        [
          {
            from: "orders/checkout.service.ts",
            to: mod("billing/ports/payment.ts"),
          },
          {
            from: "billing/refund.service.ts",
            to: mod("orders/model/order.ts"),
          },
        ],
      )
      expect(checkDag(g)).toEqual([
        {
          check: "dag",
          ruleset: "arch",
          rules: [13],
          group: { kind: "cross-service" },
          members: ["billing", "orders"],
          shape: "service-cycle",
          services: ["billing", "orders"],
          hops: [
            {
              from: "billing",
              to: "orders",
              via: {
                from: "billing/refund.service.ts",
                to: "orders/model/order.ts",
              },
              typeOnly: false,
              wiring: false,
            },
            {
              from: "orders",
              to: "billing",
              via: {
                from: "orders/checkout.service.ts",
                to: "billing/ports/payment.ts",
              },
              typeOnly: false,
              wiring: false,
            },
          ],
        },
      ])
    })

    it("fires the nesting trap — type edge up, runtime edge down, nearest-ancestor roots", () => {
      const g = graph(
        {
          "icons/icons.service.ts": { layer: "service", serviceRoot: "icons" },
          "icons/ports/manifest.ts": { layer: "ports", serviceRoot: "icons" },
          "icons/manifest/manifest.adapter.ts": {
            layer: "adapters",
            serviceRoot: "icons/manifest",
          },
          "icons/manifest/model/entry.ts": {
            layer: "model",
            serviceRoot: "icons/manifest",
          },
        },
        [
          {
            from: "icons/manifest/manifest.adapter.ts",
            to: mod("icons/ports/manifest.ts"),
            kind: "type",
          },
          {
            from: "icons/icons.service.ts",
            to: mod("icons/manifest/model/entry.ts"),
          },
        ],
      )
      const [violation] = checkDag(g)
      expect(violation).toMatchObject({
        rules: [13],
        members: ["icons", "icons/manifest"],
        services: ["icons", "icons/manifest"],
      })
    })

    it("keeps root wiring green — unowned files contribute no edges", () => {
      const g = graph(
        {
          "main.ts": { layer: "assembly" },
          "orders/orders.service.ts": {
            layer: "service",
            serviceRoot: "orders",
          },
          "billing/billing.service.ts": {
            layer: "service",
            serviceRoot: "billing",
          },
        },
        [
          { from: "main.ts", to: mod("orders/orders.service.ts") },
          { from: "main.ts", to: mod("billing/billing.service.ts") },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })

    it("keeps fixture wiring green — a spec wiring a same-service fixture adapter", () => {
      const g = graph(
        {
          "icons/icons.service.spec.ts": {
            layer: "assembly",
            serviceRoot: "icons",
          },
          "icons/fake-manifest.adapter.ts": {
            layer: "adapters",
            serviceRoot: "icons",
          },
          "icons/ports/manifest.ts": { layer: "ports", serviceRoot: "icons" },
          "icons/manifest/manifest.adapter.ts": {
            layer: "adapters",
            serviceRoot: "icons/manifest",
          },
        },
        [
          {
            from: "icons/icons.service.spec.ts",
            to: mod("icons/fake-manifest.adapter.ts"),
          },
          {
            from: "icons/manifest/manifest.adapter.ts",
            to: mod("icons/ports/manifest.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })

    it("fires misplaced wiring — a spec importing the real nested adapter", () => {
      const g = graph(
        {
          "icons/icons.service.spec.ts": {
            layer: "assembly",
            serviceRoot: "icons",
          },
          "icons/ports/manifest.ts": { layer: "ports", serviceRoot: "icons" },
          "icons/manifest/manifest.adapter.ts": {
            layer: "adapters",
            serviceRoot: "icons/manifest",
          },
        },
        [
          {
            from: "icons/icons.service.spec.ts",
            to: mod("icons/manifest/manifest.adapter.ts"),
          },
          {
            from: "icons/manifest/manifest.adapter.ts",
            to: mod("icons/ports/manifest.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkDag(g)).toEqual([
        expect.objectContaining({
          rules: [13],
          hops: [
            expect.objectContaining({
              from: "icons",
              to: "icons/manifest",
              wiring: true,
              typeOnly: false,
            }),
            expect.objectContaining({
              from: "icons/manifest",
              to: "icons",
              wiring: false,
              typeOnly: true,
            }),
          ],
        }),
      ])
    })

    it("reports an N-node cycle as one finding with the full witness path", () => {
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "b/b.service.ts": { layer: "service", serviceRoot: "b" },
          "c/c.service.ts": { layer: "service", serviceRoot: "c" },
        },
        [
          { from: "a/a.service.ts", to: mod("b/b.service.ts") },
          { from: "b/b.service.ts", to: mod("c/c.service.ts") },
          { from: "c/c.service.ts", to: mod("a/a.service.ts") },
        ],
      )
      const violations = checkDag(g).filter((v) => v.rules.includes(13))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({
        members: ["a", "b", "c"],
        services: ["a", "b", "c"],
      })
      expect((violations[0] as { hops: readonly unknown[] }).hops).toHaveLength(
        3,
      )
    })

    it("keeps a chorded SCC one finding — members beyond the witness", () => {
      // a ⇄ b plus the 3-loop through c: one knot, shortest witness
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "b/b.service.ts": { layer: "service", serviceRoot: "b" },
          "c/c.service.ts": { layer: "service", serviceRoot: "c" },
        },
        [
          { from: "a/a.service.ts", to: mod("b/b.service.ts") },
          { from: "b/b.service.ts", to: mod("a/a.service.ts") },
          { from: "b/b.service.ts", to: mod("c/c.service.ts") },
          { from: "c/c.service.ts", to: mod("a/a.service.ts") },
        ],
      )
      const violations = checkDag(g).filter((v) => v.rules.includes(13))
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({
        members: ["a", "b", "c"],
        services: ["a", "b"],
      })
      // determinism: same graph, same witness
      expect(checkDag(g)).toEqual(checkDag(g))
    })

    it("reports disjoint knots separately", () => {
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "b/b.service.ts": { layer: "service", serviceRoot: "b" },
          "c/c.service.ts": { layer: "service", serviceRoot: "c" },
          "d/d.service.ts": { layer: "service", serviceRoot: "d" },
        },
        [
          { from: "a/a.service.ts", to: mod("b/b.service.ts") },
          { from: "b/b.service.ts", to: mod("a/a.service.ts") },
          { from: "c/c.service.ts", to: mod("d/d.service.ts") },
          { from: "d/d.service.ts", to: mod("c/c.service.ts") },
        ],
      )
      const violations = checkDag(g).filter((v) => v.rules.includes(13))
      expect(violations).toHaveLength(2)
      expect(violations.map((v) => v.members)).toEqual([
        ["a", "b"],
        ["c", "d"],
      ])
    })

    it("fires a mutual type-only cycle — both hops flagged", () => {
      const g = graph(
        {
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "b/b.service.ts": { layer: "service", serviceRoot: "b" },
        },
        [
          { from: "a/a.service.ts", to: mod("b/b.service.ts"), kind: "type" },
          { from: "b/b.service.ts", to: mod("a/a.service.ts"), kind: "type" },
        ],
      )
      expect(checkDag(g)).toEqual([
        expect.objectContaining({
          rules: [13],
          hops: [
            expect.objectContaining({ typeOnly: true }),
            expect.objectContaining({ typeOnly: true }),
          ],
        }),
      ])
    })

    it("keeps a mixed hop unflagged — wiring means every inducing edge is assembly-origin", () => {
      // the spec file sorts first (carrying edge) but a service file also
      // induces the hop: the placement remedy would misdirect
      const g = graph(
        {
          "a/a.service.spec.ts": { layer: "assembly", serviceRoot: "a" },
          "a/a.service.ts": { layer: "service", serviceRoot: "a" },
          "b/y.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/a.service.spec.ts", to: mod("b/y.model.ts") },
          { from: "a/a.service.ts", to: mod("b/y.model.ts") },
          { from: "b/y.model.ts", to: mod("a/a.service.ts"), kind: "type" },
        ],
      )
      const [violation] = checkDag(g)
      expect(violation).toMatchObject({
        hops: [
          expect.objectContaining({
            from: "a",
            to: "b",
            via: { from: "a/a.service.spec.ts", to: "b/y.model.ts" },
            wiring: false,
          }),
          expect.objectContaining({ from: "b", to: "a" }),
        ],
      })
    })

    it("quotes the smallest carrying edge and stays runtime-flagged when any inducing edge is runtime", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "a/z.model.ts": { layer: "model", serviceRoot: "a" },
          "b/y.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/z.model.ts", to: mod("b/y.model.ts"), kind: "runtime" },
          { from: "a/x.model.ts", to: mod("b/y.model.ts"), kind: "type" },
          { from: "b/y.model.ts", to: mod("a/x.model.ts"), kind: "runtime" },
        ],
      )
      const [violation] = checkDag(g)
      expect(violation).toMatchObject({
        hops: [
          {
            from: "a",
            to: "b",
            via: { from: "a/x.model.ts", to: "b/y.model.ts" },
            typeOnly: false,
            wiring: false,
          },
          expect.objectContaining({ from: "b", to: "a" }),
        ],
      })
    })

    it("breaks a same-importer tie on the target path", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "b/a.model.ts": { layer: "model", serviceRoot: "b" },
          "b/z.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/x.model.ts", to: mod("b/z.model.ts") },
          { from: "a/x.model.ts", to: mod("b/a.model.ts") },
          { from: "b/z.model.ts", to: mod("a/x.model.ts") },
        ],
      )
      const [violation] = checkDag(g)
      expect(violation).toMatchObject({
        hops: [
          expect.objectContaining({
            via: { from: "a/x.model.ts", to: "b/a.model.ts" },
          }),
          expect.objectContaining({ from: "b", to: "a" }),
        ],
      })
    })
  })

  describe("module cycles (rule 14)", () => {
    it("fires a runtime cycle between two blob files, blob bucket", () => {
      const g = graph(
        {
          "lib/fetchers.ts": { layer: "blob" },
          "lib/client.ts": { layer: "blob" },
        },
        [
          { from: "lib/fetchers.ts", to: mod("lib/client.ts") },
          { from: "lib/client.ts", to: mod("lib/fetchers.ts") },
        ],
      )
      expect(checkDag(g)).toEqual([
        {
          check: "dag",
          ruleset: "arch",
          rules: [14],
          group: { kind: "blob" },
          members: ["lib/client.ts", "lib/fetchers.ts"],
          shape: "module-cycle",
          files: ["lib/client.ts", "lib/fetchers.ts"],
        },
      ])
    })

    it("buckets an in-service cycle under its service", () => {
      const g = graph(
        {
          "icons/a.ts": { layer: "blob", serviceRoot: "icons" },
          "icons/b.ts": { layer: "blob", serviceRoot: "icons" },
        },
        [
          { from: "icons/a.ts", to: mod("icons/b.ts") },
          { from: "icons/b.ts", to: mod("icons/a.ts") },
        ],
      )
      expect(checkDag(g)).toEqual([
        expect.objectContaining({
          rules: [14],
          group: { kind: "service", root: "icons" },
        }),
      ])
    })

    it("coexists with the service finding on a cross-service runtime cycle — keep both", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "b/y.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/x.model.ts", to: mod("b/y.model.ts") },
          { from: "b/y.model.ts", to: mod("a/x.model.ts") },
        ],
      )
      const violations = checkDag(g)
      expect(violations).toHaveLength(2)
      expect(violations.map((v) => v.rules)).toEqual([[13], [14]])
      expect(violations[1]).toMatchObject({
        group: { kind: "cross-service" },
      })
    })

    it("fires through an unowned file while rule 13 stays silent — no service-edge transit", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "lib/util.ts": { layer: "blob" },
          "b/y.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/x.model.ts", to: mod("lib/util.ts") },
          { from: "lib/util.ts", to: mod("b/y.model.ts") },
          { from: "b/y.model.ts", to: mod("a/x.model.ts") },
        ],
      )
      const violations = checkDag(g)
      expect(violations).toHaveLength(1)
      expect(violations[0]).toMatchObject({
        rules: [14],
        group: { kind: "cross-service" },
        files: ["a/x.model.ts", "lib/util.ts", "b/y.model.ts"],
      })
    })

    it("stays green on a type-only cycle through an unowned file — the named non-goal", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
          "lib/util.ts": { layer: "blob" },
          "b/y.model.ts": { layer: "model", serviceRoot: "b" },
        },
        [
          { from: "a/x.model.ts", to: mod("lib/util.ts"), kind: "type" },
          { from: "lib/util.ts", to: mod("b/y.model.ts"), kind: "type" },
          { from: "b/y.model.ts", to: mod("a/x.model.ts"), kind: "type" },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })

    it("stays green when a type edge breaks the runtime loop", () => {
      const g = graph(
        {
          "lib/a.ts": { layer: "blob" },
          "lib/b.ts": { layer: "blob" },
        },
        [
          { from: "lib/a.ts", to: mod("lib/b.ts"), kind: "runtime" },
          { from: "lib/b.ts", to: mod("lib/a.ts"), kind: "type" },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })

    it("fires a runtime self-import as a one-file cycle", () => {
      const g = graph({ "lib/loop.ts": { layer: "blob" } }, [
        { from: "lib/loop.ts", to: mod("lib/loop.ts") },
      ])
      expect(checkDag(g)).toEqual([
        expect.objectContaining({
          rules: [14],
          members: ["lib/loop.ts"],
          files: ["lib/loop.ts"],
        }),
      ])
    })

    it.each(["dynamic", "require"] as const)(
      "counts a %s runtime edge — form-blind",
      (form) => {
        const g = graph(
          {
            "lib/a.ts": { layer: "blob" },
            "lib/b.ts": { layer: "blob" },
          },
          [
            { from: "lib/a.ts", to: mod("lib/b.ts"), form },
            { from: "lib/b.ts", to: mod("lib/a.ts") },
          ],
        )
        expect(checkDag(g)).toEqual([expect.objectContaining({ rules: [14] })])
      },
    )
  })

  describe("non-participants", () => {
    it("ignores external targets — leaves can never point back", () => {
      const g = graph(
        {
          "a/x.model.ts": { layer: "model", serviceRoot: "a" },
        },
        [
          { from: "a/x.model.ts", to: lib("express") },
          { from: "a/x.model.ts", to: lib("node:path") },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })

    it("runs a clean layered mini-graph green", () => {
      const g = graph(
        {
          "main.ts": { layer: "assembly" },
          "icons/icons.service.ts": { layer: "service", serviceRoot: "icons" },
          "icons/ports/manifest.ts": { layer: "ports", serviceRoot: "icons" },
          "icons/manifest/manifest.adapter.ts": {
            layer: "adapters",
            serviceRoot: "icons/manifest",
          },
        },
        [
          { from: "main.ts", to: mod("icons/icons.service.ts") },
          { from: "main.ts", to: mod("icons/manifest/manifest.adapter.ts") },
          {
            from: "icons/manifest/manifest.adapter.ts",
            to: mod("icons/ports/manifest.ts"),
            kind: "type",
          },
          {
            from: "icons/icons.service.ts",
            to: mod("icons/ports/manifest.ts"),
            kind: "type",
          },
        ],
      )
      expect(checkDag(g)).toEqual([])
    })
  })

  describe("contract breaches are loud", () => {
    it("throws when an edge references a module missing from the graph", () => {
      const g = graph(
        { "a/x.model.ts": { layer: "model", serviceRoot: "a" } },
        [{ from: "a/x.model.ts", to: mod("ghost.ts") }],
      )
      expect(() => checkDag(g)).toThrow(/ghost\.ts/)
    })
  })
})
