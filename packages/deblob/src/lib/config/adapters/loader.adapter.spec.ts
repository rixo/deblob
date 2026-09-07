import { mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, it } from "vitest"

import type { FlavorResolver } from "../../extraction/ports/flavor.port.ts"
import { STOCK_FLAVOR_NAME } from "../../extraction/stock-flavor.model.ts"
import { ConfigError } from "../config.model.ts"
import { resolveConfig } from "../config.service.ts"
import {
  discoverConfig,
  explicitConfigPath,
  importConfigDefault,
  readPackageSurface,
  tsconfigPathOf,
} from "./loader.adapter.ts"

const fixture = (name: string): string =>
  fileURLToPath(new URL(`../__fixtures__/${name}`, import.meta.url))

const fakeFlavor = (): FlavorResolver => ({
  classify: (files) =>
    new Map(
      files.map((file) => [
        file,
        { layer: "blob" as const, serviceRoot: null, isPrivate: false },
      ]),
    ),
})

const FLAVORS = { [STOCK_FLAVOR_NAME]: () => fakeFlavor() }

/** The assembly sequence (main's loadFor), composed here for the fixture cases. */
const load = async (cwd: string) => {
  const configPath = discoverConfig(cwd)
  if (configPath === null) {
    return resolveConfig({}, { root: cwd, configPath: null, flavors: FLAVORS })
  }
  return resolveConfig(await importConfigDefault(configPath), {
    root: dirname(configPath),
    configPath,
    flavors: FLAVORS,
  })
}

describe("discoverConfig", () => {
  it("finds the config in cwd", () => {
    expect(discoverConfig(fixture("walk"))).toBe(
      join(fixture("walk"), "deblob.config.ts"),
    )
  })

  it("walks up to the nearest config — never past it", () => {
    expect(discoverConfig(fixture("walk/nested/deeper"))).toBe(
      join(fixture("walk/nested"), "deblob.config.ts"),
    )
  })

  it("rejects two config files in one directory as ambiguity", () => {
    expect(() => discoverConfig(fixture("ambiguous"))).toThrowError(
      /deblob\.config\.ts and deblob\.config\.js/,
    )
  })
})

describe("explicitConfigPath", () => {
  it("resolves a relative path from cwd, absolute passed through", () => {
    const absolute = join(fixture("walk"), "deblob.config.ts")
    expect(
      explicitConfigPath(fixture("walk/nested"), "../deblob.config.ts"),
    ).toBe(absolute)
    expect(explicitConfigPath(fixture("walk/nested/deeper"), absolute)).toBe(
      absolute,
    )
  })

  it("a missing explicit path is a teaching error, never a silent fallback", () => {
    expect(() =>
      explicitConfigPath(fixture("walk"), "SOME_MADE_UP_PATH.config.ts"),
    ).toThrowError(/SOME_MADE_UP_PATH.*does not exist/s)
  })
})

describe("tsconfigPathOf", () => {
  const roots: string[] = []
  const makeRoot = async (withTsconfig: boolean): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), "deblob-tsconfig-"))
    roots.push(root)
    if (withTsconfig) await writeFile(join(root, "tsconfig.json"), "{}\n")
    return root
  }
  afterAll(() =>
    Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    ),
  )

  it("discovers tsconfig.json at the root when undeclared", async () => {
    const root = await makeRoot(true)
    expect(tsconfigPathOf({ root, tsconfig: undefined })).toBe(
      join(root, "tsconfig.json"),
    )
  })

  it("yields null when undeclared and the root has none", async () => {
    const root = await makeRoot(false)
    expect(tsconfigPathOf({ root, tsconfig: undefined })).toBeNull()
  })

  it("false disables discovery even when the file exists", async () => {
    const root = await makeRoot(true)
    expect(tsconfigPathOf({ root, tsconfig: false })).toBeNull()
  })

  it("returns a declared path that exists", async () => {
    const root = await makeRoot(true)
    const declared = join(root, "tsconfig.json")
    expect(tsconfigPathOf({ root, tsconfig: declared })).toBe(declared)
  })

  it("a declared-but-missing path is a teaching error — declared means load-bearing", async () => {
    const root = await makeRoot(false)
    expect(() =>
      tsconfigPathOf({ root, tsconfig: join(root, "tsconfig.json") }),
    ).toThrowError(/"tsconfig".*does not exist/s)
  })
})

describe("importConfigDefault + the assembly sequence", () => {
  it("loads a .ts config natively and resolves it", async () => {
    const resolved = await load(fixture("walk"))
    expect(resolved.pureLibs).toEqual(["FAKE_ROOT_LIB"])
    expect(resolved.root).toBe(fixture("walk"))
    expect(resolved.configPath).toBe(join(fixture("walk"), "deblob.config.ts"))
  })

  it("the nearest config governs a nested cwd — no merge with the ancestor", async () => {
    const resolved = await load(fixture("walk/nested/deeper"))
    expect(resolved.pureLibs).toEqual(["FAKE_NESTED_LIB"])
    expect(resolved.root).toBe(fixture("walk/nested"))
  })

  it("loads .js and .mjs configs", async () => {
    expect((await load(fixture("js-config"))).pureLibs).toEqual(["FAKE_JS_LIB"])
    expect((await load(fixture("mjs-config"))).pureLibs).toEqual([
      "FAKE_MJS_LIB",
    ])
  })

  it("rejects a config without a default export, teaching the fix", async () => {
    await expect(load(fixture("no-default"))).rejects.toThrowError(
      /no default export.*defineConfig/s,
    )
  })

  it("wraps an evaluation failure with the config path, cause preserved", async () => {
    const failure = await load(fixture("throws")).then(
      () => null,
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(ConfigError)
    expect((failure as ConfigError).message).toMatch(/failed to load/)
    expect(((failure as ConfigError).cause as Error).message).toBe(
      "FAKE_CONFIG_EVAL_FAILURE",
    )
  })

  it("uses a custom flavor exported from the config", async () => {
    const resolved = await load(fixture("custom-flavor"))
    expect(resolved.flavor.classify(["a.ts"]).get("a.ts")?.layer).toBe("model")
  })

  describe("configless", () => {
    let isolated: string | undefined
    afterAll(async () => {
      if (isolated) await rm(isolated, { recursive: true, force: true })
    })

    it("resolves every default with root = cwd and null provenance", async () => {
      isolated = await mkdtemp(join(tmpdir(), "deblob-configless-"))
      const resolved = await load(isolated)
      expect(resolved.configPath).toBeNull()
      expect(resolved.root).toBe(isolated)
      expect(resolved.pureLibs).toEqual([])
      expect(resolved.typeOnlyExempt).toBe(true)
    })
  })
})

describe("readPackageSurface", () => {
  const roots: string[] = []
  const rootWith = async (manifest?: string): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), "deblob-surface-"))
    roots.push(root)
    if (manifest !== undefined) {
      await writeFile(join(root, "package.json"), manifest)
    }
    return root
  }
  afterAll(() =>
    Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    ),
  )

  it("yields null without a package.json — no claim, no check", async () => {
    expect(readPackageSurface(await rootWith())).toBeNull()
  })

  it("yields null without a deblob field — declaring is opting in", async () => {
    const root = await rootWith(
      JSON.stringify({ name: "made-up", exports: "./src/x.service.ts" }),
    )
    expect(readPackageSurface(root)).toBeNull()
  })

  it("flattens a dot-keyed exports map to subpath → targets", async () => {
    const root = await rootWith(
      JSON.stringify({
        name: "made-up",
        deblob: {},
        exports: {
          ".": "./src/index.ts",
          "./checkout.service": {
            types: "./dist/checkout.service.d.ts",
            import: "./dist/checkout.service.js",
            default: null,
          },
          "./legacy": ["./dist/legacy.cjs"],
        },
      }),
    )
    expect(readPackageSurface(root)).toEqual({
      subpaths: [
        { subpath: ".", targets: ["src/index.ts"] },
        {
          subpath: "./checkout.service",
          targets: ["dist/checkout.service.d.ts", "dist/checkout.service.js"],
        },
        { subpath: "./legacy", targets: ["dist/legacy.cjs"] },
      ],
      blob: [],
    })
  })

  it("reads a string exports and a bare conditions object as the root entry", async () => {
    const asString = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: "./src/index.ts" }),
    )
    expect(readPackageSurface(asString)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [],
    })
    const asConditions = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: {},
        exports: { import: "./dist/index.js", require: "./dist/index.cjs" },
      }),
    )
    expect(readPackageSurface(asConditions)).toEqual({
      subpaths: [
        { subpath: ".", targets: ["dist/index.js", "dist/index.cjs"] },
      ],
      blob: [],
    })
  })

  it("a bare string target normalizes; a non-path scalar map yields no entries", async () => {
    const bare = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: "src/index.ts" }),
    )
    expect(readPackageSurface(bare)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [],
    })
    const scalar = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: 42 }),
    )
    expect(readPackageSurface(scalar)).toEqual({ subpaths: [], blob: [] })
  })

  it("rejects a field without an exports map — the map is the surface the field claims; main is not one", async () => {
    for (const manifest of [
      { name: "m", deblob: {} },
      { name: "m", deblob: {}, exports: null },
      { name: "m", deblob: {}, main: "./dist/index.js" },
    ]) {
      const root = await rootWith(JSON.stringify(manifest))
      expect(() => readPackageSurface(root)).toThrowError(
        /declares "deblob" but no "exports" map/,
      )
    }
  })

  it("treats a non-object manifest as empty — a scalar package.json claims nothing", async () => {
    const root = await rootWith("42")
    expect(readPackageSurface(root)).toBeNull()
  })

  it("rejects a non-object field — presence is the claim, as {}", async () => {
    for (const field of ["stock", true, ["x"]]) {
      const root = await rootWith(JSON.stringify({ name: "m", deblob: field }))
      expect(() => readPackageSurface(root)).toThrowError(
        /"deblob" field must be an object/,
      )
    }
  })

  it("rejects keys this version cannot honor — load-bearing at home, loud, never silent", async () => {
    const root = await rootWith(
      JSON.stringify({ name: "m", deblob: { flavor: "SOME_MADE_UP_FLAVOR" } }),
    )
    expect(() => readPackageSurface(root)).toThrowError(
      /"flavor".*honors "blob" only/s,
    )
  })

  it("reads the blob carve-outs — subpath patterns, as written", async () => {
    const root = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: { blob: [".", "./legacy/**"] },
        exports: { ".": "./src/index.ts" },
      }),
    )
    expect(readPackageSurface(root)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [".", "./legacy/**"],
    })
  })

  it("rejects a malformed blob loudly at home — naming the offending value", async () => {
    for (const [blob, offending] of [
      ["./x", '"./x"'],
      [["./ok", "legacy"], '"legacy"'],
      [[42], "42"],
    ] as const) {
      const root = await rootWith(
        JSON.stringify({
          name: "m",
          deblob: { blob },
          exports: { ".": "./src/index.ts" },
        }),
      )
      expect(() => readPackageSurface(root)).toThrowError(
        new RegExp(
          `"deblob"\\.blob must be an array of subpath patterns.*${offending.replace(/[."]/g, "\\$&")} is not`,
          "s",
        ),
      )
    }
  })

  it("rejects an unparseable own manifest loudly — home is not a stranger", async () => {
    const root = await rootWith("{ not json")
    expect(() => readPackageSurface(root)).toThrowError(ConfigError)
  })
})
