import { describe, expect, it } from "vitest"

import { STOCK_FLAVOR_NAME } from "../../config/config.model.ts"
import {
  STOCK_FLAVORS,
  createTsSuffixesFactoriesFlavor,
} from "./ts-suffixes-factories-flavor.adapter.ts"

const classify = (files: string[]) =>
  createTsSuffixesFactoriesFlavor().classify(files)

describe("stock flavor registry", () => {
  it("yields this flavor under the stock name", () => {
    const flavor = STOCK_FLAVORS[STOCK_FLAVOR_NAME]?.()
    const result = flavor?.classify(["icons/icons.model.ts"])
    expect(result?.get("icons/icons.model.ts")?.layer).toBe("model")
  })
})

describe("ts-suffixes-factories flavor", () => {
  it("classifies each layer suffix to its layer", () => {
    const result = classify([
      "icons/icons.model.ts",
      "icons/icons.service.ts",
      "icons/icon-source.port.ts",
      "icons/fs-source.adapter.ts",
    ])
    expect(result.get("icons/icons.model.ts")?.layer).toBe("model")
    expect(result.get("icons/icons.service.ts")?.layer).toBe("service")
    expect(result.get("icons/icon-source.port.ts")?.layer).toBe("ports")
    expect(result.get("icons/fs-source.adapter.ts")?.layer).toBe("adapters")
  })

  it("classifies every file of the set — none skipped", () => {
    const files = ["a/a.model.ts", "b/readme.md", "c.ts"]
    const result = classify(files)
    expect([...result.keys()].sort()).toEqual([...files].sort())
  })

  it("classifies unsuffixed files as blob", () => {
    const result = classify(["src/util.ts"])
    expect(result.get("src/util.ts")).toEqual({
      layer: "blob",
      serviceRoot: null,
      isPrivate: false,
    })
  })

  it("classifies unknown shapes as blob, never an error (open-set tripwire)", () => {
    const result = classify([
      "src/foo.helper.ts",
      "src/widget.svelte",
      "src/data.json",
    ])
    expect(result.get("src/foo.helper.ts")?.layer).toBe("blob")
    expect(result.get("src/widget.svelte")?.layer).toBe("blob")
    expect(result.get("src/data.json")?.layer).toBe("blob")
  })

  it("never yields assembly from source naming — designation is the caller's", () => {
    const result = classify(["src/main.assembly.ts", "src/assembly/wire.ts"])
    for (const [, classification] of result) {
      expect(classification.layer).not.toBe("assembly")
    }
  })

  it("attributes a file to the nearest ancestor service root", () => {
    const result = classify(["icons/icons.service.ts", "icons/notes.ts"])
    expect(result.get("icons/notes.ts")).toEqual({
      layer: "blob",
      serviceRoot: "icons",
      isPrivate: false,
    })
  })

  it("does not count a layer grouping dir as a service root", () => {
    const result = classify([
      "icons/icons.service.ts",
      "icons/ports/icon-source.port.ts",
    ])
    expect(result.get("icons/ports/icon-source.port.ts")?.serviceRoot).toBe(
      "icons",
    )
  })

  it("attributes through a chain of grouping dirs when the service dir has no direct layer file", () => {
    const result = classify(["icons/ports/icon-source.port.ts"])
    expect(result.get("icons/ports/icon-source.port.ts")?.serviceRoot).toBe(
      "icons",
    )
  })

  it("treats a repo-root layer file as belonging to the root service", () => {
    const result = classify(["app.model.ts"])
    expect(result.get("app.model.ts")?.serviceRoot).toBe(".")
  })

  it("marks private/ subtree membership", () => {
    const result = classify([
      "icons/icons.service.ts",
      "icons/private/scoring.model.ts",
    ])
    expect(result.get("icons/private/scoring.model.ts")).toEqual({
      layer: "model",
      serviceRoot: "icons",
      isPrivate: true,
    })
  })

  it("gives a nested service its own root", () => {
    const result = classify([
      "icons/icons.service.ts",
      "icons/manifest/manifest.adapter.ts",
      "icons/manifest/manifest.model.ts",
    ])
    expect(result.get("icons/manifest/manifest.adapter.ts")?.serviceRoot).toBe(
      "icons/manifest",
    )
    expect(result.get("icons/manifest/manifest.model.ts")?.serviceRoot).toBe(
      "icons/manifest",
    )
  })

  it("gives a nested service under private/ its own root, still private", () => {
    const result = classify([
      "icons/icons.service.ts",
      "icons/private/manifest/manifest.service.ts",
    ])
    expect(result.get("icons/private/manifest/manifest.service.ts")).toEqual({
      layer: "service",
      serviceRoot: "icons/private/manifest",
      isPrivate: true,
    })
  })

  it("classifies test files as assembly — rule 16, the flavor's opinion", () => {
    const result = classify([
      "icons/icons.model.spec.ts",
      "icons/loader.test.ts",
      "icons/icons.model.ts",
    ])
    expect(result.get("icons/icons.model.spec.ts")?.layer).toBe("assembly")
    expect(result.get("icons/loader.test.ts")?.layer).toBe("assembly")
    expect(result.get("icons/icons.model.spec.ts")?.serviceRoot).toBe("icons")
  })

  it("classifies test files as assembly inside grouping dirs too", () => {
    const result = classify([
      "icons/icons.service.ts",
      "icons/ports/icon-source.spec.ts",
      "icons/private/scoring.test.ts",
    ])
    expect(result.get("icons/ports/icon-source.spec.ts")).toEqual({
      layer: "assembly",
      serviceRoot: "icons",
      isPrivate: false,
    })
    expect(result.get("icons/private/scoring.test.ts")).toEqual({
      layer: "assembly",
      serviceRoot: "icons",
      isPrivate: true,
    })
  })

  it("classifies test naming across the same extension set as layer suffixes", () => {
    const result = classify(["a/x.spec.tsx", "a/y.test.mjs", "a/z.spec.cts"])
    for (const [, classification] of result) {
      expect(classification.layer).toBe("assembly")
    }
  })

  it("does not let a test file mark a service root", () => {
    const result = classify(["icons/icons.service.spec.ts", "icons/util.ts"])
    expect(result.get("icons/util.ts")?.serviceRoot).toBe(null)
  })

  it("keeps .svelte and unknown suffixes blob — test naming is a closed carve-out", () => {
    const result = classify(["src/widget.svelte", "src/foo.specs.ts"])
    expect(result.get("src/widget.svelte")?.layer).toBe("blob")
    expect(result.get("src/foo.specs.ts")?.layer).toBe("blob")
  })
})
