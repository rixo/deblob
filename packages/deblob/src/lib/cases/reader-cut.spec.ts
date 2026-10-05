import { describe, expect, test } from "vitest"

import { ARGV_SWITCH } from "./argv-switch-reader.model.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * A reader with a cut of its own (the reader revealer,
 * `longshot/revealer/README.md`): a tech that takes no callback. It reads the
 * command line and the driver dispatches with a `switch`. canon: "a technology
 * whose hooks are not handed callbacks … needs a reader with a cut of its own";
 * `hook-one-call` is "ruled for the stock cut; a reader with a cut of its own
 * says where the line sits".
 *
 * The driver rules do not change. The reader says two things in place of the
 * stock cut: a `switch` in a wiring function, on a value its tech returned, has
 * a hook for each case's body, `default` included (the cut); what `readLine`
 * returned is the event. The discriminant needs nothing new: it sits in the
 * wiring, where "a tech value may be read — a field, a destructured part".
 *
 * Written red first, before the port had a cut; the reader is
 * `argv-switch-reader.model.ts`.
 */

const CONFIG = { readers: { driver: [ARGV_SWITCH] } } as const

/** The tech, the tool's service and its assembly. */
const TOOL = {
  "src/lib/argv/argv.model.ts": `
    export type Read = { command: string; sub: string; line: readonly string[] }
    export const readLine = (argv: readonly string[]): Read => {
      const line = argv.slice(2)
      return { command: line[0] ?? "", sub: line[1] ?? "", line }
    }
  `,
  "src/lib/tool/tool.service.ts": `
    export const createTool = () => {
      const run = async (read: unknown, host?: unknown) => (read === host ? 0 : 1)
      return { check: run, checkDag: run, explain: run, fix: run, help: run, report: run, status: run, view: run }
    }
  `,
  "src/tool.assembly.ts": `
    import { createTool } from "./lib/tool/tool.service.ts"
    export const createToolAssembly = () => ({ tool: createTool() })
  `,
} as const

const IMPORTS = `
  import { readLine } from "./lib/argv/argv.model.ts"
  import { createToolAssembly } from "./tool.assembly.ts"
`

const ROWS: readonly Row[] = [
  {
    // The two statements of the reader, and nothing else: every other row is
    // this one with a defect. Without the cut the switch is a branch in the
    // wiring and each case's call a use case outside any hook; the only way
    // out is `blobDriver`.
    name: "the thin driver: wiring, then a switch on what the tech read, one call per case, the read handed whole; default is a hook like any case",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read)
            case "explain":
              return tool.explain(read)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    // canon: `hook-one-call`, as `driver.spec.ts` proves it for a callback:
    // "a hook with no call, two calls, a condition …", "a tech call beside
    // the one call in a hook", "a write beside the call in a hook".
    name: "a case with no call, two calls, a condition, a log line or a write beside its one call is red, as a callback hook is",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "noop": // red: hook-one-call -- zero calls
              return
            case "check": // red: hook-one-call -- two calls
              tool.check(read)
              return tool.report(read)
            case "explain": // red: hook-one-call -- two calls
              if (read.sub) return tool.explain(read) // red: hook-one-call -- the call is conditional
              return tool.status(read)
            case "view":
              console.log("viewing") // red: hook-one-call -- a log line beside the call
              return tool.view(read)
            case "fix":
              process.exitCode = 0 // red: hook-one-call -- a write beside the call
              return tool.fix(read)
          }
        }
      `,
    },
  },
  {
    name: "two labels on one body are one hook",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "-h":
            case "--help":
              return tool.help(read)
            default:
              return tool.status(read)
          }
        }
      `,
    },
  },
  {
    name: "a case that falls through into the next body is red: one trigger, two calls",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check": // red: hook-one-call -- falls through into "explain": two calls
              tool.check(read)
            case "explain":
              return tool.explain(read)
          }
        }
      `,
    },
  },
  {
    // canon: the call's value is "returned … or dropped"; "a branch or a
    // write in the wiring is red" (`driver.spec.ts`).
    name: "break instead of return drops the value: green; a write after the switch is a write in the wiring",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              tool.check(read)
              break
            default:
              tool.status(read)
          }
          process.exitCode = 0 // red: wiring-outside-hooks -- a write in the wiring
        }
      `,
    },
  },
  {
    // The reader's cut must not reach it.
    name: "a switch on a value the tech did not return is not the reader's cut: a branch in the wiring, a use case outside any hook",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (process.env["MODE"]) { // red: wiring-outside-hooks -- a branch in the wiring
            case "ci":
              return tool.check(read) // red: wiring-outside-hooks -- a use case outside any hook
          }
        }
      `,
    },
  },
  {
    // The reader's cut must not reach it: a tech value, a call's result, but
    // of a call that is not into this reader's tech.
    name: "a switch on what another tech returned is not the reader's cut: the host's call is not this reader's, a branch in the wiring, a use case outside any hook",
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
          switch (platform) { // red: wiring-outside-hooks -- a branch in the wiring
            case "win32":
              return tool.check(read) // red: wiring-outside-hooks -- a use case outside any hook
          }
        }
      `,
    },
  },
  {
    // The reader's cut must not reach it: whose tech a value is travels with
    // the value, a hand-off included.
    name: "a sub-driver handed what another tech returned, switching on it, is not the reader's cut: a branch in the wiring, a use case outside any hook",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        import os from "node:os"
        import { createToolAssembly } from "./tool.assembly.ts"
        import { dispatchByPlatform } from "./platform.driver.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const platform = os.platform()
          dispatchByPlatform(platform, tool)
        }
      `,
      "src/platform.driver.ts": `
        export const dispatchByPlatform = (platform: string, tool: { check: (platform: unknown) => unknown }) => {
          switch (platform) { // red: wiring-outside-hooks -- a branch in the wiring
            case "win32":
              return tool.check(platform) // red: wiring-outside-hooks -- a use case outside any hook
          }
        }
      `,
    },
  },
  {
    // The same through the lazy hand-off: an import() binds like a call.
    name: "a lazy unit handed what another tech returned, switching on it, is not the reader's cut either",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        import os from "node:os"
        ${IMPORTS}
        export const main = async () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          const platform = os.platform()
          switch (read.command) {
            case "platform":
              return (await import("./platform.driver.ts")).dispatchByPlatform(platform, tool)
            default:
              return tool.status(read)
          }
        }
      `,
      "src/platform.driver.ts": `
        export const dispatchByPlatform = (platform: string, tool: { check: (platform: unknown) => unknown }) => {
          switch (platform) { // red: wiring-outside-hooks -- a branch in the wiring
            case "win32":
              return tool.check(platform) // red: wiring-outside-hooks -- a use case outside any hook
          }
        }
      `,
    },
  },
  {
    // The read is the tech's whoever of the tech returned it: a function the
    // driver imports, or a method of an object the tech built.
    name: "the read returned by a method of an object the tech built is the reader's all the same: the thin driver, cut",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/lib/argv/argv.model.ts": `
        export const createArgv = () => ({
          readLine: (argv: readonly string[]) => ({ command: argv[2] ?? "" }),
        })
      `,
      "src/tool.driver.ts": `
        import { createArgv } from "./lib/argv/argv.model.ts"
        import { createToolAssembly } from "./tool.assembly.ts"
        export const main = () => {
          const { tool } = createToolAssembly()
          const argv = createArgv()
          const read = argv.readLine(process.argv)
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
    // Ruled 2026-09-28: "whatever, as long as you can describe it to me" —
    // an if chain is a second shape, for a reader that describes it. The
    // reader's cut must not reach it.
    name: "the same dispatch as an if chain is red: the reader describes one shape",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          if (read.command === "check") return tool.check(read) // red: wiring-outside-hooks, wiring-outside-hooks -- a branch in the wiring, a use case outside any hook
          return tool.status(read) // red: wiring-outside-hooks -- a use case outside any hook
        }
      `,
    },
  },
  {
    name: "a switch inside a case is a branch in a hook: red",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              switch (read.sub) { // red: hook-one-call -- a conditional call
                case "dag":
                  return tool.checkDag(read)
              }
          }
        }
      `,
    },
  },
  {
    // canon: a hook hands "the event as received … nothing read off them
    // (`opts`, never `opts.files`)". The reader says the event is what
    // `readLine` returned.
    name: "the read handed whole is green; anything read off it is red, as off a callback's event",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read)
            case "explain":
              return tool.explain(read.line) // red: hook-one-call -- read off the event
            case "view":
              return tool.view(read.line[0]) // red: hook-one-call -- read off the event
            case "fix":
              return tool.fix(read.command) // red: hook-one-call -- read off the event
          }
        }
      `,
    },
  },
  {
    // canon: "in the wiring … a tech value may be read — a field, a
    // destructured part"; what the wiring read is no event as received
    // (`driver.spec.ts`, "the host read or called in the wiring, handed on by
    // a hook").
    name: "the read destructured in the wiring: the switch on a part is green, a case handing a part on is red",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const { command, line } = readLine(process.argv)
          switch (command) {
            case "check":
              return tool.check(line) // red: hook-one-call -- read off the event, in the wiring
          }
        }
      `,
    },
  },
  {
    name: "a second argument beside the event: the host handed whole is green, a host call's result is red",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { tool } = createToolAssembly()
          const read = readLine(process.argv)
          switch (read.command) {
            case "check":
              return tool.check(read, process)
            case "here":
              return tool.check(read, process.cwd()) // red: hook-one-call, hook-one-call -- a call that is not the use case's, and a value that is not the event handed on
          }
        }
      `,
    },
  },
  {
    // canon: "a root driver's `main()`, which takes nothing and reads its
    // tech itself".
    name: "a root main taking the read as a parameter is red, and its switch is no cut: the value is not one the tech returned here",
    config: CONFIG,
    files: {
      ...TOOL,
      "src/tool.driver.ts": `
        import type { Read } from "./lib/argv/argv.model.ts"
        import { createToolAssembly } from "./tool.assembly.ts"
        export const main = (read: Read) => { // red: driver-hooks-only -- main takes nothing and reads its tech itself
          const { tool } = createToolAssembly()
          switch (read.command) { // red: wiring-outside-hooks -- a branch in the wiring
            case "check":
              return tool.check(read) // red: wiring-outside-hooks -- a use case outside any hook
          }
        }
      `,
    },
  },
]

describe("reader cut", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
