import { afterEach, expect, it, test, vi } from "vitest"

import { mountMap } from "./spike/map/host/map.js"

// the map is spike code (step 09): the entry's word to it is what is checked
vi.mock("./spike/map/host/map.js", () => ({ mountMap: vi.fn(() => vi.fn()) }))

// the entry runs on import; each test evaluates it afresh. An entry of an
// earlier test still follows the hash: the reset settles before the count is
// cleared, and a row counts the calls made for its own target only.
afterEach(async () => {
  vi.resetModules()
  document.body.replaceChildren()
  location.hash = ""
  await new Promise((resolve) => setTimeout(resolve))
  vi.mocked(mountMap).mockClear()
})

/** What the entry asked of the map, for `target` alone. */
const mapCallsOn = (target: HTMLElement) =>
  vi
    .mocked(mountMap)
    .mock.calls.map((args, index) => ({
      args,
      teardown: vi.mocked(mountMap).mock.results[index]?.value as () => void,
    }))
    .filter(({ args: [on] }) => on === target)

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

it("follows the hash: the outline when it turns to #debug, the map again when it leaves, nothing on another hash", async () => {
  const target = appTarget()
  await import("./main.ts")

  const changed = new Promise((resolve) =>
    addEventListener("hashchange", resolve, { once: true }),
  )
  location.hash = "#elsewhere"
  await changed
  expect(mapCallsOn(target)).toHaveLength(1)

  location.hash = "#debug"
  await vi.waitFor(() => expect(target.querySelector("main")).not.toBeNull())
  const [first] = mapCallsOn(target)
  expect(first?.teardown).toHaveBeenCalledTimes(1)

  location.hash = ""
  await vi.waitFor(() => expect(target.querySelector("main")).toBeNull())
  expect(mapCallsOn(target)).toHaveLength(2)
})
