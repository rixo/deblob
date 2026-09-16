import { expect, test } from "vitest"

import { createPlainTsTech } from "./plain-ts-tech.adapter.ts"

test("reads the three plain-TypeScript kinds, claims no package, exempts nothing", () => {
  const tech = createPlainTsTech()
  expect(tech.name).toBe("plain-ts")
  expect(tech.kinds).toEqual(["assembly", "driver", "boot"])
  expect(tech.claims("some-made-up-parser")).toBe(false)
  expect(tech.claims("node:fs")).toBe(false)
  expect(tech.exempts).toEqual([])
})
