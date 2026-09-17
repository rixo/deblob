import { expect, test } from "vitest"

import { createMemoryWatcher } from "./memory-watcher.adapter.ts"

test("a change reaches the watches holding that directory; update and close move the sets", async () => {
  const { watcher, change, watching } = createMemoryWatcher()
  const fired: string[] = []
  const first = await watcher.watch(["/FAKE_A", "/FAKE_A/src"], () =>
    fired.push("first"),
  )
  const second = await watcher.watch(["/FAKE_B"], () => fired.push("second"))
  expect(watching()).toEqual([["/FAKE_A", "/FAKE_A/src"], ["/FAKE_B"]])

  change("/FAKE_A/src")
  change("/FAKE_ELSEWHERE")
  expect(fired).toEqual(["first"])

  await first.update(["/FAKE_A"])
  change("/FAKE_A/src")
  change("/FAKE_B")
  expect(fired).toEqual(["first", "second"])

  await first.close()
  expect(watching()).toEqual([["/FAKE_B"]])
  change("/FAKE_A")
  expect(fired).toEqual(["first", "second"])
  await second.close()
  expect(watching()).toEqual([])
})

test("held: watch and update stay pending, nothing moves, until the release", async () => {
  const { watcher, watching, hold } = createMemoryWatcher()
  const early = await watcher.watch(["/FAKE_A"], () => {})

  const release = hold()
  let opened = false
  const opening = watcher
    .watch(["/FAKE_B"], () => {})
    .then((watch) => {
      opened = true
      return watch
    })
  const updating = early.update(["/FAKE_C"])
  await new Promise((resolve) => setTimeout(resolve, 0))
  expect(opened).toBe(false)
  expect(watching()).toEqual([["/FAKE_A"]])

  release()
  await opening
  await updating
  expect(watching()).toEqual([["/FAKE_C"], ["/FAKE_B"]])
})
