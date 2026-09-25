import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * `boot-one-call`, by what canon says the boot is: "the one module whose
 * evaluation performs a call. Two rights, nothing more" — it imports a single
 * driver and calls its wiring function exactly once, at module root, with no
 * arguments; it imports nothing else, defines nothing, holds nothing, touches
 * no tech. The boot's one call is also the exemption `stable-root` needs to
 * hold everywhere else. The import cells — a boot importing anything but its
 * driver, anything importing a boot — live in `layers.spec.ts`.
 *
 * Red first: no check reports the rule yet, so every red is a `missed red`
 * naming what it waits for. Each red's way out is in the step's SPEC (the boot
 * and test table).
 */

const WAIT = "the boot check is not built yet"

/** The CLI the boot starts: its service, assembly, parser and driver. */
const CLI = {
  "node_modules/cac/package.json": JSON.stringify({
    name: "cac",
    main: "./index.js",
  }),
  "node_modules/cac/index.js": "module.exports = {}",
  "src/lib/cli/cli.service.ts": `
    export const createCli = (deps: { cwd: string }) => ({
      check: async (opts: unknown) => (opts ? 0 : deps.cwd.length),
    })
  `,
  "src/cli.assembly.ts": `
    import { createCli } from "./lib/cli/cli.service.ts"
    export const createCliAssembly = ({ cwd }: { cwd: string }) => ({ cli: createCli({ cwd }) })
  `,
  "src/cli.driver.ts": `
    import { cac } from "cac"
    import { createCliAssembly } from "./cli.assembly.ts"
    export const main = () => {
      const { cli } = createCliAssembly({ cwd: process.cwd() })
      const parser = cac("notes")
      parser.command("check").action((opts) => cli.check(opts))
      parser.parse(process.argv)
    }
  `,
} as const

const CONFIG = { driverTech: ["cac"] } as const

const ROWS: readonly Row[] = [
  {
    // canon: "a boot imports a single driver and calls its wiring function
    // once, at module root, with no arguments". A shebang is not a statement.
    name: "the boot: a shebang, one driver imported, its wiring function called once with nothing",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.boot.ts": `#!/usr/bin/env node
        import { main } from "./cli.driver.ts"
        main()
      `,
    },
  },
  {
    // canon: "It imports nothing else" — a side-effect import too (ruled
    // 2026-09-25: its way out is the driver's import, evaluated before `main`
    // runs).
    name: "a side-effect import beside the driver is red: a boot imports nothing else",
    config: CONFIG,
    files: {
      ...CLI,
      "node_modules/dotenv/package.json": JSON.stringify({
        name: "dotenv",
        main: "./index.js",
      }),
      "node_modules/dotenv/index.js": "module.exports = {}",
      "node_modules/dotenv/config.js": "module.exports = {}",
      "src/cli.boot.ts": `
        import "dotenv/config"
        import { main } from "./cli.driver.ts"
        main()
        // missed red: boot-one-call -- the import of dotenv/config: a boot imports nothing else; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: "with no arguments … touches no tech: `process`, `document`, the
    // parser are the driver's to read".
    name: "an argument to the wiring function is red: the tech is the driver's to read",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        main(process.argv) // missed red: boot-one-call -- an argument, and the tech touched; ${WAIT}
      `,
    },
  },
  {
    // canon: "defines nothing, holds nothing".
    name: "a definition, or the call's result held, is red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        const start = () => main() // missed red: boot-one-call -- a definition; ${WAIT}
        start() // missed red: boot-one-call -- a call that is not the driver's wiring function; ${WAIT}
      `,
      "src/worker.boot.ts": `
        import { main } from "./cli.driver.ts"
        // false unknown: stable-root -- a call's result is not followed yet
        const app = main() // missed red: boot-one-call -- the call's result held; ${WAIT}
      `,
    },
  },
  {
    // canon: "calls its wiring function once" — exactly once: two is red, and
    // so is none, "the one module whose evaluation performs a call"
    // performing none. The second call is also past `stable-root`'s
    // exemption, which is the one call.
    name: "the wiring function called twice, or never, is red: exactly once",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        main()
        main() // missed red: boot-one-call, stable-root -- a second call; the exemption is the one call; ${WAIT}, and the call shape is not built yet
      `,
      "src/worker.boot.ts": `
        import { main } from "./cli.driver.ts"
        // missed red: boot-one-call -- the driver imported, its wiring function never called; ${WAIT}
      `,
    },
  },
  {
    // canon: "touches no tech"; an assignment at root is also `stable-root`'s
    // "a root statement that … still does something".
    name: "touching the tech in a boot is red",
    config: CONFIG,
    files: {
      ...CLI,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        // missed red: boot-one-call -- the tech touched; ${WAIT}
        process.title = "notes" // red: stable-root -- an assignment at root
        main()
      `,
    },
  },
]

describe("boot", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
