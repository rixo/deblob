import { describe, expect, it } from "vitest"

import { createMemoryViewStore } from "./memory-view-store.adapter.ts"

describe("createMemoryViewStore", () => {
  it("gives back what was saved for a project, as it was", () => {
    const store = createMemoryViewStore()
    const view = {
      map: { camera: { k: 1.4, x: 60, y: 90 } },
      host: { depth: 2 },
    }

    store.save("/work/app", view)

    expect(store.load("/work/app")).toEqual(view)
  })

  it("keeps each project apart, and knows nothing of a project never saved", () => {
    const store = createMemoryViewStore()

    store.save("/work/app", { depth: 2 })

    expect(store.load("/work/lib")).toBeNull()
    expect(store.load("/work/app")).toEqual({ depth: 2 })
  })
})
