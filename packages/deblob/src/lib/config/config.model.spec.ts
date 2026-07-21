import { describe, expect, it } from "vitest"

import type { FlavorResolver } from "../extraction/ports/flavor.port.ts"
import type { FlavorRegistry } from "./config.model.ts"
import {
  ConfigError,
  COVERAGE_EXTENSIONS,
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
  STOCK_FLAVOR_NAME,
  defineConfig,
  hasCoverageExtension,
  configImportErrorMessage,
  resolveConfig,
} from "./config.model.ts"

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
  it("is the identity — typing channel only", () => {
    const config = { pureLibs: ["some-fake-lib"] }
    expect(defineConfig(config)).toBe(config)
  })
})

describe("resolveConfig — defaults", () => {
  it("resolves an empty config to every default", () => {
    const resolved = resolve({})
    expect(resolved.root).toBe("/fixture-root")
    expect(resolved.configPath).toBe("/fixture-root/deblob.config.ts")
    expect(resolved.include).toEqual(DEFAULT_INCLUDE)
    expect(resolved.exclude).toEqual(EXCLUDE_BASELINE)
    expect(resolved.pureLibs).toEqual([])
    expect(resolved.typeOnlyExempt).toBe(true)
    expect(resolved.isAssembly("src/main.ts")).toBe(false)
  })

  it("defaults the flavor to the stock name's registry entry", () => {
    const stock = fakeFlavor()
    const resolved = resolve({}, { [STOCK_FLAVOR_NAME]: () => stock })
    expect(resolved.flavor).toBe(stock)
  })

  it("fails loud when the registry lacks the stock flavor (wiring bug)", () => {
    expect(() => resolve({}, {})).toThrowError(/registry/)
  })

  it("keeps a null configPath (configless run)", () => {
    const resolved = resolveConfig(
      {},
      { root: "/somewhere", configPath: null, flavors: FLAVORS },
    )
    expect(resolved.configPath).toBeNull()
  })
})

describe("resolveConfig — validation", () => {
  it("rejects a non-object config", () => {
    for (const raw of [null, undefined, "flavor", [1]]) {
      expect(() => resolve(raw)).toThrowError(ConfigError)
    }
  })

  it("rejects an unknown key, naming it and the valid set", () => {
    expect(() => resolve({ SOME_MADE_UP_KEY: true })).toThrowError(
      /SOME_MADE_UP_KEY.*flavor.*assembly.*include.*exclude.*pureLibs.*typeOnlyExempt/s,
    )
  })

  it("rejects the plausible typo through the same path", () => {
    expect(() => resolve({ pureLib: ["some-fake-lib"] })).toThrowError(
      /unknown key "pureLib"/,
    )
  })

  it("rejects wrong-typed values, naming key and expected shape", () => {
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

  it("rejects an unknown flavor name, naming the known ones", () => {
    expect(() => resolve({ flavor: "no-such-flavor" })).toThrowError(
      /no-such-flavor.*ts-suffixes-factories/s,
    )
  })

  it("rejects a flavor object without classify", () => {
    expect(() => resolve({ flavor: { name: "broken" } })).toThrowError(
      /"flavor".*classify/s,
    )
  })
})

describe("resolveConfig — flavor", () => {
  it("resolves a registry name to its instance", () => {
    const resolved = resolve({ flavor: STOCK_FLAVOR_NAME })
    expect(resolved.flavor.classify(["a.ts"]).get("a.ts")?.layer).toBe("blob")
  })

  it("uses a custom resolver object as-is", () => {
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

  it.each(cases)(
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
  it("matches extensionless route-file globs", () => {
    const resolved = resolve({ assembly: ["src/routes/**/+*"] })
    expect(resolved.isAssembly("src/routes/inbox/+page.svelte")).toBe(true)
    expect(resolved.isAssembly("src/routes/+layout.ts")).toBe(true)
    expect(resolved.isAssembly("src/routes/inbox/widget.svelte")).toBe(false)
  })

  it("matches directory globs against descendants", () => {
    const resolved = resolve({ assembly: ["src/wiring/**"] })
    expect(resolved.isAssembly("src/wiring/deep/main.ts")).toBe(true)
    expect(resolved.isAssembly("src/elsewhere/main.ts")).toBe(false)
  })

  it("matches exact paths, root-relative", () => {
    const resolved = resolve({ assembly: ["src/main.ts"] })
    expect(resolved.isAssembly("src/main.ts")).toBe(true)
    expect(resolved.isAssembly("other/src/main.ts")).toBe(false)
  })
})

describe("resolveConfig — coverage keys", () => {
  it("keeps user include as given (tightening)", () => {
    const resolved = resolve({ include: ["src/**"] })
    expect(resolved.include).toEqual(["src/**"])
  })

  it("appends user exclude to the baseline, never replaces it", () => {
    const resolved = resolve({ exclude: ["**/__fixtures__/**"] })
    expect(resolved.exclude).toEqual([
      ...EXCLUDE_BASELINE,
      "**/__fixtures__/**",
    ])
  })

  it("passes pureLibs through untouched", () => {
    const resolved = resolve({ pureLibs: ["some-fake-lib", "node:path"] })
    expect(resolved.pureLibs).toEqual(["some-fake-lib", "node:path"])
  })
})

describe("hasCoverageExtension", () => {
  it("accepts every extension of the gate", () => {
    for (const ext of COVERAGE_EXTENSIONS) {
      expect(hasCoverageExtension(`dir/file${ext}`)).toBe(true)
    }
  })

  it("rejects non-source extensions and near-misses", () => {
    expect(hasCoverageExtension("dir/styles.css")).toBe(false)
    expect(hasCoverageExtension("dir/notes.md")).toBe(false)
    expect(hasCoverageExtension("dir/data.json")).toBe(false)
    expect(hasCoverageExtension("dir/ts")).toBe(false)
  })
})

describe("configImportErrorMessage", () => {
  it("teaches the erasable-only constraint on the Node syntax code", () => {
    const error = Object.assign(new Error("enum stripped"), {
      code: "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX",
    })
    const message = configImportErrorMessage(error, "/repo/deblob.config.ts")
    expect(message).toMatch(/erasable/)
    expect(message).toMatch(/deblob\.config\.ts/)
  })

  it("names the config path on any other failure", () => {
    const message = configImportErrorMessage(
      new Error("SOME_FAKE_EVALUATION_FAILURE"),
      "/repo/deblob.config.ts",
    )
    expect(message).toMatch(/failed to load/i)
    expect(message).toMatch(/deblob\.config\.ts/)
  })
})
