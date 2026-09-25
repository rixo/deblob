import { expect, test } from "vitest"

import { createGoodEnoughTestsReader } from "./good-enough-tests-reader.adapter.ts"

test("binds the test naming, reads the test kind only, claims the runners it knows by package, exempts the four", () => {
  const reader = createGoodEnoughTestsReader()
  expect(reader.name).toBe("good-enough-tests")
  expect(reader.files).toEqual([
    "**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
    "**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
  ])
  expect(reader.kinds).toEqual(["test"])
  expect(reader.claims("vitest")).toBe(true)
  expect(reader.claims("@jest/globals")).toBe(true)
  expect(reader.claims("node:test")).toBe(true)
  expect(reader.claims("vitest/config")).toBe(true)
  expect(reader.claims("some-made-up-runner")).toBe(false)
  expect(reader.claims("./local.ts")).toBe(false)
  expect(reader.exempts).toEqual([
    "registration",
    "call-count",
    "services-only",
    "definitions",
  ])
})
