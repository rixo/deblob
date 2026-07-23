import { describe, expect, it } from "vitest"

import type {
  BarrelsViolation,
  DagViolation,
  LayersViolation,
  PortsViolation,
  PrivateViolation,
} from "../check/violation.model.ts"
import {
  ANSI_COLORS,
  CHECK_HELP,
  HELP,
  NO_COLORS,
  blobPercentOf,
  formatSize,
  provenanceOf,
  renderBareStatus,
  renderCheckResults,
  renderExplain,
} from "./render.model.ts"

const layersViolation = (
  overrides: Partial<LayersViolation> = {},
): LayersViolation => ({
  check: "layers",
  ruleset: "arch",
  rules: [4],
  file: "src/invoice/pdf-render.service.ts",
  serviceRoot: "src/invoice",
  importerLayer: "service",
  target: { type: "external", specifier: "node:fs", package: "node:fs" },
  shape: "matrix-cell",
  targetClass: "concrete",
  ...overrides,
})

const privateViolation = (): PrivateViolation => ({
  check: "private",
  ruleset: "arch",
  rules: [12],
  file: "src/billing/stripe.adapter.ts",
  serviceRoot: "src/billing",
  target: { type: "module", path: "src/invoice/private/totals.ts" },
  boundary: "src/invoice/private",
  owner: "src/invoice",
})

const barrelsViolation = (
  overrides: Partial<BarrelsViolation> = {},
): BarrelsViolation => ({
  check: "barrels",
  ruleset: "arch",
  rules: [2],
  file: "src/invoice/index.ts",
  serviceRoot: "src/invoice",
  target: { type: "module", path: "src/invoice/pdf-render.service.ts" },
  shape: "barrel-file",
  ...overrides,
})

const portsViolation = (
  overrides: Partial<PortsViolation> = {},
): PortsViolation =>
  ({
    check: "ports",
    ruleset: "arch",
    rules: [10],
    file: "src/invoice/ports/renderer.ts",
    serviceRoot: "src/invoice",
    shape: "runtime-export",
    form: "const",
    name: "SOME_MADE_UP_CONST",
    exported: true,
    ...overrides,
  }) as PortsViolation

const STATS = { files: 214, edges: 380 }

describe("renderCheckResults", () => {
  it("renders the fiction's grouped listing: service → file → tagged lines", () => {
    const output = renderCheckResults(
      [layersViolation(), privateViolation()],
      STATS,
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "src/billing",
        "  src/billing/stripe.adapter.ts",
        "    private  imports src/invoice/private/totals.ts — private/ is sealed",
        "             outside its service (rule 12)",
        "",
        "src/invoice",
        "  src/invoice/pdf-render.service.ts",
        "    layers   imports node:fs — service layer cannot depend on concrete",
        "             (rule 4)",
        "",
        "2 violations (1 layers, 1 private) · 214 files · 380 edges",
        "why: deblob explain 4 12 · or rerun with --explain",
        "",
      ].join("\n"),
    )
  })

  it("rule citations never split across wrapped lines", () => {
    // slide the citation over the wrap boundary — no orphaned "(rule" / "8)"
    for (let pad = 0; pad <= 60; pad += 1) {
      const target = {
        type: "module",
        path: `src/invoice/${"x".repeat(pad)}.model.ts`,
      } as const
      const output = renderCheckResults(
        [
          layersViolation({ rules: [5], target }),
          layersViolation({ rules: [6, 8], target }),
        ],
        STATS,
        NO_COLORS,
      )
      for (const line of output.split("\n")) {
        expect(line).not.toMatch(/\(?rules?$/)
        expect(line).not.toMatch(/^\s*\d+[,)]/)
      }
    }
  })

  it("pathPrefix lands on every module path, never on package specifiers", () => {
    const output = renderCheckResults(
      [layersViolation(), privateViolation()],
      STATS,
      NO_COLORS,
      "../../",
    )
    expect(output).toContain("../../src/billing\n")
    expect(output).toContain("  ../../src/billing/stripe.adapter.ts")
    expect(output).toContain("imports ../../src/invoice/private/totals.ts")
    // a package specifier is not a path — no prefix
    expect(output).toContain("imports node:fs —")
  })

  it("a clean run is one summary line, no footer", () => {
    expect(renderCheckResults([], STATS, NO_COLORS)).toBe(
      "0 violations · 214 files · 380 edges\n",
    )
  })

  it("singular: 1 violation", () => {
    const output = renderCheckResults([layersViolation()], STATS, NO_COLORS)
    expect(output).toContain("1 violation (1 layers)")
    expect(output).not.toContain("1 violations")
  })

  it("groups deterministically: services ascending, blob bucket last, files ascending", () => {
    const output = renderCheckResults(
      [
        layersViolation({
          file: "src/zeta/a.service.ts",
          serviceRoot: "src/zeta",
        }),
        layersViolation({
          file: "src/lib/helpers.ts",
          serviceRoot: null,
          importerLayer: "blob",
        }),
        privateViolation(),
      ],
      STATS,
      NO_COLORS,
    )
    const billing = output.indexOf("src/billing")
    const zeta = output.indexOf("src/zeta")
    const blob = output.indexOf("blob\n")
    expect(billing).toBeGreaterThanOrEqual(0)
    expect(zeta).toBeGreaterThan(billing)
    expect(blob).toBeGreaterThan(zeta)
    // blob bucket files keep their full path
    expect(output).toContain("  src/lib/helpers.ts")
  })

  it("orders violations inside a file by check name", () => {
    const output = renderCheckResults(
      [
        portsViolation({
          file: "src/invoice/checkout.service.ts",
          shape: "runtime-import-of-port",
          target: { type: "module", path: "src/invoice/ports/renderer.ts" },
        } as Partial<PortsViolation>),
        barrelsViolation({
          file: "src/invoice/checkout.service.ts",
          shape: "index-import",
          target: { type: "module", path: "src/invoice/index.ts" },
        }),
      ],
      STATS,
      NO_COLORS,
    )
    expect(output.indexOf("    barrels")).toBeGreaterThanOrEqual(0)
    expect(output.indexOf("    barrels")).toBeLessThan(
      output.indexOf("    ports"),
    )
  })

  it("same-check violations in a file order by message, either input order", () => {
    const exportViolation = (name: string) =>
      portsViolation({ name } as Partial<PortsViolation>)
    for (const input of [
      [exportViolation("AAA_FAKE"), exportViolation("ZZZ_FAKE")],
      [exportViolation("ZZZ_FAKE"), exportViolation("AAA_FAKE")],
    ]) {
      const output = renderCheckResults(input, STATS, NO_COLORS)
      expect(output.indexOf("AAA_FAKE")).toBeLessThan(
        output.indexOf("ZZZ_FAKE"),
      )
    }
  })

  describe("messages", () => {
    // collapse the hanging-indent wrap so substrings assert on whole phrases
    const message = (violation: Parameters<typeof renderCheckResults>[0][0]) =>
      renderCheckResults([violation], STATS, NO_COLORS).replace(/\n {13}/g, " ")

    it("seal violations carry the import-type hint when rule 8 is cited", () => {
      const output = message(
        layersViolation({
          rules: [6, 8],
          file: "src/billing/invoice-client.service.ts",
          serviceRoot: "src/billing",
          target: {
            type: "module",
            path: "src/invoice/pdf-render.service.ts",
          },
          targetClass: "service",
        }),
      )
      expect(output).toContain(".service.ts is assembly-only")
      expect(output).toContain("import type is fine")
      expect(output).toContain("(rules 6, 8)")
    })

    it("seal violations without the exemption carry no hint", () => {
      const output = message(
        layersViolation({
          rules: [7],
          target: { type: "module", path: "src/billing/stripe.adapter.ts" },
          targetClass: "adapters",
        }),
      )
      expect(output).toContain(".adapter.ts is assembly-only")
      expect(output).not.toContain("import type is fine")
    })

    it("blob target cites the extraction remedy", () => {
      const output = message(
        layersViolation({
          rules: [5],
          target: { type: "module", path: "src/lib/helpers.ts" },
          targetClass: "blob",
        }),
      )
      expect(output).toContain("only assembly may import blob")
    })

    it("model purity wording differs from the service one", () => {
      const output = message(
        layersViolation({
          rules: [1, 4],
          file: "src/invoice/model/totals.model.ts",
          importerLayer: "model",
        }),
      )
      expect(output).toContain("model must stay pure")
    })

    it("a matrix cell outside the named wordings falls back to the generic form", () => {
      const output = message(
        layersViolation({
          rules: [1],
          file: "src/invoice/fs-store.adapter.ts",
          importerLayer: "adapters",
          target: { type: "module", path: "src/main.ts" },
          targetClass: "assembly",
        }),
      )
      expect(output).toContain("adapters may not import assembly")
    })

    it("model inward-only cell names its allowed set", () => {
      const output = message(
        layersViolation({
          rules: [1],
          file: "src/invoice/model/schedule.model.ts",
          importerLayer: "model",
          target: { type: "module", path: "src/invoice/renderer.port.ts" },
          targetClass: "ports",
        }),
      )
      expect(output).toContain("model may only import model")
    })

    it("inward-only cells name the allowed set", () => {
      const output = message(
        layersViolation({
          rules: [1],
          file: "src/invoice/ports/renderer.ts",
          importerLayer: "ports",
          target: {
            type: "module",
            path: "src/invoice/pdf-render.service.ts",
          },
          targetClass: "service",
        }),
      )
      expect(output).toContain("ports may only import model and ports")
    })

    it("unclassified lib points at the pureLibs escape hatch", () => {
      const output = message(
        layersViolation({
          rules: [4],
          shape: "unclassified-lib",
          target: {
            type: "external",
            specifier: "some-made-up-lib",
            package: "some-made-up-lib",
          },
        } as Partial<LayersViolation>),
      )
      expect(output).toContain("unclassified third-party in a pure layer")
      expect(output).toContain("pureLibs")
    })

    it("barrel shapes: re-export at the index, direct-import remedy at the importer", () => {
      expect(message(barrelsViolation())).toContain(
        "re-exports src/invoice/pdf-render.service.ts — no index.ts indirection",
      )
      expect(
        message(
          barrelsViolation({
            file: "src/billing/refund.service.ts",
            serviceRoot: "src/billing",
            target: { type: "module", path: "src/invoice/index.ts" },
            shape: "index-import",
          }),
        ),
      ).toContain("import the layered file directly")
    })

    it("ports shapes: export, contains, runtime edges both directions", () => {
      expect(message(portsViolation())).toContain(
        "exports const SOME_MADE_UP_CONST — ports are types only",
      )
      expect(
        message(
          portsViolation({
            form: "function",
            name: "someMadeUpFn",
            exported: false,
          } as Partial<PortsViolation>),
        ),
      ).toContain("contains function someMadeUpFn — ports are types only")
      expect(
        message(
          portsViolation({
            form: "statement",
            name: null,
            exported: false,
          } as Partial<PortsViolation>),
        ),
      ).toContain("contains a runtime statement — ports are types only")
      expect(
        message(
          portsViolation({
            shape: "runtime-import",
            target: { type: "module", path: "src/invoice/invoice.model.ts" },
          } as Partial<PortsViolation>),
        ),
      ).toContain("a port needs no runtime imports")
      expect(
        message(
          portsViolation({
            file: "src/invoice/invoice.service.ts",
            shape: "runtime-import-of-port",
            target: { type: "module", path: "src/invoice/ports/renderer.ts" },
          } as Partial<PortsViolation>),
        ),
      ).toContain("a types-only file supplies no runtime binding")
    })
  })

  describe("dag blocks", () => {
    const serviceCycle = (
      overrides: Partial<DagViolation> = {},
    ): DagViolation =>
      ({
        check: "dag",
        ruleset: "arch",
        rules: [13],
        group: { kind: "cross-service" },
        members: ["src/billing", "src/orders"],
        shape: "service-cycle",
        services: ["src/billing", "src/orders"],
        hops: [
          {
            from: "src/billing",
            to: "src/orders",
            via: {
              from: "src/billing/refund.service.ts",
              to: "src/orders/model/order.ts",
            },
            typeOnly: false,
            wiring: false,
          },
          {
            from: "src/orders",
            to: "src/billing",
            via: {
              from: "src/orders/checkout.service.ts",
              to: "src/billing/ports/payment.ts",
            },
            typeOnly: false,
            wiring: false,
          },
        ],
        ...overrides,
      }) as DagViolation

    const moduleCycle = (overrides: Partial<DagViolation> = {}): DagViolation =>
      ({
        check: "dag",
        ruleset: "arch",
        rules: [14],
        group: { kind: "blob" },
        members: ["src/lib/api/client.ts", "src/lib/utils/fetchers.ts"],
        shape: "module-cycle",
        files: ["src/lib/api/client.ts", "src/lib/utils/fetchers.ts"],
        ...overrides,
      }) as DagViolation

    it("renders the fiction's cross-service block with quoted carrying edges", () => {
      const output = renderCheckResults([serviceCycle()], STATS, NO_COLORS)
      expect(output).toBe(
        [
          "cross-service",
          "  dag      src/billing ⇄ src/orders",
          "           billing → orders (src/billing/refund.service.ts →",
          "           src/orders/model/order.ts)",
          "           orders → billing (src/orders/checkout.service.ts →",
          "           src/billing/ports/payment.ts)",
          "           services must form a DAG (rule 13); see the sharing",
          "           progression",
          "",
          "1 violation (1 dag) · 214 files · 380 edges",
          "why: deblob explain 13 · or rerun with --explain",
          "",
        ].join("\n"),
      )
    })

    it("orders blocks in a bucket by rule, then membership", () => {
      const output = renderCheckResults(
        [
          moduleCycle({
            group: { kind: "cross-service" },
          } as Partial<DagViolation>),
          serviceCycle(),
        ],
        STATS,
        NO_COLORS,
      )
      expect(output.indexOf("src/billing ⇄ src/orders")).toBeLessThan(
        output.indexOf("src/lib/api/client.ts ⇄"),
      )
      // either input order — the sort, not the input, decides
      const reversed = renderCheckResults(
        [
          serviceCycle(),
          moduleCycle({
            group: { kind: "cross-service" },
          } as Partial<DagViolation>),
        ],
        STATS,
        NO_COLORS,
      )
      expect(reversed).toBe(output)
    })

    it("renders the module cycle in the blob bucket, last", () => {
      const output = renderCheckResults(
        [moduleCycle(), serviceCycle()],
        STATS,
        NO_COLORS,
      )
      const lines = output.split("\n")
      expect(lines.indexOf("cross-service")).toBeLessThan(lines.indexOf("blob"))
      expect(output).toContain(
        "  dag      src/lib/api/client.ts ⇄ src/lib/utils/fetchers.ts",
      )
      expect(output).toContain(
        "runtime module cycle (rule 14) — works in dev, silently fails",
      )
    })

    it("marks type-only and wiring hops, and extends the remedy for wiring", () => {
      const output = renderCheckResults(
        [
          serviceCycle({
            hops: [
              {
                from: "src/billing",
                to: "src/orders",
                via: {
                  from: "src/billing/billing.service.spec.ts",
                  to: "src/orders/orders.adapter.ts",
                },
                typeOnly: false,
                wiring: true,
              },
              {
                from: "src/orders",
                to: "src/billing",
                via: {
                  from: "src/orders/orders.adapter.ts",
                  to: "src/billing/ports/payment.ts",
                },
                typeOnly: true,
                wiring: false,
              },
            ],
          } as Partial<DagViolation>),
        ],
        STATS,
        NO_COLORS,
      )
      expect(output).toContain("src/orders/orders.adapter.ts) (wiring)")
      expect(output).toContain("src/billing/ports/payment.ts) (type-only)")
      expect(output).toContain("(wiring): use a fixture adapter, or move the")
      expect(output).toContain("wiring outside the service tree")
    })

    it("renders a longer witness as an arrow chain and notes entanglement", () => {
      const output = renderCheckResults(
        [
          serviceCycle({
            // rootless service dirs: the hop label falls back to the whole root
            members: ["a", "b", "c"],
            services: ["a", "b"],
            hops: [
              {
                from: "a",
                to: "b",
                via: { from: "a/a.service.ts", to: "b/b.model.ts" },
                typeOnly: false,
                wiring: false,
              },
              {
                from: "b",
                to: "a",
                via: { from: "b/b.service.ts", to: "a/a.model.ts" },
                typeOnly: false,
                wiring: false,
              },
            ],
          } as Partial<DagViolation>),
          moduleCycle({
            group: { kind: "service", root: "src/a" },
            members: ["src/a/one.ts", "src/a/three.ts", "src/a/two.ts"],
            files: ["src/a/one.ts", "src/a/two.ts", "src/a/three.ts"],
          } as Partial<DagViolation>),
        ],
        STATS,
        NO_COLORS,
      )
      expect(output).toContain(
        "  dag      src/a/one.ts → src/a/two.ts → src/a/three.ts →",
      )
      expect(output).toContain(
        "entangled with 1 more — break this cycle and rerun",
      )
      // the in-service module cycle lands under its service header
      const lines = output.split("\n")
      expect(lines.indexOf("src/a")).toBeLessThan(
        lines.indexOf("cross-service"),
      )
    })
  })
})

describe("bare status", () => {
  it("renders the fiction's block with the full check-list hint", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf("deblob.config.ts", "ts-suffixes-factories"),
        stats: {
          fileCount: 1872,
          totalBytes: 4404019,
          blobPercent: 78,
          serviceCount: 3,
        },
      },
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "deblob 0.0.1 · deblob.config.ts (flavor: ts-suffixes-factories)",
        "",
        "  1,872 files · 4.2mb · 78% blob",
        "  3 services",
        "",
        "Commands",
        "  deblob check [what...]      run architecture checks",
        "                              (dag · layers · private · barrels · ports)",
        "  deblob explain <topic...>   explain rules or checks",
        "  deblob --help               full help",
        "",
      ].join("\n"),
    )
  })

  it("singular service, configless provenance", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf(null, "ts-suffixes-factories"),
        stats: {
          fileCount: 1,
          totalBytes: 2048,
          blobPercent: 100,
          serviceCount: 1,
        },
      },
      NO_COLORS,
    )
    expect(output).toContain("no config (defaults)")
    expect(output).toContain("1 file · 2kb ·")
    expect(output).toContain("1 service\n")
  })

  it("formatSize: kb below 1000kb, mb above, no trailing .0", () => {
    expect(formatSize(0)).toBe("0kb")
    expect(formatSize(125952)).toBe("123kb")
    expect(formatSize(5 * 1024 * 1024)).toBe("5mb")
    expect(formatSize(4404019)).toBe("4.2mb")
  })

  it("a broken config skips the stat lines — bare informs, never fails", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: "config error (details on stderr)",
        stats: null,
      },
      NO_COLORS,
    )
    expect(output).not.toContain("% blob")
    expect(output).toContain("Commands")
  })

  it("blobPercentOf weighs by size and survives an empty set", () => {
    expect(
      blobPercentOf([
        { size: 900, blob: true },
        { size: 100, blob: false },
      ]),
    ).toBe(90)
    expect(blobPercentOf([])).toBe(0)
  })
})

describe("renderExplain", () => {
  const entry = (rule: number, cards: { slug: string; text: string }[]) => ({
    rule,
    title: "Some made-up rule title",
    body: "Body of the made-up rule, short enough to stay one line.",
    cards,
    url: `https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-${rule}`,
  })

  it("prints heading (lowercased title), body, card, url", () => {
    const output = renderExplain(
      [entry(4, [{ slug: "made-up-card", text: "# Card\n\ncard body\n" }])],
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "rule 4 — some made-up rule title",
        "",
        "Body of the made-up rule, short enough to stay one line.",
        "",
        "card: made-up-card",
        "",
        "# Card",
        "",
        "card body",
        "",
        "full text:",
        "https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-4",
        "",
      ].join("\n"),
    )
  })

  it("a card cited by several rules prints once, later citations point up", () => {
    const shared = { slug: "shared-card", text: "shared card body" }
    const output = renderExplain(
      [entry(6, [shared]), entry(7, [shared])],
      NO_COLORS,
    )
    expect(output.match(/shared card body/g)).toHaveLength(1)
    expect(output).toContain("card: shared-card — shown above")
    expect(output).toContain("···")
  })

  it("wraps a long body at the output width", () => {
    const long = entry(1, [])
    long.body = Array.from({ length: 30 }, () => "word").join(" ")
    const output = renderExplain([long], NO_COLORS)
    for (const line of output.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(72)
    }
  })
})

describe("colors", () => {
  it("ANSI palette wraps in SGR codes; NO_COLORS is identity", () => {
    expect(ANSI_COLORS.strong("x")).toBe("\u001b[1mx\u001b[22m")
    expect(ANSI_COLORS.dim("x")).toBe("\u001b[2mx\u001b[22m")
    expect(ANSI_COLORS.accent("x")).toBe("\u001b[36mx\u001b[39m")
    expect(NO_COLORS.strong("x")).toBe("x")
    expect(NO_COLORS.dim("x")).toBe("x")
    expect(NO_COLORS.accent("x")).toBe("x")
  })
})

describe("help screens", () => {
  it("main help: commands, checks, options, exit codes, the no-autofix line", () => {
    expect(HELP).toContain("deblob check [what...]")
    expect(HELP).toContain("deblob explain <topic...>")
    expect(HELP).toContain("-c, --config <path>")
    expect(HELP).toContain("--no-color")
    expect(HELP).toContain(
      "0  clean    1  violations found    2  usage or config error",
    )
    expect(HELP).toContain("deblob detects; it never moves code.")
  })

  it("check help: batch flags and the teaching primer", () => {
    expect(CHECK_HELP).toContain("--explain")
    expect(CHECK_HELP).toContain("--explain-only")
    expect(CHECK_HELP).toContain("one shared import graph")
  })

  it("both help screens carry dag — the fiction's full check list", () => {
    expect(HELP).toContain("dag        service dependencies form a DAG")
    expect(CHECK_HELP).toContain("deblob check dag layers")
  })
})
