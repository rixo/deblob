/**
 * The watcher in memory: the test fires the changes. `watching()` lists the set
 * of every open watch, in opening order — closed ones leave it; `change(dir)`
 * reaches every open watch whose set holds `dir`, nobody otherwise. `hold()`
 * keeps every `watch` and `update` from here on pending until its release — a
 * real watcher's time to be up, in the test's hand.
 */

import type { Watch, Watcher } from "../ports/watch.port.ts"

export const createMemoryWatcher = () => {
  const open: { dirs: readonly string[]; onChange: () => void }[] = []
  let held: Promise<void> | null = null
  const watcher: Watcher = {
    watch: async (dirs, onChange) => {
      await held
      const entry = { dirs, onChange }
      open.push(entry)
      const watch: Watch = {
        update: async (next) => {
          await held
          entry.dirs = next
        },
        close: async () => {
          open.splice(open.indexOf(entry), 1)
        },
      }
      return watch
    },
  }
  return {
    watcher,
    change: (dir: string): void => {
      for (const { dirs, onChange } of open) {
        if (dirs.includes(dir)) onChange()
      }
    },
    watching: (): readonly (readonly string[])[] =>
      open.map(({ dirs }) => dirs),
    /** Pending from now on; the returned release lets them all through. */
    hold: (): (() => void) => {
      let release!: () => void
      held = new Promise((resolve) => (release = resolve))
      return () => {
        held = null
        release()
      }
    },
  }
}
