import { mkdir, mkdtemp, rm, symlink, writeFile } from "node:fs/promises"
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

test("a watched directory whose own name is hidden is watched; hidden entries inside it are not", async () => {
  const root = await tempTree()
  const dotted = join(root, ".FAKE_DOTTED")
  await mkdir(dotted)
  const { report } = createMemoryReport()
  const watcher = createChokidarWatcher({ quietMs: QUIET_MS, report })
  const fired: number[] = []
  const watch = await watcher.watch([dotted], () => fired.push(Date.now()))
  cleanups.push(() => watch.close())

  await writeFile(join(dotted, ".FAKE_HIDDEN"), "")
  await settle()
  expect(fired).toHaveLength(0)

  await writeFile(join(dotted, "FAKE_ONE.ts"), "")
  await until(fired, 1)
})

test("chokidar's own error is reported, and the rest of the set is watched once the watch resolves", async () => {
  const root = await tempTree()
  // a loop: no user gets past it, root included (the alpine job runs as root,
  // so a permission error would not be provoked there)
  const loop = join(root, "FAKE_LOOP")
  await symlink(loop, loop)
  const { report, reported } = createMemoryReport()
  const watcher = createChokidarWatcher({ quietMs: QUIET_MS, report })
  const fired: number[] = []
  const watch = await watcher.watch([root, loop], () => fired.push(Date.now()))
  cleanups.push(() => watch.close())
  // the loop's own instance fails before it is ready; `root`'s, listing the
  // loop among its entries, may fail too, now or a moment later
  expect(reported.length).toBeGreaterThan(0)
  for (const error of reported) expect(error).toMatchObject({ code: "ELOOP" })

  // right away: one chokidar instance over the whole set said `ready` before
  // `root` was watched, and this write was missed
  await writeFile(join(root, "FAKE_ONE.ts"), "")
  await until(fired, 1)
})

test("a directory of the set that is gone: the rest is watched once the watch resolves, on open and on update", async () => {
  const root = await tempTree()
  const sub = join(root, "FAKE_SUB")
  const gone = join(root, "FAKE_GONE")
  const { report, reported } = createMemoryReport()
  const watcher = createChokidarWatcher({ quietMs: QUIET_MS, report })
  const fired: number[] = []
  const watch = await watcher.watch([gone, sub], () => fired.push(Date.now()))
  cleanups.push(() => watch.close())

  // right away, as above: the one-instance shape missed this write here, 8
  // runs out of 8
  await writeFile(join(sub, "FAKE_ONE.ts"), "")
  await until(fired, 1)
  await settle()

  await watch.update([gone, root, sub])
  await writeFile(join(sub, "FAKE_TWO.ts"), "")
  await until(fired, 2)
  // missing is not an error: chokidar waits for it to appear
  expect(reported).toEqual([])
})
