/**
 * The watcher over chokidar (rixo, 2026-09-16: the dependency pays for the
 * primitive — `fs.watch` is not consistent across platforms, and where a
 * filesystem emits nothing only polling helps; `CHOKIDAR_USEPOLLING` reaches it
 * untouched). One instance per watch, the set as its paths at depth 0 — each
 * directory's own entries, never a subtree — hidden entries ignored (the scan
 * never covers them), the initial listing skipped. Every event resets the quiet
 * window; its end is the one `onChange`. chokidar's own errors go to `report`:
 * a watch is not worth the server.
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
    /** An instance over a set, resolved once its initial listing is done. */
    const open = async (set: readonly string[]): Promise<FSWatcher> => {
      const watched = new Set(set)
      const instance = chokidarWatch([...set], {
        depth: 0,
        ignoreInitial: true,
        // a hidden entry, never a watched directory that happens to be one
        ignored: (path) => basename(path).startsWith(".") && !watched.has(path),
      })
      instance.on("all", bump)
      instance.on("error", report)
      await new Promise<void>((resolve) => instance.once("ready", resolve))
      return instance
    }
    let instance = await open(dirs)
    const watch: Watch = {
      // a fresh instance, ready, before the old one goes: no gap, and chokidar's
      // `add` has no ready to await — its initial listing would race the caller
      update: async (next) => {
        const previous = instance
        instance = await open(next)
        await previous.close()
      },
      close: async () => {
        if (timer !== null) clearTimeout(timer)
        timer = null
        await instance.close()
      },
    }
    return watch
  },
})
