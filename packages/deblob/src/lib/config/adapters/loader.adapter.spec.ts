import { mkdtemp, rm } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { fileURLToPath } from "node:url"

import { afterAll, describe, expect, it } from "vitest"

import type { FlavorResolver } from "../../extraction/ports/flavor.port.ts"
import { ConfigError, STOCK_FLAVOR_NAME } from "../config.model.ts"
import { discoverConfig, loadConfig } from "./loader.adapter.ts"

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

const load = (cwd: string) => loadConfig({ cwd, flavors: FLAVORS })

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

describe("loadConfig", () => {
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
