import { describe, expect, test } from "vitest"

import { blobDriver, node } from "../../readers.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The readers (04/07): a driver's tech is only what the readers bound to it
 * claim. The flavor names every kind, tests included; a binding only adds a
 * kind to a file the flavor leaves blob. A name or an import no bound reader
 * claims is unclaimed, red wherever a rule asks a proof; a driver or a test
 * file no reader reads is red (`driver-reader`), its way out a binding. The
 * corpus fills `host: [node()]` and `driver: [hostDriver()]` where a row writes
 * none (the transition, `cases.assembly.ts`); a row writing a group replaces
 * it, as a user's config does.
 */

/** A driver reader for the fixture's own tech: a router no stock reader knows. */
const ROUTER = {
  name: "made-up-router",
  tech: ["made-up-router"],
} as const

/** The notes service, its assembly, and the router package. */
const APP = {
  "node_modules/made-up-router/package.json": JSON.stringify({
    name: "made-up-router",
    main: "./index.js",
  }),
  "node_modules/made-up-router/index.js": "module.exports = {}",
  "src/notes/notes.service.ts": `
    export const createNotes = () => ({
      list: async (query: unknown) => (query ? [] : [1]),
    })
  `,
  "src/app.assembly.ts": `
    import { createNotes } from "./notes/notes.service.ts"
    export const createApp = () => ({ notes: createNotes() })
  `,
} as const

/** A driver over the router: its hooks cut, one use case each. */
const ROUTES = `
  import { route } from "made-up-router"
  import { createApp } from "./app.assembly.ts"
  export const main = () => {
    const { notes } = createApp()
    route("/notes", (query: unknown) => notes.list(query))
  }
`

/**
 * A driver reader for a router the project writes itself: it claims the file,
 * no package (GUESS: D4).
 */
const LOCAL_ROUTER = {
  name: "local-router",
  tech: ["./src/lib/router/router.model.ts"],
} as const

/** The project's own router: a model factory, its registrations kept inside. */
const ROUTER_FILE = {
  "src/lib/router/router.model.ts": `
    export const createRouter = () => {
      const routes = new Map<string, (query: unknown) => unknown>()
      return {
        route: (path: string, hook: (query: unknown) => unknown) => {
          routes.set(path, hook)
        },
      }
    }
  `,
} as const

/** A driver over the local router: its hooks cut, one use case each. */
const LOCAL_ROUTES = `
  import { createRouter } from "./lib/router/router.model.ts"
  import { createApp } from "./app.assembly.ts"
  export const main = () => {
    const { notes } = createApp()
    const router = createRouter()
    router.route("/notes", (query: unknown) => notes.list(query))
  }
`

const ROWS: readonly Row[] = [
  {
    name: "a driver over a router the project's reader claims: its hooks cut, the rules as ever",
    config: { readers: { driver: [ROUTER] } },
    files: { ...APP, "src/web.driver.ts": ROUTES },
  },
  {
    name: "a driver over a local router its reader claims as a project file: its hooks cut, the rules as ever",
    config: { readers: { driver: [LOCAL_ROUTER] } },
    files: { ...APP, ...ROUTER_FILE, "src/web.driver.ts": LOCAL_ROUTES },
  },
  {
    name: "the same local router no reader claims: a model the driver imports and calls, red",
    config: { readers: { driver: [ROUTER] } },
    files: {
      ...APP,
      ...ROUTER_FILE,
      // six reds for one missing premise, as with an unclaimed package's
      // callee before D8's cut: a project file has no such cut yet, and the
      // message calls \`route\` a use case (GUESS: D4, both findings)
      "src/web.driver.ts": `
        import { createRouter } from "./lib/router/router.model.ts"
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          // red: driver-calls-services -- a model's factory, called
          const router = createRouter()
          // red: wiring-outside-hooks -- the callback's use case, outside any hook
          // red: wiring-outside-hooks -- its argument read as computed
          // red: wiring-outside-hooks -- route, a model's, called in the wiring
          // red: wiring-outside-hooks -- handed a function
          router.route("/notes", (query: unknown) => notes.list(query))
        }
        // red: driver-calls-services -- the import: a model, not its tech
      `,
    },
  },
  {
    name: "a claimed router file keeps every rule of its own layer: its root state is red",
    config: { readers: { driver: [LOCAL_ROUTER] } },
    files: {
      ...APP,
      "src/lib/router/router.model.ts": `
        // red: stable-root -- claimed as tech, still a model
        const routes = new Map<string, (query: unknown) => unknown>()
        export const route = (path: string, hook: (query: unknown) => unknown) => {
          routes.set(path, hook)
        }
      `,
      "src/web.driver.ts": `
        import { route } from "./lib/router/router.model.ts"
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          route("/notes", (query: unknown) => notes.list(query))
        }
      `,
    },
  },
  {
    name: "the same driver with no reader bound is red on the file: its premises do not cover it",
    config: { readers: { driver: [] } },
    files: {
      ...APP,
      "src/web.driver.ts": `${ROUTES}
        // red: driver-reader -- no driver reader binds it; bind the router's
      `,
    },
  },
  {
    name: "a reader bound to other files leaves this driver unread — the binding is the premise",
    config: {
      readers: { driver: [{ ...ROUTER, include: ["src/admin/**"] }] },
    },
    files: {
      ...APP,
      "src/web.driver.ts": `${ROUTES}
        // red: driver-reader -- the router's reader is bound to src/admin only
      `,
    },
  },
  {
    name: "a blob-named file under a driver reader's written binding is a driver, read and judged",
    config: {
      readers: {
        driver: [{ ...ROUTER, include: ["src/routes/**/+page.ts"] }],
      },
    },
    files: {
      ...APP,
      "src/routes/notes/+page.ts": `
        import { route } from "made-up-router"
        import { createApp } from "../../app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          // red: hook-one-call -- two use-case calls in one hook
          route("/notes", (query: unknown) => {
            notes.list(query)
            return notes.list(query)
          })
        }
      `,
    },
  },
  {
    name: "a host call in a driver: Node's where node is bound",
    files: {
      ...APP,
      "src/cli.driver.ts": `
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          process.on("message", (query: unknown) => notes.list(query))
        }
      `,
    },
  },
  {
    name: "the same host call with no host bound: `process` is nobody's, red",
    config: { readers: { host: [] } },
    files: {
      ...APP,
      "src/cli.driver.ts": `
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          process.on("message", (query: unknown) => notes.list(query)) // red: driver-calls-services -- process, claimed by no bound reader
        }
      `,
    },
  },
  {
    name: "a builtin a driver imports: tech where node is bound",
    files: {
      ...APP,
      "src/cli.driver.ts": `
        import process from "node:process"
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          process.on("message", (query: unknown) => notes.list(query))
        }
      `,
    },
  },
  {
    name: "the same builtin with no host bound is an import no reader claims",
    config: { readers: { host: [] } },
    files: {
      ...APP,
      "src/cli.driver.ts": `
        import process from "node:process"
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          process.on("message", (query: unknown) => notes.list(query)) // red: driver-calls-services -- a call on node:process, claimed by no bound reader
        }
        // red: driver-calls-services -- the import of node:process, claimed by no bound reader
      `,
    },
  },
  {
    name: "a call at a service's root on a builtin no reader claims is red, reaching unclaimed",
    config: { readers: { host: [] } },
    files: {
      "src/clock/clock.service.ts": `
        import { hrtime } from "node:process"
        export const STARTED = hrtime() // red: stable-root + stable-root -- node:process, claimed by nobody; the binding rides the call
        export const createClock = () => ({ started: () => STARTED })
      `,
    },
    checks: ["modules"],
  },
  {
    name: "a driver counted as blob on purpose: nothing inside judged, its inbound seal kept",
    config: {
      readers: {
        host: [node()],
        driver: [blobDriver({ include: ["src/legacy.driver.ts"] })],
      },
    },
    files: {
      ...APP,
      "src/legacy.driver.ts": `
        import { createApp } from "./app.assembly.ts"
        export const main = () => {
          const { notes } = createApp()
          if (process.argv.length > 2) notes.list(1)
          notes.list(2)
        }
      `,
      "src/notes/notes.adapter.ts": `
        import { main } from "../legacy.driver.ts"
        export const createNotesAdapter = () => ({ start: main })
        // red: inward-deps, driver-not-imported -- the seal holds for a silenced driver
      `,
    },
    checks: ["layers", "driver"],
  },
  {
    name: "an e2e file is a test file by the flavor's name, read by the test reader",
    files: {
      "src/notes/notes.service.ts": `
        export const createNotes = () => ({ count: () => 1 })
      `,
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/notes/notes.e2e.ts": `
        import { expect, test } from "vitest"
        import { createNotes } from "./notes.service.ts"
        test("counts", () => {
          expect(createNotes().count()).toBe(1)
        })
      `,
    },
  },
  {
    name: "a file under __tests__ with no test name is blob, counted, not read as a test",
    files: {
      "src/notes/notes.service.ts": `
        export const createNotes = () => ({ count: () => 1 })
      `,
      "src/notes/__tests__/helpers.ts": `
        export const SEED = 1
      `,
    },
  },
  {
    name: "with the test group written empty, a spec file is read by nobody: red",
    config: { readers: { test: [] } },
    files: {
      "src/notes/notes.service.ts": `
        export const createNotes = () => ({ count: () => 1 })
      `,
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/notes/notes.service.spec.ts": `
        import { expect, test } from "vitest"
        import { createNotes } from "./notes.service.ts"
        test("counts", () => {
          expect(createNotes().count()).toBe(1)
        })
        // red: driver-reader -- test: [] drops the default test reader
      `,
    },
  },
]

describe("readers", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
