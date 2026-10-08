import { describe, expect, it, test } from "vitest"

import type { FlavorResolver } from "../extraction/flavor.model.ts"
import type { ReaderGroups } from "../extraction/readers.model.ts"
import type { TestReader } from "../extraction/test-reader.model.ts"
import { STOCK_FLAVOR_NAME } from "../extraction/stock-flavor.model.ts"
import {
  ConfigError,
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
} from "./config.model.ts"
import type { DefaultReaders, FlavorRegistry } from "./config.service.ts"
import {
  createConfigService,
  defineConfig,
  overlayLocalConfig,
  resolveConfig,
} from "./config.service.ts"
import type { ConfigFiles } from "./ports/config-files.port.ts"

const fakeFlavor = (
  overrides: Partial<FlavorResolver> = {},
): FlavorResolver => ({
  classify: ({ files }) =>
    new Map(
      files.map((file) => [
        file,
        { layer: "blob" as const, serviceRoot: null, isPrivate: false },
      ]),
    ),
  ...overrides,
})

const FLAVORS = { [STOCK_FLAVOR_NAME]: () => fakeFlavor() } as const

const fakeTestReader = (
  name: string,
  include?: readonly string[],
): TestReader => ({
  name,
  ...(include ? { include } : {}),
  tech: [],
  roleOf: () => null,
})

/** The defaults, one invented reader per group that has one. */
const READERS: ReaderGroups = {
  language: [{ name: "fake-language", globals: ["SomeMadeUpGlobal"] }],
  host: [],
  test: [fakeTestReader("fake-runner")],
  driver: [],
} as const

const resolve = (
  raw: unknown,
  flavors: FlavorRegistry = FLAVORS,
  readers: DefaultReaders = READERS,
) =>
  resolveConfig(raw, {
    root: "/fixture-root",
    configPath: "/fixture-root/deblob.config.ts",
    localPath: null,
    flavors,
    readers,
  })

describe("defineConfig", () => {
  it("is the identity — typing channel only", () => {
    const config = { pure: ["some-fake-lib"] }
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
    expect(resolved.pure).toEqual([])
    expect(resolved.typeOnlyExempt).toBe(true)
    // the readonly check is on by default; the key is the opt-out
    expect(resolved.mutableModuleState).toBe(false)
    expect(resolved.isAssembly("src/main.ts")).toBe(false)
  })

  it("carries mutableModuleState as given, true or false", () => {
    expect(resolve({ mutableModuleState: true }).mutableModuleState).toBe(true)
    expect(resolve({ mutableModuleState: false }).mutableModuleState).toBe(
      false,
    )
  })

  it("defaults the flavor to the stock name's registry entry", () => {
    const stock = fakeFlavor()
    const resolved = resolve({}, { [STOCK_FLAVOR_NAME]: () => stock })
    expect(resolved.flavor).toBe(stock)
    expect(resolved.flavorName).toBe(STOCK_FLAVOR_NAME)
  })

  it("labels provenance: registry name as-is, custom object as custom", () => {
    expect(resolve({ flavor: STOCK_FLAVOR_NAME }).flavorName).toBe(
      STOCK_FLAVOR_NAME,
    )
    expect(resolve({ flavor: fakeFlavor() }).flavorName).toBe("custom")
  })

  it("fails loud when the registry lacks the stock flavor (wiring bug)", () => {
    expect(() => resolve({}, {})).toThrowError(/registry/)
  })

  it("keeps a null configPath (configless run)", () => {
    const resolved = resolveConfig(
      {},
      {
        root: "/somewhere",
        configPath: null,
        localPath: null,
        flavors: FLAVORS,
        readers: READERS,
      },
    )
    expect(resolved.configPath).toBeNull()
  })

  test("carries the overlay's provenance as given", () => {
    const resolved = resolveConfig(
      {},
      {
        root: "/somewhere",
        configPath: "/somewhere/deblob.config.ts",
        localPath: "/somewhere/deblob.local.ts",
        flavors: FLAVORS,
        readers: READERS,
      },
    )
    expect(resolved.localPath).toBe("/somewhere/deblob.local.ts")
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
      /SOME_MADE_UP_KEY.*flavor.*assembly.*include.*exclude.*pure.*typeOnlyExempt/s,
    )
  })

  it("rejects the plausible typo through the same path", () => {
    expect(() => resolve({ pures: ["some-fake-lib"] })).toThrowError(
      /unknown key "pures"/,
    )
  })

  it("rejects the pre-0.0.6 key by its new name — renamed, never aliased", () => {
    expect(() => resolve({ pureLibs: ["some-fake-lib"] })).toThrowError(
      /"pureLibs" was renamed "pure"/,
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
    expect(() => resolve({ mutableModuleState: "yes" })).toThrowError(
      /"mutableModuleState".*boolean/s,
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

describe("resolveConfig — tsconfig & alias", () => {
  it("defaults tsconfig to undefined (discover at root) and alias to empty", () => {
    const resolved = resolve({})
    expect(resolved.tsconfig).toBeUndefined()
    expect(resolved.alias).toEqual({})
  })

  it("resolves a declared tsconfig path against the root", () => {
    expect(resolve({ tsconfig: "./tsconfig.base.json" }).tsconfig).toBe(
      "/fixture-root/tsconfig.base.json",
    )
  })

  it("passes tsconfig: false through — discovery disabled", () => {
    expect(resolve({ tsconfig: false }).tsconfig).toBe(false)
  })

  it("rejects non-string non-false tsconfig values", () => {
    for (const value of [true, 42, {}]) {
      expect(() => resolve({ tsconfig: value })).toThrowError(/"tsconfig"/)
    }
  })

  it("normalizes alias: every value an array, path-like entries absolute", () => {
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

  it("rejects malformed alias shapes, naming the offender", () => {
    expect(() => resolve({ alias: ["nope"] })).toThrowError(/"alias"/)
    expect(() => resolve({ alias: { "some-made-up-alias": 42 } })).toThrowError(
      /"some-made-up-alias"/,
    )
  })
})

describe("resolveConfig — the outside kinds: designations, configLoads", () => {
  it("defaults every designation to a matcher that matches nothing, configLoads to none", () => {
    const resolved = resolve({})
    for (const matches of [resolved.isAssembly, resolved.isBoot]) {
      expect(matches("src/anything.ts")).toBe(false)
    }
    expect(resolved.configLoads).toEqual([])
  })

  it("compiles each designation key to its own glob matcher", () => {
    const resolved = resolve({
      assembly: ["src/wire/**"],
      boot: ["src/entry.ts"],
    })
    expect(resolved.isAssembly("src/wire/app.ts")).toBe(true)
    expect(resolved.isBoot("src/entry.ts")).toBe(true)
  })

  it("rejects a non-array designation, naming the key", () => {
    expect(() => resolve({ boot: "src/**" })).toThrowError(
      /"boot" must be an array of strings/,
    )
  })

  it("rejects the gone tests key with a teaching error naming the test group", () => {
    expect(() => resolve({ tests: ["e2e/**"] })).toThrowError(
      /"tests" is gone.*readers: \{ test: \[genericTestApi/s,
    )
  })

  it("rejects the gone drivers and driverTech keys, naming the driver group", () => {
    for (const key of ["drivers", "driverTech"]) {
      expect(() => resolve({ [key]: ["x"] })).toThrowError(
        /"drivers" and "driverTech" are gone.*readers: \{ driver/s,
      )
    }
  })
})

describe("resolveConfig — readers: four groups, a written one replaces its defaults", () => {
  it("defaults every group to the injected defaults", () => {
    expect(resolve({}).readers).toBe(READERS)
  })

  it("replaces a written group whole and keeps the others' defaults", () => {
    const cli = { name: "some-cli", tech: ["some-cli"] }
    const resolved = resolve({ readers: { driver: [cli], test: [] } })
    expect(resolved.readers.driver).toEqual([cli])
    expect(resolved.readers.test).toEqual([])
    expect(resolved.readers.language).toBe(READERS.language)
  })

  it("folds a bound host's pure builtins into pure — a host with none adds none", () => {
    const host = { name: "some-host", tech: ["host:str"], pure: ["host:str"] }
    const bare = { name: "other-host", tech: [] }
    expect(
      resolve({ pure: ["some-lib"], readers: { host: [host, bare] } }).pure,
    ).toEqual(["some-lib", "host:str"])
  })

  it("rejects an unknown group, a non-object, and a group of non-readers, naming the key", () => {
    expect(() => resolve({ readers: { framework: [] } })).toThrowError(
      /unknown reader group "framework".*language, host, test, driver/,
    )
    expect(() => resolve({ readers: ["x/**"] })).toThrowError(
      /"readers" must be an object of reader groups/,
    )
    expect(() => resolve({ readers: { driver: ["x/**"] } })).toThrowError(
      /"readers.driver" must be an array of readers/,
    )
  })

  it("rejects a driver, test or host reader whose tech is not a list of strings, naming the reader — a function included", () => {
    expect(() =>
      resolve({
        readers: { host: [{ name: "some-host", claims: () => true }] },
      }),
    ).toThrowError(
      /reader "some-host" under "readers.host": tech must be an array of strings/,
    )
    expect(() =>
      resolve({
        readers: { driver: [{ name: "some-cli", claims: () => true }] },
      }),
    ).toThrowError(
      /reader "some-cli" under "readers.driver": tech must be an array of strings/,
    )
    expect(() =>
      resolve({ readers: { test: [{ name: "some-runner" }] } }),
    ).toThrowError(
      /reader "some-runner" under "readers.test": tech must be an array of strings/,
    )
  })

  it("covers a script extension, a designated file, or a file a driver or test reader's written binding names — nothing else", () => {
    const resolved = resolve({
      assembly: ["src/wire/*.json"],
      readers: {
        driver: [
          {
            name: "pages",
            include: ["src/routes/**/+page.svelte"],
            tech: [],
          },
        ],
        test: [fakeTestReader("stories", ["src/**/*.story.vue"])],
      },
    })
    expect(resolved.covers("src/app.ts")).toBe(true)
    expect(resolved.covers("src/wire/app.json")).toBe(true)
    expect(resolved.covers("src/routes/home/+page.svelte")).toBe(true)
    expect(resolved.covers("src/card.story.vue")).toBe(true)
    expect(resolved.covers("src/routes/home/Card.svelte")).toBe(false)
    expect(resolved.covers("src/notes.md")).toBe(false)
  })

  it("normalizes configLoads: one string or a list, each split at the hash", () => {
    expect(
      resolve({ configLoads: "src/lib/config/config.service.ts#load" })
        .configLoads,
    ).toEqual([{ file: "src/lib/config/config.service.ts", name: "load" }])
    expect(
      resolve({
        configLoads: ["src/a/a.service.ts#loadA", "src/b/b.service.ts#loadB"],
      }).configLoads,
    ).toEqual([
      { file: "src/a/a.service.ts", name: "loadA" },
      { file: "src/b/b.service.ts", name: "loadB" },
    ])
  })

  it("rejects a configLoads entry that is not <file>#<name>, quoting it", () => {
    for (const entry of [
      "src/a.service.ts",
      "#load",
      "src/a.service.ts#",
      "a#b#c",
    ]) {
      expect(() => resolve({ configLoads: entry })).toThrowError(
        new RegExp(`"configLoads": ${JSON.stringify(entry)}.*<file>#<name>`),
      )
    }
    expect(() => resolve({ configLoads: 42 })).toThrowError(
      /"configLoads" must be a "<file>#<name>" string or an array/,
    )
  })
})

describe("resolveConfig — external specifier patterns", () => {
  it("defaults to a matcher that matches nothing", () => {
    expect(resolve({}).external("$made-up/config")).toBeNull()
  })

  it("returns the first declared pattern matching the raw specifier", () => {
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

  it("matches `**` across `/` even glued to a prefix — specifiers are not paths (field papercut)", () => {
    const { external } = resolve({ external: ["$a:**"] })
    expect(external("$a:x.scss")).toBe("$a:**")
    expect(external("$a:x/y/z.scss")).toBe("$a:**")
    expect(external("$a:")).toBe("$a:**")
  })

  it("keeps `*` within a segment, and `.` and other regex characters literal; `/**` does not match the bare namespace root", () => {
    const { external } = resolve({ external: ["$a:*.scss", "$b/*"] })
    expect(external("$a:x.scss")).toBe("$a:*.scss")
    expect(external("$a:x/y.scss")).toBeNull()
    expect(external("$a:xXscss")).toBeNull()
    expect(external("$b/x")).toBe("$b/*")
    expect(external("$b/x/y")).toBeNull()
    const literal = String.raw`a+b?c^d{2}(e)|f[g]\h`
    const specials = resolve({ external: [literal] }).external
    expect(specials(literal)).toBe(literal)
    // a `|` read as alternation would match either half alone
    expect(specials(String.raw`f[g]\h`)).toBeNull()
    // `/**` is not optional: the bare namespace root is its own entry
    expect(resolve({ external: ["$c/**"] }).external("$c")).toBeNull()
  })

  it("rejects non-array and non-string entries, naming the key", () => {
    expect(() => resolve({ external: "$made-up/**" })).toThrowError(
      /"external".*array of strings/s,
    )
    expect(() => resolve({ external: [42] })).toThrowError(
      /"external".*array of strings/s,
    )
  })
})

describe("resolveConfig — build", () => {
  it("defaults to the dist → src mirror", () => {
    expect(resolve({}).mirror).toEqual({ dist: "src" })
  })

  it("reads a string as the output root mirroring src/", () => {
    expect(resolve({ build: "build" }).mirror).toEqual({ build: "src" })
  })

  it("declares no mirror on false", () => {
    expect(resolve({ build: false }).mirror).toEqual({})
  })

  it("maps several roots to their source roots in the full form", () => {
    expect(
      resolve({
        build: { mirror: { "dist/esm": "src", "dist/cjs": "src", out: "lib" } },
      }).mirror,
    ).toEqual({ "dist/esm": "src", "dist/cjs": "src", out: "lib" })
  })

  it("rejects any other shape, showing what it got", () => {
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

  it("rejects roots that are not root-relative directories", () => {
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
  it("defaults to no claims", () => {
    expect(resolve({}).externalLayers("@made-up/pkg/checkout.service")).toBe(
      null,
    )
  })

  it("maps specifier patterns to layers — same two wildcards as external", () => {
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

  it("picks the first match in declaration order", () => {
    const { externalLayers } = resolve({
      externalLayers: {
        "@made-up/**": "adapters",
        "@made-up/pkg/**": "model",
      },
    })
    expect(externalLayers("@made-up/pkg/thing")).toBe("adapters")
  })

  it("rejects a non-object value, naming the key", () => {
    for (const raw of ["service", ["@made-up/**"], null]) {
      expect(() => resolve({ externalLayers: raw })).toThrowError(
        /"externalLayers".*pattern → layer/s,
      )
    }
  })

  it("rejects an unknown layer name loudly, listing the vocabulary", () => {
    expect(() =>
      resolve({ externalLayers: { "@made-up/**": "SOME_MADE_UP_LAYER" } }),
    ).toThrowError(
      /"@made-up\/\*\*".*SOME_MADE_UP_LAYER.*model, ports, service, adapters, assembly, driver, boot, test, blob/s,
    )
  })
})

describe("resolveConfig — flavor", () => {
  it("resolves a registry name to its instance", () => {
    const resolved = resolve({ flavor: STOCK_FLAVOR_NAME })
    expect(
      resolved.flavor.classify({ files: ["a.ts"] }).get("a.ts")?.layer,
    ).toBe("blob")
  })

  it("uses a custom resolver object as-is", () => {
    const custom = fakeFlavor()
    const resolved = resolve({ flavor: custom })
    expect(resolved.flavor).toBe(custom)
  })
})

describe("resolveConfig — typeOnlyExempt precedence", () => {
  const cases: ReadonlyArray<{
    readonly flavorStance: boolean | undefined
    readonly key: boolean | undefined
    readonly winner: boolean
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
    "resolves typeOnlyExempt from flavor $flavorStance × key $key to $winner",
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

  it("passes `pure` through untouched", () => {
    const resolved = resolve({ pure: ["some-fake-lib", "node:path"] })
    expect(resolved.pure).toEqual(["some-fake-lib", "node:path"])
  })
})

describe("resolveConfig — view", () => {
  test("defaults to no projects: absent key, empty object, absent list alike", () => {
    expect(resolve({}).view).toEqual({ projects: [] })
    expect(resolve({ view: {} }).view).toEqual({ projects: [] })
    expect(resolve({ view: { projects: [] } }).view).toEqual({ projects: [] })
  })

  test("resolves project paths against the config root, absolute passed through", () => {
    const resolved = resolve({
      view: { projects: ["../FAKE_SIBLING", "packages/FAKE_PKG", "/FAKE_ABS"] },
    })
    expect(resolved.view.projects).toEqual([
      "/FAKE_SIBLING",
      "/fixture-root/packages/FAKE_PKG",
      "/FAKE_ABS",
    ])
  })

  test("rejects a non-object view, naming the key", () => {
    for (const view of ["src", ["src"], 42, null]) {
      expect(() => resolve({ view })).toThrowError(
        /config key "view" must be an object/,
      )
    }
  })

  test("rejects an unknown sub-key, naming it and the valid set", () => {
    expect(() => resolve({ view: { SOME_MADE_UP_SUBKEY: [] } })).toThrowError(
      /unknown key "SOME_MADE_UP_SUBKEY" in config key "view".*projects/s,
    )
  })

  test("rejects a projects value that is not an array of strings", () => {
    for (const projects of ["src", [42], { a: "src" }]) {
      expect(() => resolve({ view: { projects } })).toThrowError(
        /config key "view\.projects" must be an array of directory paths/,
      )
    }
  })
})

describe("overlayLocalConfig", () => {
  const LOCAL = "/fixture-root/deblob.local.ts"

  test("merges per top-level key, local winning", () => {
    expect(
      overlayLocalConfig(
        { include: ["src/**"], pure: ["FAKE_BASE_LIB"] },
        { pure: ["FAKE_LOCAL_LIB"] },
        LOCAL,
      ),
    ).toEqual({ include: ["src/**"], pure: ["FAKE_LOCAL_LIB"] })
  })

  test("replaces arrays and objects whole — no deep merge, no concatenation", () => {
    expect(
      overlayLocalConfig(
        { view: { projects: ["FAKE_COMMITTED"] }, alias: { "@a": "./a" } },
        { view: { projects: ["FAKE_LOCAL"] } },
        LOCAL,
      ),
    ).toEqual({ view: { projects: ["FAKE_LOCAL"] }, alias: { "@a": "./a" } })
  })

  test("the merged value resolves like any config — view paths absolute", () => {
    const merged = overlayLocalConfig(
      {},
      { view: { projects: ["../FAKE_CHECKOUT"] } },
      LOCAL,
    )
    expect(resolve(merged).view.projects).toEqual(["/FAKE_CHECKOUT"])
  })

  test("rejects a non-object local value, naming the local file", () => {
    for (const local of [["x"], "x", 42, null]) {
      expect(() => overlayLocalConfig({}, local, LOCAL)).toThrowError(
        /deblob\.local\.ts must export an object/,
      )
    }
  })

  test("rejects an unknown local key, naming the local file and the valid set", () => {
    expect(() =>
      overlayLocalConfig({}, { SOME_MADE_UP_KEY: true }, LOCAL),
    ).toThrowError(
      /unknown key "SOME_MADE_UP_KEY" in \/fixture-root\/deblob\.local\.ts.*view/s,
    )
  })

  test("rejects a non-object base — the config file's own failure, not the overlay's", () => {
    expect(() => overlayLocalConfig(42, {}, LOCAL)).toThrowError(
      /deblob config must be an object/,
    )
  })
})

describe("createConfigService", () => {
  /**
   * Config files held in memory: one project at `/made-up/project`, its config
   * and overlay exporting what the test says; `-c` finds the one file named.
   */
  const filesWith = (exports: Record<string, unknown>): ConfigFiles => {
    const found = (path: string | null, local: string | null) => ({
      root: "/made-up/project",
      configPath: path,
      localPath: local,
    })
    const configPath =
      "/made-up/project/deblob.config.ts" in exports
        ? "/made-up/project/deblob.config.ts"
        : null
    const localPath =
      "/made-up/project/deblob.local.ts" in exports
        ? "/made-up/project/deblob.local.ts"
        : null
    const here =
      configPath === null && localPath === null
        ? null
        : found(configPath, localPath)
    return {
      discoverConfig: async () => here,
      configAt: async (dir) => (dir === "/made-up/project" ? here : null),
      explicitConfigPath: async (cwd, path) => found(`${cwd}/${path}`, null),
      importConfigDefault: async (path) => exports[path],
    }
  }

  const serviceOver = (exports: Record<string, unknown>) =>
    createConfigService({
      files: filesWith(exports),
      flavors: FLAVORS,
      readers: READERS,
    })

  it("loads the config discovered from a directory, its overlay applied", async () => {
    const config = await serviceOver({
      "/made-up/project/deblob.config.ts": { include: ["src/**"], pure: ["a"] },
      "/made-up/project/deblob.local.ts": { pure: ["b"] },
    }).loadConfig("/made-up/project/src")
    expect(config.root).toBe("/made-up/project")
    expect(config.include).toEqual(["src/**"])
    expect(config.pure).toEqual(["b"])
    expect(config.localPath).toBe("/made-up/project/deblob.local.ts")
  })

  it("roots the defaults at the directory when no file is found", async () => {
    const service = serviceOver({})
    const found = await service.loadConfig("/made-up/elsewhere")
    expect([found.root, found.configPath]).toEqual(["/made-up/elsewhere", null])
    const exact = await service.loadConfigAt("/made-up/elsewhere")
    expect(exact.root).toBe("/made-up/elsewhere")
  })

  it("loads a directory's own config exactly", async () => {
    const config = await serviceOver({
      "/made-up/project/deblob.config.ts": { include: ["lib/**"] },
    }).loadConfigAt("/made-up/project")
    expect(config.include).toEqual(["lib/**"])
  })

  it("loads the file a command line names", async () => {
    const config = await serviceOver({
      "/made-up/named.config.ts": { include: ["named/**"] },
    }).loadConfigNamed("/made-up", "named.config.ts")
    expect(config.configPath).toBe("/made-up/named.config.ts")
    expect(config.include).toEqual(["named/**"])
  })

  it("resolves a config given as a value at a root, no file behind it", () => {
    const config = serviceOver({}).resolve({ include: ["x/**"] }, "/made-up")
    expect([config.root, config.configPath, config.localPath]).toEqual([
      "/made-up",
      null,
      null,
    ])
    expect(config.include).toEqual(["x/**"])
  })

  it("fails loud on what resolution refuses, whatever the source", async () => {
    await expect(
      serviceOver({
        "/made-up/project/deblob.config.ts": { pureLibs: [] },
      }).loadConfig("/made-up/project"),
    ).rejects.toThrow(ConfigError)
  })
})
