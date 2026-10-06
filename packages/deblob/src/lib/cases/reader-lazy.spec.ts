import { describe, expect, test } from "vitest"

import { ARGV_SWITCH } from "./argv-switch-reader.model.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The lazy seam written by the tech (the reader revealer,
 * `longshot/revealer/README.md` 4.5; the driver writing the `import()` itself
 * is `reader-hand-off.spec.ts`). The tech loads the unit and calls its wiring
 * function, as a framework loads a route file: `lazy(() => import("./unit"),
 * read, log)` imports the module and calls its `dispatch` with what follows the
 * thunk. Ruled 2026-10-05: the same verdicts as the driver's own `import()`,
 * mixed in as one more case of the same switch. The thunk is the seam, not a
 * hook; the call is the hand-off, so the unit's cases are hooks and the read
 * handed through `lazy` is their event.
 *
 * Written red first, before the reader could say any of it; the reader is
 * `argv-switch-reader.model.ts`.
 */

const CONFIG = { readers: { driver: [ARGV_SWITCH] } } as const

/** The tech, `lazy` included; the shared log service; the tool's assembly. */
const TOOL = {
  "src/lib/argv/argv.model.ts": `
    export type Read = { command: string; sub: string; line: readonly string[] }
    export const readLine = (argv: readonly string[]): Read => {
      const line = argv.slice(2)
      return { command: line[0] ?? "", sub: line[1] ?? "", line }
    }
    export const lazy = async <Args extends readonly unknown[]>(
      load: () => Promise<{ dispatch: (...args: Args) => unknown }>,
      ...args: Args
    ) => (await load()).dispatch(...args)
  `,
  "src/lib/log/sink.port.ts": `
    export type Sink = { write: (text: string) => void }
  `,
  "src/lib/log/adapters/memory-sink.adapter.ts": `
    import type { Sink } from "../sink.port.ts"
    export const createMemorySink = (): Sink => {
      const lines: string[] = []
      return { write: (text) => void lines.push(text) }
    }
  `,
  "src/lib/log/log.service.ts": `
    import type { Sink } from "./sink.port.ts"
    export const createLog = ({ sink }: { sink: Sink }) => ({
      info: (text: string) => sink.write(text),
    })
    export type Log = ReturnType<typeof createLog>
  `,
  "src/lib/tool/tool.service.ts": `
    import type { Log } from "../log/log.service.ts"
    export const createTool = ({ log }: { log: Log }) => {
      const run = async (read: unknown) => log.info(String(read))
      return { check: run, status: run }
    }
    export type Tool = ReturnType<typeof createTool>
  `,
  "src/tool.assembly.ts": `
    import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
    import { createLog } from "./lib/log/log.service.ts"
    import { createTool } from "./lib/tool/tool.service.ts"
    export const createToolAssembly = () => {
      const log = createLog({ sink: createMemorySink() })
      return { tool: createTool({ log }), log }
    }
  `,
} as const

/** The lazy unit's own service and assembly, built over the shared log. */
const VIEW = {
  "src/view/view.service.ts": `
    import type { Log } from "../lib/log/log.service.ts"
    export const createView = ({ log }: { log: Log }) => ({
      open: async (read: unknown) => log.info(String(read)),
    })
  `,
  "src/view/view.assembly.ts": `
    import type { Log } from "../lib/log/log.service.ts"
    import { createView } from "./view.service.ts"
    export const createViewAssembly = (log: Log) => ({ view: createView({ log }) })
  `,
} as const

/** A lazy unit the tech loads: `dispatch` is the name the tech calls. */
const VIEW_DRIVER = `
  import type { Read } from "../lib/argv/argv.model.ts"
  import type { Log } from "../lib/log/log.service.ts"
  import { createViewAssembly } from "./view.assembly.ts"
  export const dispatch = (read: Read, log: Log) => {
    const { view } = createViewAssembly(log)
    // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the unit is handed nothing, its switch is a branch
    switch (read.sub) {
      default:
        return view.open(read) // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the case is no hook
    }
  }
`

/**
 * The same unit where no seam leads to it: no caller the reader knows hands it
 * anything, so its switch is on no tech value — a branch in the wiring.
 */
const UNIT_HANDED_NOTHING = `
  import type { Read } from "../lib/argv/argv.model.ts"
  import type { Log } from "../lib/log/log.service.ts"
  import { createViewAssembly } from "./view.assembly.ts"
  export const dispatch = (read: Read, log: Log) => {
    const { view } = createViewAssembly(log)
    switch (read.sub) { // red: wiring-outside-hooks -- a branch in the wiring: the unit is handed nothing
      default:
        return view.open(read) // red: wiring-outside-hooks -- a use case outside any hook
    }
  }
`

/** The same unit, loaded by the driver's own `import()`. */
const EDIT_DRIVER = `
  import type { Read } from "../lib/argv/argv.model.ts"
  import type { Log } from "../lib/log/log.service.ts"
  import { createViewAssembly } from "./view.assembly.ts"
  export const dispatch = (read: Read, log: Log) => {
    const { view } = createViewAssembly(log)
    switch (read.sub) {
      default:
        return view.open(read)
    }
  }
`

/** An eager sub-driver, for the row that mixes the three hand-offs. */
const CHECK_DRIVER = `
  import type { Read } from "./lib/argv/argv.model.ts"
  import type { Tool } from "./lib/tool/tool.service.ts"
  export const dispatchCheck = (read: Read, tool: Tool) => {
    switch (read.sub) {
      default:
        return tool.check(read)
    }
  }
`

const IMPORTS = `
  import { lazy, readLine } from "./lib/argv/argv.model.ts"
  import { createToolAssembly } from "./tool.assembly.ts"
`

const ROWS: readonly Row[] = [
  {
    name: "a case that hands a literal import() of a driver, the read and instances to the tech's lazy is the lazy seam: green, the thunk is no hook",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "view":
              return lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // Two hand-off spellings in one reader is the bench's licence: a real
    // project picks one.
    name: "the three hand-offs as cases of one switch — a sub-driver called, a driver's import() written by the driver, the same handed to the tech: green",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/edit/edit.driver.ts": EDIT_DRIVER,
      "src/edit/view.assembly.ts": VIEW["src/view/view.assembly.ts"],
      "src/edit/view.service.ts": VIEW["src/view/view.service.ts"],
      "src/check.driver.ts": CHECK_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = async () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return dispatchCheck(read, tool)
            case "edit":
              return (await import("./edit/edit.driver.ts")).dispatch(read, log)
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "view":
              return lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The proof that the unit is read as handed: its cases are hooks, and
    // what the tech passed on is their event.
    name: "the unit the tech loaded is judged as any sub-driver: reading off the read it was handed is red, a second call in a case is red",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": `
        import type { Read } from "../lib/argv/argv.model.ts"
        import type { Log } from "../lib/log/log.service.ts"
        import { createViewAssembly } from "./view.assembly.ts"
        export const dispatch = (read: Read, log: Log) => {
          const { view } = createViewAssembly(log)
          // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the unit is handed nothing, its switch is a branch
          switch (read.sub) {
            case "first":
              // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the case is no hook
              return view.open(read.line) // missed red: hook-one-call -- read off the event; the tech-side seam is not read yet
            default: // missed red: hook-one-call -- two calls; the tech-side seam is not read yet
              log.info("opening") // false unknown: driver-calls-services -- the tech-side seam is not read yet: the log is handed by no caller
              return view.open(read) // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the case is no hook
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "view":
              return lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // canon: `sub-driver-wiring`, as for the eager hand-off
    // (`reader-hand-off.spec.ts`).
    name: "a use-case call beside the tech's lazy, or a use-case result handed through it, is red",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": `
        import type { Read } from "../lib/argv/argv.model.ts"
        import type { Log } from "../lib/log/log.service.ts"
        import { createViewAssembly } from "./view.assembly.ts"
        export const dispatch = (read: Read, log: Log, extra?: unknown) => {
          const { view } = createViewAssembly(log)
          // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the unit is handed nothing, its switch is a branch
          switch (read.sub) {
            default:
              return view.open(read) // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the case is no hook
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = async () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "view":
              tool.status(read)
              // missed red: sub-driver-wiring -- wired from inside a hook: the case has its use-case call; the tech-side seam is not read yet
              return lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              // missed red: wiring-outside-hooks -- a use case outside any hook; the tech-side seam is not read yet
              // missed red: sub-driver-wiring -- handed a use-case result; the tech-side seam is not read yet
              return lazy(() => import("./view/view.driver.ts"), read, log, await tool.status(read)) // false red: hook-one-call, hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook, the result used
          }
        }
      `,
    },
  },
  {
    // canon: "a hook does not wire" (`reader-hand-off.spec.ts`, the same
    // import() written by the driver). A thunk that loads no driver is no
    // seam: it is a function handed to the tech, a hook.
    name: "the tech's lazy handed an import() of an assembly is red: only a driver is loaded at a seam",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              return lazy(() => import("./view/view.assembly.ts"), read, log) // red: hook-one-call, hook-one-call, hook-one-call -- no seam: lazy called in a hook, the thunk a hook with no use case, its import()
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The thunk is the seam only when it is the import() and nothing else.
    name: "a thunk that does anything beside its import() is a hook like any function handed to the tech: red",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": UNIT_HANDED_NOTHING,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              // red: hook-one-call -- no seam: lazy called in a hook
              return lazy(() => {
                tool.status(read)
                return import("./view/view.driver.ts") // red: hook-one-call -- a hook does not wire: import()
              }, read, log)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // README 4.2. A bundler cannot split on a path it cannot read, and
    // neither can the reader follow it to the unit.
    name: "a computed specifier handed to the tech's lazy is red: the unit loaded is not known",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              return lazy(() => import(\`./\${read.command}/view.driver.ts\`), read, log) // red: hook-one-call, hook-one-call, hook-one-call -- no seam: lazy called in a hook, the thunk a hook with no use case, its import()
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "a computed specifier in the driver's own import() is red the same",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = async () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              return (await import(\`./\${read.command}/view.driver.ts\`)).dispatch(read, log) // red: hook-one-call, driver-calls-services -- no seam: import() in a hook, and a call into a module the reader cannot name
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The thunk is its import(), however the function is written.
    name: "the thunk written with a block body, as a function, or async is the seam all the same: green",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "view":
              return lazy(() => { return import("./view/view.driver.ts") }, read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "show":
              return lazy(function () { return import("./view/view.driver.ts") }, read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "open":
              return lazy(async () => await import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The hand-off is the call, returned or not (`reader-hand-off.spec.ts`).
    name: "the tech's lazy as a bare statement, closed by break, is the seam all the same: green",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "view":
              lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
              break
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // A sub-driver's wiring function is called in the wiring
    // (`sub-driver-wiring`); loaded by the tech, it is the same call.
    name: "the tech's lazy in the wiring, outside any case, is a sub-driver wired: green",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { log } = createToolAssembly()
          const read = readLine(process.argv)
          return lazy(() => import("./view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, import() for a call in a hook
        }
      `,
    },
  },
  {
    // A unit is a sub-driver like any: it hands the dispatch on in turn.
    name: "a unit the tech loaded hands the read on through the tech's lazy in turn: green, the second unit's cases are hooks",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/group/group.driver.ts": `
        import type { Read } from "../lib/argv/argv.model.ts"
        import { lazy } from "../lib/argv/argv.model.ts"
        import type { Log } from "../lib/log/log.service.ts"
        export const dispatch = (read: Read, log: Log) => {
          // false red: wiring-outside-hooks -- the tech-side seam is not read yet: the unit is handed nothing, its switch is a branch
          switch (read.sub) {
            default:
              return lazy(() => import("../view/view.driver.ts"), read, log) // false red: hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, import() for a call in a hook
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "group":
              return lazy(() => import("./group/group.driver.ts"), read, log) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // `reader-cut.spec.ts`, the same through the driver's own import(): whose
    // a value is travels through the tech's lazy as through a call.
    name: "a unit the tech loaded, handed what another tech returned and switching on it, is not the reader's cut",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        import os from "node:os"
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          const platform = os.platform()
          switch (read.command) {
            // false red: hook-one-call -- the tech-side seam is not read yet: the case is taken for a hook with no use case
            case "platform":
              return lazy(() => import("./platform.driver.ts"), platform, tool) // false red: hook-one-call, hook-one-call, hook-one-call -- the tech-side seam is not read yet: the thunk is taken for a hook, lazy and import() for calls in a hook
            default:
              return tool.status(read)
          }
        }
      `,
      "src/platform.driver.ts": `
        export const dispatch = (platform: string, tool: { check: (platform: unknown) => unknown }) => {
          switch (platform) { // red: wiring-outside-hooks -- a branch in the wiring
            case "win32":
              // false unknown: driver-calls-services -- the tech-side seam is not read yet: the tool is handed by no caller
              return tool.check(platform) // missed red: wiring-outside-hooks -- a use case outside any hook; the tech-side seam is not read yet
          }
        }
      `,
    },
  },
  {
    // One shape per reader (README 1.8, 4.4): the seam is the thunk written
    // where it is handed.
    name: "a thunk held in a local and handed by name is no seam: red, the reader describes one shape",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": UNIT_HANDED_NOTHING,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          const loadView = () => import("./view/view.driver.ts") // red: driver-hooks-only -- a function held in the wiring
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              return lazy(loadView, read, log) // red: hook-one-call -- no seam: lazy called in a hook
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The tech calls `dispatch`; a module that exports none is handed
    // nothing.
    name: "a unit that does not export what the tech calls is no seam: red",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": UNIT_HANDED_NOTHING.replace(
        "const dispatch",
        "const dispatchView",
      ),
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            // red: hook-one-call -- the case runs no use case
            case "view":
              return lazy(() => import("./view/view.driver.ts"), read, log) // red: hook-one-call, hook-one-call, hook-one-call -- no seam: lazy called in a hook, the thunk a hook with no use case, its import()
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
]

describe("reader lazy", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
