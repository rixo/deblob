import { describe, expect, test } from "vitest"

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
  formatSize,
  provenanceOf,
  renderBareStatus,
  renderCheckResults,
  renderExplain,
  renderUnresolved,
  renderUnverified,
  sizeStatsOf,
  SURFACE_NOT_CLAIMED,
} from "./render.model.ts"
import type { GraphStats } from "./render.model.ts"

const layersViolation = (
  overrides: Partial<LayersViolation> = {},
): LayersViolation => ({
  check: "layers",
  ruleset: "arch",
  rules: [4],
  file: "src/invoice/pdf-render.service.ts",
  serviceRoot: "src/invoice",
  importerLayer: "service",
  target: {
    type: "external",
    specifier: "node:fs",
    package: "node:fs",
    declared: false,
    layer: null,
  },
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

const STATS: GraphStats = {
  files: 214,
  totalBytes: 218 * 1024,
  blobPercent: 25,
  services: 12,
  imports: 380,
  surface: null,
}

describe("renderCheckResults", () => {
  test("renders the fiction's grouped listing: service → file → tagged lines", () => {
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
        "2 violations (1 layers, 1 private) · 214 files · 218kb · 25% blob",
        "12 services · 380 imports",
        "why: deblob explain 4 12 · or rerun with --explain",
        "",
      ].join("\n"),
    )
  })

  test("rule citations never split across wrapped lines", () => {
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

  test("pathPrefix lands on every module path, never on package specifiers", () => {
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

  test("a clean run is the summary and coverage lines, no footer", () => {
    expect(renderCheckResults([], STATS, NO_COLORS)).toBe(
      "0 violations · 214 files · 218kb · 25% blob\n12 services · 380 imports\n",
    )
  })

  test("coverage line: the exports segment exists iff a claim was checked, disclosed only when nonzero", () => {
    const claimed = { ...STATS, surface: { checked: 7, disclosed: 2 } }
    expect(renderCheckResults([], claimed, NO_COLORS)).toContain(
      "\n12 services · 380 imports · exports 7 checked, 2 disclosed\n",
    )
    const undisclosed = { ...STATS, surface: { checked: 1, disclosed: 0 } }
    expect(renderCheckResults([], undisclosed, NO_COLORS)).toContain(
      "\n12 services · 380 imports · exports 1 checked\n",
    )
    // singulars
    expect(
      renderCheckResults(
        [],
        { ...STATS, services: 1, imports: 1, surface: null },
        NO_COLORS,
      ),
    ).toContain("\n1 service · 1 import\n")
  })

  test("the no-field note names the opt-in — one stderr line, the driver keeps exit 0", () => {
    expect(SURFACE_NOT_CLAIMED).toBe(
      'surface: no "deblob" field in package.json — nothing to check; declaring is opting in ("deblob": {})\n',
    )
  })

  test("singular: 1 violation", () => {
    const output = renderCheckResults([layersViolation()], STATS, NO_COLORS)
    expect(output).toContain("1 violation (1 layers)")
    expect(output).not.toContain("1 violations")
  })

  test("groups deterministically: services ascending, blob bucket last, files ascending", () => {
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

  test("orders violations inside a file by check name", () => {
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

  test("same-check violations in a file order by message, either input order", () => {
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
    const message = (
      violation: Parameters<typeof renderCheckResults>[0][0],
      prefix = "",
    ) =>
      renderCheckResults([violation], STATS, NO_COLORS, prefix).replace(
        /\n {13}/g,
        " ",
      )

    test("seal violations carry the import-type hint when rule 8 is cited", () => {
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

    test("seal violations without the exemption carry no hint", () => {
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

    test("blob target cites the extraction remedy", () => {
      const output = message(
        layersViolation({
          rules: [5],
          target: { type: "module", path: "src/lib/helpers.ts" },
          targetClass: "blob",
        }),
      )
      expect(output).toContain("only assembly may import blob")
    })

    test("model purity wording differs from the service one", () => {
      const output = message(
        layersViolation({
          rules: [1, 4],
          file: "src/invoice/model/totals.model.ts",
          importerLayer: "model",
        }),
      )
      expect(output).toContain("model must stay pure")
    })

    test("a matrix cell outside the named wordings falls back to the generic form", () => {
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

    test("model inward-only cell names its allowed set", () => {
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

    test("inward-only cells name the allowed set", () => {
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

    test("unclassified lib points at the `pure` escape hatch", () => {
      const output = message(
        layersViolation({
          rules: [4],
          shape: "unclassified-lib",
          target: {
            type: "external",
            specifier: "some-made-up-lib",
            package: "some-made-up-lib",
            declared: false,
            layer: null,
          },
        } as Partial<LayersViolation>),
      )
      expect(output).toContain("unclassified third-party in a pure layer")
      expect(output).toContain('config key "pure"')
    })

    test("marks a declared external leaf so the cell reads as declared, not a resolver accident", () => {
      const output = message(
        layersViolation({
          rules: [4, 8],
          target: {
            type: "external",
            specifier: "$made-up:tokens.scss",
            package: "$made-up:*",
            declared: true,
            layer: null,
          },
        }),
      )
      expect(output).toContain("imports $made-up:tokens.scss (declared)")
    })

    test("renders the surface claim-mismatch with subpath, claim, and fact", () => {
      const output = message({
        check: "surface",
        ruleset: "arch",
        rules: [3],
        file: "src/stripe.adapter.ts",
        serviceRoot: "src",
        subpath: "./totals.model",
        exported: "src/stripe.adapter.ts",
        shape: "claim-mismatch",
        claimed: "model",
        actual: "adapters",
      })
      expect(output).toContain('is exported as "./totals.model" —')
      expect(output).toContain("claims model")
      expect(output).toContain("the file is adapters")
      expect(output).toContain("(rule 3)")
    })

    test("names the built target a source wears when reached through the mirror", () => {
      const output = message(
        {
          check: "surface",
          ruleset: "arch",
          rules: [2],
          file: "src/index.ts",
          serviceRoot: "src",
          subpath: ".",
          exported: "dist/index.js",
          shape: "unlabeled-front",
          fronts: "src/checkout.service.ts",
          frontLayer: "service",
        },
        "../",
      )
      expect(output).toContain("  ../src/index.ts")
      expect(output).toContain('is exported as "." (as ../dist/index.js) —')
    })

    test("renders the unlabeled front — direct, and through a fronted file", () => {
      const direct = message({
        check: "surface",
        ruleset: "arch",
        rules: [2],
        file: "src/checkout.service.ts",
        serviceRoot: "src",
        subpath: "./checkout",
        exported: "src/checkout.service.ts",
        shape: "unlabeled-front",
        fronts: "src/checkout.service.ts",
        frontLayer: "service",
      })
      expect(direct).toContain("an unlabeled entry over service")
      const chained = message({
        check: "surface",
        ruleset: "arch",
        rules: [2],
        file: "src/index.ts",
        serviceRoot: "src",
        subpath: ".",
        exported: "src/index.ts",
        shape: "unlabeled-front",
        fronts: "src/checkout.service.ts",
        frontLayer: "service",
      })
      expect(chained).toContain("fronting service (src/checkout.service.ts)")
      expect(chained).toContain("(rule 2)")
    })

    test("barrel shapes: re-export at the index, direct-import remedy at the importer", () => {
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

    test("ports shapes: export, contains, runtime edges both directions", () => {
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

    test("renders the fiction's cross-service block with quoted carrying edges", () => {
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
          "1 violation (1 dag) · 214 files · 218kb · 25% blob",
          "12 services · 380 imports",
          "why: deblob explain 13 · or rerun with --explain",
          "",
        ].join("\n"),
      )
    })

    test("orders blocks in a bucket by rule, then membership", () => {
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

    test("renders the module cycle in the blob bucket, last", () => {
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

    test("marks type-only and wiring hops, and extends the remedy for wiring", () => {
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

    test("renders a longer witness as an arrow chain and notes entanglement", () => {
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
  test("renders the fiction's block with the full check-list hint", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf("deblob.config.ts", "ts-suffixes-factories"),
        stats: {
          files: 1872,
          totalBytes: 4404019,
          blobPercent: 78,
          services: 3,
          surface: { claimed: 9, disclosed: 2 },
        },
      },
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "deblob 0.0.1 · deblob.config.ts (flavor: ts-suffixes-factories)",
        "",
        "  1,872 files · 4.2mb · 78% blob",
        "  3 services · exports 9 claimed, 2 disclosed",
        "",
        "Commands",
        "  deblob check [what...]      run architecture checks",
        "                              (dag · layers · private · barrels · ports · surface)",
        "  deblob explain <topic...>   explain rules or checks",
        "  deblob --help               full help",
        "",
      ].join("\n"),
    )
  })

  test("singular service, configless provenance", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf(null, "ts-suffixes-factories"),
        stats: {
          files: 1,
          totalBytes: 2048,
          blobPercent: 100,
          services: 1,
          surface: null,
        },
      },
      NO_COLORS,
    )
    expect(output).toContain("no config (defaults)")
    expect(output).toContain("1 file · 2kb ·")
    // no field: the line ends at the service count
    expect(output).toContain("1 service\n")
  })

  test("a claim with nothing disclosed prints the count alone", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf(null, "ts-suffixes-factories"),
        stats: {
          files: 4,
          totalBytes: 2048,
          blobPercent: 0,
          services: 2,
          surface: { claimed: 3, disclosed: 0 },
        },
      },
      NO_COLORS,
    )
    expect(output).toContain("  2 services · exports 3 claimed\n")
  })

  test("formatSize: kb below 1000kb, mb above, no trailing .0", () => {
    expect(formatSize(0)).toBe("0kb")
    expect(formatSize(125952)).toBe("123kb")
    expect(formatSize(5 * 1024 * 1024)).toBe("5mb")
    expect(formatSize(4404019)).toBe("4.2mb")
  })

  test("a broken config skips the stat lines — bare informs, never fails", () => {
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

  test("sizeStatsOf folds total bytes + size-weighted blob %, survives an empty set", () => {
    expect(
      sizeStatsOf([
        { size: 900, blob: true },
        { size: 100, blob: false },
      ]),
    ).toEqual({ totalBytes: 1000, blobPercent: 90 })
    expect(sizeStatsOf([])).toEqual({ totalBytes: 0, blobPercent: 0 })
  })
})

describe("renderUnresolved", () => {
  test("names each import, cites the incompleteness, teaches the remedies", () => {
    const output = renderUnresolved(
      [
        {
          from: "src/some-made-up.model.ts",
          specifier: "$made-up-alias/thing.service.ts",
          reason: "Cannot find module '$made-up-alias/thing.service.ts'",
          literal: true,
        },
      ],
      NO_COLORS,
      "",
    )
    expect(output).toContain("resolution failed — 1 import did not resolve")
    expect(output).toContain("  src/some-made-up.model.ts")
    expect(output).toContain("$made-up-alias/thing.service.ts — Cannot find")
    expect(output).toContain('config key "tsconfig"')
    expect(output).toContain('config key "alias"')
    expect(output).toContain('config key "external"')
  })

  test("prints importer paths under the runner's prefix, ctrl+clickable", () => {
    const output = renderUnresolved(
      [{ from: "src/a.model.ts", specifier: "x", reason: "r", literal: true }],
      NO_COLORS,
      "../",
    )
    expect(output).toContain("  ../src/a.model.ts")
  })
})

describe("renderUnverified", () => {
  test("names each entry with its subpath and reason, teaches the three remedies", () => {
    const output = renderUnverified(
      [
        {
          subpath: ".",
          targets: [
            {
              target: "dist/index.js",
              mapped: "src/index",
              mirror: { root: "dist", source: "src" },
              candidates: [],
            },
          ],
        },
        {
          subpath: "./legacy",
          targets: [
            {
              target: "build/legacy/index.js",
              mapped: "build/legacy/index",
              mirror: null,
              candidates: [],
            },
          ],
        },
      ],
      NO_COLORS,
      "",
    )
    expect(output).toContain(
      "surface unverified — 2 entries could not be reached; the claim cannot be certified",
    )
    expect(output).toContain("  dist/index.js\n")
    expect(output).toContain("  build/legacy/index.js\n")
    // wrapped continuation lines rejoined — the sentences, whatever the width
    const flat = output.replace(/\n */g, " ")
    expect(flat).toContain(
      'exported as "." — mirrors dist → src, no covered module at src/index',
    )
    expect(flat).toContain(
      'exported as "./legacy" — under no build mirror root, not a covered module',
    )
    expect(flat).toContain('config key "build"')
    expect(flat).toContain('config key "include"')
    expect(flat).toContain('"deblob": { "blob": ["."] }')
    expect(flat).toContain("consumers see it unlabeled")
  })

  test("an ambiguous stem names its candidates — the mirror cannot pick, and says so", () => {
    const output = renderUnverified(
      [
        {
          subpath: "./x",
          targets: [
            {
              target: "dist/x.js",
              mapped: "src/x",
              mirror: { root: "dist", source: "src" },
              candidates: ["src/x.ts", "src/x.js"],
            },
          ],
        },
      ],
      NO_COLORS,
      "../",
    )
    expect(output.replace(/\n */g, " ")).toContain(
      "mirrors dist → src, 2 covered modules at ../src/x (../src/x.ts, ../src/x.js), the mirror cannot pick one",
    )
    expect(output.replace(/\n */g, " ")).toContain('"exclude" a twin')
  })

  test("singular headline, paths under the runner's prefix", () => {
    const output = renderUnverified(
      [
        {
          subpath: "./x",
          targets: [
            {
              target: "dist/x.js",
              mapped: "src/x",
              mirror: { root: "dist", source: "src" },
              candidates: [],
            },
          ],
        },
      ],
      NO_COLORS,
      "../",
    )
    expect(output).toContain("1 entry could not be reached")
    expect(output).toContain("  ../dist/x.js\n")
    expect(output.replace(/\n */g, " ")).toContain(
      "no covered module at ../src/x",
    )
  })

  test("one block per subpath — its targets on one line, one reason when they all missed the same way", () => {
    const output = renderUnverified(
      [
        {
          subpath: "./made-up",
          targets: [
            {
              target: "dist/made-up.d.ts",
              mapped: "src/made-up",
              mirror: { root: "dist", source: "src" },
              candidates: [],
            },
            {
              target: "dist/made-up.js",
              mapped: "src/made-up",
              mirror: { root: "dist", source: "src" },
              candidates: [],
            },
          ],
        },
      ],
      NO_COLORS,
      "",
    )
    expect(output).toContain("1 entry could not be reached")
    expect(output).toContain("  dist/made-up.d.ts, dist/made-up.js\n")
    expect(output.replace(/\n */g, " ")).toContain(
      'exported as "./made-up" — mirrors dist → src, no covered module at src/made-up',
    )
    // the reason is said once — not once per target
    expect(output.match(/no covered module/g)).toHaveLength(1)
  })

  test("targets that missed differently each carry their own reason, target-prefixed", () => {
    const output = renderUnverified(
      [
        {
          subpath: "./bundled-thing",
          targets: [
            {
              target: "dist/lib/bundled-thing.js",
              mapped: "dist/lib/bundled-thing",
              mirror: null,
              candidates: [],
            },
            {
              target: "dist/types/bundled-thing.d.ts",
              mapped: "src/bundled-thing",
              mirror: { root: "dist/types", source: "src" },
              candidates: [],
            },
          ],
        },
      ],
      NO_COLORS,
      "../",
    )
    expect(output).toContain(
      "  ../dist/lib/bundled-thing.js, ../dist/types/bundled-thing.d.ts\n",
    )
    expect(output.replace(/\n */g, " ")).toContain(
      'exported as "./bundled-thing" — ../dist/lib/bundled-thing.js: under no build mirror root, not a covered module; ../dist/types/bundled-thing.d.ts: mirrors dist/types → src, no covered module at ../src/bundled-thing',
    )
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

  test("prints heading (lowercased title), body, card, url", () => {
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

  test("a card cited by several rules prints once, later citations point up", () => {
    const shared = { slug: "shared-card", text: "shared card body" }
    const output = renderExplain(
      [entry(6, [shared]), entry(7, [shared])],
      NO_COLORS,
    )
    expect(output.match(/shared card body/g)).toHaveLength(1)
    expect(output).toContain("card: shared-card — shown above")
    expect(output).toContain("···")
  })

  test("wraps a long body at the output width", () => {
    const long = entry(1, [])
    long.body = Array.from({ length: 30 }, () => "word").join(" ")
    const output = renderExplain([long], NO_COLORS)
    for (const line of output.split("\n")) {
      expect(line.length).toBeLessThanOrEqual(72)
    }
  })
})

describe("colors", () => {
  test("ANSI palette wraps in SGR codes; NO_COLORS is identity", () => {
    expect(ANSI_COLORS.strong("x")).toBe("\u001b[1mx\u001b[22m")
    expect(ANSI_COLORS.dim("x")).toBe("\u001b[2mx\u001b[22m")
    expect(ANSI_COLORS.accent("x")).toBe("\u001b[36mx\u001b[39m")
    expect(NO_COLORS.strong("x")).toBe("x")
    expect(NO_COLORS.dim("x")).toBe("x")
    expect(NO_COLORS.accent("x")).toBe("x")
  })
})

describe("help screens", () => {
  test("main help: commands, checks, options, exit codes, the no-autofix line", () => {
    expect(HELP).toContain("deblob check [what...]")
    expect(HELP).toContain("deblob explain <topic...>")
    expect(HELP).toContain("-c, --config <path>")
    expect(HELP).toContain("--no-color")
    expect(HELP).toContain(
      "0  clean    1  violations found    2  usage or config error",
    )
    expect(HELP).toContain("deblob detects; it never moves code.")
  })

  test("check help: batch flags and the teaching primer", () => {
    expect(CHECK_HELP).toContain("--explain")
    expect(CHECK_HELP).toContain("--explain-only")
    expect(CHECK_HELP).toContain("one shared import graph")
  })

  test("both help screens carry dag — the fiction's full check list", () => {
    expect(HELP).toContain("dag        service dependencies form a DAG")
    expect(CHECK_HELP).toContain("deblob check dag layers")
  })
})
