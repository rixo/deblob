import { expect, test } from "vitest"

import { createPlainTsReader } from "./plain-ts-reader.adapter.ts"

test("binds every script file, reads the three plain-TypeScript kinds, claims no package, exempts nothing", () => {
  const reader = createPlainTsReader()
  expect(reader.name).toBe("plain-ts")
  expect(reader.files).toEqual(["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"])
  expect(reader.kinds).toEqual(["assembly", "driver", "boot"])
  expect(reader.claims("some-made-up-parser")).toBe(false)
  expect(reader.claims("node:fs")).toBe(false)
  expect(reader.exempts).toEqual([])
})
