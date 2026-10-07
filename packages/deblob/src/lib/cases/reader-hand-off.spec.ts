import { describe, expect, test } from "vitest"

import { ARGV_SWITCH } from "./argv-switch-reader.model.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The switch reader's hand-off (the reader revealer,
 * `longshot/revealer/README.md` sections 3 to 6; the cut itself is
 * `reader-cut.spec.ts`). A switch dispatches where it stands, so a sub-driver
 * cannot be wired unconditionally and left to attach callbacks, as
 * `sub-driver-wiring` has it for a callback tech. Ruled 2026-10-05: a case
 * whose whole body hands the read and instances to a sub-driver's wiring
 * function is the dispatch continued, not a hook — one trigger still ends in
 * one use-case call, which is what the existing red protects. The same hand-off
 * through a literal `import()` of a driver file is the lazy seam: the unit
 * builds its own app in its wiring. A shared logger travels as a service, never
 * as a bare adapter.
 *
 * Written red first, before the port had a cut; the reader is
 * `argv-switch-reader.model.ts`.
 */

const CONFIG = { readers: { driver: [ARGV_SWITCH] } } as const

/** The tech; the shared log service over its port; the tool and its assembly. */
const TOOL = {
  "src/lib/argv/argv.model.ts": `
    export type Read = { command: string; sub: string; line: readonly string[] }
    export const readLine = (argv: readonly string[]): Read => {
      const line = argv.slice(2)
      return { command: line[0] ?? "", sub: line[1] ?? "", line }
    }
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
      return { check: run, checkDag: run, status: run }
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

/** A lazy unit: its wiring builds its app, its switch has the one hook. */
const VIEW_DRIVER = `
  import type { Read } from "../lib/argv/argv.model.ts"
  import type { Log } from "../lib/log/log.service.ts"
  import { createViewAssembly } from "./view.assembly.ts"
  export const dispatchView = (read: Read, log: Log) => {
    const { view } = createViewAssembly(log)
    switch (read.sub) {
      default:
        return view.open(read)
    }
  }
`

const IMPORTS = `
  import { readLine } from "./lib/argv/argv.model.ts"
  import { createToolAssembly } from "./tool.assembly.ts"
`

const ROWS: readonly Row[] = [
  {
    // The hand-off case stays the wiring's: a sub-driver's wiring function
    // called in the wiring, as `sub-driver-wiring` has it.
    name: "a case whose whole body hands the read and instances to a sub-driver's wiring function is the dispatch continued: green, and the sub-driver's cases are hooks",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Read } from "./lib/argv/argv.model.ts"
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (read: Read, tool: Tool) => {
          switch (read.sub) {
            case "dag":
              return tool.checkDag(read)
            default:
              return tool.check(read)
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return dispatchCheck(read, tool)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // canon: `sub-driver-wiring`, "calling a sub-driver from inside a hook, or
    // handing it a use-case result, would let one hook chain two calls". A
    // case with a use-case call is a hook; the hand-off beside it is the
    // chain.
    name: "a use-case call beside the hand-off, or a use-case result handed to it, is red",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Read } from "./lib/argv/argv.model.ts"
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (read: Read, tool: Tool, extra?: unknown) => {
          switch (read.sub) {
            default:
              return tool.check(read)
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = async () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              tool.status(read)
              return dispatchCheck(read, tool) // red: sub-driver-wiring -- wired from inside a hook: the case has its use-case call
            default:
              // red: wiring-outside-hooks -- a use case outside any hook
              return dispatchCheck(read, tool, await tool.status(read)) // red: sub-driver-wiring -- handed a use-case result
          }
        }
      `,
    },
  },
  {
    // The hand-off is the call, returned or not.
    name: "the hand-off as a bare statement, closed by break, is the dispatch continued all the same: green",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Read } from "./lib/argv/argv.model.ts"
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (read: Read, tool: Tool) => {
          switch (read.sub) {
            default:
              return tool.check(read)
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              dispatchCheck(read, tool)
              break
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The whole body, not its first statement: a case that hands off and then
    // calls is a hook, as when the call comes first.
    name: "the hand-off first and a use-case call after it is red too: the case is a hook, whatever the order",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Read } from "./lib/argv/argv.model.ts"
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (read: Read, tool: Tool) => {
          switch (read.sub) {
            default:
              return tool.check(read)
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              dispatchCheck(read, tool) // red: sub-driver-wiring -- wired from inside a hook: the case has its use-case call
              return tool.status(read)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The unit's cases are hooks, the read it received their event; the
    // shared log service handed through the import() raises nothing.
    name: "the hand-off through a literal import() of a driver is the lazy seam; the unit builds its own app over the shared log service, its switch has the one hook",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": VIEW_DRIVER,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = async () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "view":
              return (await import("./view/view.driver.ts")).dispatchView(read, log)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // canon: "a hook does not wire" (`driver.spec.ts`, "an assembly imported
    // lazily in a hook is red three times").
    name: "a lazy import() of an assembly in a case is red: a hook does not wire",
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
            case "view":
              return (await import("./view/view.assembly.ts")).createViewAssembly(log).view.open(read) // red: hook-one-call, hook-one-call -- a hook does not wire: import(), the assembly call
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "the lazy unit calling the shared log itself is red: beside its use case in a case, or in its wiring",
    config: CONFIG,
    files: {
      ...TOOL,
      ...VIEW,
      "src/view/view.driver.ts": `
        import type { Read } from "../lib/argv/argv.model.ts"
        import type { Log } from "../lib/log/log.service.ts"
        import { createViewAssembly } from "./view.assembly.ts"
        export const dispatchView = (read: Read, log: Log) => {
          const { view } = createViewAssembly(log)
          log.info("wiring") // red: wiring-outside-hooks -- a use case outside any hook
          switch (read.sub) {
            default: // red: hook-one-call -- two calls
              log.info("opening")
              return view.open(read)
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
              return (await import("./view/view.driver.ts")).dispatchView(read, log)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // A model (the tech file) calling a service handed to it raises nothing.
    name: "the tech handed the shared log service at setup: an instance as a wiring argument, green",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/lib/argv/argv.model.ts": `
        export type Read = { command: string; line: readonly string[] }
        export const readLine = (argv: readonly string[], log: { info: (text: string) => void }): Read => {
          const line = argv.slice(2)
          if (line.includes("--colour")) log.info("unknown flag --colour")
          return { command: line[0] ?? "", line }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool, log } = createToolAssembly()
          const read = readLine(process.argv, log)
          switch (read.command) {
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // `reader-cut.spec.ts`, "the read destructured in the wiring": a part read
    // off the read is still the tech's, and no longer the event as received.
    // That it was read off travels with it through the hand-off.
    name: "a part of the read handed to a sub-driver: its switch is the reader's cut, and its cases handing the part on are red, read off the event in the caller's wiring",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (line: readonly string[], tool: Tool) => {
          switch (line[1]) {
            case "dag":
              return tool.checkDag(line) // red: hook-one-call -- read off the event, in the caller's wiring
            default:
              return tool.check(line) // red: hook-one-call -- read off the event, in the caller's wiring
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return dispatchCheck(read.line, tool)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "the same part handed through a literal import() is red the same",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (line: readonly string[], tool: Tool) => {
          switch (line[1]) {
            default:
              return tool.check(line) // red: hook-one-call -- read off the event, in the caller's wiring
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = async () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return (await import("./check.driver.ts")).dispatchCheck(read.line, tool)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // The read reshaped is not the event as received. The reader misses it: a
    // call on a tech value reads as a call into the tech (a method of an
    // object the tech built is one), and without types `.slice` on what the
    // tech returned looks the same — so the result passes for an event of its
    // own. `reader-cut.spec.ts` has the same in one driver.
    name: "the read reshaped by a method call and handed to a sub-driver is red: not the event as received",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/check.driver.ts": `
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (rest: readonly string[], tool: Tool) => {
          switch (rest[0]) {
            default:
              return tool.check(rest) // missed red: hook-one-call -- not the event as received: the read sliced by the caller; a method call on a tech value reads as the tech's
          }
        }
      `,
      "src/tool.driver.ts": `
        ${IMPORTS}
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return dispatchCheck(read.line.slice(1), tool)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
] as const

describe("reader hand-off", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
