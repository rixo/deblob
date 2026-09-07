import { describe, expect, it } from "vitest"

import { classifyStockEntry } from "../extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import type {
  EdgeTarget,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import type { PackageSurface } from "./surface.model.ts"
import { checkSurface } from "./surface.model.ts"

type NodeSpec = {
  layer: Layer
  serviceRoot?: string | null
}

type EdgeSpec = {
  from: string
  to: EdgeTarget
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
        runtimeContent: [],
      },
    ]),
  ),
  edges: edges.map(({ from, to, reExport }) => ({
    from,
    to,
    kind: "runtime",
    form: "static",
    reExport: reExport ?? false,
  })),
  unresolved: [],
})

const mod = (path: string): EdgeTarget => ({ type: "module", path })

const surface = (
  subpaths: Record<string, readonly string[]>,
  blob: readonly string[] = [],
): PackageSurface => ({
  subpaths: Object.entries(subpaths).map(([subpath, targets]) => ({
    subpath,
    targets,
  })),
  blob,
  assembly: [],
})

const options = {
  classifyEntry: classifyStockEntry,
  mirror: { dist: "src" },
  disclosed: () => false,
}

describe("checkSurface", () => {
  it("yields nothing for a null surface — no field, no claim, no check", () => {
    const g = graph({ "src/checkout.service.ts": { layer: "service" } })
    expect(checkSurface(g, null, options)).toEqual({
      violations: [],
      unverified: [],
    })
  })

  it("stays green when every claim matches its file", () => {
    const g = graph({
      "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      "src/totals.model.ts": { layer: "model", serviceRoot: "src" },
    })
    const s = surface({
      "./checkout.service": ["src/checkout.service.ts"],
      "./totals.model": ["src/totals.model.ts"],
    })
    expect(checkSurface(g, s, options).violations).toEqual([])
  })

  it("fires 3 when a claimed subpath fronts a file of another layer", () => {
    const g = graph({
      "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
    })
    const s = surface({ "./totals.model": ["src/stripe.adapter.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      {
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
      },
    ])
  })

  it("reads the graph's word for covered targets — a designated assembly entry contradicts a service claim", () => {
    const g = graph({
      "src/index.ts": { layer: "assembly", serviceRoot: "src" },
    })
    const s = surface({ "./checkout.service": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({
        rules: [3],
        shape: "claim-mismatch",
        claimed: "service",
        actual: "assembly",
      }),
    ])
  })

  it("reaches a built target through the mirror — dist/ maps to src/, extensions stripped", () => {
    const g = graph({
      "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
    })
    const green = surface({
      "./checkout.service": [
        "dist/checkout.service.js",
        "dist/checkout.service.d.ts",
      ],
    })
    expect(checkSurface(g, green, options)).toEqual({
      violations: [],
      unverified: [],
    })
    const lying = surface({ "./checkout.service": ["dist/stripe.adapter.mjs"] })
    expect(checkSurface(g, lying, options).violations).toEqual([
      expect.objectContaining({
        rules: [3],
        shape: "claim-mismatch",
        claimed: "service",
        actual: "adapters",
        // the source is the fix site; the built target is what it wears
        file: "src/stripe.adapter.ts",
        serviceRoot: "src",
        exported: "dist/stripe.adapter.mjs",
      }),
    ])
  })

  it("no basename fallback — a name in dist is not a fact about a layer", () => {
    const g = graph({})
    const s = surface({ "./checkout.service": ["dist/stripe.adapter.js"] })
    expect(checkSurface(g, s, options)).toEqual({
      violations: [],
      unverified: [
        {
          subpath: "./checkout.service",
          targets: [
            {
              target: "dist/stripe.adapter.js",
              mapped: "src/stripe.adapter",
              mirror: { root: "dist", source: "src" },
              candidates: [],
            },
          ],
        },
      ],
    })
  })

  it("the gap's own pin — a laundering root fires 2 through the mirror", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "assembly", serviceRoot: "src" },
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      },
      [
        {
          from: "src/index.ts",
          to: mod("src/checkout.service.ts"),
          reExport: true,
        },
      ],
    )
    const s = surface({ ".": ["dist/index.js"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({
        rules: [2],
        shape: "unlabeled-front",
        file: "src/index.ts",
        exported: "dist/index.js",
        fronts: "src/checkout.service.ts",
      }),
    ])
  })

  it("several mirror roots — the longest prefixing root wins", () => {
    const g = graph({
      "src/index.ts": { layer: "blob" },
      "legacy/index.ts": { layer: "blob" },
      // a covered non-module file indexes under its own name, never a stem
      "src/widget.svelte": { layer: "blob" },
    })
    const s = surface({
      ".": ["dist/esm/index.js", "dist/cjs/index.cjs"],
      "./old": ["dist/legacy/index.js"],
    })
    const mirror = {
      dist: "src",
      "dist/legacy": "legacy",
      "dist/esm": "src",
      "dist/cjs": "src",
    }
    expect(checkSurface(g, s, { ...options, mirror })).toEqual({
      violations: [],
      unverified: [],
    })
  })

  it("under no mirror root: looked up as itself — a source target outside coverage is unverified", () => {
    const g = graph({ "src/index.ts": { layer: "blob" } })
    const s = surface({
      ".": ["src/index.ts"],
      "./legacy": ["build/legacy/index.js", "lib/legacy.ts"],
    })
    expect(checkSurface(g, s, options)).toEqual({
      violations: [],
      unverified: [
        // one entry for the subpath, every target that missed listed
        {
          subpath: "./legacy",
          targets: [
            {
              target: "build/legacy/index.js",
              mapped: "build/legacy/index",
              mirror: null,
              candidates: [],
            },
            {
              target: "lib/legacy.ts",
              mapped: "lib/legacy",
              mirror: null,
              candidates: [],
            },
          ],
        },
      ],
    })
  })

  it("a declaration file describes its sibling — one stem, one module; alone it is the module", () => {
    const g = graph({
      "src/x.d.ts": { layer: "blob" },
      "src/x.js": { layer: "service", serviceRoot: "src" },
      "src/types.d.ts": { layer: "blob" },
    })
    const s = surface({ "./x": ["dist/x.js"], "./types": ["dist/types.d.ts"] })
    expect(checkSurface(g, s, options)).toEqual({
      violations: [
        expect.objectContaining({
          shape: "unlabeled-front",
          file: "src/x.js",
          exported: "dist/x.js",
        }),
      ],
      unverified: [],
    })
    // two declaration forms and no module: still ambiguous
    const twins = graph({
      "src/x.d.ts": { layer: "blob" },
      "src/x.d.mts": { layer: "blob" },
    })
    expect(
      checkSurface(twins, surface({ "./x": ["dist/x.js"] }), options)
        .unverified,
    ).toEqual([
      {
        subpath: "./x",
        targets: [
          expect.objectContaining({
            candidates: ["src/x.d.ts", "src/x.d.mts"],
          }),
        ],
      },
    ])
  })

  it("an ambiguous stem is unverified — two covered modules, no exact match", () => {
    const g = graph({
      "src/index.ts": { layer: "blob" },
      "src/index.js": { layer: "blob" },
    })
    const s = surface({ ".": ["dist/index.js"] })
    expect(checkSurface(g, s, options).unverified).toEqual([
      {
        subpath: ".",
        targets: [
          expect.objectContaining({
            mapped: "src/index",
            candidates: ["src/index.ts", "src/index.js"],
          }),
        ],
      },
    ])
  })

  it("no mirror declared — built targets are unverified, nothing guessed", () => {
    const g = graph({ "src/index.ts": { layer: "blob" } })
    const s = surface({ ".": ["dist/index.js"] })
    expect(checkSurface(g, s, { ...options, mirror: {} }).unverified).toEqual([
      {
        subpath: ".",
        targets: [
          expect.objectContaining({ target: "dist/index.js", mirror: null }),
        ],
      },
    ])
  })

  it("non-module targets are not surface entries — neither verified nor unverified", () => {
    const g = graph({})
    const s = surface({
      "./package.json": ["package.json"],
      "./styles.css": ["dist/styles.css"],
      "./data": ["dist/data.json"],
    })
    expect(checkSurface(g, s, options)).toEqual({
      violations: [],
      unverified: [],
    })
  })

  it("a disclosed subpath is the field's own carve-out — not checked, not unverified", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "assembly", serviceRoot: "src" },
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      },
      [
        {
          from: "src/index.ts",
          to: mod("src/checkout.service.ts"),
          reExport: true,
        },
      ],
    )
    const s = surface({
      ".": ["dist/index.js"],
      "./legacy/thing": ["build/legacy/thing.js"],
    })
    const disclosed = (subpath: string) =>
      subpath === "." || subpath.startsWith("./legacy/")
    expect(checkSurface(g, s, { ...options, disclosed })).toEqual({
      violations: [],
      unverified: [],
    })
  })

  describe("pattern entries — Node's substitution, expanded over source", () => {
    it("binds the star per covered stem, across slashes, and judges each concrete subpath", () => {
      const g = graph(
        {
          "src/api.ts": { layer: "assembly", serviceRoot: "src" },
          "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
          "src/deep/thing.model.ts": { layer: "adapters", serviceRoot: "src" },
          "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
        },
        [
          {
            from: "src/api.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
        ],
      )
      const s = surface({ "./*": ["dist/*.js"] })
      expect(checkSurface(g, s, options)).toEqual({
        violations: [
          expect.objectContaining({
            rules: [2],
            shape: "unlabeled-front",
            subpath: "./api",
            exported: "dist/api.js",
            file: "src/api.ts",
            fronts: "src/checkout.service.ts",
          }),
          expect.objectContaining({
            rules: [3],
            shape: "claim-mismatch",
            subpath: "./deep/thing.model",
            exported: "dist/deep/thing.model.js",
            file: "src/deep/thing.model.ts",
            claimed: "model",
            actual: "adapters",
          }),
        ],
        unverified: [],
      })
    })

    it("a literal key wins over a pattern for the file it names — judged once, under the literal", () => {
      const g = graph(
        {
          "src/index.ts": { layer: "assembly", serviceRoot: "src" },
          "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        },
        [
          {
            from: "src/index.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
        ],
      )
      const s = surface({
        "./index": ["dist/index.js"],
        "./*": ["dist/*.js"],
      })
      expect(checkSurface(g, s, options).violations).toEqual([
        expect.objectContaining({
          subpath: "./index",
          exported: "dist/index.js",
        }),
      ])
      // a different subpath to the same file is a different claim — Node
      // routes "./index" through the pattern when the literal is "."
      const twice = surface({ ".": ["dist/index.js"], "./*": ["dist/*.js"] })
      expect(
        checkSurface(g, twice, options).violations.map((v) => v.subpath),
      ).toEqual([".", "./index"])
    })

    it("the most specific pattern wins — longest base, then longest key", () => {
      const g = graph(
        {
          "src/legacy/x.ts": { layer: "assembly", serviceRoot: "src" },
          "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        },
        [
          {
            from: "src/legacy/x.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
        ],
      )
      // declaration order is not specificity — the catch-all comes last here
      const s = surface({
        "./legacy/*": ["dist/legacy/*.js"],
        "./legacy/*.js": ["dist/legacy/*.js"],
        "./*": ["dist/*.js"],
      })
      // "./legacy/x" routes to "./legacy/*" (longer base than "./*");
      // "./legacy/x.js" routes to "./legacy/*.js" (longer key at equal base)
      // — each concrete subpath judged once, under the key Node picks
      expect(checkSurface(g, s, options).violations).toEqual([
        expect.objectContaining({
          subpath: "./legacy/x",
          exported: "dist/legacy/x.js",
        }),
        expect.objectContaining({
          subpath: "./legacy/x.js",
          exported: "dist/legacy/x.js",
        }),
      ])
    })

    it("a pattern matching no covered stem is unverified as itself", () => {
      const g = graph({ "lib/x.ts": { layer: "blob" } })
      const s = surface({ "./*": ["dist/*.js"], "./out/*": ["out/*.js"] })
      expect(checkSurface(g, s, options)).toEqual({
        violations: [],
        unverified: [
          {
            subpath: "./*",
            targets: [
              {
                target: "dist/*.js",
                mapped: "src/*",
                mirror: { root: "dist", source: "src" },
                candidates: [],
              },
            ],
          },
          // under no mirror root: the pattern is looked up as itself
          {
            subpath: "./out/*",
            targets: [
              {
                target: "out/*.js",
                mapped: "out/*",
                mirror: null,
                candidates: [],
              },
            ],
          },
        ],
      })
    })

    it("a pattern key is one claim too — its declarations expanding verifies it, a bundled twin missing is not reported", () => {
      // the hybrid build: tsc declarations mirror src/, the runtime entry is a
      // rollup bundle under no honest mirror
      const g = graph({
        "src/api.ts": { layer: "blob" },
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      })
      const s = surface({ "./*": ["dist/lib/*.js", "dist/types/*.d.ts"] })
      const report = checkSurface(g, s, {
        ...options,
        mirror: { "dist/types": "src" },
      })
      expect(report.unverified).toEqual([])
      // the concrete subpaths wear the target that reached them
      expect(report.violations).toEqual([])
      const laundering = surface({
        "./*": ["dist/lib/*.js", "dist/types/*.d.ts"],
      })
      const g2 = graph(
        {
          "src/api.ts": { layer: "blob" },
          "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        },
        [
          {
            from: "src/api.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
        ],
      )
      expect(
        checkSurface(g2, laundering, {
          ...options,
          mirror: { "dist/types": "src" },
        }).violations,
      ).toEqual([
        expect.objectContaining({
          subpath: "./api",
          exported: "dist/types/api.d.ts",
        }),
      ])
    })

    it("a pattern key disclosed whole is retracted, not unverified — even when it matches nothing", () => {
      // build: false and nothing under the key on disk: the producer said
      // "./legacy/**" is not claimed, so the run has nothing to certify
      const g = graph({ "lib/x.ts": { layer: "blob" } })
      const s = surface({ "./legacy/*": ["dist/legacy/*.js"] })
      const disclosed = (subpath: string) => subpath.startsWith("./legacy/")
      expect(checkSurface(g, s, { ...options, mirror: {}, disclosed })).toEqual(
        { violations: [], unverified: [] },
      )
    })

    it("a star-less target under a pattern key is one literal entry — the pattern is its claim", () => {
      const g = graph({
        "src/features.ts": { layer: "service", serviceRoot: "src" },
      })
      const s = surface({ "./features/*": ["dist/features.js"] })
      expect(checkSurface(g, s, options).violations).toEqual([
        expect.objectContaining({
          shape: "unlabeled-front",
          subpath: "./features/*",
          exported: "dist/features.js",
        }),
      ])
    })

    it("a target ending in the star leaves the extension to the consumer — bound to the stem, judged extensionless", () => {
      const g = graph({
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
      })
      // `@pkg/checkout.service.js` resolves through "./*" to dist/checkout.service.js
      const s = surface({ "./*": ["dist/*"], "./x/*": ["dist/x/*"] })
      expect(checkSurface(g, s, options)).toEqual({
        violations: [],
        unverified: [
          {
            subpath: "./x/*",
            targets: [expect.objectContaining({ mapped: "src/x/*" })],
          },
        ],
      })
      // the key's own trailer is part of the claim: every bound stem is
      // exported as "<stem>.model", and neither file is one
      const lying = surface({ "./*.model": ["dist/*"] })
      expect(checkSurface(g, lying, options).violations).toEqual([
        expect.objectContaining({
          shape: "claim-mismatch",
          subpath: "./checkout.service.model",
          exported: "dist/checkout.service",
          claimed: "model",
          actual: "service",
        }),
        expect.objectContaining({
          shape: "claim-mismatch",
          subpath: "./stripe.adapter.model",
          exported: "dist/stripe.adapter",
          actual: "adapters",
        }),
      ])
    })

    it("a two-star key never matches in Node — no consumer reaches it, nothing to certify", () => {
      const g = graph({
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      })
      const s = surface({ "./*/*": ["dist/*.js"] })
      expect(checkSurface(g, s, options)).toEqual({
        violations: [],
        unverified: [],
      })
    })

    it("disclosure applies to the concrete subpath — a carve-out pattern trims an expansion", () => {
      const g = graph(
        {
          "src/api.ts": { layer: "assembly", serviceRoot: "src" },
          "src/legacy/old.ts": { layer: "assembly", serviceRoot: "src" },
          "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        },
        [
          {
            from: "src/api.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
          {
            from: "src/legacy/old.ts",
            to: mod("src/checkout.service.ts"),
            reExport: true,
          },
        ],
      )
      const s = surface({ "./*": ["dist/*.js"] })
      const disclosed = (subpath: string) => subpath.startsWith("./legacy/")
      expect(checkSurface(g, s, { ...options, disclosed }).violations).toEqual([
        expect.objectContaining({ subpath: "./api" }),
      ])
    })

    it("substitutes the bound string verbatim — a dollar in a name is a name", () => {
      const g = graph({
        "src/$made-up.ts": { layer: "service", serviceRoot: "src" },
      })
      const s = surface({ "./*": ["dist/*.js"] })
      expect(checkSurface(g, s, options).violations).toEqual([
        expect.objectContaining({
          subpath: "./$made-up",
          exported: "dist/$made-up.js",
        }),
      ])
    })
  })

  it("fires 2 when an unlabeled subpath sits directly over a composition unit", () => {
    const g = graph({
      "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
    })
    const s = surface({ "./checkout": ["src/checkout.service.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      {
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
      },
    ])
  })

  it("fires 2 on the laundering shape — an assembly-designated entry re-exporting a service", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "assembly", serviceRoot: "src" },
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
        "src/totals.model.ts": { layer: "model", serviceRoot: "src" },
      },
      [
        {
          from: "src/index.ts",
          to: mod("src/checkout.service.ts"),
          reExport: true,
        },
        {
          from: "src/index.ts",
          to: mod("src/totals.model.ts"),
          reExport: true,
        },
      ],
    )
    const s = surface({ ".": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({
        rules: [2],
        shape: "unlabeled-front",
        file: "src/index.ts",
        fronts: "src/checkout.service.ts",
        frontLayer: "service",
      }),
    ])
  })

  it("follows re-export chains — a hop through an unlabeled file hides nothing", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "blob", serviceRoot: null },
        "src/middle.ts": { layer: "blob", serviceRoot: null },
        "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
      },
      [
        { from: "src/index.ts", to: mod("src/middle.ts"), reExport: true },
        {
          from: "src/middle.ts",
          to: mod("src/stripe.adapter.ts"),
          reExport: true,
        },
      ],
    )
    const s = surface({ ".": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({
        shape: "unlabeled-front",
        fronts: "src/stripe.adapter.ts",
        frontLayer: "adapters",
      }),
    ])
  })

  it("plain imports are not fronting — only re-export edges launder", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "assembly", serviceRoot: "src" },
        "src/checkout.service.ts": { layer: "service", serviceRoot: "src" },
      },
      [{ from: "src/index.ts", to: mod("src/checkout.service.ts") }],
    )
    const s = surface({ ".": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([])
  })

  it("an unlabeled entry over models stays green — the fat root barrel stays what it is", () => {
    const g = graph(
      {
        "src/index.ts": { layer: "blob", serviceRoot: null },
        "src/totals.model.ts": { layer: "model", serviceRoot: "src" },
        "src/store.port.ts": { layer: "ports", serviceRoot: "src" },
      },
      [
        {
          from: "src/index.ts",
          to: mod("src/totals.model.ts"),
          reExport: true,
        },
        { from: "src/index.ts", to: mod("src/store.port.ts"), reExport: true },
      ],
    )
    const s = surface({ ".": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([])
  })

  it("survives re-export cycles and picks the smallest front deterministically", () => {
    const g = graph(
      {
        "src/a.ts": { layer: "blob" },
        "src/b.ts": { layer: "blob" },
        "src/z.service.ts": { layer: "service", serviceRoot: "src" },
        "src/an.adapter.ts": { layer: "adapters", serviceRoot: "src" },
      },
      [
        { from: "src/a.ts", to: mod("src/b.ts"), reExport: true },
        { from: "src/b.ts", to: mod("src/a.ts"), reExport: true },
        { from: "src/b.ts", to: mod("src/z.service.ts"), reExport: true },
        { from: "src/a.ts", to: mod("src/an.adapter.ts"), reExport: true },
      ],
    )
    const s = surface({ ".": ["src/a.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({
        fronts: "src/an.adapter.ts",
        frontLayer: "adapters",
      }),
    ])
  })

  it("picks the smallest front whatever order the edges came in", () => {
    const g = graph(
      {
        "src/a.ts": { layer: "blob" },
        "src/z.service.ts": { layer: "service", serviceRoot: "src" },
        "src/an.adapter.ts": { layer: "adapters", serviceRoot: "src" },
      },
      [
        { from: "src/a.ts", to: mod("src/z.service.ts"), reExport: true },
        { from: "src/a.ts", to: mod("src/an.adapter.ts"), reExport: true },
      ],
    )
    const s = surface({ ".": ["src/a.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({ fronts: "src/an.adapter.ts" }),
    ])
  })

  it("an unlabeled subpath over an unreachable target is unverified — nothing to front through, nothing certified", () => {
    const g = graph({})
    const s = surface({ ".": ["dist/index.js"] })
    expect(checkSurface(g, s, options)).toEqual({
      violations: [],
      unverified: [
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
      ],
    })
  })

  it("a subpath is one claim — conditions reaching the same module are judged once, wearing the first target", () => {
    const g = graph({
      "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
    })
    const s: PackageSurface = {
      subpaths: [
        {
          subpath: "./checkout.service",
          targets: [
            "dist/stripe.adapter.js",
            "dist/stripe.adapter.js",
            "dist/stripe.adapter.d.ts",
          ],
        },
      ],
      blob: [],
      assembly: [],
    }
    expect(checkSurface(g, s, options).violations).toEqual([
      expect.objectContaining({ exported: "dist/stripe.adapter.js" }),
    ])
  })

  it("the hybrid build — one reaching target verifies the subpath; the bundled twin under no mirror is not unverified", () => {
    const g = graph({
      "src/stripe.adapter.ts": { layer: "adapters", serviceRoot: "src" },
      "src/totals.model.ts": { layer: "model", serviceRoot: "src" },
    })
    const s = surface({
      "./totals.model": ["dist/lib/totals.js", "dist/types/totals.model.d.ts"],
      "./checkout.service": [
        "dist/lib/checkout.js",
        "dist/types/stripe.adapter.d.ts",
      ],
    })
    const report = checkSurface(g, s, {
      ...options,
      mirror: { "dist/types": "src" },
    })
    expect(report.unverified).toEqual([])
    // judged through the declarations, and the finding says so
    expect(report.violations).toEqual([
      expect.objectContaining({
        subpath: "./checkout.service",
        exported: "dist/types/stripe.adapter.d.ts",
        shape: "claim-mismatch",
      }),
    ])
  })

  it("every target missing is the unverified case — the entry lists them all", () => {
    const g = graph({ "src/index.ts": { layer: "blob" } })
    const s = surface({
      "./thing": ["dist/lib/thing.js", "dist/types/thing.d.ts"],
    })
    expect(
      checkSurface(g, s, { ...options, mirror: { "dist/types": "src" } })
        .unverified,
    ).toEqual([
      {
        subpath: "./thing",
        targets: [
          expect.objectContaining({
            target: "dist/lib/thing.js",
            mirror: null,
          }),
          expect.objectContaining({
            target: "dist/types/thing.d.ts",
            mapped: "src/thing",
          }),
        ],
      },
    ])
  })

  it("re-exports pointing outward stay out of the closure — the seal never parses through", () => {
    const g = graph({ "src/index.ts": { layer: "blob" } }, [
      {
        from: "src/index.ts",
        to: {
          type: "external",
          specifier: "@made-up/other",
          package: "@made-up/other",
          declared: false,
          layer: null,
        },
        reExport: true,
      },
    ])
    const s = surface({ ".": ["src/index.ts"] })
    expect(checkSurface(g, s, options).violations).toEqual([])
  })
})
