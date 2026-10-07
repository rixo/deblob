import { describe, expect, test } from "vitest"

import { ARGV_SWITCH } from "./argv-switch-reader.model.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * Receiving (the reader revealer, `longshot/revealer/README.md` rows 2.5 and
 * 6.3, re-ruled 2026-10-06): a tech that needs a port — a router that logs — is
 * built like a service, by the assembly, and handed to the driver. The reader's
 * claim does not change: the router's file is its tech. What the driver imports
 * from that file is tech, and so is what an assembly built with it and handed
 * over: the value is followed back, out of the assembly, to the file whose
 * factory built it.
 *
 * Followed through every way a value may leave an assembly — an assembly only
 * builds, and passes on or returns what it built: a returned record, written in
 * place or held in a local, nested; the instance itself; a parameter passed
 * through; every return of a branch. What an assembly may not do is not
 * followed — a call that builds nothing, a record spread into the returned one
 * (ruled 2026-10-06: it stays red): red where it stands, and no one's tech.
 *
 * Written red first, before a value was followed out of an assembly.
 */

const CONFIG = {
  readers: {
    driver: [{ ...ARGV_SWITCH, tech: ["./src/lib/router/router.service.ts"] }],
  },
} as const

/** The router as a service over the shared log; the tool; the log's parts. */
const TOOL = {
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
  "src/lib/router/router.service.ts": `
    import type { Log } from "../log/log.service.ts"
    export type Read = { command: string; sub: string; line: readonly string[] }
    export const createRouter = ({ log }: { log: Log }) => ({
      readLine: (argv: readonly string[]): Read => {
        const line = argv.slice(2)
        if (line.length === 0) log.info("no command")
        return { command: line[0] ?? "", sub: line[1] ?? "", line }
      },
    })
    export type Router = ReturnType<typeof createRouter>
  `,
  "src/lib/tool/tool.service.ts": `
    import type { Log } from "../log/log.service.ts"
    export const createTool = ({ log }: { log: Log }) => {
      const run = async (read: unknown) => log.info(String(read))
      return { check: run, status: run }
    }
    export type Tool = ReturnType<typeof createTool>
  `,
} as const

const BUILDS = `
  import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
  import { createLog } from "./lib/log/log.service.ts"
  import { createRouter } from "./lib/router/router.service.ts"
  import { createTool } from "./lib/tool/tool.service.ts"
`

/** The thin driver, handed its router by the assembly. */
const DRIVER = {
  "src/tool.driver.ts": `
    import { createToolAssembly } from "./tool.assembly.ts"
    export const main = () => {
      const { tool, router } = createToolAssembly()
      const read = router.readLine(process.argv)
      switch (read.command) {
        case "check":
          return tool.check(read)
        default:
          return tool.status(read)
      }
    }
  `,
} as const

/** The same driver where the router is no one's tech: an instance, as any. */
const INSTANCE_DRIVER = {
  "src/tool.driver.ts": `
    import { createToolAssembly } from "./tool.assembly.ts"
    export const main = () => {
      const { tool, router } = createToolAssembly()
      const read = router.readLine(process.argv) // red: wiring-outside-hooks -- a use case outside any hook: the router is an instance
      switch (read.command) { // red: wiring-outside-hooks -- a branch in the wiring
        case "check":
          return tool.check(read) // red: wiring-outside-hooks, wiring-outside-hooks -- a use case outside any hook, handed another's result
        default:
          return tool.status(read) // red: wiring-outside-hooks, wiring-outside-hooks -- the same
      }
    }
  `,
} as const

const ROWS: readonly Row[] = [
  {
    name: "the router built by the assembly and returned in its record is the driver's tech: the thin driver, cut",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createRouter({ log }) }
        }
      `,
    },
  },
  {
    name: "the record held in a local before it is returned: the same",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          const app = { tool: createTool({ log }), router: createRouter({ log }) }
          return app
        }
      `,
    },
  },
  {
    // Ruled 2026-10-06: composing assemblies by spread stays red — "what the
    // assembly builds is passed on or returned, never computed with". Red where
    // it stands, and not followed: nothing is known of a key past a spread.
    name: "the router spread from another assembly's record: the spread red in the assembly, not followed, the driver red as any",
    config: CONFIG,
    files: {
      ...TOOL,
      ...INSTANCE_DRIVER,
      "src/cli.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        export const createCliAssembly = (log: Log) => ({ router: createRouter({ log }) })
      `,
      "src/tool.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        import { createCliAssembly } from "./cli.assembly.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { ...createCliAssembly(log), tool: createTool({ log }) } // red: assembly-builds-only -- what another assembly built, spread: computed with
        }
      `,
    },
  },
  {
    name: "the router returned itself by another assembly, no record around it: the same",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/router.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        export const createRouterAssembly = (log: Log) => createRouter({ log })
      `,
      "src/tool.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        import { createRouterAssembly } from "./router.assembly.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createRouterAssembly(log) }
        }
      `,
    },
  },
  {
    name: "the router in a record nested in the record, read by its path in the driver: the same",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), cli: { router: createRouter({ log }) } }
        }
      `,
      "src/tool.driver.ts": `
        import { createToolAssembly } from "./tool.assembly.ts"
        export const main = () => {
          const { tool, cli } = createToolAssembly()
          const read = cli.router.readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "the router built by the root assembly, handed to another and returned by it: followed through the parameter, the same",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/cli.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import type { Router } from "./lib/router/router.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        export const createCliAssembly = (router: Router, log: Log) => ({ router, tool: createTool({ log }) })
      `,
      "src/tool.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        import { createCliAssembly } from "./cli.assembly.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return createCliAssembly(createRouter({ log }), log)
        }
      `,
    },
  },
  {
    name: "an assembly with two returns on a branch, the router built by its file in both: the same",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = (mode: "quiet" | "loud") => {
          const log = createLog({ sink: createMemorySink() })
          if (mode === "quiet") return { tool: createTool({ log }), router: createRouter({ log }) }
          return { router: createRouter({ log }), tool: createTool({ log }) }
        }
      `,
      "src/tool.driver.ts": `
        import { createToolAssembly } from "./tool.assembly.ts"
        export const main = () => {
          const { tool, router } = createToolAssembly("loud")
          const read = router.readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "the assembly's record held whole in the driver, the router read off it: the same",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createRouter({ log }) }
        }
      `,
      "src/tool.driver.ts": `
        import { createToolAssembly } from "./tool.assembly.ts"
        export const main = () => {
          const app = createToolAssembly()
          const read = app.router.readLine(process.argv)
          switch (read.command) {
            case "check":
              return app.tool.check(read)
            default:
              return app.tool.status(read)
          }
        }
      `,
    },
  },
  {
    // Followed per caller: the shared assembly returns what each root handed
    // it, and each driver is told what its own root built.
    name: "one assembly handed the reader's router by one root and another file's by another: each driver judged by what its own root built",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/lib/other/other.service.ts": `
        import type { Read } from "../router/router.service.ts"
        export const createOtherRouter = () => ({
          readLine: (argv: readonly string[]): Read => ({ command: argv[2] ?? "", sub: "", line: argv }),
        })
      `,
      "src/cli.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        export const createCliAssembly = (router: unknown, log: Log) => ({ router, tool: createTool({ log }) })
      `,
      "src/first.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        import { createCliAssembly } from "./cli.assembly.ts"
        export const createFirstAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return createCliAssembly(createRouter({ log }), log)
        }
      `,
      "src/second.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createOtherRouter } from "./lib/other/other.service.ts"
        import { createCliAssembly } from "./cli.assembly.ts"
        export const createSecondAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return createCliAssembly(createOtherRouter(), log)
        }
      `,
      "src/first.driver.ts": `
        import { createFirstAssembly } from "./first.assembly.ts"
        export const main = () => {
          const { tool, router } = createFirstAssembly()
          const read = router.readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read)
            default:
              return tool.status(read)
          }
        }
      `,
      "src/second.driver.ts": `
        import { createSecondAssembly } from "./second.assembly.ts"
        export const main = () => {
          const { tool, router } = createSecondAssembly()
          const read = router.readLine(process.argv) // red: wiring-outside-hooks -- a use case outside any hook: this router is an instance
          switch (read.command) { // red: wiring-outside-hooks -- a branch in the wiring
            case "check":
              return tool.check(read) // red: wiring-outside-hooks, wiring-outside-hooks -- a use case outside any hook, handed another's result
            default:
              return tool.status(read) // red: wiring-outside-hooks, wiring-outside-hooks -- the same
          }
        }
      `,
    },
  },
  {
    // Whose tech a value is travels on: the read of a router the assembly
    // handed over is the event in a sub-driver too.
    name: "the read of a router handed over, handed on to a sub-driver: its cases are hooks there as well",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createRouter({ log }) }
        }
      `,
      "src/check.driver.ts": `
        import type { Read } from "./lib/router/router.service.ts"
        import type { Tool } from "./lib/tool/tool.service.ts"
        export const dispatchCheck = (read: Read, tool: Tool) => {
          switch (read.sub) {
            default:
              return tool.check(read)
          }
        }
      `,
      "src/tool.driver.ts": `
        import { createToolAssembly } from "./tool.assembly.ts"
        import { dispatchCheck } from "./check.driver.ts"
        export const main = () => {
          const { tool, router } = createToolAssembly()
          const read = router.readLine(process.argv)
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
    // As the record reads: a key written twice holds what was written last.
    name: "a key written twice in the record holds the last: another file's router first, the reader's last, is the reader's",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/lib/other/other.service.ts": `
        import type { Read } from "../router/router.service.ts"
        export const createOtherRouter = () => ({
          readLine: (argv: readonly string[]): Read => ({ command: argv[2] ?? "", sub: "", line: argv }),
        })
      `,
      "src/tool.assembly.ts": `
        ${BUILDS}
        import { createOtherRouter } from "./lib/other/other.service.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createOtherRouter(), router: createRouter({ log }) }
        }
      `,
    },
  },
  {
    // The spread may hold a router too: what was written before it is not
    // known to be what the record holds.
    name: "a record spread after the router: nothing is known past the spread, the router is an instance, the driver red as any",
    config: CONFIG,
    files: {
      ...TOOL,
      ...INSTANCE_DRIVER,
      "src/tools.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        export const createToolsAssembly = (log: Log) => ({ tool: createTool({ log }) })
      `,
      "src/tool.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        import { createToolsAssembly } from "./tools.assembly.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { router: createRouter({ log }), ...createToolsAssembly(log) } // red: assembly-builds-only -- what another assembly built, spread: computed with
        }
      `,
    },
  },
  {
    // The last entry of a key wins, a spread before it or not: the router
    // written after the spread is what the record holds.
    name: "the router written after a spread is known all the same: followed, the driver cut, the spread red in the assembly",
    config: CONFIG,
    files: {
      ...TOOL,
      ...DRIVER,
      "src/tools.assembly.ts": `
        import type { Log } from "./lib/log/log.service.ts"
        import { createTool } from "./lib/tool/tool.service.ts"
        export const createToolsAssembly = (log: Log) => ({ tool: createTool({ log }) })
      `,
      "src/tool.assembly.ts": `
        import { createMemorySink } from "./lib/log/adapters/memory-sink.adapter.ts"
        import { createLog } from "./lib/log/log.service.ts"
        import { createRouter } from "./lib/router/router.service.ts"
        import { createToolsAssembly } from "./tools.assembly.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { ...createToolsAssembly(log), router: createRouter({ log }) } // red: assembly-builds-only -- what another assembly built, spread: computed with
        }
      `,
    },
  },
  {
    // The two returns do not say the same thing: no one can tell which runs.
    name: "two returns that build the router from different files: not followed, the router is an instance and the driver red as any",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/lib/other/other.service.ts": `
        import type { Read } from "../router/router.service.ts"
        export const createOtherRouter = () => ({
          readLine: (argv: readonly string[]): Read => ({ command: argv[2] ?? "", sub: "", line: argv }),
        })
      `,
      "src/tool.assembly.ts": `
        ${BUILDS}
        import { createOtherRouter } from "./lib/other/other.service.ts"
        export const createToolAssembly = (mode: "quiet" | "loud") => {
          const log = createLog({ sink: createMemorySink() })
          if (mode === "quiet") return { tool: createTool({ log }), router: createRouter({ log }) }
          return { tool: createTool({ log }), router: createOtherRouter() }
        }
      `,
      "src/tool.driver.ts": INSTANCE_DRIVER["src/tool.driver.ts"].replace(
        "createToolAssembly()",
        'createToolAssembly("loud")',
      ),
    },
  },
  {
    // What a call that builds nothing returns is not what the factory built:
    // red where it stands, and followed by no one.
    name: "the router wrapped by a call before it is returned: the assembly red for the call, the router an instance, the driver red as any",
    config: CONFIG,
    files: {
      ...TOOL,
      ...INSTANCE_DRIVER,
      "src/lib/router/timed.model.ts": `
        export const timed = <T>(router: T): T => router
      `,
      "src/tool.assembly.ts": `
        ${BUILDS}
        import { timed } from "./lib/router/timed.model.ts"
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: timed(createRouter({ log })) } // red: assembly-builds-only -- a call that builds nothing
        }
      `,
    },
  },
  {
    // The claim is what makes it tech: following a value finds its file, and a
    // file no reader claims is a service like any other.
    name: "the same router under a reader that does not claim its file: an instance, the driver red as any",
    config: { readers: { driver: [ARGV_SWITCH] } },
    files: {
      ...TOOL,
      ...INSTANCE_DRIVER,
      "src/tool.assembly.ts": `
        ${BUILDS}
        export const createToolAssembly = () => {
          const log = createLog({ sink: createMemorySink() })
          return { tool: createTool({ log }), router: createRouter({ log }) }
        }
      `,
    },
  },
] as const

describe("reader receiving", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
