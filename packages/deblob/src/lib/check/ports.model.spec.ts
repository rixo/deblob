import { describe, expect, it } from "vitest"

import type {
  EdgeForm,
  EdgeKind,
  EdgeTarget,
  ImportGraph,
  Layer,
  RuntimeEntry,
} from "../extraction/graph.model.ts"
import { checkPorts } from "./ports.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
  runtimeContent?: RuntimeEntry[]
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
  edges: EdgeSpec[] = [],
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
        runtimeContent: spec.runtimeContent ?? [],
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
})

const entry = (overrides: Partial<RuntimeEntry> = {}): RuntimeEntry => ({
  form: "const",
  name: "SOME_MADE_UP_CONST",
  exported: true,
  ...overrides,
})

describe("checkPorts", () => {
  describe("runtime-export — runtime content in a port file (rule 10)", () => {
    it("fires on a runtime export, carrying the declaration's form and name", () => {
      const g = graph({
        "invoice/ports/renderer.ts": {
          layer: "ports",
          serviceRoot: "invoice",
          runtimeContent: [entry()],
        },
      })
      expect(checkPorts(g)).toEqual([
        {
          check: "ports",
          ruleset: "arch",
          rules: [10],
          file: "invoice/ports/renderer.ts",
          serviceRoot: "invoice",
          shape: "runtime-export",
          form: "const",
          name: "SOME_MADE_UP_CONST",
          exported: true,
        },
      ])
    })

    it("fires once per entry when a port holds several", () => {
      const g = graph({
        "invoice/ports/renderer.ts": {
          layer: "ports",
          serviceRoot: "invoice",
          runtimeContent: [
            entry(),
            entry({ form: "statement", name: null, exported: false }),
          ],
        },
      })
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-export", form: "const" }),
        expect.objectContaining({ shape: "runtime-export", form: "statement" }),
      ])
    })

    it("stays green on a pure port", () => {
      const g = graph({
        "invoice/ports/renderer.ts": { layer: "ports", serviceRoot: "invoice" },
      })
      expect(checkPorts(g)).toEqual([])
    })

    it.each(["model", "service", "adapters", "assembly", "blob"] as const)(
      "stays green on runtime content in a %s file — rule 10 binds ports only",
      (layer) => {
        const g = graph({
          "invoice/thing.ts": {
            layer,
            serviceRoot: "invoice",
            runtimeContent: [entry()],
          },
        })
        expect(checkPorts(g)).toEqual([])
      },
    )
  })

  describe("runtime-import — a runtime edge out of a port file (rule 10)", () => {
    const port = (
      to: EdgeTarget,
      edge: Partial<EdgeSpec> = {},
      nodes: Record<string, NodeSpec> = {},
    ): ImportGraph =>
      graph(
        {
          "invoice/ports/renderer.ts": {
            layer: "ports",
            serviceRoot: "invoice",
          },
          ...nodes,
        },
        [{ from: "invoice/ports/renderer.ts", to, ...edge }],
      )

    it("fires on a matrix-legal target — the rule is target-blind", () => {
      const g = port(
        mod("invoice/dpi.model.ts"),
        {},
        {
          "invoice/dpi.model.ts": { layer: "model", serviceRoot: "invoice" },
        },
      )
      expect(checkPorts(g)).toEqual([
        {
          check: "ports",
          ruleset: "arch",
          rules: [10],
          file: "invoice/ports/renderer.ts",
          serviceRoot: "invoice",
          shape: "runtime-import",
          target: mod("invoice/dpi.model.ts"),
        },
      ])
    })

    it.each([
      ["another port", mod("invoice/ports/other.ts")],
      ["blob", mod("lib/helpers.ts")],
    ] as const)("fires on a runtime edge to %s", (_label, to) => {
      const g = port(
        to,
        {},
        {
          "invoice/ports/other.ts": { layer: "ports", serviceRoot: "invoice" },
          "lib/helpers.ts": { layer: "blob" },
        },
      )
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-import", target: to }),
      ])
    })

    it("fires on an external target — pure-lib classification is irrelevant", () => {
      const g = port(lib("zod"))
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({
          shape: "runtime-import",
          target: lib("zod"),
        }),
      ])
    })

    it.each(["dynamic", "require"] as const)("fires on a %s edge", (form) => {
      const g = port(lib("zod"), { form })
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-import" }),
      ])
    })

    it("fires on a runtime re-export edge", () => {
      const g = port(
        mod("invoice/pdf.adapter.ts"),
        { reExport: true },
        {
          "invoice/pdf.adapter.ts": {
            layer: "adapters",
            serviceRoot: "invoice",
          },
        },
      )
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-import" }),
      ])
    })

    it("stays green on type edges from a port, whatever the target", () => {
      const g = port(
        mod("invoice/pdf.adapter.ts"),
        { kind: "type" },
        {
          "invoice/pdf.adapter.ts": {
            layer: "adapters",
            serviceRoot: "invoice",
          },
        },
      )
      expect(checkPorts(g)).toEqual([])
    })
  })

  describe("runtime-import-of-port — a runtime edge into a port file (rule 10)", () => {
    const importOfPort = (
      from: string,
      spec: NodeSpec,
      edge: Partial<EdgeSpec> = {},
    ): ImportGraph =>
      graph(
        {
          [from]: spec,
          "invoice/ports/renderer.ts": {
            layer: "ports",
            serviceRoot: "invoice",
          },
        },
        [{ from, to: mod("invoice/ports/renderer.ts"), ...edge }],
      )

    it("fires at the importer on the matrix-legal service → ports cell", () => {
      const g = importOfPort("invoice/invoice.service.ts", {
        layer: "service",
        serviceRoot: "invoice",
      })
      expect(checkPorts(g)).toEqual([
        {
          check: "ports",
          ruleset: "arch",
          rules: [10],
          file: "invoice/invoice.service.ts",
          serviceRoot: "invoice",
          shape: "runtime-import-of-port",
          target: mod("invoice/ports/renderer.ts"),
        },
      ])
    })

    it.each([
      ["model", "invoice/dpi.model.ts", "invoice"],
      ["adapters", "invoice/pdf.adapter.ts", "invoice"],
      ["assembly", "src/main.ts", null],
      ["blob", "lib/helpers.ts", null],
    ] as const)(
      "fires for a %s importer — importer-blind",
      (layer, from, serviceRoot) => {
        const g = importOfPort(from, { layer, serviceRoot })
        expect(checkPorts(g)).toEqual([
          expect.objectContaining({
            shape: "runtime-import-of-port",
            file: from,
            serviceRoot,
          }),
        ])
      },
    )

    it.each(["dynamic", "require"] as const)("fires on a %s edge", (form) => {
      const g = importOfPort("lib/helpers.ts", { layer: "blob" }, { form })
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-import-of-port" }),
      ])
    })

    it("stays green on `import type` of a port from anywhere", () => {
      const g = importOfPort(
        "invoice/invoice.service.ts",
        { layer: "service", serviceRoot: "invoice" },
        { kind: "type" },
      )
      expect(checkPorts(g)).toEqual([])
    })

    it("stays green on runtime imports of non-port targets", () => {
      const g = graph(
        {
          "invoice/invoice.service.ts": {
            layer: "service",
            serviceRoot: "invoice",
          },
          "invoice/dpi.model.ts": { layer: "model", serviceRoot: "invoice" },
        },
        [
          {
            from: "invoice/invoice.service.ts",
            to: mod("invoice/dpi.model.ts"),
          },
          { from: "invoice/invoice.service.ts", to: lib("zod") },
        ],
      )
      expect(checkPorts(g)).toEqual([])
    })
  })

  describe("the shapes partition rule 10", () => {
    it("port → port runtime yields exactly one finding, at the acting port", () => {
      const g = graph(
        {
          "invoice/ports/a.ts": { layer: "ports", serviceRoot: "invoice" },
          "invoice/ports/b.ts": { layer: "ports", serviceRoot: "invoice" },
        },
        [{ from: "invoice/ports/a.ts", to: mod("invoice/ports/b.ts") }],
      )
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({
          shape: "runtime-import",
          file: "invoice/ports/a.ts",
        }),
      ])
    })

    it("a port with runtime content and a runtime import yields two findings, distinct shapes", () => {
      const g = graph(
        {
          "invoice/ports/renderer.ts": {
            layer: "ports",
            serviceRoot: "invoice",
            runtimeContent: [entry()],
          },
        },
        [{ from: "invoice/ports/renderer.ts", to: lib("zod") }],
      )
      expect(checkPorts(g)).toEqual([
        expect.objectContaining({ shape: "runtime-export" }),
        expect.objectContaining({ shape: "runtime-import" }),
      ])
    })
  })

  describe("contract breaches are loud", () => {
    it("throws when an edge references a module missing from the graph", () => {
      const g = graph(
        {
          "invoice/ports/renderer.ts": {
            layer: "ports",
            serviceRoot: "invoice",
          },
        },
        [{ from: "invoice/ports/renderer.ts", to: mod("ghost.ts") }],
      )
      expect(() => checkPorts(g)).toThrow(/ghost\.ts/)
    })
  })
})
