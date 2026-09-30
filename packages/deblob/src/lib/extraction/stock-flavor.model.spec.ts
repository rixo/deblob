import { describe, expect, it } from "vitest"

import { classifyStockEntry } from "./stock-flavor.model.ts"

describe("classifyStockEntry — the naming rule over subpath and specifier tails", () => {
  it("classifies each layer suffix on an extensionless tail", () => {
    expect(classifyStockEntry("checkout.service")).toBe("service")
    expect(classifyStockEntry("totals.model")).toBe("model")
    expect(classifyStockEntry("store.port")).toBe("ports")
    expect(classifyStockEntry("stripe.adapter")).toBe("adapters")
    expect(classifyStockEntry("cli.assembly")).toBe("assembly")
    expect(classifyStockEntry("cli.driver")).toBe("driver")
    expect(classifyStockEntry("cli.boot")).toBe("boot")
  })

  it("reads exports-map subpaths as written — ./ prefix and nesting", () => {
    expect(classifyStockEntry("./checkout.service")).toBe("service")
    expect(classifyStockEntry("./nested/totals.model")).toBe("model")
  })

  it("sees through an extension — dist artifacts and typed entries included", () => {
    expect(classifyStockEntry("checkout.service.js")).toBe("service")
    expect(classifyStockEntry("dist/checkout.service.mjs")).toBe("service")
    expect(classifyStockEntry("src/stripe.adapter.ts")).toBe("adapters")
    expect(classifyStockEntry("checkout.service.d.ts")).toBe("service")
    expect(classifyStockEntry("checkout.service.d.mts")).toBe("service")
  })

  it("claims nothing for unsuffixed tails — the bare root included", () => {
    expect(classifyStockEntry("")).toBe(null)
    expect(classifyStockEntry(".")).toBe(null)
    expect(classifyStockEntry("./")).toBe(null)
    expect(classifyStockEntry("checkout")).toBe(null)
    expect(classifyStockEntry("dist/index.js")).toBe(null)
  })

  it("claims nothing for a suffix no list names — the set is the record, no census (tripwire)", () => {
    expect(classifyStockEntry("thing.mega-widget")).toBe(null)
    expect(classifyStockEntry("x.spec")).toBe(null)
    expect(classifyStockEntry("x.helper.js")).toBe(null)
  })
})
