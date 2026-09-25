import { afterEach, expect, it, test, vi } from "vitest"

import { mountMap } from "./spike/map/host/map.js"

// the map is spike code (step 09): the entry's word to it is what is checked
vi.mock("./spike/map/host/map.js", () => ({ mountMap: vi.fn(() => () => {}) }))

// the entry runs on import; each test evaluates it afresh
afterEach(() => {
  vi.resetModules()
  vi.mocked(mountMap).mockClear()
  document.body.replaceChildren()
  location.hash = ""
})

const appTarget = () => {
  const target = document.createElement("div")
  target.id = "app"
  document.body.append(target)
  return target
}

test("the entry refuses to run without #app", async () => {
  await expect(import("./main.ts")).rejects.toThrow("no #app element")
})

it("mounts the map on #app, fed by the snapshot source", async () => {
  const target = appTarget()

  await import("./main.ts")

  expect(mountMap).toHaveBeenCalledTimes(1)
  expect(mountMap).toHaveBeenCalledWith(
    target,
    expect.objectContaining({
      subscribe: expect.any(Function),
      select: expect.any(Function),
    }),
  )
  expect(target.querySelector("main")).toBeNull()
})

it("mounts the outline instead at #debug", async () => {
  location.hash = "#debug"
  const target = appTarget()

  await import("./main.ts")

  expect(mountMap).not.toHaveBeenCalled()
  expect(target.querySelector("main")).not.toBeNull()
  expect(target.textContent).toContain("loading")
})
