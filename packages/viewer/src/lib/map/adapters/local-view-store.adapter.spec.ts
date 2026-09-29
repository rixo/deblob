import { afterEach, describe, expect, it } from "vitest"

import { createLocalViewStore } from "./local-view-store.adapter.ts"

afterEach(() => localStorage.clear())

describe("createLocalViewStore", () => {
  it("gives back what was saved for a project, as it was", () => {
    const store = createLocalViewStore(localStorage)
    const view = {
      map: { camera: { k: 1.4, x: 60, y: 90 } },
      host: { depth: 2 },
    }

    store.save("/work/app", view)

    expect(store.load("/work/app")).toEqual(view)
  })

  it("keeps each project apart, and knows nothing of a project never saved", () => {
    const store = createLocalViewStore(localStorage)

    store.save("/work/app", { depth: 2 })

    expect(store.load("/work/lib")).toBeNull()
    expect(store.load("/work/app")).toEqual({ depth: 2 })
  })

  it("keeps a project's view across stores: what a reload finds", () => {
    createLocalViewStore(localStorage).save("/work/app", { depth: 1 })

    expect(createLocalViewStore(localStorage).load("/work/app")).toEqual({
      depth: 1,
    })
    expect(localStorage.getItem("deblob.view.v1:/work/app")).toBe('{"depth":1}')
  })

  it("reads an entry that does not parse as nothing kept", () => {
    localStorage.setItem("deblob.view.v1:/work/app", "{not json")

    expect(createLocalViewStore(localStorage).load("/work/app")).toBeNull()
  })

  it("drops a save the storage refuses, without failing", () => {
    const full: Storage = Object.assign(Object.create(localStorage), {
      setItem: () => {
        throw new DOMException("quota exceeded", "QuotaExceededError")
      },
    })
    const store = createLocalViewStore(full)

    expect(() => store.save("/work/app", { depth: 2 })).not.toThrow()
  })
})
