import { describe, expect, it, test } from "vitest"

import { STOCK_FLAVOR_NAME } from "../stock-flavor.model.ts"
import {
  createStockFlavors,
  createTsSuffixesFactoriesFlavor,
  isStockFactoryName,
} from "./ts-suffixes-factories-flavor.adapter.ts"

const classify = (files: string[]) =>
  createTsSuffixesFactoriesFlavor().classify({ files })

describe("stock flavor registry", () => {
  it("yields this flavor under the stock name", () => {
    const flavor = createStockFlavors()[STOCK_FLAVOR_NAME]?.()
    const result = flavor?.classify({ files: ["icons/icons.model.ts"] })
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

  it("classifies the outside kinds by suffix — assembly, driver, boot", () => {
    const result = classify([
      "src/cli.assembly.ts",
      "src/cli.driver.ts",
      "src/cli.boot.ts",
      "src/assembly/wire.ts",
    ])
    expect(result.get("src/cli.assembly.ts")?.layer).toBe("assembly")
    expect(result.get("src/cli.driver.ts")?.layer).toBe("driver")
    expect(result.get("src/cli.boot.ts")?.layer).toBe("boot")
    // a directory name is not a suffix — designation is the config's
    expect(result.get("src/assembly/wire.ts")?.layer).toBe("blob")
  })

  it("marks no service root for the outside kinds — a driver directory is not a service", () => {
    const result = classify([
      "src/drivers/cli/cli.driver.ts",
      "src/drivers/cli/cli.boot.ts",
      "src/drivers/cli/cli.assembly.ts",
      "src/drivers/cli/notes.ts",
    ])
    for (const [, classification] of result) {
      expect(classification.serviceRoot).toBeNull()
    }
  })

  it("attributes an outside-kind file to an enclosing service root like any file", () => {
    const result = classify([
      "src/lib/cli/cli.service.ts",
      "src/lib/cli/cli.assembly.ts",
    ])
    expect(result.get("src/lib/cli/cli.assembly.ts")?.serviceRoot).toBe(
      "src/lib/cli",
    )
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
    const result = classify([
      "icons/ports/icon-source.port.ts",
      "fonts/private/adapters/font-source.adapter.ts",
    ])
    expect(result.get("icons/ports/icon-source.port.ts")?.serviceRoot).toBe(
      "icons",
    )
    expect(
      result.get("fonts/private/adapters/font-source.adapter.ts")?.serviceRoot,
    ).toBe("fonts")
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

  it("names test files — .spec, .test, .e2e — filed under their service; __tests__ alone names nothing", () => {
    const result = classify([
      "icons/icons.model.spec.ts",
      "icons/loader.test.ts",
      "icons/icons.model.ts",
      "icons/ports/icon-source.spec.ts",
      "icons/private/scoring.test.ts",
      "icons/render.e2e.ts",
      "icons/__tests__/helpers.ts",
    ])
    expect(result.get("icons/icons.model.spec.ts")?.layer).toBe("test")
    expect(result.get("icons/loader.test.ts")?.layer).toBe("test")
    expect(result.get("icons/render.e2e.ts")?.layer).toBe("test")
    expect(result.get("icons/__tests__/helpers.ts")?.layer).toBe("blob")
    expect(result.get("icons/icons.model.spec.ts")?.serviceRoot).toBe("icons")
    expect(result.get("icons/ports/icon-source.spec.ts")).toEqual({
      layer: "test",
      serviceRoot: "icons",
      isPrivate: false,
    })
    expect(result.get("icons/private/scoring.test.ts")).toEqual({
      layer: "test",
      serviceRoot: "icons",
      isPrivate: true,
    })
  })

  it("does not let a spec file's layered stem mark a service root", () => {
    const result = classify(["icons/icons.service.spec.ts", "icons/util.ts"])
    expect(result.get("icons/util.ts")?.serviceRoot).toBe(null)
    expect(result.get("icons/icons.service.spec.ts")?.layer).toBe("test")
  })

  it("keeps .svelte and unknown suffixes blob", () => {
    const result = classify(["src/widget.svelte", "src/foo.specs.ts"])
    expect(result.get("src/widget.svelte")?.layer).toBe("blob")
    expect(result.get("src/foo.specs.ts")?.layer).toBe("blob")
  })
})

describe("the factory naming rule — `create` followed by a capital", () => {
  it("names the guide's factories", () => {
    expect(isStockFactoryName("createSomeMadeUpService")).toBe(true)
    expect(isStockFactoryName("createX")).toBe(true)
  })

  it("names nothing else: bare, lowercase continuation, other prefixes, the default export", () => {
    expect(isStockFactoryName("create")).toBe(false)
    expect(isStockFactoryName("createdAt")).toBe(false)
    expect(isStockFactoryName("creates")).toBe(false)
    expect(isStockFactoryName("initSomething")).toBe(false)
    expect(isStockFactoryName("makeThing")).toBe(false)
    expect(isStockFactoryName("default")).toBe(false)
  })

  test("the flavor's isFactory answers as isStockFactoryName", () => {
    const flavor = createTsSuffixesFactoriesFlavor()
    expect(flavor.isFactory?.({ name: "createThing" })).toBe(true)
    expect(flavor.isFactory?.({ name: "makeThing" })).toBe(false)
  })
})
