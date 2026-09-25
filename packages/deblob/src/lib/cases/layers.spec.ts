import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/** The assembly the import rows point at, and what it wires. */
const ASSEMBLY = {
  "src/notes/notes.service.ts": `
    export const createNotes = (deps: { store: unknown }) => ({ list: () => [] as readonly unknown[] })
  `,
  "src/notes/adapters/fs-store.adapter.ts": `
    export const createFsStore = (root: string) => ({ root })
  `,
  "src/notes.assembly.ts": `
    import { createNotes } from "./notes/notes.service.ts"
    import { createFsStore } from "./notes/adapters/fs-store.adapter.ts"
    export const createNotesAssembly = ({ cwd }: { cwd: string }) => ({
      notes: createNotes({ store: createFsStore(cwd) }),
    })
  `,
} as const

const ROWS: readonly Row[] = [
  {
    name: "a model importing a service is inward-deps, and runtime-import: as a type it would pass",
    files: {
      "src/totals.service.ts": `
        export const createTotals = () => ({ sum: (xs: number[]) => xs.length })
      `,
      "src/report.model.ts": `
        import { createTotals } from "./totals.service.ts"
        export const report = () => createTotals().sum([])
        // red: inward-deps, runtime-import -- the import of totals.service: a model reaching outward
      `,
    },
    checks: ["layers"],
  },
  {
    name: "a bare import lands in the tree's node_modules and reads through its manifest: concrete in a service is service-purity",
    files: {
      "node_modules/made-up-pkg/package.json": JSON.stringify({
        name: "made-up-pkg",
        main: "./index.js",
      }),
      "node_modules/made-up-pkg/index.js": "module.exports = {}",
      "src/app.service.ts": `
        import pkg from "made-up-pkg"
        export const createApp = () => pkg
        // red: service-purity, runtime-import -- the import of made-up-pkg: a concrete package in a service
      `,
    },
    checks: ["layers"],
  },
  {
    // canon: `ambient-access`, "a model or a service is handed the
    // environment, the time and randomness, by its caller or through a port …
    // The same at module root or in a function, in a condition or in a value."
    // A `throw` the read decides is green (`stable-root`); the read stored
    // at root is also captured state (`stable-root`, ruled 2026-09-21).
    name: "reading the environment in a service is ambient-access wherever it sits: at root, in a condition, in a function",
    files: {
      "src/server.service.ts": `
        // missed red: ambient-access -- discovered, not handed in; ambient-access is not built yet
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: stable-root -- captured at load time
        if (!process.env["SOME_MADE_UP_KEY"]) throw new Error("made up") // missed red: ambient-access -- the read, not the throw; ambient-access is not built yet
        export const createServer = () => ({
          host: () => process.env["SOME_MADE_UP_HOST"], // missed red: ambient-access -- ambient-access is not built yet
        })
      `,
    },
  },
  {
    // canon: `ambient-access`, and the model's own list: "time, randomness,
    // `globalThis` are inputs passed by the caller, not discoveries". A pure
    // language global is no environment: `Math.min`, `Math.floor` stay green.
    // The read stored at root is also captured state (`stable-root`).
    name: "reading the environment, the time or randomness in a model is ambient-access; a pure language global is not",
    files: {
      "src/mode.model.ts": `
        // missed red: ambient-access -- an input; ambient-access is not built yet
        export const SOME_MADE_UP_MODE: string = process.env["SOME_MADE_UP_MODE"] ?? "dev" // red: stable-root -- captured at load time
        export const stamp = () => Date.now() // missed red: ambient-access -- time is an input; ambient-access is not built yet
        export const pick = (xs: readonly number[]) => xs[Math.floor(Math.random() * xs.length)] // missed red: ambient-access -- randomness is an input; ambient-access is not built yet
        export const clamp = (n: number) => Math.min(n, 10)
      `,
    },
  },
  {
    // canon: `ambient-access`, "Adapters and drivers read the environment:
    // that is the tech's business." Ruled 2026-09-21 (rixo). Storing the read
    // at root is another matter, and another rule: `stable-root`, "A
    // value read from the tech is proven by no type".
    name: "reading the environment in an adapter is not ambient-access; storing the read at root is still captured state",
    files: {
      "src/server/adapters/env-server.adapter.ts": `
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: stable-root -- captured at load time, whatever the layer
        if (!process.env["SOME_MADE_UP_KEY"]) throw new Error("made up")
        export const createEnvServer = () => ({
          host: () => process.env["SOME_MADE_UP_HOST"],
        })
      `,
    },
  },
  {
    // canon: `assembly-driver-only`, "An assembly is imported only by drivers
    // and assemblies".
    name: "a driver and another assembly import an assembly: green",
    files: {
      ...ASSEMBLY,
      "src/cli.driver.ts": `
        import { createNotesAssembly } from "./notes.assembly.ts"
        export const main = () => {
          const services = createNotesAssembly({ cwd: process.cwd() })
          process.on("ready", () => services.notes.list())
        }
      `,
      "src/app.assembly.ts": `
        import { createNotesAssembly } from "./notes.assembly.ts"
        export const createAppAssembly = ({ cwd }: { cwd: string }) => createNotesAssembly({ cwd })
      `,
    },
  },
  {
    // canon: `assembly-driver-only`, "an assembly has no contract to depend
    // on"; the service also points outward, `inward-deps`.
    name: "a service importing an assembly is red twice: outward, and an assembly has no contract",
    files: {
      ...ASSEMBLY,
      "src/search/search.service.ts": `
        import { createNotesAssembly } from "../notes.assembly.ts"
        export const createSearch = ({ cwd }: { cwd: string }) => ({ find: () => createNotesAssembly({ cwd }) })
        // red: inward-deps -- the import of notes.assembly: a service reaching outward
        // missed red: assembly-driver-only -- the import of notes.assembly: only drivers and assemblies; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: `assembly-driver-only`, "type imports included; an assembly has
    // no contract to depend on".
    name: "a service importing an assembly as a type is red: runtime-import's exemption does not reach it",
    files: {
      ...ASSEMBLY,
      "src/search/search.service.ts": `
        import type { createNotesAssembly } from "../notes.assembly.ts"
        export const createSearch = (deps: { notes: ReturnType<typeof createNotesAssembly>["notes"] }) => ({ find: () => deps.notes.list() })
        // red: inward-deps -- the type import of notes.assembly: outward, and the type exemption covers service and adapter targets only
        // missed red: assembly-driver-only -- the type import of notes.assembly: type imports included; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: `assembly-driver-only` — blob is neither a driver nor an
    // assembly.
    name: "a blob file importing an assembly is red",
    files: {
      ...ASSEMBLY,
      "src/legacy/start-notes.ts": `
        import { createNotesAssembly } from "../notes.assembly.ts"
        export const startNotes = () => createNotesAssembly({ cwd: "/" }).notes.list()
        // missed red: assembly-driver-only -- the import of notes.assembly from blob; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: `test-is-outside`, "A test file is assembly and driver in one …
    // It imports anything"; a test factory is an assembly function.
    name: "a spec file importing an assembly is green",
    files: {
      ...ASSEMBLY,
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/notes.spec.ts": `
        import { expect, it } from "vitest"
        import { createNotesAssembly } from "./notes.assembly.ts"
        it("lists", () => {
          expect(createNotesAssembly({ cwd: "/" }).notes.list()).toEqual([])
        })
      `,
    },
  },
  {
    // canon: "Never a driver" (assembly), outward along the chain
    // (`inward-deps`), and `driver-not-imported`, "Nothing but a boot or
    // another driver imports a driver".
    name: "an assembly importing a driver is red twice: outward, and a driver is imported by a boot or a driver only",
    files: {
      ...ASSEMBLY,
      "src/other.driver.ts": `
        export const main = () => {
          process.on("ready", () => undefined)
        }
      `,
      "src/wired.assembly.ts": `
        import { main } from "./other.driver.ts"
        export const createWiredAssembly = () => ({ start: main })
        // red: inward-deps -- the import of other.driver: an assembly reaching outward
        // missed red: driver-not-imported -- the import of other.driver from an assembly; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: `driver-not-imported`, "nothing but a boot or another driver
    // imports a driver, type imports included"; the service also points
    // outward, `inward-deps`.
    name: "a service importing a driver as a type is red: type imports included",
    files: {
      ...ASSEMBLY,
      "src/cli.driver.ts": `
        import { createNotesAssembly } from "./notes.assembly.ts"
        export const main = () => {
          const services = createNotesAssembly({ cwd: process.cwd() })
          process.on("ready", () => services.notes.list())
        }
      `,
      "src/search/search.service.ts": `
        import type { main } from "../cli.driver.ts"
        export const createSearch = (deps: { start: typeof main }) => ({ find: () => deps.start })
        // red: inward-deps -- the type import of cli.driver: a service reaching outward
        // missed red: driver-not-imported -- the type import of cli.driver: type imports included; the matrix cell is not built yet
      `,
    },
  },
  {
    // canon: `driver-not-imported` — blob is neither a boot nor a driver.
    name: "a blob file importing a driver is red",
    files: {
      ...ASSEMBLY,
      "src/cli.driver.ts": `
        import { createNotesAssembly } from "./notes.assembly.ts"
        export const main = () => {
          const services = createNotesAssembly({ cwd: process.cwd() })
          process.on("ready", () => services.notes.list())
        }
      `,
      "src/legacy/start.ts": `
        import { main } from "../cli.driver.ts"
        export const start = () => main()
        // missed red: driver-not-imported -- the import of cli.driver from blob; the matrix cell is not built yet
      `,
    },
  },
]

describe("layers", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
