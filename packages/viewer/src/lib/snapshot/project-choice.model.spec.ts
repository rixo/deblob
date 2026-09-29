import { describe, expect, it } from "vitest"

import { chooseProject } from "./project-choice.model.ts"

const PROJECTS = [
  { root: "/work/app", name: "app" },
  { root: "/work/lib", name: null },
] as const

describe("chooseProject", () => {
  it("opens on the project shown last, when the server lists it", () => {
    expect(chooseProject(PROJECTS, "/work/lib")).toBe("/work/lib")
  })

  it("opens on the first project listed when none was shown before", () => {
    expect(chooseProject(PROJECTS, null)).toBe("/work/app")
  })

  it("opens on the first project listed when the last one is no longer listed", () => {
    expect(chooseProject(PROJECTS, "/work/gone")).toBe("/work/app")
  })
})
