import { describe, expect, it } from "vitest"

import { isTechPackage } from "./tech.model.ts"
import {
  createAstroReader,
  createViteReader,
} from "./framework-readers.model.ts"

describe("createViteReader", () => {
  it("claims vite by package, a relative path never", () => {
    const reader = createViteReader({ include: ["src/plugin/**"] })
    expect(reader).toMatchObject({ name: "vite", include: ["src/plugin/**"] })
    expect(isTechPackage(reader.tech, "vite")).toBe(true)
    expect(isTechPackage(reader.tech, "./vite.ts")).toBe(false)
  })
})

describe("createAstroReader", () => {
  it("claims astro, its subpaths and its virtual modules", () => {
    const reader = createAstroReader()
    expect(isTechPackage(reader.tech, "astro/middleware")).toBe(true)
    expect(isTechPackage(reader.tech, "astro:middleware")).toBe(true)
    expect(isTechPackage(reader.tech, "svelte")).toBe(false)
  })
})
