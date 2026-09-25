import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The driver rules, by what canon says they buy: "The driver holds the tech and
 * fires the hexagon … kept so thin that nothing in it needs a test." Outside
 * its hooks a driver only wires (`wiring-outside-hooks`); each hook makes one
 * unconditional use-case call and translates nothing around it
 * (`hook-one-call`); a driver calls services, assembly, sub-driver wiring and
 * its own tech (`driver-calls-services`); it defines its hooks and at most one
 * wiring function (`driver-hooks-only`); it imports another driver only to call
 * its wiring function (`sub-driver-wiring`). The import rule,
 * `driver-not-imported`, lives in `layers.spec.ts`.
 *
 * Red first: no check reports these rules yet, so every red is a `missed red`
 * naming what it waits for. Each red's way out is in the step's SPEC (the
 * driver table); a red with no way out is the finding. A hook is a function
 * handed to a tech callee — here the parser, `cac`, declared as the driver's
 * tech. Every tree is legal under every other rule, or its other red marked.
 */

const WAIT = "the driver check is not built yet"

/** The parser as the driver's tech, declared. */
const CONFIG = { driverTech: ["cac"] } as const

/** The CLI service, its assembly, and the parser package. */
const CLI = {
  "node_modules/cac/package.json": JSON.stringify({
    name: "cac",
    main: "./index.js",
  }),
  "node_modules/cac/index.js": "module.exports = {}",
  "src/lib/cli/cli.service.ts": `
    export const createCli = (deps: { cwd: string }) => ({
      check: async (opts: unknown, cwd?: string) => (opts === cwd ? 0 : deps.cwd.length),
      status: async (opts: unknown) => (opts ? 0 : 1),
    })
  `,
  "src/cli.assembly.ts": `
    import { createCli } from "./lib/cli/cli.service.ts"
    export const createCliAssembly = ({ cwd }: { cwd: string }) => ({ cli: createCli({ cwd }) })
  `,
} as const

const IMPORTS = `
  import { cac } from "cac"
  import { createCliAssembly } from "./cli.assembly.ts"
`

const ROWS: readonly Row[] = [
  {
    // canon: "outside its hooks, a driver only wires: assembly calls, tech
    // setup (the parser, the server, the mount), sub-driver registration";
    // "each hook … exactly one use-case call", its result returned.
    name: "the thin driver: an assembly call, tech setup and registration outside the hooks, one call in each hook",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("check").action((opts) => cli.check(opts))
          parser.command("status").action((opts) => cli.status(opts))
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "Arguments are tech values, instances, literals"; "outside its
    // hooks, a driver only wires" — a use case is not wiring.
    name: "outside the hooks, a computed argument and a use-case call are red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() + "/notes" }) // missed red: wiring-outside-hooks -- a computed argument; ${WAIT}
          const parser = cac("notes")
          parser.command("check").action((opts) => cli.check(opts))
          cli.status({}) // missed red: wiring-outside-hooks -- a use case outside any hook; ${WAIT}
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "Wiring may also sit inside a hook — an assembly imported lazily
    // on first event"; a local of the wiring function is wiring, not a
    // definition (D5, ruled 2026-09-25).
    name: "wiring inside a hook, an assembly imported lazily, and a parser held in a local of main: green",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        import { cac } from "cac"
        export const main = () => {
          const parser = cac("notes")
          parser.command("check").action(async (opts) => (await import("./cli.assembly.ts")).createCliAssembly({ cwd: process.cwd() }).cli.check(opts))
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: `hook-one-call` — "Zero calls is a violation too"; "Two calls
    // mean the sequence between them is a use case nobody owns"; "The call is
    // unconditional, and the hook translates nothing around it … A default on
    // the way in (`opts.cwd ?? process.cwd()`), a branch on the result (`if
    // (result.ok) exit(0)`), a transform before handing (`JSON.stringify(
    // result)`), an error mapped to an exit code: each is translation." H11:
    // two tech values merged into one is the smallest translation.
    name: "a hook with no call, two calls, a condition, or a translation around its one call is red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("echo").action((opts) => console.log(opts)) // missed red: hook-one-call -- no use case: logic with no home; ${WAIT}
          parser.command("both").action(async (opts) => { await cli.check(opts); return cli.status(opts) }) // missed red: hook-one-call -- two calls: a use case nobody owns; ${WAIT}
          parser.command("maybe").action((opts) => { if (opts.run) return cli.check(opts) }) // missed red: hook-one-call -- a conditional call; ${WAIT}
          parser.command("default").action((opts) => cli.check({ cwd: opts.cwd ?? process.cwd() })) // missed red: hook-one-call -- a default on the way in; ${WAIT}
          parser.command("exit").action(async (opts) => { if (!(await cli.check(opts))) process.exit(1) }) // missed red: hook-one-call -- a branch on the result; ${WAIT}
          parser.command("json").action(async (opts) => console.log(JSON.stringify(await cli.status(opts)))) // missed red: hook-one-call -- a transform before handing; ${WAIT}
          parser.command("safe").action(async (opts) => { try { return await cli.check(opts) } catch { process.exitCode = 2 } }) // missed red: hook-one-call -- an error mapped to an exit code; ${WAIT}
          parser.command("merged").action((opts) => cli.check({ ...opts, cwd: process.cwd() })) // missed red: hook-one-call -- two tech values merged into one; ${WAIT}
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "the result is returned, or handed whole to the tech — a tech
    // call, tech-held state"; "the exit code is part of its result";
    // arguments "tech values, instances and literals, unchanged"; "a tech
    // value may be read — a field, a destructured part — and is still a tech
    // value".
    name: "one call whose result is handed whole to the tech, a field of a tech value, two tech values unchanged: green",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("check").action(async (opts) => { process.exitCode = await cli.check(opts) })
          parser.command("files").action((opts) => cli.check(opts.files))
          parser.command("here").action((opts) => cli.check(opts, process.cwd()))
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "Never an adapter: an adapter call from a hook is an effect no
    // contract covers." The import is `adapter-assembly-only`, reported today.
    name: "a driver calling an adapter is red, and so is its import",
    config: CONFIG,
    files: {
      ...CLI,
      "src/lib/notes/adapters/fs-store.adapter.ts": `
        export const createFsStore = (root: string) => ({ root })
      `,
      "src/cli.driver.ts": `
        import { cac } from "cac"
        import { createFsStore } from "./lib/notes/adapters/fs-store.adapter.ts"
        export const main = () => {
          const parser = cac("notes")
          parser.command("store").action(() => createFsStore(process.cwd())) // missed red: driver-calls-services -- an adapter called from a hook; ${WAIT}
          parser.parse(process.argv)
        }
        // red: adapter-assembly-only, runtime-import -- the import of fs-store.adapter from a driver: a type import would pass
      `,
    },
  },
  {
    // canon: "Never a model: parsing and rendering are use cases of a
    // service"; the parse is also a translation around the call.
    name: "a driver calling a model is red, and the parse around the call is a translation",
    config: CONFIG,
    files: {
      ...CLI,
      "src/lib/cli/opts.model.ts": `
        export const parseOpts = (opts: unknown) => ({ opts })
      `,
      "src/cli.driver.ts": `
        ${IMPORTS}
        import { parseOpts } from "./lib/cli/opts.model.ts"
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("check").action((opts) => cli.check(parseOpts(opts))) // missed red: driver-calls-services, hook-one-call -- a model called; a parse around the call; ${WAIT}
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "A driver's tech is what its reading claims, or what the project
    // declares as tech … an external import neither claims is a violation
    // whose resolution is the declaration".
    name: "a package the driver uses that nothing declares as tech is red",
    config: CONFIG,
    files: {
      ...CLI,
      "node_modules/picocolors/package.json": JSON.stringify({
        name: "picocolors",
        main: "./index.js",
      }),
      "node_modules/picocolors/index.js": "module.exports = {}",
      "src/cli.driver.ts": `
        ${IMPORTS}
        import pc from "picocolors"
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac(pc.bold("notes")) // missed red: driver-calls-services -- picocolors, declared by nothing; ${WAIT}
          parser.command("check").action((opts) => cli.check(opts))
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "or what the project declares as tech".
    name: "the same package, declared as the driver's tech, is green",
    config: { driverTech: ["cac", "picocolors"] },
    files: {
      ...CLI,
      "node_modules/picocolors/package.json": JSON.stringify({
        name: "picocolors",
        main: "./index.js",
      }),
      "node_modules/picocolors/index.js": "module.exports = {}",
      "src/cli.driver.ts": `
        ${IMPORTS}
        import pc from "picocolors"
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac(pc.bold("notes"))
          parser.command("check").action((opts) => cli.check(opts))
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "the only definitions in a driver are its hooks and at most one
    // wiring function … a local `parseFoo` is a model without a test"; a type
    // and a constant are definitions too (A15's ruling).
    name: "a helper, a type and a constant beside the hooks and the wiring function are red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        const parseFoo = (s: string) => s.split(",") // missed red: driver-hooks-only -- a model without a test; ${WAIT}
        type Opts = { cwd: string } // missed red: driver-hooks-only -- a definition; ${WAIT}
        const NAME = "notes" // missed red: driver-hooks-only -- a definition; ${WAIT}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac(NAME)
          parser.command("check").action((opts: Opts) => cli.check(parseFoo(opts.cwd))) // missed red: driver-calls-services, hook-one-call -- a local function called; a parse around the call; ${WAIT}
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "a table of lambdas a service without a contract" — a lambda
    // not handed to the tech where it is written is not a hook.
    name: "a table of lambdas in main is red: a service without a contract",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          const handlers = { check: (opts: unknown) => cli.check(opts) } // missed red: driver-hooks-only -- a table of lambdas; ${WAIT}
          parser.command("check").action(handlers.check)
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "at most one wiring function: a root driver's `main()`, which
    // takes nothing and reads its tech itself".
    name: "a second wiring function, or a main that takes its tech as a parameter, is red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.driver.ts": `
        ${IMPORTS}
        export const main = (argv: string[]) => { // missed red: driver-hooks-only -- main takes nothing and reads its tech itself; ${WAIT}
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("check").action((opts) => cli.check(opts))
          parser.parse(argv)
        }
        export const registerMore = (parser: ReturnType<typeof cac>) => { // missed red: driver-hooks-only -- a second wiring function; ${WAIT}
          parser.command("more").action(() => createCliAssembly({ cwd: process.cwd() }).cli.status({}))
        }
      `,
    },
  },
  {
    // canon: `sub-driver-wiring`, "a driver imports another driver only to
    // call its wiring function, during its own wiring, passing tech and
    // instances … a spec file calling a shared `registerMatchers(expect)`".
    name: "a sub-driver's wiring function called during the root's wiring, with tech and instances: green",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli/check.driver.ts": `
        import type { cac } from "cac"
        import type { createCli } from "../lib/cli/cli.service.ts"
        export const registerCheckCommands = (parser: ReturnType<typeof cac>, cli: ReturnType<typeof createCli>) => {
          parser.command("check").action((opts) => cli.check(opts))
        }
      `,
      "src/cli.driver.ts": `
        ${IMPORTS}
        import { registerCheckCommands } from "./cli/check.driver.ts"
        export const main = () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          registerCheckCommands(parser, cli)
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: "Calling a sub-driver from inside a hook, or handing it a
    // use-case result, would let one hook chain two calls"; "Never a hook,
    // never data from the hexagon"; "The sub-driver exports that one wiring
    // function and no hook".
    name: "a sub-driver wired from a hook, handed hexagon data, or asked for a hook is red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli/check.driver.ts": `
        import type { cac } from "cac"
        export const registerCheckCommands = (parser: ReturnType<typeof cac>, cli: unknown) => {
          parser.command("check").action(() => cli)
        }
        export const checkHook = (opts: unknown) => opts // missed red: driver-hooks-only -- a hook exported beside the wiring function; ${WAIT}
      `,
      "src/cli.driver.ts": `
        ${IMPORTS}
        import { checkHook, registerCheckCommands } from "./cli/check.driver.ts" // missed red: sub-driver-wiring -- a hook imported from a sub-driver; ${WAIT}
        export const main = async () => {
          const { cli } = createCliAssembly({ cwd: process.cwd() })
          const parser = cac("notes")
          parser.command("later").action(() => registerCheckCommands(parser, cli)) // missed red: sub-driver-wiring -- wired from inside a hook; ${WAIT}
          // missed red: wiring-outside-hooks -- a use case outside any hook; ${WAIT}
          registerCheckCommands(parser, await cli.status({})) // missed red: sub-driver-wiring -- handed a use-case result; ${WAIT}
          parser.command("hook").action(checkHook)
          parser.parse(process.argv)
        }
      `,
    },
  },
  {
    // canon: `test-is-outside`, "A test file is assembly and driver in one …
    // the test bodies are hooks … the hook count and services-only do not
    // apply".
    name: "a test body making two use-case calls and calling an adapter is green: the test tech exempts the count and services-only",
    files: {
      ...CLI,
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/lib/notes/adapters/fs-store.adapter.ts": `
        export const createFsStore = (root: string) => ({ root })
      `,
      "src/cli.spec.ts": `
        import { expect, it } from "vitest"
        import { createCliAssembly } from "./cli.assembly.ts"
        import { createFsStore } from "./lib/notes/adapters/fs-store.adapter.ts"
        it("checks, then reports status", async () => {
          const { cli } = createCliAssembly({ cwd: "/tmp" })
          expect(await cli.check({})).toBe(4)
          expect(await cli.status({})).toBe(0)
          expect(createFsStore("/tmp").root).toBe("/tmp")
        })
      `,
    },
  },
]

describe("driver", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
