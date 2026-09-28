import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { dirname, join } from "node:path"

import { afterAll, describe, expect, it } from "vitest"

import { createNodeFs } from "../../fs/adapters/node-fs.adapter.ts"
import type { Resolution } from "../ports/resolver.port.ts"
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
  layerOf: (specifier: string) => Promise<string | null>
  resolvedCount: () => number
}> => {
  const root = await mkdtemp(join(tmpdir(), "deblob-meta-"))
  roots.push(root)
  for (const [path, content] of Object.entries(files)) {
    await mkdir(dirname(join(root, path)), { recursive: true })
    await writeFile(join(root, path), content)
  }
  let resolved = 0
  const resolve = async (
    _from: string,
    specifier: string,
  ): Promise<Resolution> => {
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
    fs: createNodeFs(),
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
    expect(await layerOf("@made-up/billing/checkout.service")).toBe("service")
  })

  it("claims nothing for the bare root — an unlabeled surface, exactly as today", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/@made-up/billing/package.json": AWARE,
        "node_modules/@made-up/billing/src/index.ts": "",
      },
      { "@made-up/billing": "node_modules/@made-up/billing/src/index.ts" },
    )
    expect(await layerOf("@made-up/billing")).toBe(null)
  })

  it("leaves a package without the field unlabeled — no claim to read", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/plain-pkg/package.json": JSON.stringify({
          name: "plain-pkg",
        }),
        "node_modules/plain-pkg/x.service.js": "",
      },
      { "plain-pkg/x.service": "node_modules/plain-pkg/x.service.js" },
    )
    expect(await layerOf("plain-pkg/x.service")).toBe(null)
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
    expect(await layerOf("newer/x.adapter")).toBe("adapters")
  })

  it("claims nothing for a subpath off the exports surface — a deep import around the map is unlabeled", async () => {
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
    expect(await layerOf("@made-up/billing/checkout.service")).toBe("service")
    // the disclosed file reached around its disclosure: not on the surface,
    // so not pure by the field's word either
    expect(await layerOf("@made-up/billing/src/totals.model")).toBe(null)
    expect(await layerOf("@made-up/billing/src/checkout.service")).toBe(null)
    // a pattern key keeps everything under it on the surface
    expect(await layerOf("@made-up/billing/legacy/old.adapter")).toBe(
      "adapters",
    )
  })

  it("classifies a disclosed subpath null even with a suffixed tail — the retraction pin", async () => {
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
    expect(await layerOf("@made-up/billing/old.service")).toBe(null)
    expect(await layerOf("@made-up/billing/legacy/deep/thing.adapter")).toBe(
      null,
    )
    expect(await layerOf("@made-up/billing")).toBe(null)
    // undisclosed siblings still classify
    expect(await layerOf("@made-up/billing/checkout.service")).toBe("service")
  })

  it("classifies an assembly-designated subpath assembly — the producer's word, over the tail", async () => {
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
    expect(await layerOf("@made-up/tool/cli")).toBe("assembly")
    expect(await layerOf("@made-up/tool/bin/deep/run")).toBe("assembly")
    // the designation beats the tail's own suffix
    expect(await layerOf("@made-up/tool/wired.service")).toBe("assembly")
    // blob retracts before assembly is read
    expect(await layerOf("@made-up/tool/bin/legacy")).toBe(null)
    // undesignated siblings still read the stock rule
    expect(await layerOf("@made-up/tool/totals.model")).toBe("model")
  })

  it("reads a malformed assembly list abroad as absent — the tail decides", async () => {
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
    expect(await layerOf("sloppy-tool/cli")).toBe(null)
    expect(await layerOf("sloppy-tool/x.service")).toBe("service")
  })

  it("ignores a field without an exports map abroad, claiming nothing — the provider's error", async () => {
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
    expect(await layerOf("mainonly/x.service")).toBe(null)
  })

  it("reads a malformed blob abroad as absent — a stranger's field never breaks the run", async () => {
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
    expect(await layerOf("sloppy/x.service")).toBe("service")
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
    expect(await layerOf("marked/x.model")).toBe("model")
  })

  it("walks past a scalar manifest — valid JSON, no package there", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/scalar/package.json": "42",
        "node_modules/scalar/x.service.js": "",
      },
      { "scalar/x.service": "node_modules/scalar/x.service.js" },
    )
    expect(await layerOf("scalar/x.service")).toBe(null)
  })

  it("degrades to unlabeled on a stranger's broken manifest — never breaks the run", async () => {
    const { layerOf } = await workspace(
      {
        "node_modules/broken/package.json": "{ not json",
        "node_modules/broken/x.service.js": "",
      },
      { "broken/x.service": "node_modules/broken/x.service.js" },
    )
    expect(await layerOf("broken/x.service")).toBe(null)
  })

  it("yields no claim for relative specifiers, builtins, and unresolvable packages", async () => {
    const { layerOf } = await workspace({}, {})
    expect(await layerOf("./local/thing.service")).toBe(null)
    expect(await layerOf("node:path")).toBe(null)
    expect(await layerOf("@made-up/ghost/x.service")).toBe(null)
  })

  it("yields no claim when nothing up the tree carries a named manifest", async () => {
    const { layerOf } = await workspace(
      { "stray/x.service.js": "" },
      { "stray-pkg/x.service": "stray/x.service.js" },
    )
    expect(await layerOf("stray-pkg/x.service")).toBe(null)
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
    expect(await layerOf("@made-up/billing/checkout.service")).toBe("service")
    expect(await layerOf("@made-up/billing/totals.model")).toBe("model")
    expect(await layerOf("@made-up/billing")).toBe(null)
    expect(resolvedCount()).toBe(1)
  })

  it("reads the claim from the next subpath when one resolves to no file — that one teaches nothing", async () => {
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
    expect(await layerOf("@made-up/billing/theme.css")).toBe(null)
    expect(await layerOf("@made-up/billing/checkout.service")).toBe("service")
    // the unreached probe was not cached; the reached one is
    expect(await layerOf("@made-up/billing/totals.model")).toBe("model")
    expect(resolvedCount()).toBe(2)
  })
})
