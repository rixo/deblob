import { describe, expect, it } from "vitest"

import { createMemoryLastProject } from "./memory-last-project.adapter.ts"

describe("createMemoryLastProject", () => {
  it("knows nothing before a save, then the last root saved", () => {
    const last = createMemoryLastProject()
    expect(last.load()).toBeNull()

    last.save("/work/app")
    last.save("/work/lib")

    expect(last.load()).toBe("/work/lib")
  })
})
