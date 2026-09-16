/**
 * The watcher over chokidar (rixo, 2026-09-16: the dependency pays for the
 * primitive — `fs.watch` is not consistent across platforms, and where a
 * filesystem emits nothing only polling helps; `CHOKIDAR_USEPOLLING` reaches it
 * untouched). One instance per watched directory, at depth 0 — each directory's
 * own entries, never a subtree — hidden entries ignored (the scan never covers
 * them), the initial listing skipped. Every event resets the quiet window; its
 * end is the one `onChange`. chokidar's own errors go to `report`: a watch is
 * not worth the server.
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
     * One instance per directory, resolved once each is up. Not one instance
     * over the set: chokidar 5 counts a path that fails (missing, a loop, a
     * name too long) as ready twice, so its `ready` fires before the rest of
     * the set is watched. With a single path per instance, it cannot.
     */
    const open = (set: readonly string[]): Promise<FSWatcher[]> =>
      Promise.all(
        set.map(async (dir) => {
          const instance = chokidarWatch(dir, {
            depth: 0,
            ignoreInitial: true,
            // a hidden entry, never the watched directory if it is one
            ignored: (path) => basename(path).startsWith(".") && path !== dir,
          })
          instance.on("all", bump)
          instance.on("error", report)
          await new Promise<void>((resolve) => instance.once("ready", resolve))
          return instance
        }),
      )
    const closeAll = async (instances: FSWatcher[]): Promise<void> => {
      await Promise.all(instances.map((instance) => instance.close()))
    }
    let instances = await open(dirs)
    const watch: Watch = {
      // fresh instances, ready, before the old ones go: no gap, and chokidar's
      // `add` has no ready to await — its initial listing would race the caller
      update: async (next) => {
        const previous = instances
        instances = await open(next)
        await closeAll(previous)
      },
      close: async () => {
        if (timer !== null) clearTimeout(timer)
        timer = null
        await closeAll(instances)
      },
    }
    return watch
  },
})
