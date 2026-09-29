import { afterEach, describe, expect, it } from "vitest"

import { createLocalLastProject } from "./local-last-project.adapter.ts"

afterEach(() => localStorage.clear())

describe("createLocalLastProject", () => {
  it("knows nothing before a save", () => {
    expect(createLocalLastProject(localStorage).load()).toBeNull()
  })

  it("keeps the last root saved across stores: what a reload finds", () => {
    createLocalLastProject(localStorage).save("/work/app")
    createLocalLastProject(localStorage).save("/work/lib")

    expect(createLocalLastProject(localStorage).load()).toBe("/work/lib")
    expect(localStorage.getItem("deblob.view.project")).toBe("/work/lib")
  })

  it("drops a save the storage refuses, without failing", () => {
    const full: Storage = Object.assign(Object.create(localStorage), {
      setItem: () => {
        throw new DOMException("quota exceeded", "QuotaExceededError")
      },
    })

    expect(() => createLocalLastProject(full).save("/work/app")).not.toThrow()
  })
})
