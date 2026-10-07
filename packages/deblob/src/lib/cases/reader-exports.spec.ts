import { describe, expect, test } from "vitest"

import { ROUTE_EXPORTS } from "./exports-reader.model.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * A tech that calls a file's exports (the reader revealer, the verdict on the
 * port, point 4): a route file the framework loads. Its reader binds the file
 * by `include`, which makes it a driver, and points at the function each export
 * statement defines; a function a cut points at is a hook wherever it stands,
 * an export included, and its parameters are the event. The reader is
 * `exports-reader.model.ts`.
 *
 * What these rows do not settle: where such a file does its wiring. Nobody
 * calls a wiring function of a file the framework loads, so the assembly call
 * sits at the module root, red as any root call and any definition of a driver
 * that is no hook. Every row carries that line as reported today; where the
 * call may legally go is open (the web drivers).
 */

const CONFIG = { readers: { driver: [ROUTE_EXPORTS] } } as const

const TOOL = {
  "node_modules/made-up-kit/package.json": JSON.stringify({
    name: "made-up-kit",
    main: "./index.js",
  }),
  "node_modules/made-up-kit/index.js": "module.exports = {}",
  "src/lib/tool/tool.service.ts": `
    export const createTool = () => {
      const run = async (event: unknown) => String(event)
      return { get: run, save: run, list: run }
    }
  `,
  "src/tool.assembly.ts": `
    import { createTool } from "./lib/tool/tool.service.ts"
    export const createToolAssembly = () => ({ tool: createTool() })
  `,
} as const

/** The route file's head: its assembly called at the module root. */
const HEAD = `
  import { createToolAssembly } from "../../tool.assembly.ts"
  // stubborn unknown: stable-root -- to rule: where a file the framework loads wires; pinned as reported, a root binding of a call's result
  const { tool } = createToolAssembly() // red: driver-hooks-only -- to rule: where a file the framework loads wires; pinned as reported, a definition that is no hook
`

const route = (body: string) => ({
  ...TOOL,
  "src/routes/api/+server.ts": `${HEAD}${body}`,
})

const ROWS: readonly Row[] = [
  {
    name: "an exported arrow the reader points at is a hook: one call, the event handed whole, green",
    config: CONFIG,
    files: route(`
      export const GET = (event: unknown) => tool.get(event)
    `),
  },
  {
    name: "an exported function declaration is a hook the same",
    config: CONFIG,
    files: route(`
      export function GET(event: unknown) {
        return tool.get(event)
      }
    `),
  },
  {
    name: "a default-exported function is a hook the same",
    config: CONFIG,
    files: route(`
      export default (event: unknown) => tool.get(event)
    `),
  },
  {
    name: "several exports are several hooks",
    config: CONFIG,
    files: route(`
      export const GET = (event: unknown) => tool.get(event)
      export const POST = (event: unknown) => tool.save(event)
    `),
  },
  {
    name: "an exported hook is judged as any hook: two calls, a read off the event, no call are red",
    config: CONFIG,
    files: route(`
      export const GET = (event: unknown) => { // red: hook-one-call -- two calls
        tool.list(event)
        return tool.get(event)
      }
      export const POST = (event: { url: string }) => tool.save(event.url) // red: hook-one-call -- read off the event
      export const DELETE = () => {} // red: hook-one-call -- no use case
    `),
  },
  {
    name: "a function the file does not export is no hook: a definition, red, and its call a use case outside any hook",
    config: CONFIG,
    files: route(`
      const helper = (event: unknown) => tool.list(event) // red: driver-hooks-only -- a function that is no hook
      export const GET = (event: unknown) => tool.get(event)
    `),
  },
  {
    name: "an exported constant is no hook: a definition, red",
    config: CONFIG,
    files: route(`
      export const prerender = true // red: driver-hooks-only -- a definition that is no hook
      export const GET = (event: unknown) => tool.get(event)
    `),
  },
  {
    name: "an object of handlers is not the shape this reader describes: a definition, red",
    config: CONFIG,
    files: route(`
      // red: stable-root -- a record at the module root
      export const actions = { // red: driver-hooks-only -- a definition that is no hook
        save: (event: unknown) => tool.save(event),
      }
    `),
  },
  {
    name: "a function exported by name after its definition is not the shape this reader describes: red",
    config: CONFIG,
    files: route(`
      // red: driver-hooks-only -- taken for the wiring function, which takes nothing
      const GET = (event: unknown) => tool.get(event) // red: wiring-outside-hooks -- a use case outside any hook
      export { GET }
    `),
  },
  {
    name: "the same file under a reader with no cut: the export is a definition and its call a use case outside any hook",
    config: {
      readers: {
        driver: [
          {
            name: "route-claims",
            include: ["src/routes/**/+server.ts"],
            tech: ["made-up-kit"],
          },
        ],
      },
    },
    files: route(`
      // red: driver-hooks-only -- taken for the wiring function, which takes nothing
      export const GET = (event: unknown) => tool.get(event) // red: wiring-outside-hooks -- a use case outside any hook
    `),
  },
] as const

describe("reader exports", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
