import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import type { Resolution } from "../ports/extraction.port.ts"
import { classifyStockEntry } from "./ts-suffixes-factories-flavor.adapter.ts"
import { createPackageMetaReader } from "./package-meta.adapter.ts"

const roots: string[] = []
afterAll(() =>
  Promise.all(roots.map((root) => rm(root, { recursive: true, force: true }))),
)

/**
 * An on-disk fake package tree plus a resolver stub mapping specifiers to files
 * inside it — the reader sees packages exactly through the resolver.
 */
const workspace = async (
  files: Record<string, string>,
  resolveTo: Record<string, string>,
): Promise<{
  layerOf: (specifier: string) => string | null
  resolvedCount: () => number
}> => {
  const root = await mkdtemp(join(tmpdir(), "deblob-meta-"))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  let resolved = 0
  const resolve = (_from: string, specifier: string): Resolution => {
    resolved += 1
    if (specifier.startsWith("node:")) {
      return { kind: "builtin", specifier }
    }
    const target = resolveTo[specifier]
    return target === undefined
      ? { kind: "unresolved", reason: "fake: not mapped" }
      : { kind: "file", path: join(root, target) }
  }
  const reader = createPackageMetaReader({
    resolve,
    anchor: join(root, "package.json"),
    classifyEntry: classifyStockEntry,
  })
  return { layerOf: reader.layerOf, resolvedCount: () => resolved }
}

const AWARE = JSON.stringify({
  name: "@made-up/billing",
  deblob: {},
  exports: { ".": "./src/index.ts", "./*": "./src/*.ts" },
})

describe("createPackageMetaReader", () => {
  it("classifies a subpath of a deblob-aware package by the stock naming rule", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": AWARE,
        "node_modules/@made-up/billing/src/checkout.service.ts": "",
      },
      {
        "@made-up/billing/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
      },
    )
    expect(layerOf("@made-up/billing/checkout.service")).toBe("service")
  })

  it("the bare root claims nothing — an unlabeled surface, exactly as today", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": AWARE,
        "node_modules/@made-up/billing/src/index.ts": "",
      },
      { "@made-up/billing": "node_modules/@made-up/billing/src/index.ts" },
    )
    expect(layerOf("@made-up/billing")).toBe(null)
  })

  it("a package without the field stays unlabeled — no claim to read", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/plain-pkg/package.json": JSON.stringify({
          name: "plain-pkg",
        }),
        "node_modules/plain-pkg/x.service.js": "",
      },
      { "plain-pkg/x.service": "node_modules/plain-pkg/x.service.js" },
    )
    expect(layerOf("plain-pkg/x.service")).toBe(null)
  })

  it("honors presence over keys it does not understand — a newer producer stays readable", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/newer/package.json": JSON.stringify({
          name: "newer",
          deblob: { SOME_FUTURE_KEY: true },
          exports: { "./x.adapter": "./x.adapter.js" },
        }),
        "node_modules/newer/x.adapter.js": "",
      },
      { "newer/x.adapter": "node_modules/newer/x.adapter.js" },
    )
    expect(layerOf("newer/x.adapter")).toBe("adapters")
  })

  it("a subpath off the exports surface claims nothing — a deep import around the map is unlabeled", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": JSON.stringify({
          name: "@made-up/billing",
          deblob: { blob: ["./totals.model"] },
          exports: {
            "./checkout.service": "./src/checkout.service.ts",
            "./totals.model": "./src/totals.model.ts",
            "./legacy/*": "./src/legacy/*.ts",
          },
        }),
        "node_modules/@made-up/billing/src/checkout.service.ts": "",
        "node_modules/@made-up/billing/src/totals.model.ts": "",
        "node_modules/@made-up/billing/src/legacy/old.adapter.ts": "",
      },
      {
        "@made-up/billing/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
        // an alias into source resolves what Node's map would refuse
        "@made-up/billing/src/totals.model":
          "node_modules/@made-up/billing/src/totals.model.ts",
        "@made-up/billing/src/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
        "@made-up/billing/legacy/old.adapter":
          "node_modules/@made-up/billing/src/legacy/old.adapter.ts",
      },
    )
    expect(layerOf("@made-up/billing/checkout.service")).toBe("service")
    // the disclosed file reached around its disclosure: not on the surface,
    // so not pure by the field's word either
    expect(layerOf("@made-up/billing/src/totals.model")).toBe(null)
    expect(layerOf("@made-up/billing/src/checkout.service")).toBe(null)
    // a pattern key keeps everything under it on the surface
    expect(layerOf("@made-up/billing/legacy/old.adapter")).toBe("adapters")
  })

  it("a disclosed subpath classifies null even with a suffixed tail — the retraction pin", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": JSON.stringify({
          name: "@made-up/billing",
          deblob: { blob: [".", "./legacy/**", "./old.service"] },
          exports: { ".": "./src/index.ts", "./*": "./src/*.ts" },
        }),
        "node_modules/@made-up/billing/src/checkout.service.ts": "",
        "node_modules/@made-up/billing/src/old.service.ts": "",
      },
      {
        "@made-up/billing/old.service":
          "node_modules/@made-up/billing/src/old.service.ts",
        "@made-up/billing/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
      },
    )
    expect(layerOf("@made-up/billing/old.service")).toBe(null)
    expect(layerOf("@made-up/billing/legacy/deep/thing.adapter")).toBe(null)
    expect(layerOf("@made-up/billing")).toBe(null)
    // undisclosed siblings still classify
    expect(layerOf("@made-up/billing/checkout.service")).toBe("service")
  })

  it("an assembly-designated subpath classifies assembly — the producer's word, over the tail", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/tool/package.json": JSON.stringify({
          name: "@made-up/tool",
          deblob: {
            assembly: ["./cli", "./bin/**", "./wired.service"],
            blob: ["./bin/legacy"],
          },
          exports: { "./*": "./src/*.ts" },
        }),
        "node_modules/@made-up/tool/src/cli.ts": "",
      },
      { "@made-up/tool/cli": "node_modules/@made-up/tool/src/cli.ts" },
    )
    expect(layerOf("@made-up/tool/cli")).toBe("assembly")
    expect(layerOf("@made-up/tool/bin/deep/run")).toBe("assembly")
    // the designation beats the tail's own suffix
    expect(layerOf("@made-up/tool/wired.service")).toBe("assembly")
    // blob retracts before assembly is read
    expect(layerOf("@made-up/tool/bin/legacy")).toBe(null)
    // undesignated siblings still read the stock rule
    expect(layerOf("@made-up/tool/totals.model")).toBe("model")
  })

  it("a malformed assembly list abroad reads as absent — the tail decides", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/sloppy-tool/package.json": JSON.stringify({
          name: "sloppy-tool",
          deblob: { assembly: "./cli" },
          exports: { "./*": "./*.js" },
        }),
        "node_modules/sloppy-tool/cli.js": "",
      },
      { "sloppy-tool/cli": "node_modules/sloppy-tool/cli.js" },
    )
    expect(layerOf("sloppy-tool/cli")).toBe(null)
    expect(layerOf("sloppy-tool/x.service")).toBe("service")
  })

  it("a field without an exports map is the provider's error — ignored abroad, no claim", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/mainonly/package.json": JSON.stringify({
          name: "mainonly",
          deblob: {},
          main: "./index.js",
        }),
        "node_modules/mainonly/x.service.js": "",
      },
      { "mainonly/x.service": "node_modules/mainonly/x.service.js" },
    )
    expect(layerOf("mainonly/x.service")).toBe(null)
  })

  it("a malformed blob abroad reads as absent — a stranger's field never breaks the run", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/sloppy/package.json": JSON.stringify({
          name: "sloppy",
          deblob: { blob: "./x.service" },
          exports: { "./x.service": "./x.service.js" },
        }),
        "node_modules/sloppy/x.service.js": "",
      },
      { "sloppy/x.service": "node_modules/sloppy/x.service.js" },
    )
    expect(layerOf("sloppy/x.service")).toBe("service")
  })

  it("steps over nameless type-marker manifests to the owning package", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/marked/package.json": JSON.stringify({
          name: "marked",
          deblob: {},
          exports: { "./*": "./dist/*.js" },
        }),
        "node_modules/marked/dist/package.json": JSON.stringify({
          type: "module",
        }),
        "node_modules/marked/dist/x.model.js": "",
      },
      { "marked/x.model": "node_modules/marked/dist/x.model.js" },
    )
    expect(layerOf("marked/x.model")).toBe("model")
  })

  it("walks past a scalar manifest — valid JSON, no package there", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/scalar/package.json": "42",
        "node_modules/scalar/x.service.js": "",
      },
      { "scalar/x.service": "node_modules/scalar/x.service.js" },
    )
    expect(layerOf("scalar/x.service")).toBe(null)
  })

  it("degrades to unlabeled on a stranger's broken manifest — never breaks the run", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/broken/package.json": "{ not json",
        "node_modules/broken/x.service.js": "",
      },
      { "broken/x.service": "node_modules/broken/x.service.js" },
    )
    expect(layerOf("broken/x.service")).toBe(null)
  })

  it("yields no claim for relative specifiers, builtins, and unresolvable packages", async () => {
    const { layerOf } = await workspace({}, {})
    expect(layerOf("./local/thing.service")).toBe(null)
    expect(layerOf("node:path")).toBe(null)
    expect(layerOf("@made-up/ghost/x.service")).toBe(null)
  })

  it("yields no claim when nothing up the tree carries a named manifest", async () => {
    const { layerOf } = await workspace(
      { "stray/x.service.js": "" },
      { "stray-pkg/x.service": "stray/x.service.js" },
    )
    expect(layerOf("stray-pkg/x.service")).toBe(null)
  })

  it("caches per package name — one probe serves every subpath", async () => {
    const { layerOf, resolvedCount } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": AWARE,
        "node_modules/@made-up/billing/src/checkout.service.ts": "",
      },
      {
        "@made-up/billing/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
      },
    )
    expect(layerOf("@made-up/billing/checkout.service")).toBe("service")
    expect(layerOf("@made-up/billing/totals.model")).toBe("model")
    expect(layerOf("@made-up/billing")).toBe(null)
    expect(resolvedCount()).toBe(1)
  })

  it("a subpath that resolves to no file teaches nothing — the claim is read from the next one", async () => {
    // order pin: a stray or declared-external subpath seen first (a stylesheet
    // the environment provides) must not blank the package's claim
    const { layerOf, resolvedCount } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": AWARE,
        "node_modules/@made-up/billing/src/checkout.service.ts": "",
      },
      {
        "@made-up/billing/checkout.service":
          "node_modules/@made-up/billing/src/checkout.service.ts",
      },
    )
    expect(layerOf("@made-up/billing/theme.css")).toBe(null)
    expect(layerOf("@made-up/billing/checkout.service")).toBe("service")
    // the unreached probe was not cached; the reached one is
    expect(layerOf("@made-up/billing/totals.model")).toBe("model")
    expect(resolvedCount()).toBe(2)
  })
})
