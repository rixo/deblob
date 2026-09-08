import { describe, expect, test } from "vitest"

import { defineConfig } from "./index.ts"

describe("public surface", () => {
  test("exports defineConfig", () => {
    const config = { pureLibs: ["some-fake-lib"] }
    expect(defineConfig(config)).toBe(config)
  })
})
