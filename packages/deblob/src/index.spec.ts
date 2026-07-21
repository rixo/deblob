import { describe, expect, it } from "vitest"

import { defineConfig } from "./index.ts"

describe("public surface", () => {
  it("exports defineConfig", () => {
    const config = { pureLibs: ["some-fake-lib"] }
    expect(defineConfig(config)).toBe(config)
  })
})
