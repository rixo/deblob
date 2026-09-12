import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, test } from "vitest"

import type { FlavorResolver } from "../../extraction/ports/flavor.port.ts"
import { STOCK_FLAVOR_NAME } from "../../extraction/stock-flavor.model.ts"
import { ConfigError } from "../config.model.ts"
import { overlayLocalConfig, resolveConfig } from "../config.service.ts"
import { createNodeFs } from "../../fs/adapters/node-fs.adapter.ts"
import { createConfigLoader, importConfigDefault } from "./loader.adapter.ts"

const {
  discoverConfig,
  explicitConfigPath,
  readLocalConfig,
  tsconfigPathOf,
  readPackageSurface,
} = createConfigLoader({ fs: createNodeFs() })

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
/** No stock reader: the loader's cases are about the load, not the binding. */
const READERS = {}

/** The assembly sequence (main's loadFor), composed here for the fixture cases. */
const load = async (cwd: string) => {
  const found = await discoverConfig(cwd)
  if (found === null) {
    return resolveConfig(
      {},
      {
        root: cwd,
        configPath: null,
        localPath: null,
        flavors: FLAVORS,
        readers: READERS,
      },
    )
  }
  const { root, configPath, localPath } = found
  const base = configPath === null ? {} : await importConfigDefault(configPath)
  const raw =
    localPath === null
      ? base
      : overlayLocalConfig(base, await readLocalConfig(localPath), localPath)
  return resolveConfig(raw, {
    root,
    configPath,
    localPath,
    flavors: FLAVORS,
    readers: READERS,
  })
}

describe("discoverConfig", () => {
  test("finds the config in cwd — its directory is the root, no overlay beside it", async () => {
    expect(await discoverConfig(fixture("walk"))).toEqual({
      root: fixture("walk"),
      configPath: join(fixture("walk"), "deblob.config.ts"),
      localPath: null,
    })
  })

  test("walks up to the nearest config — never past it", async () => {
    expect(
      (await discoverConfig(fixture("walk/nested/deeper")))?.configPath,
    ).toBe(join(fixture("walk/nested"), "deblob.config.ts"))
  })

  test("rejects two config files in one directory as ambiguity", async () => {
    await expect(discoverConfig(fixture("ambiguous"))).rejects.toThrowError(
      /deblob\.config\.ts and deblob\.config\.js/,
    )
  })
})

describe("explicitConfigPath", () => {
  test("resolves a relative path from cwd, absolute passed through", async () => {
    const absolute = join(fixture("walk"), "deblob.config.ts")
    const expected = {
      root: fixture("walk"),
      configPath: absolute,
      localPath: null,
    }
    expect(
      await explicitConfigPath(fixture("walk/nested"), "../deblob.config.ts"),
    ).toEqual(expected)
    expect(
      await explicitConfigPath(fixture("walk/nested/deeper"), absolute),
    ).toEqual(expected)
  })

  test("a missing explicit path is a teaching error, never a silent fallback", async () => {
    await expect(
      explicitConfigPath(fixture("walk"), "SOME_MADE_UP_PATH.config.ts"),
    ).rejects.toThrowError(/SOME_MADE_UP_PATH.*does not exist/s)
  })
})

describe("the local overlay — deblob.local.json beside the config", () => {
  const roots: string[] = []
  const makeRoot = async (
    files: Readonly<Record<string, string>>,
  ): Promise<string> => {
    const root = await mkdtemp(join(tmpdir(), "deblob-local-"))
    roots.push(root)
    for (const [name, content] of Object.entries(files)) {
      await writeFile(join(root, name), content)
    }
    return root
  }
  afterAll(() =>
    Promise.all(
      roots.map((root) => rm(root, { recursive: true, force: true })),
    ),
  )

  const CONFIG = `export default { pure: ["FAKE_BASE_LIB"], include: ["src/**"] }\n`

  test("discovery reports both files; the merged value resolves, local winning per key", async () => {
    const root = await makeRoot({
      "deblob.config.ts": CONFIG,
      "deblob.local.json": JSON.stringify({
        pure: ["FAKE_LOCAL_LIB"],
        view: { projects: ["../FAKE_CHECKOUT"] },
      }),
    })
    expect(await discoverConfig(root)).toEqual({
      root,
      configPath: join(root, "deblob.config.ts"),
      localPath: join(root, "deblob.local.json"),
    })
    const resolved = await load(root)
    expect(resolved.localPath).toBe(join(root, "deblob.local.json"))
    expect(resolved.pure).toEqual(["FAKE_LOCAL_LIB"])
    expect(resolved.include).toEqual(["src/**"])
    expect(resolved.view.projects).toEqual([
      join(dirname(root), "FAKE_CHECKOUT"),
    ])
  })

  test("a lone local file is a configless project with an overlay — found, never ignored", async () => {
    const root = await makeRoot({
      "deblob.local.json": JSON.stringify({ view: { projects: ["FAKE_PKG"] } }),
    })
    expect(await discoverConfig(join(root))).toEqual({
      root,
      configPath: null,
      localPath: join(root, "deblob.local.json"),
    })
    const resolved = await load(root)
    expect(resolved.configPath).toBeNull()
    expect(resolved.view.projects).toEqual([join(root, "FAKE_PKG")])
  })

  test("the walk stops at the lone local file, never past it to an ancestor config", async () => {
    const root = await makeRoot({ "deblob.config.ts": CONFIG })
    const nested = join(root, "nested")
    await mkdir(nested)
    await writeFile(join(nested, "deblob.local.json"), "{}")
    expect((await discoverConfig(nested))?.root).toBe(nested)
  })

  test("-c finds the overlay beside the explicit config", async () => {
    const root = await makeRoot({
      "deblob.config.ts": CONFIG,
      "deblob.local.json": "{}",
    })
    expect((await explicitConfigPath(root, "deblob.config.ts")).localPath).toBe(
      join(root, "deblob.local.json"),
    )
  })

  test("a local file gone since discovery fails the same way, naming it", async () => {
    const root = await makeRoot({})
    await expect(
      readLocalConfig(join(root, "deblob.local.json")),
    ).rejects.toThrowError(`failed to parse ${join(root, "deblob.local.json")}`)
  })

  test("an unparseable local file fails loud, naming it, cause preserved", async () => {
    const root = await makeRoot({ "deblob.local.json": "{ not json" })
    const failure = await load(root).then(
      () => null,
      (error: unknown) => error,
    )
    expect(failure).toBeInstanceOf(ConfigError)
    expect((failure as ConfigError).message).toBe(
      `failed to parse ${join(root, "deblob.local.json")}`,
    )
    expect((failure as ConfigError).cause).toBeInstanceOf(SyntaxError)
  })

  test("a local key the config vocabulary lacks fails naming the local file", async () => {
    const root = await makeRoot({
      "deblob.local.json": JSON.stringify({ SOME_MADE_UP_KEY: 1 }),
    })
    await expect(load(root)).rejects.toThrowError(
      /unknown key "SOME_MADE_UP_KEY" in .*deblob\.local\.json/,
    )
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

  test("discovers tsconfig.json at the root when undeclared", async () => {
    const root = await makeRoot(true)
    expect(await tsconfigPathOf({ root, tsconfig: undefined })).toBe(
      join(root, "tsconfig.json"),
    )
  })

  test("yields null when undeclared and the root has none", async () => {
    const root = await makeRoot(false)
    expect(await tsconfigPathOf({ root, tsconfig: undefined })).toBeNull()
  })

  test("false disables discovery even when the file exists", async () => {
    const root = await makeRoot(true)
    expect(await tsconfigPathOf({ root, tsconfig: false })).toBeNull()
  })

  test("returns a declared path that exists", async () => {
    const root = await makeRoot(true)
    const declared = join(root, "tsconfig.json")
    expect(await tsconfigPathOf({ root, tsconfig: declared })).toBe(declared)
  })

  test("a declared-but-missing path is a teaching error — declared means load-bearing", async () => {
    const root = await makeRoot(false)
    await expect(
      tsconfigPathOf({ root, tsconfig: join(root, "tsconfig.json") }),
    ).rejects.toThrowError(/"tsconfig".*does not exist/s)
  })
})

describe("importConfigDefault + the assembly sequence", () => {
  test("loads a .ts config natively and resolves it", async () => {
    const resolved = await load(fixture("walk"))
    expect(resolved.pure).toEqual(["FAKE_ROOT_LIB"])
    expect(resolved.root).toBe(fixture("walk"))
    expect(resolved.configPath).toBe(join(fixture("walk"), "deblob.config.ts"))
  })

  test("the nearest config governs a nested cwd — no merge with the ancestor", async () => {
    const resolved = await load(fixture("walk/nested/deeper"))
    expect(resolved.pure).toEqual(["FAKE_NESTED_LIB"])
    expect(resolved.root).toBe(fixture("walk/nested"))
  })

  test("loads .mts, .js and .mjs configs", async () => {
    expect((await load(fixture("mts-config"))).pure).toEqual(["FAKE_MTS_LIB"])
    expect((await load(fixture("js-config"))).pure).toEqual(["FAKE_JS_LIB"])
    expect((await load(fixture("mjs-config"))).pure).toEqual(["FAKE_MJS_LIB"])
  })

  test("rejects a config without a default export, teaching the fix", async () => {
    await expect(load(fixture("no-default"))).rejects.toThrowError(
      /no default export.*defineConfig/s,
    )
  })

  test("wraps an evaluation failure with the config path, cause preserved", async () => {
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

  test("uses a custom flavor exported from the config", async () => {
    const resolved = await load(fixture("custom-flavor"))
    expect(resolved.flavor.classify(["a.ts"]).get("a.ts")?.layer).toBe("model")
  })

  describe("configless", () => {
    let isolated: string | undefined
    afterAll(async () => {
      if (isolated) await rm(isolated, { recursive: true, force: true })
    })

    test("resolves every default with root = cwd and null provenance", async () => {
      isolated = await mkdtemp(join(tmpdir(), "deblob-configless-"))
      const resolved = await load(isolated)
      expect(resolved.configPath).toBeNull()
      expect(resolved.root).toBe(isolated)
      expect(resolved.pure).toEqual([])
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

  test("yields null without a package.json — no claim, no check", async () => {
    expect(await readPackageSurface(await rootWith())).toBeNull()
  })

  test("yields null without a deblob field — declaring is opting in", async () => {
    const root = await rootWith(
      JSON.stringify({ name: "made-up", exports: "./src/x.service.ts" }),
    )
    expect(await readPackageSurface(root)).toBeNull()
  })

  test("flattens a dot-keyed exports map to subpath → targets", async () => {
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
    expect(await readPackageSurface(root)).toEqual({
      subpaths: [
        { subpath: ".", targets: ["src/index.ts"] },
        {
          subpath: "./checkout.service",
          targets: ["dist/checkout.service.d.ts", "dist/checkout.service.js"],
        },
        { subpath: "./legacy", targets: ["dist/legacy.cjs"] },
      ],
      blob: [],
      assembly: [],
    })
  })

  test("reads a string exports and a bare conditions object as the root entry", async () => {
    const asString = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: "./src/index.ts" }),
    )
    expect(await readPackageSurface(asString)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [],
      assembly: [],
    })
    const asConditions = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: {},
        exports: { import: "./dist/index.js", require: "./dist/index.cjs" },
      }),
    )
    expect(await readPackageSurface(asConditions)).toEqual({
      subpaths: [
        { subpath: ".", targets: ["dist/index.js", "dist/index.cjs"] },
      ],
      blob: [],
      assembly: [],
    })
  })

  test("a bare string target normalizes; a non-path scalar map yields no entries", async () => {
    const bare = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: "src/index.ts" }),
    )
    expect(await readPackageSurface(bare)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [],
      assembly: [],
    })
    const scalar = await rootWith(
      JSON.stringify({ name: "m", deblob: {}, exports: 42 }),
    )
    expect(await readPackageSurface(scalar)).toEqual({
      subpaths: [],
      blob: [],
      assembly: [],
    })
  })

  test("rejects a field without an exports map — the map is the surface the field claims; main is not one", async () => {
    for (const manifest of [
      { name: "m", deblob: {} },
      { name: "m", deblob: {}, exports: null },
      { name: "m", deblob: {}, main: "./dist/index.js" },
    ]) {
      const root = await rootWith(JSON.stringify(manifest))
      await expect(readPackageSurface(root)).rejects.toThrowError(
        /declares "deblob" but no "exports" map/,
      )
    }
  })

  test("treats a non-object manifest as empty — a scalar package.json claims nothing", async () => {
    const root = await rootWith("42")
    expect(await readPackageSurface(root)).toBeNull()
  })

  test("rejects a non-object field — presence is the claim, as {}", async () => {
    for (const field of ["stock", true, ["x"]]) {
      const root = await rootWith(JSON.stringify({ name: "m", deblob: field }))
      await expect(readPackageSurface(root)).rejects.toThrowError(
        /"deblob" field must be an object/,
      )
    }
  })

  test("rejects keys this version cannot honor — load-bearing at home, loud, never silent", async () => {
    const root = await rootWith(
      JSON.stringify({ name: "m", deblob: { flavor: "SOME_MADE_UP_FLAVOR" } }),
    )
    await expect(readPackageSurface(root)).rejects.toThrowError(
      /"flavor".*honors "blob" and "assembly" only/s,
    )
  })

  test("reads the blob carve-outs — subpath patterns, as written", async () => {
    const root = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: { blob: [".", "./legacy/**"] },
        exports: { ".": "./src/index.ts" },
      }),
    )
    expect(await readPackageSurface(root)).toEqual({
      subpaths: [{ subpath: ".", targets: ["src/index.ts"] }],
      blob: [".", "./legacy/**"],
      assembly: [],
    })
  })

  test("rejects a malformed blob loudly at home — naming the offending value", async () => {
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
      await expect(readPackageSurface(root)).rejects.toThrowError(
        new RegExp(
          `"deblob"\\.blob must be an array of subpath patterns.*${offending.replace(/[."]/g, "\\$&")} is not`,
          "s",
        ),
      )
    }
  })

  test("reads the assembly designations — the same pattern grammar, its own list", async () => {
    const root = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: { assembly: ["./cli", "./bin/*"], blob: ["./legacy/**"] },
        exports: { "./cli": "./src/cli.ts" },
      }),
    )
    expect(await readPackageSurface(root)).toEqual({
      subpaths: [{ subpath: "./cli", targets: ["src/cli.ts"] }],
      blob: ["./legacy/**"],
      assembly: ["./cli", "./bin/*"],
    })
  })

  test("rejects a malformed assembly list loudly at home — the message names the key", async () => {
    const root = await rootWith(
      JSON.stringify({
        name: "m",
        deblob: { assembly: ["cli"] },
        exports: { "./cli": "./src/cli.ts" },
      }),
    )
    await expect(readPackageSurface(root)).rejects.toThrowError(
      /"deblob"\.assembly must be an array of subpath patterns.*"cli" is not/s,
    )
  })

  test("rejects an unparseable own manifest loudly — home is not a stranger", async () => {
    const root = await rootWith("{ not json")
    await expect(readPackageSurface(root)).rejects.toThrowError(ConfigError)
  })
})
