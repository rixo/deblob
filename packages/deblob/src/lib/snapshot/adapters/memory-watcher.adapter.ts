/**
 * The watcher in memory: the test fires the changes. `watching()` lists the set
 * of every open watch, in opening order — closed ones leave it; `change(dir)`
 * reaches every open watch whose set holds `dir`, nobody otherwise.
 */

import type { Watch, Watcher } from "../ports/watch.port.ts"

export const createMemoryWatcher = () => {
  const open: { dirs: readonly string[]; onChange: () => void }[] = []
  const watcher: Watcher = {
    watch: async (dirs, onChange) => {
      const entry = { dirs, onChange }
      open.push(entry)
      const watch: Watch = {
        update: async (next) => {
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
  }
}
