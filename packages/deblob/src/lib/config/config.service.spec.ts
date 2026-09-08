import { describe, expect, test } from "vitest"

import type { FlavorResolver } from "../extraction/ports/flavor.port.ts"
import { STOCK_FLAVOR_NAME } from "../extraction/stock-flavor.model.ts"
import {
  ConfigError,
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
} from "./config.model.ts"
import type { FlavorRegistry } from "./config.service.ts"
import { defineConfig, resolveConfig } from "./config.service.ts"

const fakeFlavor = (
  overrides: Partial<FlavorResolver> = {},
): FlavorResolver => ({
  classify: (files) =>
    new Map(
      files.map((file) => [
        file,
        { layer: "blob" as const, serviceRoot: null, isPrivate: false },
      ]),
    ),
  ...overrides,
})

const FLAVORS = { [STOCK_FLAVOR_NAME]: () => fakeFlavor() }

const resolve = (raw: unknown, flavors: FlavorRegistry = FLAVORS) =>
  resolveConfig(raw, {
    root: "/fixture-root",
    configPath: "/fixture-root/deblob.config.ts",
    flavors,
  })

describe("defineConfig", () => {
  test("is the identity — typing channel only", () => {
    const config = { pureLibs: ["some-fake-lib"] }
    expect(defineConfig(config)).toBe(config)
  })
})

describe("resolveConfig — defaults", () => {
  test("resolves an empty config to every default", () => {
    const resolved = resolve({})
    expect(resolved.root).toBe("/fixture-root")
    expect(resolved.configPath).toBe("/fixture-root/deblob.config.ts")
    expect(resolved.include).toEqual(DEFAULT_INCLUDE)
    expect(resolved.exclude).toEqual(EXCLUDE_BASELINE)
    expect(resolved.pureLibs).toEqual([])
    expect(resolved.typeOnlyExempt).toBe(true)
    expect(resolved.isAssembly("src/main.ts")).toBe(false)
  })

  test("defaults the flavor to the stock name's registry entry", () => {
    const stock = fakeFlavor()
    const resolved = resolve({}, { [STOCK_FLAVOR_NAME]: () => stock })
    expect(resolved.flavor).toBe(stock)
    expect(resolved.flavorName).toBe(STOCK_FLAVOR_NAME)
  })

  test("labels provenance: registry name as-is, custom object as custom", () => {
    expect(resolve({ flavor: STOCK_FLAVOR_NAME }).flavorName).toBe(
      STOCK_FLAVOR_NAME,
    )
    expect(resolve({ flavor: fakeFlavor() }).flavorName).toBe("custom")
  })

  test("fails loud when the registry lacks the stock flavor (wiring bug)", () => {
    expect(() => resolve({}, {})).toThrowError(/registry/)
  })

  test("keeps a null configPath (configless run)", () => {
    const resolved = resolveConfig(
      {},
      { root: "/somewhere", configPath: null, flavors: FLAVORS },
    )
    expect(resolved.configPath).toBeNull()
  })
})

describe("resolveConfig — validation", () => {
  test("rejects a non-object config", () => {
    for (const raw of [null, undefined, "flavor", [1]]) {
      expect(() => resolve(raw)).toThrowError(ConfigError)
    }
  })

  test("rejects an unknown key, naming it and the valid set", () => {
    expect(() => resolve({ SOME_MADE_UP_KEY: true })).toThrowError(
      /SOME_MADE_UP_KEY.*flavor.*assembly.*include.*exclude.*pureLibs.*typeOnlyExempt/s,
    )
  })

  test("rejects the plausible typo through the same path", () => {
    expect(() => resolve({ pureLib: ["some-fake-lib"] })).toThrowError(
      /unknown key "pureLib"/,
    )
  })

  test("rejects wrong-typed values, naming key and expected shape", () => {
    expect(() => resolve({ include: "src/**" })).toThrowError(
      /"include".*array of strings/s,
    )
    expect(() => resolve({ assembly: [42] })).toThrowError(
      /"assembly".*array of strings/s,
    )
    expect(() => resolve({ typeOnlyExempt: "yes" })).toThrowError(
      /"typeOnlyExempt".*boolean/s,
    )
  })

  test("rejects an unknown flavor name, naming the known ones", () => {
    expect(() => resolve({ flavor: "no-such-flavor" })).toThrowError(
      /no-such-flavor.*ts-suffixes-factories/s,
    )
  })

  test("rejects a flavor object without classify", () => {
    expect(() => resolve({ flavor: { name: "broken" } })).toThrowError(
      /"flavor".*classify/s,
    )
  })
})

describe("resolveConfig — tsconfig & alias", () => {
  test("defaults: tsconfig undefined (discover at root), alias empty", () => {
    const resolved = resolve({})
    expect(resolved.tsconfig).toBeUndefined()
    expect(resolved.alias).toEqual({})
  })

  test("resolves a declared tsconfig path against the root", () => {
    expect(resolve({ tsconfig: "./tsconfig.base.json" }).tsconfig).toBe(
      "/fixture-root/tsconfig.base.json",
    )
  })

  test("passes tsconfig: false through — discovery disabled", () => {
    expect(resolve({ tsconfig: false }).tsconfig).toBe(false)
  })

  test("rejects non-string non-false tsconfig values", () => {
    for (const value of [true, 42, {}]) {
      expect(() => resolve({ tsconfig: value })).toThrowError(/"tsconfig"/)
    }
  })

  test("normalizes alias: every value an array, path-like entries absolute", () => {
    const resolved = resolve({
      alias: {
        "some-made-up-alias": "./src/some-made-up-dir",
        "other-made-up-alias": ["some-made-up-pkg", "./other-made-up-dir"],
      },
    })
    expect(resolved.alias).toEqual({
      "some-made-up-alias": ["/fixture-root/src/some-made-up-dir"],
      "other-made-up-alias": [
        "some-made-up-pkg",
        "/fixture-root/other-made-up-dir",
      ],
    })
  })

  test("rejects malformed alias shapes, naming the offender", () => {
    expect(() => resolve({ alias: ["nope"] })).toThrowError(/"alias"/)
    expect(() => resolve({ alias: { "some-made-up-alias": 42 } })).toThrowError(
      /"some-made-up-alias"/,
    )
  })
})

describe("resolveConfig — external specifier patterns", () => {
  test("defaults to a matcher that matches nothing", () => {
    expect(resolve({}).external("$made-up/config")).toBeNull()
  })

  test("returns the first declared pattern matching the raw specifier", () => {
    const { external } = resolve({
      external: ["$made-up/**", "$made-up:*", "$made-up/assets:*"],
    })
    expect(external("$made-up/config")).toBe("$made-up/**")
    expect(external("$made-up/deep/er/config")).toBe("$made-up/**")
    expect(external("$made-up:tokens.scss")).toBe("$made-up:*")
    // the hybrid form: first match in declaration order wins
    expect(external("$made-up/assets:icon-sprites.hmr")).toBe("$made-up/**")
    expect(external("$other/config")).toBeNull()
    expect(external("./made-up/config")).toBeNull()
  })

  test("`**` crosses `/` even glued to a prefix — specifiers are not paths (field papercut)", () => {
    const { external } = resolve({ external: ["$a:**"] })
    expect(external("$a:x.scss")).toBe("$a:**")
    expect(external("$a:x/y/z.scss")).toBe("$a:**")
    expect(external("$a:")).toBe("$a:**")
  })

  test("`*` stays within a segment; `.` and other regex characters stay literal", () => {
    const { external } = resolve({ external: ["$a:*.scss", "$b/*"] })
    expect(external("$a:x.scss")).toBe("$a:*.scss")
    expect(external("$a:x/y.scss")).toBeNull()
    expect(external("$a:xXscss")).toBeNull()
    expect(external("$b/x")).toBe("$b/*")
    expect(external("$b/x/y")).toBeNull()
    // `/**` is not optional: the bare namespace root is its own entry
    expect(resolve({ external: ["$c/**"] }).external("$c")).toBeNull()
  })

  test("rejects non-array and non-string entries, naming the key", () => {
    expect(() => resolve({ external: "$made-up/**" })).toThrowError(
      /"external".*array of strings/s,
    )
    expect(() => resolve({ external: [42] })).toThrowError(
      /"external".*array of strings/s,
    )
  })
})

describe("resolveConfig — build", () => {
  test("defaults to the dist → src mirror", () => {
    expect(resolve({}).mirror).toEqual({ dist: "src" })
  })

  test("a string names the output root mirroring src/", () => {
    expect(resolve({ build: "build" }).mirror).toEqual({ build: "src" })
  })

  test("false declares no mirror", () => {
    expect(resolve({ build: false }).mirror).toEqual({})
  })

  test("the full form maps several roots to their source roots", () => {
    expect(
      resolve({
        build: { mirror: { "dist/esm": "src", "dist/cjs": "src", out: "lib" } },
      }).mirror,
    ).toEqual({ "dist/esm": "src", "dist/cjs": "src", out: "lib" })
  })

  test("rejects any other shape, showing what it got", () => {
    for (const raw of [
      true,
      42,
      ["dist"],
      {},
      { mirror: "dist" },
      { mirror: {}, SOME_MADE_UP_KEY: 1 },
    ]) {
      expect(() => resolve({ build: raw })).toThrowError(
        new RegExp(
          `config key "build" must be an output directory.*got ${JSON.stringify(raw).replace(/[[\]{}()*+?.\\^$|]/g, "\\$&")}`,
          "s",
        ),
      )
    }
  })

  test("rejects roots that are not root-relative directories", () => {
    for (const [raw, offending] of [
      ["", '""'],
      ["/abs/dist", '"/abs/dist"'],
      ["./dist", '"./dist"'],
      ["../dist", '"../dist"'],
      ["dist//x", '"dist//x"'],
      [{ mirror: { dist: "../src" } }, '"../src"'],
    ] as const) {
      expect(() => resolve({ build: raw })).toThrowError(
        new RegExp(
          `mirror roots are root-relative directories — ${offending.replace(/[./]/g, "\\$&")} is not`,
        ),
      )
    }
  })
})

describe("resolveConfig — externalLayers", () => {
  test("defaults to no claims", () => {
    expect(resolve({}).externalLayers("@made-up/pkg/checkout.service")).toBe(
      null,
    )
  })

  test("maps specifier patterns to layers — same two wildcards as external", () => {
    const { externalLayers } = resolve({
      externalLayers: {
        "@made-up/*/legacy": "blob",
        "@made-up/**": "service",
      },
    })
    // blob is the revoke: the target is back to unlabeled
    expect(externalLayers("@made-up/billing/legacy")).toBe("blob")
    expect(externalLayers("@made-up/billing/deep/entry")).toBe("service")
    expect(externalLayers("@other/billing")).toBe(null)
  })

  test("first declaration-order match wins", () => {
    const { externalLayers } = resolve({
      externalLayers: {
        "@made-up/**": "adapters",
        "@made-up/pkg/**": "model",
      },
    })
    expect(externalLayers("@made-up/pkg/thing")).toBe("adapters")
  })

  test("rejects a non-object value, naming the key", () => {
    for (const raw of ["service", ["@made-up/**"], null]) {
      expect(() => resolve({ externalLayers: raw })).toThrowError(
        /"externalLayers".*pattern → layer/s,
      )
    }
  })

  test("rejects an unknown layer name loudly, listing the vocabulary", () => {
    expect(() =>
      resolve({ externalLayers: { "@made-up/**": "SOME_MADE_UP_LAYER" } }),
    ).toThrowError(
      /"@made-up\/\*\*".*SOME_MADE_UP_LAYER.*model, ports, service, adapters, assembly, blob/s,
    )
  })
})

describe("resolveConfig — flavor", () => {
  test("resolves a registry name to its instance", () => {
    const resolved = resolve({ flavor: STOCK_FLAVOR_NAME })
    expect(resolved.flavor.classify(["a.ts"]).get("a.ts")?.layer).toBe("blob")
  })

  test("uses a custom resolver object as-is", () => {
    const custom = fakeFlavor()
    const resolved = resolve({ flavor: custom })
    expect(resolved.flavor).toBe(custom)
  })
})

describe("resolveConfig — typeOnlyExempt precedence", () => {
  const cases: Array<{
    flavorStance: boolean | undefined
    key: boolean | undefined
    winner: boolean
  }> = [
    { flavorStance: undefined, key: undefined, winner: true },
    { flavorStance: undefined, key: true, winner: true },
    { flavorStance: undefined, key: false, winner: false },
    { flavorStance: true, key: undefined, winner: true },
    { flavorStance: true, key: false, winner: false },
    { flavorStance: false, key: undefined, winner: false },
    { flavorStance: false, key: true, winner: true },
    { flavorStance: false, key: false, winner: false },
    { flavorStance: true, key: true, winner: true },
  ]

  test.each(cases)(
    "flavor $flavorStance × key $key → $winner",
    ({ flavorStance, key, winner }) => {
      const flavor =
        flavorStance === undefined
          ? fakeFlavor()
          : fakeFlavor({ typeOnlyExempt: flavorStance })
      const raw =
        key === undefined ? { flavor } : { flavor, typeOnlyExempt: key }
      expect(resolve(raw).typeOnlyExempt).toBe(winner)
    },
  )
})

describe("resolveConfig — assembly matcher", () => {
  test("matches extensionless route-file globs", () => {
    const resolved = resolve({ assembly: ["src/routes/**/+*"] })
    expect(resolved.isAssembly("src/routes/inbox/+page.svelte")).toBe(true)
    expect(resolved.isAssembly("src/routes/+layout.ts")).toBe(true)
    expect(resolved.isAssembly("src/routes/inbox/widget.svelte")).toBe(false)
  })

  test("matches directory globs against descendants", () => {
    const resolved = resolve({ assembly: ["src/wiring/**"] })
    expect(resolved.isAssembly("src/wiring/deep/main.ts")).toBe(true)
    expect(resolved.isAssembly("src/elsewhere/main.ts")).toBe(false)
  })

  test("matches exact paths, root-relative", () => {
    const resolved = resolve({ assembly: ["src/main.ts"] })
    expect(resolved.isAssembly("src/main.ts")).toBe(true)
    expect(resolved.isAssembly("other/src/main.ts")).toBe(false)
  })
})

describe("resolveConfig — coverage keys", () => {
  test("keeps user include as given (tightening)", () => {
    const resolved = resolve({ include: ["src/**"] })
    expect(resolved.include).toEqual(["src/**"])
  })

  test("appends user exclude to the baseline, never replaces it", () => {
    const resolved = resolve({ exclude: ["**/__fixtures__/**"] })
    expect(resolved.exclude).toEqual([
      ...EXCLUDE_BASELINE,
      "**/__fixtures__/**",
    ])
  })

  test("passes pureLibs through untouched", () => {
    const resolved = resolve({ pureLibs: ["some-fake-lib", "node:path"] })
    expect(resolved.pureLibs).toEqual(["some-fake-lib", "node:path"])
  })
})
