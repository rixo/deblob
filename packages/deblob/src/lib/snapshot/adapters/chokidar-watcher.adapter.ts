/**
 * The watcher over chokidar (rixo, 2026-09-16: the dependency pays for the
 * primitive — `fs.watch` is not consistent across platforms, and where a
 * filesystem emits nothing only polling helps; `CHOKIDAR_USEPOLLING` reaches it
 * untouched). One instance per watched directory, at depth 0 — each directory's
 * own entries, never a subtree — hidden entries ignored (the scan never covers
 * them), the initial listing skipped. An update watches the difference: what
 * stays keeps its instance. Every event resets the quiet window; its end is the
 * one `onChange`. chokidar's own errors go to `report`: a watch is not worth
 * the server.
 */

import { basename } from "node:path"

import { type FSWatcher, watch as chokidarWatch } from "chokidar"

import type { Report } from "../ports/report.port.ts"
import type { Watch, Watcher } from "../ports/watch.port.ts"

export const createChokidarWatcher = ({
  quietMs,
  report,
}: {
  quietMs: number
  report: Report
}): Watcher => ({
  watch: async (dirs, onChange) => {
    let timer: NodeJS.Timeout | null = null
    const bump = (): void => {
      if (timer !== null) clearTimeout(timer)
      timer = setTimeout(() => {
        timer = null
        onChange()
      }, quietMs)
    }
    /**
     * One directory per instance, resolved once it is up. Not one instance over
     * the set: chokidar 5 counts a path that fails (missing, a loop, a name too
     * long) as ready twice, so its `ready` fires before the rest of the set is
     * watched. With a single path per instance, it cannot. Known upstream since
     * 3.x (paulmillr/chokidar#1011, #1110), the fix (#1289) closed unmerged;
     * still in 5.0.0.
     */
    const openOne = async (dir: string): Promise<[string, FSWatcher]> => {
      const instance = chokidarWatch(dir, {
        depth: 0,
        ignoreInitial: true,
        // a hidden entry, never the watched directory if it is one
        ignored: (path) => basename(path).startsWith(".") && path !== dir,
      })
      instance.on("all", bump)
      instance.on("error", report)
      await new Promise<void>((resolve) => instance.once("ready", resolve))
      return [dir, instance]
    }
    const openEach = (set: Iterable<string>): Promise<[string, FSWatcher][]> =>
      Promise.all([...set].map(openOne))
    const closeAll = async (open: Iterable<FSWatcher>): Promise<void> => {
      await Promise.all([...open].map((instance) => instance.close()))
    }

    const instances = new Map(await openEach(new Set(dirs)))
    let closed = false

    /**
     * The difference, not the set: a directory still wanted keeps the instance
     * it has, so it is never briefly unwatched and its entries are never listed
     * again — an update to the same set does nothing at all. The added ones are
     * ready before the removed ones go, so there is no gap either way.
     */
    const applyDiff = async (next: readonly string[]): Promise<void> => {
      const wanted = new Set(next)
      const added = [...wanted].filter((dir) => !instances.has(dir))
      const fresh = await openEach(added)
      // closed while they opened: the close never saw them
      if (closed) {
        await closeAll(fresh.map(([, instance]) => instance))
        return
      }
      for (const [dir, instance] of fresh) instances.set(dir, instance)
      const removed = [...instances].filter(([dir]) => !wanted.has(dir))
      for (const [dir] of removed) instances.delete(dir)
      await closeAll(removed.map(([, instance]) => instance))
    }

    /**
     * One diff at a time. A diff reads the set it is changing, so computing one
     * while another is still opening would drop what that one is about to add —
     * and the caller of a no-op update would be told "watched" about a set the
     * older call then takes apart. Chained, the last call's set is the one
     * watched, and a call that resolves has been applied.
     */
    let queue: Promise<unknown> = Promise.resolve()

    const watch: Watch = {
      update: (next) => {
        const mine = queue.then(() => applyDiff(next))
        // settled, never rejected: one caller's failure is not the next's
        queue = Promise.allSettled([mine])
        return mine
      },
      close: async () => {
        closed = true
        if (timer !== null) clearTimeout(timer)
        timer = null
        const open = [...instances.values()]
        instances.clear()
        await closeAll(open)
      },
    }
    return watch
  },
})
