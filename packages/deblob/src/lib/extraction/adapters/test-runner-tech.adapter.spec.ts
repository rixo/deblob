import { expect, test } from "vitest"

import { createTestRunnerTech } from "./test-runner-tech.adapter.ts"

test("reads the test kind, claims the runners it knows by package, exempts the four", () => {
  const tech = createTestRunnerTech()
  expect(tech.name).toBe("test-runner")
  expect(tech.kinds).toEqual(["test"])
  expect(tech.claims("vitest")).toBe(true)
  expect(tech.claims("@jest/globals")).toBe(true)
  expect(tech.claims("node:test")).toBe(true)
  expect(tech.claims("vitest/config")).toBe(true)
  expect(tech.claims("some-made-up-runner")).toBe(false)
  expect(tech.claims("./local.ts")).toBe(false)
  expect(tech.exempts).toEqual([
    "registration",
    "call-count",
    "services-only",
    "definitions",
  ])
})
