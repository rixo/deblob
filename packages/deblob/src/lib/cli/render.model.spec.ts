import { describe, expect, it, test } from "vitest"

import { groupByFix } from "../check/grouping.model.ts"
import type { RuleId } from "../check/rule.model.ts"
import type {
  AssemblyViolation,
  BarrelsViolation,
  DriverViolation,
  DagViolation,
  LayersViolation,
  ModulesViolation,
  PortsViolation,
  PrivateViolation,
  Violation,
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
  renderBroken,
  renderUnresolved,
  renderUnverified,
  serviceCountOf,
  sizeStatsOf,
  SURFACE_NOT_CLAIMED,
} from "./render.model.ts"
import type { Colors, GraphStats } from "./render.model.ts"

/** Violations rendered as the CLI does: grouped by fix first. */
const renderViolations = (
  violations: readonly Violation[],
  stats: GraphStats,
  colors: Colors,
  pathPrefix?: string,
): string =>
  renderCheckResults(groupByFix(violations), stats, colors, pathPrefix)

/** Where a statement-level violation's subject sits — a line's span. */
const SUBJECT = { start: 100, end: 110, line: 7, column: 0 } as const

const layersViolation = (
  overrides: Partial<LayersViolation> = {},
): LayersViolation => ({
  check: "layers",
  ruleset: "arch",
  rules: ["service-purity"],
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
  rules: ["private-sealed"],
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
  rules: ["layer-in-path"],
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
    rules: ["ports-types-only"],
    file: "src/invoice/ports/renderer.ts",
    serviceRoot: "src/invoice",
    shape: "runtime-export",
    form: "const",
    name: "SOME_MADE_UP_CONST",
    exported: true,
    ...overrides,
  }) as PortsViolation

type RootBinding = Extract<ModulesViolation, { shape: "root-binding" }>

/** `Omit` over each member of a union, its discriminant kept. */
type DistributiveOmit<T, K extends PropertyKey> = T extends unknown
  ? Omit<T, K>
  : never

type RootCall = Extract<ModulesViolation, { shape: "root-call" }>

const rootBinding = (
  fields: Partial<Pick<RootBinding, "line" | "holds" | "by" | "unknown">>,
  file = "src/billing/refund.model.ts",
): RootBinding => ({
  check: "modules",
  ruleset: "arch",
  rules: ["stable-root"],
  file,
  serviceRoot: "src/billing",
  line: 7,
  via: [],
  subject: SUBJECT,
  cause: null,
  shape: "root-binding",
  holds: "state",
  by: null,
  unknown: null,
  ...fields,
})

const STATS: GraphStats = {
  files: 214,
  totalBytes: 218 * 1024,
  blobPercent: 25,
  services: 12,
  imports: 380,
  surface: null,
}

describe("renderCheckResults", () => {
  it("counts the unknowns apart in the summary: a red the reader could not prove is still a violation, and says so", () => {
    const output = renderViolations(
      [
        rootBinding({ line: 1, by: { form: "let", name: null } }),
        rootBinding({ line: 2, unknown: { kind: "type-name", name: "Table" } }),
      ],
      STATS,
      NO_COLORS,
    )
    expect(output).toContain(
      "2 violations (2 modules) · 1 unknown · 214 files · 218kb · 25% blob",
    )
  })

  it("lays a group out as its lead with its riders under it, and counts it once", () => {
    const lead: RootCall = {
      check: "modules",
      ruleset: "arch",
      rules: ["stable-root"],
      file: "src/status/adapters/fetch-status.adapter.ts",
      serviceRoot: "src/status",
      line: 3,
      via: [],
      subject: SUBJECT,
      cause: null,
      shape: "root-call",
      reaches: "tech",
      name: null,
      unknown: null,
    }
    const rider = rootBinding(
      { line: 3, unknown: { kind: "type-name", name: "Response" } },
      lead.file,
    )
    expect(
      renderCheckResults([{ lead, riders: [rider] }], STATS, NO_COLORS),
    ).toBe(
      [
        "src/status",
        "  src/status/adapters/fetch-status.adapter.ts",
        "    modules  line 3 runs on import — a call into the host, presumed to",
        "             act; move it inside a factory or a function (stable-root)",
        "             + line 3 may bind state at module root — unknown: the",
        "               reader does not follow the type name Response yet; write",
        "               the type out in place, or move it inside a factory",
        "               (stable-root)",
        "",
        // one fix, one count; the lead is proven, so no unknown is counted
        "1 violation (1 modules) · 214 files · 218kb · 25% blob",
        "12 services · 380 imports",
        "why: deblob explain stable-root · or rerun with --explain",
        "",
      ].join("\n"),
    )
  })

  it("renders the fiction's grouped listing: service → file → tagged lines", () => {
    const output = renderViolations(
      [layersViolation(), privateViolation()],
      STATS,
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "src/billing",
        "  src/billing/stripe.adapter.ts",
        "    private  imports src/invoice/private/totals.ts — private/ is sealed",
        "             outside its service (private-sealed)",
        "",
        "src/invoice",
        "  src/invoice/pdf-render.service.ts",
        "    layers   imports node:fs — service layer cannot depend on concrete",
        "             (service-purity)",
        "",
        "2 violations (1 layers, 1 private) · 214 files · 218kb · 25% blob",
        "12 services · 380 imports",
        "why: deblob explain service-purity private-sealed · or rerun with --explain",
        "",
      ].join("\n"),
    )
  })

  test("a multi-rule citation never splits across wrapped lines", () => {
    // slide the citation over the wrap boundary — the list stays whole on one
    // line, never "(service-assembly-only," orphaned from "runtime-import)"
    for (let pad = 0; pad <= 60; pad += 1) {
      const target = {
        type: "module",
        path: `src/invoice/${"x".repeat(pad)}.model.ts`,
      } as const
      const output = renderViolations(
        [
          layersViolation({ rules: ["blob-quarantine"], target }),
          layersViolation({
            rules: ["service-assembly-only", "runtime-import"],
            target,
          }),
        ],
        STATS,
        NO_COLORS,
      )
      const lines = output.split("\n")
      expect(
        lines.some((line) =>
          line.endsWith("(service-assembly-only, runtime-import)"),
        ),
        output,
      ).toBe(true)
      expect(lines.some((line) => line.endsWith("(blob-quarantine)"))).toBe(
        true,
      )
    }
  })

  test("the footer orders rules as the summary does, not alphabetically", () => {
    const output = renderViolations(
      [
        privateViolation(),
        layersViolation({ rules: ["service-purity", "runtime-import"] }),
        barrelsViolation(),
      ],
      STATS,
      NO_COLORS,
    )
    expect(output).toContain(
      "why: deblob explain layer-in-path service-purity runtime-import private-sealed · or rerun with --explain",
    )
  })

  test("pathPrefix lands on every module path, never on package specifiers", () => {
    const output = renderViolations(
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
    expect(renderViolations([], STATS, NO_COLORS)).toBe(
      "0 violations · 214 files · 218kb · 25% blob\n12 services · 380 imports\n",
    )
  })

  test("coverage line: the exports segment exists iff a claim was checked, disclosed only when nonzero", () => {
    const claimed = { ...STATS, surface: { checked: 7, disclosed: 2 } }
    expect(renderViolations([], claimed, NO_COLORS)).toContain(
      "\n12 services · 380 imports · exports 7 checked, 2 disclosed\n",
    )
    const undisclosed = { ...STATS, surface: { checked: 1, disclosed: 0 } }
    expect(renderViolations([], undisclosed, NO_COLORS)).toContain(
      "\n12 services · 380 imports · exports 1 checked\n",
    )
    // singulars
    expect(
      renderViolations(
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
    const output = renderViolations([layersViolation()], STATS, NO_COLORS)
    expect(output).toContain("1 violation (1 layers)")
    expect(output).not.toContain("1 violations")
  })

  it("groups deterministically: services ascending, blob bucket last, files ascending", () => {
    const output = renderViolations(
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
    const output = renderViolations(
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
      const output = renderViolations(input, STATS, NO_COLORS)
      expect(output.indexOf("AAA_FAKE")).toBeLessThan(
        output.indexOf("ZZZ_FAKE"),
      )
    }
  })

  describe("messages", () => {
    // collapse the hanging-indent wrap so substrings assert on whole phrases
    const message = (violation: Violation, prefix = "") =>
      renderViolations([violation], STATS, NO_COLORS, prefix).replace(
        /\n {13}/g,
        " ",
      )

    test("seal violations carry the import-type hint when runtime-import is cited", () => {
      const output = message(
        layersViolation({
          rules: ["service-assembly-only", "runtime-import"],
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
      expect(output).toContain("only import type is allowed")
      expect(output).toContain("(service-assembly-only, runtime-import)")
    })

    test("seal violations without the exemption carry no hint", () => {
      const output = message(
        layersViolation({
          rules: ["adapter-assembly-only"],
          target: { type: "module", path: "src/billing/stripe.adapter.ts" },
          targetClass: "adapters",
        }),
      )
      expect(output).toContain(".adapter.ts is assembly-only")
      expect(output).not.toContain("only import type is allowed")
      expect(output).toContain("(adapter-assembly-only)")
    })

    test("blob target cites the extraction remedy", () => {
      const output = message(
        layersViolation({
          rules: ["blob-quarantine"],
          target: { type: "module", path: "src/lib/helpers.ts" },
          targetClass: "blob",
        }),
      )
      expect(output).toContain("only assembly may import blob")
    })

    test("model purity wording differs from the service one", () => {
      const output = message(
        layersViolation({
          rules: ["inward-deps", "service-purity"],
          file: "src/invoice/model/totals.model.ts",
          importerLayer: "model",
        }),
      )
      expect(output).toContain("model must stay pure")
    })

    test("a matrix cell outside the named wordings falls back to the generic form", () => {
      const output = message(
        layersViolation({
          rules: ["inward-deps"],
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
          rules: ["inward-deps"],
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
          rules: ["inward-deps"],
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
          rules: ["service-purity"],
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

    it("marks a declared external leaf so the cell reads as declared, not a resolver accident", () => {
      const output = message(
        layersViolation({
          rules: ["service-purity", "runtime-import"],
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

    it("renders the surface claim-mismatch with subpath, claim, and fact", () => {
      const output = message({
        check: "surface",
        ruleset: "arch",
        rules: ["chain-purity"],
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
      expect(output).toContain("(chain-purity)")
    })

    it("names the built target a source wears when reached through the mirror", () => {
      const output = message(
        {
          check: "surface",
          ruleset: "arch",
          rules: ["layer-in-path"],
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

    it("renders the unlabeled front — direct, and through a fronted file", () => {
      const direct = message({
        check: "surface",
        ruleset: "arch",
        rules: ["layer-in-path"],
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
        rules: ["layer-in-path"],
        file: "src/index.ts",
        serviceRoot: "src",
        subpath: ".",
        exported: "src/index.ts",
        shape: "unlabeled-front",
        fronts: "src/checkout.service.ts",
        frontLayer: "service",
      })
      expect(chained).toContain("fronting service (src/checkout.service.ts)")
      expect(chained).toContain("(layer-in-path)")
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

    test("a statement at module root names its line and the remedy", () => {
      const output = message({
        check: "modules",
        ruleset: "arch",
        rules: ["stable-root"],
        file: "src/billing/refund.model.ts",
        serviceRoot: "src/billing",
        line: 7,
        via: [],
        subject: SUBJECT,
        cause: null,
        shape: "root-statement",
        unknown: null,
      })
      expect(output).toContain(
        "line 7 runs on import — a module's evaluation performs no side effect; move it inside a factory or a function",
      )
      expect(output).toContain("(stable-root)")
    })

    test("a red triggered from elsewhere names every trigger as a full path:line, in its own file or another", () => {
      const output = message({
        check: "modules",
        ruleset: "arch",
        rules: ["stable-root"],
        file: "src/billing/refund.model.ts",
        serviceRoot: "src/billing",
        line: 7,
        via: [
          { file: "src/billing/refund.model.ts", line: 12 },
          { file: "src/billing/ledger.model.ts", line: 3 },
        ],
        subject: SUBJECT,
        cause: null,
        shape: "root-statement",
        unknown: null,
      })
      expect(output).toContain(
        "line 7 runs on import, reached from src/billing/refund.model.ts:12, src/billing/ledger.model.ts:3 — a module's evaluation",
      )
    })

    describe("a root binding", () => {
      const binding = (
        fields: Parameters<typeof rootBinding>[0],
        file?: string,
      ) => message(rootBinding(fields, file))

      test("a proven red names what proves it, then the ways out", () => {
        expect(binding({ by: { form: "let", name: null } })).toContain(
          "line 7 binds mutable state at module root — a let can be reassigned; use as const, a readonly type, or move it inside a factory",
        )
        expect(
          binding({ by: { form: "ObjectExpression", name: null } }),
        ).toContain("— a record literal without as const;")
        expect(
          binding({ by: { form: "NewExpression", name: "Map" } }),
        ).toContain("— a new Map, which keeps its mutators;")
        expect(
          binding({ by: { form: "TSTypeReference", name: "Record" } }),
        ).toContain("— a Record without Readonly;")
        expect(
          binding({ by: { form: "Identifier", name: "CACHE" } }),
        ).toContain("— the same object as CACHE, which is mutable;")
        expect(
          binding({ by: { form: "TSPropertySignature", name: null } }),
        ).toContain("— a member without readonly;")
      })

      test("in a JavaScript file, the ways out are JavaScript's: no readonly type to write, and the setting named", () => {
        const output = binding(
          { by: { form: "ObjectExpression", name: null } },
          "src/billing/refund.model.js",
        )
        expect(output).toContain(
          "— a record literal, not frozen; use Object.freeze, move it inside a factory, or set mutableModuleState: true",
        )
        expect(output).not.toContain("readonly type")
      })

      test("an unknown names what the reader could not see, then the ways out", () => {
        expect(
          binding({ unknown: { kind: "type-name", name: "Table" } }),
        ).toContain(
          "line 7 may bind state at module root — unknown: the reader does not follow the type name Table yet; write the type out in place, or move it inside a factory",
        )
        expect(
          binding({ unknown: { kind: "type-form", form: "TSTypeQuery" } }),
        ).toContain("— unknown: the reader does not read typeof yet;")
        expect(
          binding({ unknown: { kind: "type-form", form: "TSAnyKeyword" } }),
        ).toContain("— unknown: any declares nothing a reader could prove;")
        expect(
          binding({
            unknown: {
              kind: "call-result",
              callee: "createTable",
              construct: false,
            },
          }),
        ).toContain(
          "— unknown: what createTable() returns is not known; annotate it with a readonly type, or move it inside a factory",
        )
        expect(
          binding({
            unknown: { kind: "call-result", callee: "Spot", construct: true },
          }),
        ).toContain("— unknown: what new Spot builds is not known;")
        expect(
          binding({
            unknown: { kind: "value", form: "Identifier", name: "RESULT" },
          }),
        ).toContain(
          "— unknown: the reader does not follow RESULT to its value;",
        )
        expect(
          binding({
            unknown: { kind: "value", form: "MemberExpression", name: null },
          }),
        ).toContain("— unknown: the reader does not follow a member read;")
      })

      test("an unknown in a JavaScript file names the setting as a way out", () => {
        expect(
          binding(
            {
              unknown: {
                kind: "call-result",
                callee: "createTable",
                construct: false,
              },
            },
            "src/billing/refund.model.js",
          ),
        ).toContain(
          "— unknown: what createTable() returns is not known; move it inside a factory, or set mutableModuleState: true",
        )
      })

      test.each([
        ["var", null, "ts", "a var can be reassigned"],
        [
          "static",
          "count",
          "ts",
          "static count without readonly can be reassigned",
        ],
        ["static", "count", "js", "static count can be reassigned"],
        [
          "static",
          null,
          "ts",
          "a static field without readonly can be reassigned",
        ],
        ["ArrayExpression", null, "ts", "an array literal without as const"],
        ["ArrayExpression", null, "js", "an array literal, not frozen"],
        ["TSTypeReference", "Map", "ts", "a Map, which keeps its mutators"],
        ["TSArrayType", null, "ts", "an array type without readonly"],
        ["TSTupleType", null, "ts", "a tuple type without readonly"],
        ["TSMethodSignature", null, "ts", "a method, which can be reassigned"],
        [
          "TSIndexSignature",
          null,
          "ts",
          "an index signature without readonly, which takes new entries",
        ],
        // tripwire: a form no case lists still names itself
        ["SomeMadeUpForm", null, "ts", "SomeMadeUpForm"],
      ] as const)(
        "a proven red by %s (%s, %s) says: %s",
        (form, name, language, words) => {
          expect(
            binding(
              { by: { form, name } },
              `src/billing/refund.model.${language}`,
            ),
          ).toContain(`— ${words};`)
        },
      )

      test.each([
        ["keyof", "keyof"],
        ["unique", "unique symbol"],
        ["TSMappedType", "a mapped type"],
        ["TSConditionalType", "a conditional type"],
        ["TSIndexedAccessType", "an indexed access type"],
        ["TSImportType", "an import() type"],
        ["TSMethodSignature", "a method signature"],
        ["TSIndexSignature", "an index signature"],
        ["TSUnknownKeyword", "unknown"],
        ["TSObjectKeyword", "object"],
        // tripwire: a form no case lists still names itself
        ["SomeMadeUpType", "SomeMadeUpType"],
      ])("an unread type form %s is named %s", (form, words) => {
        expect(binding({ unknown: { kind: "type-form", form } })).toContain(
          `— unknown: the reader does not read ${words} yet;`,
        )
      })

      test("a member of no type is any: it declares nothing", () => {
        expect(
          binding({
            unknown: { kind: "type-form", form: "TSPropertySignature" },
          }),
        ).toContain(
          "— unknown: a member without a type is any, which declares nothing a reader could prove;",
        )
      })

      test.each([
        ["AwaitExpression", "an awaited value"],
        ["SpreadElement", "a spread"],
        ["ObjectPattern", "a destructured part"],
        ["ArrayPattern", "a destructured part"],
        // tripwire: a form no case lists still names itself
        ["SomeMadeUpExpression", "SomeMadeUpExpression"],
      ])("an unfollowed value %s is named %s", (form, words) => {
        expect(
          binding({ unknown: { kind: "value", form, name: null } }),
        ).toContain(`— unknown: the reader does not follow ${words};`)
      })

      test("a call whose callee is not a name is a call's result", () => {
        expect(
          binding({
            unknown: { kind: "call-result", callee: null, construct: false },
          }),
        ).toContain("— unknown: a call's result is not known;")
      })

      test("a read of the machine names what it captured", () => {
        expect(binding({ holds: "machine" })).toContain(
          "line 7 stores a read of the machine at load time — no type proves what it held; read it inside a factory or a function",
        )
      })
    })

    test("a root statement the reader does not recognise is an unknown, named", () => {
      expect(
        message({
          check: "modules",
          ruleset: "arch",
          rules: ["stable-root"],
          file: "src/billing/refund.model.ts",
          serviceRoot: "src/billing",
          line: 7,
          via: [],
          subject: SUBJECT,
          cause: null,
          shape: "root-statement",
          unknown: { kind: "statement", form: "DebuggerStatement" },
        }),
      ).toContain(
        "line 7 may run on import — unknown: the reader does not recognise this statement (DebuggerStatement); move it inside a function",
      )
    })

    describe("a root call", () => {
      const call = (
        fields: Partial<Pick<RootCall, "reaches" | "name" | "unknown" | "via">>,
      ): RootCall => ({
        check: "modules",
        ruleset: "arch",
        rules: ["stable-root"],
        file: "src/billing/adapters/refund.adapter.ts",
        serviceRoot: "src/billing",
        line: 7,
        via: [],
        subject: SUBJECT,
        cause: null,
        shape: "root-call",
        reaches: "tech",
        name: null,
        unknown: null,
        ...fields,
      })

      test.each([
        ["tech", null, "a call into the host"],
        ["tech", "node:fs", "a call into node:fs, the tech"],
        ["use-case", "app.run", "a call to the use case app.run"],
        [
          "function",
          "nameOf",
          "a call into nameOf, a function of a file that may touch the tech",
        ],
        [
          "wiring",
          "main",
          "the wiring function main runs, and sets up its tech",
        ],
        [
          "unclaimed",
          "left-pad",
          "a call into left-pad, a package nothing claims",
        ],
      ] as const)(
        "a call reaching %s (%s) says: %s",
        (reaches, name, words) => {
          expect(message(call({ reaches, name }))).toContain(
            `line 7 runs on import — ${words}, presumed to act; move it inside a factory or a function`,
          )
        },
      )

      it("names the root call that runs it from elsewhere, and the unknown in words", () => {
        expect(
          message(
            call({
              via: [
                { file: "src/billing/adapters/refund.adapter.ts", line: 12 },
              ],
            }),
          ),
        ).toContain(
          "line 7 runs on import, reached from src/billing/adapters/refund.adapter.ts:12 — a call into the host",
        )
        expect(
          message(call({ reaches: null, unknown: { kind: "callee" } })),
        ).toContain(
          "line 7 may run on import — unknown: the reader cannot tell what this call reaches; move it inside a factory or a function",
        )
      })
    })

    describe("an assembly violation", () => {
      type Shape = DistributiveOmit<
        AssemblyViolation,
        | "check"
        | "ruleset"
        | "rules"
        | "file"
        | "serviceRoot"
        | "line"
        | "unknown"
        | "subject"
        | "cause"
      >
      const assembly = (
        shape: Shape,
        unknown: AssemblyViolation["unknown"] = null,
      ): AssemblyViolation => ({
        check: "assembly",
        ruleset: "arch",
        rules: ["assembly-builds-only"],
        file: "src/notes.assembly.ts",
        serviceRoot: null,
        line: 7,
        unknown,
        subject: SUBJECT,
        cause: null,
        ...shape,
      })
      const FS_STORE = {
        kind: "factory",
        layer: "adapters",
        path: "src/notes/adapters/fs-store.adapter.ts",
        name: "createFsStore",
      } as const

      test.each([
        [
          { kind: "tech", package: "node:fs" },
          "calls node:fs, the tech — an assembly only builds; hand the tech value to the adapter that uses it",
        ],
        [
          { kind: "tech", package: null },
          "calls the host, the tech — an assembly only builds; hand the tech value to the adapter that uses it",
        ],
        [
          { kind: "use-case", member: "load", origin: null },
          "runs the use case load — an assembly only builds; run it in a hook, or declare it in configLoads if the graph depends on it",
        ],
        [
          { kind: "local", name: "rootOf", factory: false },
          "calls rootOf, which builds nothing — every call in an assembly builds; a model function passed on, or inline",
        ],
        [
          { kind: "wiring", path: "src/cli.driver.ts", name: "main" },
          "runs the wiring function main — a driver's, never an assembly's; the driver calls the assembly",
        ],
        [
          { kind: "unclaimed", package: "left-pad" },
          'calls left-pad, a package nothing claims — an assembly only builds; an adapter wraps it, or list it under config key "pure"',
        ],
        [
          { kind: "language" },
          "calls the language, which builds nothing — computing is not building; a model function passed on, or the adapter derives it",
        ],
      ] as const)("a call into %o says: %s", (callee, words) => {
        expect(message(assembly({ shape: "call", callee }))).toContain(
          `line 7 ${words} (assembly-builds-only)`,
        )
      })

      it("says what the reader could not see in a call, and the ways out", () => {
        expect(
          message(
            assembly(
              { shape: "call", callee: { kind: "unknown" } },
              {
                kind: "callee",
              },
            ),
          ),
        ).toContain(
          "line 7 may not build — unknown: the reader cannot tell what this call reaches; a factory call, or type what it is called on",
        )
      })

      it("names the argument, what it is, and where it goes", () => {
        expect(
          message(
            assembly({
              shape: "argument",
              callee: FS_STORE,
              key: null,
              value: "computed",
            }),
          ),
        ).toContain(
          "line 7 hands createFsStore a computed value as an argument — arguments are literals, tech values received, or instances; a model function passed on, or the adapter derives it",
        )
        expect(
          message(
            assembly({
              shape: "argument",
              callee: FS_STORE,
              key: "index",
              value: "function",
            }),
          ),
        ).toContain(
          "line 7 hands createFsStore a function as the entry index — an assembly defines nothing; the driver registers it, or the adapter owns it",
        )
        expect(
          message(
            assembly({
              shape: "argument",
              callee: FS_STORE,
              key: null,
              value: "tech",
            }),
          ),
        ).toContain(
          "line 7 hands createFsStore the host as an argument, read here — tech values arrive as parameters; the driver hands it in",
        )
        expect(
          message(
            assembly(
              {
                shape: "argument",
                callee: { kind: "unknown" },
                key: null,
                value: "unknown",
              },
              { kind: "call-result", callee: null, construct: false },
            ),
          ),
        ).toContain(
          "line 7 may hand a call the reader cannot place what the reader cannot tell — unknown: a call's result is not known; pass a literal, a tech value received, or an instance",
        )
      })

      test.each([
        [{ kind: "use-case", member: "list", origin: null }, "list"],
        [{ kind: "unclaimed", package: "left-pad" }, "left-pad"],
        [
          {
            kind: "forbidden-import",
            layer: "ports",
            path: "src/notes/ports/store.ts",
          },
          "src/notes/ports/store.ts",
        ],
        [{ kind: "language" }, "the language"],
      ] as const)(
        "names what an argument is handed to: %o is %s",
        (callee, name) => {
          expect(
            message(
              assembly({
                shape: "argument",
                callee,
                key: null,
                value: "computed",
              }),
            ),
          ).toContain(`line 7 hands ${name} a computed value`)
        },
      )

      test.each([
        ["member", "reads a field of"],
        ["computed", "computes with"],
        ["reassigned", "reassigns"],
        ["assigned", "writes into a member"],
      ] as const)(
        "a result used as %s says it %s what was built",
        (use, verb) => {
          expect(
            message(assembly({ shape: "result-use", use, callee: FS_STORE })),
          ).toContain(
            `line 7 ${verb} what createFsStore built — what the assembly builds is passed on or returned; pass it whole, its consumer reads the field`,
          )
        },
      )

      it("sends a field of another assembly's record down, never sideways", () => {
        expect(
          message(
            assembly({
              shape: "result-use",
              use: "member",
              callee: {
                kind: "factory",
                layer: "assembly",
                path: "src/shared.assembly.ts",
                name: "createSharedAssembly",
              },
            }),
          ),
        ).toContain(
          "line 7 reads a field of what createSharedAssembly built — shared instances flow down, never sideways; the parent builds it and passes it down to both",
        )
      })

      test.each([
        [
          { shape: "branch", testOrigin: "instance" },
          "branches on an instance — a decision the map cannot show; it moves into the service or adapter that owns it",
        ],
        [
          { shape: "branch", testOrigin: "other" },
          "branches on a computed value — a branch is wiring on a parameter or a loaded value; the decision moves into the service or adapter that owns it",
        ],
        [
          { shape: "definition", name: "LIMIT", at: "root" },
          "defines LIMIT at the assembly's root — nothing sits there but imports; the literal in place, or a model export",
        ],
        [
          { shape: "definition", name: null, at: "root" },
          "defines a value at the assembly's root — nothing sits there but imports; the literal in place, or a model export",
        ],
        [
          { shape: "definition", name: "rootOf", at: "function" },
          "defines rootOf, which builds nothing — nothing but assembly functions is defined; a model function, or inline",
        ],
        [
          { shape: "root-statement" },
          "runs at the assembly's root — nothing sits there but imports; move it inside the assembly function",
        ],
        [
          {
            shape: "adapter-returned",
            key: "fs",
            origin: {
              path: "src/notes/adapters/fs-store.adapter.ts",
              name: "createFsStore",
              layer: "adapters",
            },
          },
          "returns the adapter fs to a caller that is not a test — an assembly returns services; return services only, a test factory returns the adapters",
        ],
      ] as const)("%o says: %s", (shape, words) => {
        expect(message(assembly(shape))).toContain(`line 7 ${words}`)
      })
    })

    describe("a driver violation", () => {
      type Shape = DistributiveOmit<
        DriverViolation,
        | "check"
        | "ruleset"
        | "rules"
        | "file"
        | "serviceRoot"
        | "line"
        | "unknown"
        | "subject"
        | "cause"
      >
      const driver = (
        rule: RuleId,
        shape: Shape,
        unknown: DriverViolation["unknown"] = null,
      ): DriverViolation => ({
        check: "driver",
        ruleset: "arch",
        rules: [rule],
        file: "src/cli.driver.ts",
        serviceRoot: null,
        line: 7,
        unknown,
        subject: SUBJECT,
        cause: null,
        ...shape,
      })
      const CHECK = {
        kind: "use-case",
        member: "cli.check",
        origin: null,
      } as const
      const REGISTER = {
        kind: "wiring",
        path: "src/cli/check.driver.ts",
        name: "registerCheckCommands",
      } as const
      const CALLS_SERVICES =
        "a driver calls services, the assembly, sub-driver wiring and its own tech, nothing else"

      test.each([
        [
          "wiring-outside-hooks",
          { shape: "call", callee: CHECK, where: "wiring" },
          "runs the use case cli.check outside any hook — outside its hooks, a driver only wires; the call moves into a hook",
        ],
        [
          "sub-driver-wiring",
          { shape: "call", callee: REGISTER, where: "hook" },
          "runs the sub-driver's wiring registerCheckCommands in a hook — one hook would chain two calls; call it in the wiring",
        ],
        [
          "hook-one-call",
          {
            shape: "call",
            callee: { kind: "tech", package: null },
            where: "hook",
          },
          "calls the host beside the use case — a hook connects a trigger to one use case; the use case does it through its port",
        ],
        [
          "driver-calls-services",
          {
            shape: "call",
            callee: {
              kind: "model",
              path: "src/opts.model.ts",
              name: "parseOpts",
            },
            where: "hook",
          },
          `calls parseOpts, a model — ${CALLS_SERVICES}; parsing and rendering are use cases of a service`,
        ],
        [
          "driver-calls-services",
          {
            shape: "call",
            callee: {
              kind: "factory",
              layer: "adapters",
              path: "src/fs.adapter.ts",
              name: "createFsStore",
            },
            where: "hook",
          },
          `calls createFsStore, a factory of adapters — ${CALLS_SERVICES}; the assembly builds it, a service calls it`,
        ],
        [
          "driver-calls-services",
          {
            shape: "call",
            callee: { kind: "local", name: "parseFoo", factory: false },
            where: "hook",
          },
          `calls parseFoo, a function of the driver — ${CALLS_SERVICES}; a model function, called by a service`,
        ],
        [
          "driver-calls-services",
          {
            shape: "call",
            callee: { kind: "unclaimed", package: "picocolors" },
            where: "wiring",
          },
          `calls picocolors, a package nothing claims — ${CALLS_SERVICES}; declare it in driverTech, or it is a service's concern`,
        ],
        [
          "driver-calls-services",
          { shape: "call", callee: { kind: "language" }, where: "hook" },
          `calls the language — ${CALLS_SERVICES}; a use case of the service does it`,
        ],
        [
          "sub-driver-wiring",
          {
            shape: "argument",
            callee: REGISTER,
            value: "computed",
            where: "wiring",
          },
          "hands the sub-driver's wiring registerCheckCommands a use case's result — never data from the hexagon; pass the instance, its hook calls the use case",
        ],
        [
          "hook-one-call",
          {
            shape: "argument",
            callee: CHECK,
            value: "computed",
            where: "hook",
          },
          "hands the use case cli.check a computed value — a hook translates nothing on the way in; pass the tech values unchanged, the service derives the rest",
        ],
        [
          "wiring-outside-hooks",
          {
            shape: "argument",
            callee: { kind: "tech", package: "cac" },
            value: "function",
            where: "wiring",
          },
          "hands cac a function — wiring hands on tech values, instances and literals; the assembly takes the raw value, its adapter derives it",
        ],
        [
          "hook-one-call",
          { shape: "call-count", count: 0 },
          "registers a hook that runs no use case — a hook with no use case is logic with no home; a use case of the service",
        ],
        [
          "hook-one-call",
          { shape: "call-count", count: 2 },
          "registers a hook that runs 2 use cases — the sequence between them is a use case nobody owns; a facade use case, the calls its subfunctions",
        ],
        [
          "wiring-outside-hooks",
          { shape: "branch", where: "wiring", conditional: false },
          "branches in the wiring — outside its hooks, a driver only wires; the decision is a service's",
        ],
        [
          "hook-one-call",
          { shape: "branch", where: "hook", conditional: true },
          "calls its use case conditionally — the call is unconditional; the service decides",
        ],
        [
          "hook-one-call",
          { shape: "branch", where: "hook", conditional: false },
          "branches in a hook — a hook translates nothing around its call; the service decides",
        ],
        [
          "hook-one-call",
          { shape: "result", use: "computed" },
          "uses a use case's result past handing it on — a hook returns it, or hands it whole to the tech; the use case returns what the tech needs",
        ],
        [
          "wiring-outside-hooks",
          { shape: "statement", where: "wiring" },
          "writes in the wiring — outside its hooks, a driver only wires; the write is a service's",
        ],
        [
          "hook-one-call",
          { shape: "statement", where: "hook" },
          "writes in a hook — a hook translates nothing around its call; the use case returns what the tech needs",
        ],
        [
          "driver-hooks-only",
          { shape: "definition", name: "NAME", at: "root" },
          "defines NAME beside the hooks and the wiring function — a driver defines its hooks and one wiring function; the literal in place, or a model export",
        ],
        [
          "driver-hooks-only",
          { shape: "definition", name: null, at: "root" },
          "defines a value beside the hooks and the wiring function — a driver defines its hooks and one wiring function; the literal in place, or a model export",
        ],
        [
          "driver-hooks-only",
          { shape: "definition", name: "parseFoo", at: "function" },
          "defines parseFoo, a function beside the wiring function — a driver defines its hooks and one wiring function; a model function called by a service, or a sub-driver's wiring",
        ],
        [
          "driver-hooks-only",
          { shape: "definition", name: "handlers", at: "local" },
          "holds functions in handlers — a table of lambdas is a service without a contract; each hook handed to the tech in place",
        ],
        [
          "driver-hooks-only",
          { shape: "parameter", name: "main" },
          "main takes a parameter — a root driver's wiring function takes nothing and reads its tech itself; read it inside",
        ],
        [
          "driver-hooks-only",
          { shape: "parameter", name: null },
          "the wiring function takes a parameter — a root driver's wiring function takes nothing and reads its tech itself; read it inside",
        ],
      ] as const)("%s, %o says: %s", (rule, shape, words) => {
        expect(message(driver(rule, shape as Shape))).toContain(
          `line 7 ${words}`,
        )
      })

      it("says what the reader could not see, in a call and in an argument", () => {
        expect(
          message(
            driver(
              "driver-calls-services",
              { shape: "call", callee: { kind: "unknown" }, where: "wiring" },
              { kind: "callee" },
            ),
          ),
        ).toContain(
          "line 7 may call what a driver may not — unknown: the reader cannot tell what this call reaches; call a service, the assembly or the tech",
        )
        expect(
          message(
            driver(
              "wiring-outside-hooks",
              {
                shape: "argument",
                callee: { kind: "tech", package: "cac" },
                value: "unknown",
                where: "wiring",
              },
              { kind: "value", form: "argument", name: null },
            ),
          ),
        ).toContain("line 7 hands cac what the reader cannot tell")
      })
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
            shape: "runtime-import-in-port",
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
        rules: ["no-service-cycle"],
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
        rules: ["no-runtime-cycle"],
        group: { kind: "blob" },
        members: ["src/lib/api/client.ts", "src/lib/utils/fetchers.ts"],
        shape: "module-cycle",
        files: ["src/lib/api/client.ts", "src/lib/utils/fetchers.ts"],
        ...overrides,
      }) as DagViolation

    it("renders the fiction's cross-service block with quoted carrying edges", () => {
      const output = renderViolations([serviceCycle()], STATS, NO_COLORS)
      expect(output).toBe(
        [
          "cross-service",
          "  dag      src/billing ⇄ src/orders",
          "           billing → orders (src/billing/refund.service.ts →",
          "           src/orders/model/order.ts)",
          "           orders → billing (src/orders/checkout.service.ts →",
          "           src/billing/ports/payment.ts)",
          "           services must form a DAG (no-service-cycle); see the sharing",
          "           progression",
          "",
          "1 violation (1 dag) · 214 files · 218kb · 25% blob",
          "12 services · 380 imports",
          "why: deblob explain no-service-cycle · or rerun with --explain",
          "",
        ].join("\n"),
      )
    })

    it("orders blocks in a bucket by rule (the summary's order), then membership", () => {
      const output = renderViolations(
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
      const reversed = renderViolations(
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

    test("same-rule blocks in a bucket order by membership, either input order", () => {
      const early = moduleCycle({
        members: ["src/lib/aaa.ts", "src/lib/bbb.ts"],
        files: ["src/lib/aaa.ts", "src/lib/bbb.ts"],
      } as Partial<DagViolation>)
      const late = moduleCycle({
        members: ["src/lib/yyy.ts", "src/lib/zzz.ts"],
        files: ["src/lib/yyy.ts", "src/lib/zzz.ts"],
      } as Partial<DagViolation>)
      const output = renderViolations([late, early], STATS, NO_COLORS)
      expect(output.indexOf("src/lib/aaa.ts ⇄")).toBeLessThan(
        output.indexOf("src/lib/yyy.ts ⇄"),
      )
      expect(renderViolations([early, late], STATS, NO_COLORS)).toBe(output)
    })

    it("renders the module cycle in the blob bucket, last", () => {
      const output = renderViolations(
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
        "runtime module cycle (no-runtime-cycle) — works in dev,",
      )
    })

    it("marks type-only and wiring hops, and extends the remedy for wiring", () => {
      const output = renderViolations(
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
      const output = renderViolations(
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

describe("provenanceOf", () => {
  test("names every file the run read, joined with +, or the defaults", () => {
    const flavor = "ts-suffixes-factories"
    expect(provenanceOf({ configPath: null, localPath: null }, flavor)).toBe(
      "no config (defaults)",
    )
    expect(
      provenanceOf({ configPath: "deblob.config.ts", localPath: null }, flavor),
    ).toBe("deblob.config.ts (flavor: ts-suffixes-factories)")
    expect(
      provenanceOf(
        { configPath: "deblob.config.ts", localPath: "deblob.local.ts" },
        flavor,
      ),
    ).toBe("deblob.config.ts + deblob.local.ts (flavor: ts-suffixes-factories)")
    // a lone overlay is a configless project that still read a file
    expect(
      provenanceOf({ configPath: null, localPath: "deblob.local.ts" }, flavor),
    ).toBe("deblob.local.ts (flavor: ts-suffixes-factories)")
  })
})

describe("bare status", () => {
  it("renders the fiction's block with the full check-list hint", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf(
          { configPath: "deblob.config.ts", localPath: null },
          "ts-suffixes-factories",
        ),
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
        "                              (dag · layers · private · barrels · ports · surface · modules · assembly · driver)",
        "  deblob explain <topic...>   explain rules or checks",
        "  deblob view                 open the viewer on this project",
        "  deblob --help               full help",
        "",
      ].join("\n"),
    )
  })

  test("singular service, configless provenance", () => {
    const output = renderBareStatus(
      {
        version: "0.0.1",
        provenance: provenanceOf(
          { configPath: null, localPath: null },
          "ts-suffixes-factories",
        ),
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
        provenance: provenanceOf(
          { configPath: null, localPath: null },
          "ts-suffixes-factories",
        ),
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

  test("serviceCountOf counts distinct roots, blob (null) never counts", () => {
    expect(
      serviceCountOf(["src/FAKE_A", null, "src/FAKE_B", "src/FAKE_A", null]),
    ).toBe(2)
    expect(serviceCountOf([null, null])).toBe(0)
    expect(serviceCountOf([])).toBe(0)
  })
})

describe("renderBroken", () => {
  it("names each place deblob cannot read, the line when there is one, what it could not read, and declines to certify", () => {
    const output = renderBroken(
      [
        { file: "src/a.model.ts", line: null, reason: "Unexpected token" },
        {
          file: "src/b.model.ts",
          line: 3,
          reason: "ReadonlyMap without its type arguments",
        },
      ],
      NO_COLORS,
      "pkg/",
    )
    expect(output).toContain(
      "deblob cannot read 2 places — results cannot be certified",
    )
    expect(output).toContain("  pkg/src/a.model.ts\n    Unexpected token")
    expect(output).toContain(
      "  pkg/src/b.model.ts:3\n    ReadonlyMap without its type arguments",
    )
  })
})

describe("renderUnresolved", () => {
  it("names each import, cites the incompleteness, teaches the remedies", () => {
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

  it("prints importer paths under the runner's prefix, ctrl+clickable", () => {
    const output = renderUnresolved(
      [{ from: "src/a.model.ts", specifier: "x", reason: "r", literal: true }],
      NO_COLORS,
      "../",
    )
    expect(output).toContain("  ../src/a.model.ts")
  })
})

describe("renderUnverified", () => {
  it("names each entry with its subpath and reason, teaches the three remedies", () => {
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
  const entry = (rule: RuleId, cards: { slug: string; text: string }[]) => ({
    rule,
    title: "Some made-up rule title",
    body: "Body of the made-up rule, short enough to stay one line.",
    cards,
    verdicts: null,
    url: `https://github.com/rixo/deblob/blob/v9.9.9-made-up/docs/architecture.md#${rule}`,
  })

  it("prints how to read a rule's verdicts, when the rule has them, after its body, a blank line between paragraphs", () => {
    const output = renderExplain(
      [
        {
          ...entry("stable-root", []),
          verdicts: ["Proven: made-up.", "Unknown: made-up."],
        },
      ],
      NO_COLORS,
    )
    expect(output).toContain(
      "Body of the made-up rule, short enough to stay one line.\n\nreading a verdict\n\nProven: made-up.\n\nUnknown: made-up.\n",
    )
  })

  it("prints heading (slug — lowercased title), body, card, the url as given", () => {
    const output = renderExplain(
      [
        entry("service-purity", [
          { slug: "made-up-card", text: "# Card\n\ncard body\n" },
        ]),
      ],
      NO_COLORS,
    )
    expect(output).toBe(
      [
        "service-purity — some made-up rule title",
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
        "https://github.com/rixo/deblob/blob/v9.9.9-made-up/docs/architecture.md#service-purity",
        "",
      ].join("\n"),
    )
  })

  test("a card cited by several rules prints once, later citations point up", () => {
    const shared = { slug: "shared-card", text: "shared card body" }
    const output = renderExplain(
      [
        entry("service-assembly-only", [shared]),
        entry("adapter-assembly-only", [shared]),
      ],
      NO_COLORS,
    )
    expect(output.match(/shared card body/g)).toHaveLength(1)
    expect(output).toContain("card: shared-card — shown above")
    expect(output).toContain("···")
  })

  test("only a rule list rides the wrap whole — a paren list of other words wraps like prose", () => {
    // 54 + " (service-purity," fills the width exactly; the next token decides
    const lead = "x".repeat(54)
    const firstLineOf = (tail: string) =>
      renderExplain(
        [{ ...entry("inward-deps", []), body: `${lead} ${tail} end` }],
        NO_COLORS,
      ).split("\n")[2] as string
    expect(firstLineOf("(service-purity, runtime-import)")).toBe(lead)
    expect(firstLineOf("(service-purity, made-up)")).toBe(
      `${lead} (service-purity,`,
    )
    expect(firstLineOf("(service-purity, 42)")).toBe(`${lead} (service-purity,`)
  })

  it("wraps a long body at the output width", () => {
    const long = entry("inward-deps", [])
    long.body = Array.from({ length: 30 }, () => "word").join(" ")
    const output = renderExplain([long], NO_COLORS)
    // the URL is one token and never wraps — a pinned URL with a slug
    // anchor runs past the width by design
    for (const line of output.split("\n")) {
      if (line.startsWith("https://")) continue
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

  test("help screens cite rules by slug, never by number", () => {
    for (const screen of [HELP, CHECK_HELP]) {
      expect(screen).not.toMatch(/\brules? [0-9]/)
    }
    expect(HELP).toContain("(private-sealed)")
    expect(CHECK_HELP).toContain("(service-purity)")
  })
})
