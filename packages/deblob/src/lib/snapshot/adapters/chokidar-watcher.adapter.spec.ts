import { mkdir, mkdtemp, rm, writeFile } from "node:fs/promises"
import { tmpdir } from "node:os"
import { join } from "node:path"
import { afterEach, expect, test } from "vitest"

import { createChokidarWatcher } from "./chokidar-watcher.adapter.ts"
import { createMemoryReport } from "./memory-report.adapter.ts"

const QUIET_MS = 30
const settle = () => new Promise((resolve) => setTimeout(resolve, QUIET_MS * 4))
const until = async (fired: number[], count: number) => {
  const deadline = Date.now() + 2000
  while (fired.length < count) {
    if (Date.now() > deadline) throw new Error(`never reached ${count} changes`)
    await new Promise((resolve) => setTimeout(resolve, 5))
  }
}

const cleanups: (() => Promise<void>)[] = []
afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) await cleanup()
})

const tempTree = async () => {
  const root = await mkdtemp(join(tmpdir(), "deblob-watch-"))
  cleanups.push(() => rm(root, { recursive: true, force: true }))
  await mkdir(join(root, "FAKE_SUB"))
  return root
}

test("one change per burst, hidden entries ignored, a directory outside the set unseen until update, nothing after close", async () => {
  const root = await tempTree()
  const { report, reported } = createMemoryReport()
  const watcher = createChokidarWatcher({ quietMs: QUIET_MS, report })
  const fired: number[] = []
  const watch = await watcher.watch([root], () => fired.push(Date.now()))
  cleanups.push(() => watch.close())

  await writeFile(join(root, "FAKE_ONE.ts"), "")
  await until(fired, 1)

  // a burst: three writes, one change
  await writeFile(join(root, "FAKE_TWO.ts"), "")
  await writeFile(join(root, "FAKE_THREE.ts"), "")
  await writeFile(join(root, "FAKE_ONE.ts"), "changed")
  await until(fired, 2)
  await settle()
  expect(fired).toHaveLength(2)

  // hidden: the scan never covers it, the watch never reports it
  await writeFile(join(root, ".FAKE_HIDDEN"), "")
  await settle()
  expect(fired).toHaveLength(2)

  // depth 0: the subdirectory's own entries are not this watch's
  await writeFile(join(root, "FAKE_SUB", "FAKE_DEEP.ts"), "")
  await settle()
  expect(fired).toHaveLength(2)

  await watch.update([root, join(root, "FAKE_SUB")])
  await writeFile(join(root, "FAKE_SUB", "FAKE_DEEP.ts"), "changed")
  await until(fired, 3)

  await watch.update([join(root, "FAKE_SUB")])
  await writeFile(join(root, "FAKE_FOUR.ts"), "")
  await settle()
  expect(fired).toHaveLength(3)

  // a write, then close inside the quiet window: the pending change dies with it
  await writeFile(join(root, "FAKE_SUB", "FAKE_DEEP.ts"), "again")
  await new Promise((resolve) => setTimeout(resolve, 5))
  await watch.close()
  await writeFile(join(root, "FAKE_SUB", "FAKE_LATE.ts"), "")
  await settle()
  expect(fired).toHaveLength(3)
  expect(reported).toEqual([])
})
