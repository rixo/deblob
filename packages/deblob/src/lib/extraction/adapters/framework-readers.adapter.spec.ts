import { describe, expect, it } from "vitest"

import {
  createAstroReader,
  createViteReader,
} from "./framework-readers.adapter.ts"

describe("createViteReader", () => {
  it("claims vite by package, a relative path never", () => {
    const reader = createViteReader({ include: ["src/plugin/**"] })
    expect(reader).toMatchObject({ name: "vite", include: ["src/plugin/**"] })
    expect(reader.claims("vite")).toBe(true)
    expect(reader.claims("./vite.ts")).toBe(false)
  })
})

describe("createAstroReader", () => {
  it("claims astro, its subpaths and its virtual modules", () => {
    const reader = createAstroReader()
    expect(reader.claims("astro/middleware")).toBe(true)
    expect(reader.claims("astro:middleware")).toBe(true)
    expect(reader.claims("svelte")).toBe(false)
  })
})
