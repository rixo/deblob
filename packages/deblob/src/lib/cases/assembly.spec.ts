import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * `assembly-builds-only`, by what canon says the rule buys: "A file that may
 * import anything must be allowed to do almost nothing with it, or it becomes
 * the place where logic hides." Every call builds; what the assembly builds is
 * passed on or returned, never computed with or member-accessed; arguments are
 * literals, tech values received as parameters, or instances; no use-case call
 * but a declared load; a branch or loop is wiring on a parameter or a loaded
 * value with factory arms; nothing is defined but assembly functions, and
 * nothing sits at root but imports.
 *
 * Written red first; the assembly check reports them since the detectors step,
 * checkpoint 5 — the import of concrete tech waits on its `layers` cell. Each
 * red row's way out is in the step's SPEC
 * (`history/20260913_driver-layer/04_outside-rules/02_rows-first/SPEC.md`, the
 * assembly table); the rules are strict on purpose, and a red with no way out
 * is the finding to raise. The import half, `assembly-driver-only`, lives in
 * `layers.spec.ts`. Every row cites the canon sentence it embodies, and every
 * tree is legal under every other rule.
 */

/** The `notes` service every row wires: a service, two adapters, a model. */
const NOTES = {
  "src/notes/notes.service.ts": `
    export const createNotes = (deps: { store: unknown; limits?: unknown; settings?: unknown; index?: unknown }) => ({
      list: () => [deps.store],
    })
  `,
  "src/notes/adapters/fs-store.adapter.ts": `
    export const createFsStore = (root: string) => ({ root, ready: true })
  `,
  "src/notes/adapters/memory-store.adapter.ts": `
    export const createMemoryStore = () => ({ root: "", ready: true })
  `,
  "src/notes/limits.model.ts": `
    export const createLimits = (max: number) => ({ max })
  `,
} as const

const IMPORTS = `
  import { createNotes } from "./notes/notes.service.ts"
  import { createFsStore } from "./notes/adapters/fs-store.adapter.ts"
  import { createMemoryStore } from "./notes/adapters/memory-store.adapter.ts"
  import { createLimits } from "./notes/limits.model.ts"
`

/**
 * The driver that calls the assembly — its wiring function builds, its hook
 * fires.
 */
const DRIVER = {
  "src/cli.driver.ts": `
    import { createNotesAssembly } from "./notes.assembly.ts"
    export const main = () => {
      const services = createNotesAssembly({ cwd: process.cwd(), store: "fs" })
      process.on("ready", () => services.notes.list())
    }
  `,
} as const

/** The config service whose `load` a row declares, or does not. */
const CONFIG = {
  "src/config/config.service.ts": `
    export const createConfig = ({ cwd }: { cwd: string }) => ({
      load: async () => ({ root: cwd }),
    })
  `,
} as const

const VITEST = {
  "node_modules/vitest/package.json": JSON.stringify({
    name: "vitest",
    main: "./index.js",
  }),
  "node_modules/vitest/index.js": "module.exports = {}",
} as const

const ROWS: readonly Row[] = [
  {
    // canon: "every call in an assembly is there to build … A model call is
    // allowed on the same terms as any other — its result is passed on or
    // returned". Arguments: a tech value received, a literal, instances.
    name: "factories called in order, a tech value, a literal and instances as arguments, a model call passed on: the assembly builds",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd)
          const limits = createLimits(10)
          return { notes: createNotes({ store: fs, limits }) }
        }
      `,
    },
  },
  {
    // canon: "arguments are literals, tech values received as parameters, or
    // instances" — a computed one is none of them.
    name: "a computed argument is red: not a literal, not a tech value received, not an instance",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd + "/notes") // red: assembly-builds-only -- a computed argument
          return { notes: createNotes({ store: fs }) }
        }
      `,
    },
  },
  {
    // canon: "what the assembly builds … is passed on or returned, never
    // computed with or member-accessed" — a model's result included.
    name: "a field read on what the assembly built is red, an adapter's or a model's: the assembly using what it built",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const root = createFsStore(cwd).root // red: assembly-builds-only -- a field of an adapter instance
          const limits = createLimits(10)
          return { notes: createNotes({ store: root, limits: limits.max }) } // red: assembly-builds-only -- a field of a model's result
        }
      `,
    },
  },
  {
    // canon: "A branch or loop is wiring when what it tests or iterates is a
    // parameter or a loaded value, compared to a literal or for truthiness,
    // and its arms are factory calls." `store` is a CLI option passed in.
    name: "a branch on a parameter compared to a literal, with factory arms, is wiring",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd, store }: { cwd: string; store: "fs" | "memory" }) => {
          const notesStore = store === "memory" ? createMemoryStore() : createFsStore(cwd)
          return { notes: createNotes({ store: notesStore }) }
        }
      `,
    },
  },
  {
    // canon: "A condition on an instance, or on a value computed from one, is
    // a decision the map cannot show; it belongs to the service or adapter
    // that owns it."
    name: "a branch on an instance is red: a decision the map cannot show",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd)
          const store = fs.ready ? fs : createMemoryStore() // red: assembly-builds-only, assembly-builds-only -- a field of an instance read, and a branch on it: two facts, two fixes
          return { notes: createNotes({ store }) }
        }
      `,
    },
  },
  {
    // canon: "No use-case call: a use case whose result feeds a factory is a
    // pipeline hiding in the wiring."
    name: "a use-case call in an assembly is red",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const notes = createNotes({ store: createFsStore(cwd) })
          notes.list() // red: assembly-builds-only -- a use case run in the wiring
          return { notes }
        }
      `,
    },
  },
  {
    // canon: "The exception is the load, a use case the graph itself depends
    // on … Loads are declared", "A tech value may be read — a field, a
    // destructured part — and is still a tech value" (ruled 2026-09-25), and
    // "awaiting a call is the call".
    name: "a declared load is awaited, and its result is a tech value: passed whole, read by field or destructured",
    config: { configLoads: "src/config/config.service.ts#load" },
    files: {
      ...NOTES,
      ...CONFIG,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        import { createConfig } from "./config/config.service.ts"
        export const createNotesAssembly = async ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const settings = await createConfig({ cwd }).load()
          return { notes: createNotes({ store: createFsStore(settings.root), settings }) }
        }
        export const createRootedAssembly = async ({ cwd }: { cwd: string }) => {
          const { root } = await createConfig({ cwd }).load()
          return { notes: createNotes({ store: createFsStore(root) }) }
        }
      `,
    },
  },
  {
    // canon: "an undeclared call is a violation whose resolution is the
    // declaration".
    name: "the same load, undeclared, is a use-case call: red",
    files: {
      ...NOTES,
      ...CONFIG,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        import { createConfig } from "./config/config.service.ts"
        export const createNotesAssembly = async ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const settings = await createConfig({ cwd }).load() // red: assembly-builds-only -- an undeclared load
          return { notes: createNotes({ store: createFsStore(cwd), settings }) } // red: assembly-builds-only -- its result handed on, computed: declaring the load clears both
        }
      `,
    },
  },
  {
    // canon: "or a blob file's when a dependency not yet extracted is built
    // here and injected behind the port that awaits it".
    name: "a blob file's factory, built and injected: blob enters the graph here",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/legacy/index-builder.ts": `
        export const createLegacyIndex = () => ({ find: () => [] })
      `,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        import { createLegacyIndex } from "./legacy/index-builder.ts"
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(cwd), index: createLegacyIndex() }) }
        }
      `,
    },
  },
  {
    // canon: "It returns services … and no adapter unless a test is the
    // caller."
    name: "an assembly returning an adapter to a driver is red",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd)
          return { notes: createNotes({ store: fs }), fs } // red: assembly-builds-only -- an adapter returned, a driver the caller
        }
      `,
    },
  },
  {
    // Added at the detectors step, checkpoint 5, stamped after the check: no
    // stamped row returned a part of an adapter.
    // canon: "what the assembly builds … never … member-accessed" — a field of
    // an adapter returned is that read, one fact; the adapter itself is not
    // returned.
    name: "a field of an adapter returned to a driver is a field read: one red",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd)
          return { notes: createNotes({ store: fs }), root: fs.root } // red: assembly-builds-only -- a field of an adapter read
        }
      `,
    },
  },
  {
    // canon: "An assembly does not return adapters, except when called by a
    // test … an assembly that returns adapters can only be called by tests."
    name: "the same assembly, called by a spec file only, is a test factory: green",
    files: {
      ...NOTES,
      ...VITEST,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(cwd)
          return { notes: createNotes({ store: fs }), fs }
        }
      `,
      "src/notes.spec.ts": `
        import { expect, it } from "vitest"
        import { createNotesAssembly } from "./notes.assembly.ts"
        it("lists the store", () => {
          const { notes, fs } = createNotesAssembly({ cwd: "/tmp", store: "fs" })
          expect(notes.list()).toEqual([fs])
        })
      `,
    },
  },
  {
    // canon: "nothing sits at module root but imports". A primitive at root is
    // green under `stable-root`: this rule's red alone.
    name: "a constant at an assembly's root is red: nothing but imports",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        const LIMIT = 10 // red: assembly-builds-only -- a binding at root, not an import
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(cwd), limits: createLimits(LIMIT) }) }
        }
      `,
    },
  },
  {
    // canon: a definition is a declaration "of something that exists at run
    // time … A type is not one: where a type may travel, the import rules
    // already say" (re-ruled 2026-09-26, was red): `assembly-driver-only`
    // keeps an assembly's types to drivers and assemblies.
    name: "a type defined in an assembly file is green: a type runs nothing, and the import rules say who may read it",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        type Deps = { cwd: string; store: "fs" | "memory" }
        export const createNotesAssembly = ({ cwd }: Deps) => {
          return { notes: createNotes({ store: createFsStore(cwd) }) }
        }
      `,
    },
  },
  {
    // canon: "Nothing but assembly functions is defined", and "every call in
    // an assembly is there to build" — a local helper builds nothing.
    name: "a helper function beside the assembly function is red, and so is its call",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        const rootOf = (cwd: string) => cwd // red: assembly-builds-only -- a definition that builds nothing
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(rootOf(cwd)) }) } // red: assembly-builds-only + assembly-builds-only -- a call that builds nothing, and the argument it computed
        }
      `,
    },
  },
  {
    // Added at the detectors step, checkpoint 5, stamped after the check: no
    // stamped row reached a function handed on.
    // canon: "Nothing but assembly functions is defined" — a function written
    // as an argument is one. Way out: the service or the adapter owns it.
    name: "a function handed to a factory is red: an assembly defines nothing",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(cwd), index: () => [] }) } // red: assembly-builds-only -- a function defined and handed on
        }
      `,
    },
  },
  {
    // Added at checkpoint 5, as the row above.
    // canon: "every call in an assembly is there to build", and nothing is
    // defined but assembly functions — a hook registered on the host builds
    // nothing, and the function is the call's: one fix. Way out: the driver
    // registers it.
    name: "a function handed to a tech call rides with the call: one fix",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          process.on("exit", () => undefined) // red: assembly-builds-only + assembly-builds-only -- a call into the host, and the hook handed to it
          return { notes: createNotes({ store: createFsStore(cwd) }) }
        }
      `,
    },
  },
  {
    // Added at checkpoint 5, as the row above.
    // canon: "arguments are literals, tech values received as parameters, or
    // instances" — a record spread into one hands its entries on, each judged
    // as passed. Way out: as the computed-argument row's.
    name: "a record spread into an argument is judged as passed: a computed one is red",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const paths = { root: cwd + "/notes" }
          return { notes: createNotes({ ...paths, store: createFsStore(cwd) }) } // red: assembly-builds-only -- a computed record spread in
        }
      `,
    },
  },
  {
    // Added at checkpoint 5, as the row above.
    // canon: "nothing sits at module root but imports"; the assignment runs on
    // import, `stable-root`'s red as well.
    name: "an assignment at an assembly's root is red twice: not an import, and a side effect on load",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        process.env["NOTES"] = "on" // red: assembly-builds-only, stable-root -- a statement at root, and it runs on import
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(cwd) }) }
        }
      `,
    },
  },
  {
    // canon: "a branch or loop is wiring when what it … iterates is a
    // parameter … and its arms are factory calls". `.map` on a proven array
    // is the language's loop (ruled 2026-09-25, "as long as we can track it
    // 100%").
    name: "a map over an array parameter with a factory arm is a loop: wiring",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ names }: { names: readonly string[] }) => {
          return { notes: createNotes({ store: names.map((name) => createFsStore(name)) }) }
        }
      `,
    },
  },
  {
    // Re-stamped at the detectors step, checkpoint 5: one unknown, four
    // members — the map's call, the callback handed it, the element the
    // callback reads (handed back by that call), the value passed on; proving
    // the array clears the four.
    // canon: "a call on one is not" a tech value; "any declares nothing a
    // reader could prove" (step 06). The receiver is not proven an array:
    // `.map` may be anything's (ruled unknown 2026-09-25). Ways out: type it,
    // or `createFsStores(names)` in the adapter.
    name: "the same map over a parameter typed any is unknown: a loop cannot be told from a call on a tech value",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ names }: { names: any }) => {
          return { notes: createNotes({ store: names.map((name: string) => createFsStore(name)) }) } // stubborn unknown: assembly-builds-only + assembly-builds-only + assembly-builds-only + assembly-builds-only -- the receiver of map is not proven an array: the call, the callback handed it, the element, the value passed on
        }
      `,
    },
  },
  {
    // Re-stamped at checkpoint 5, as the row above.
    // As the row above, in JavaScript: no type proves the receiver (ruled
    // unknown 2026-09-25). Not stuck: `createFsStores(names)` in the adapter
    // is green today, JSDoc once the engine reads it.
    name: "the same map in a JavaScript assembly is unknown: no type proves the receiver",
    files: {
      ...NOTES,
      "src/cli.driver.ts": `
        import { createNotesAssembly } from "./notes.assembly.js"
        export const main = () => {
          const services = createNotesAssembly({ names: process.argv })
          process.on("ready", () => services.notes.list())
        }
      `,
      "src/notes.assembly.js": `
        ${IMPORTS}
        export const createNotesAssembly = ({ names }) => {
          return { notes: createNotes({ store: names.map((name) => createFsStore(name)) }) } // stubborn unknown: assembly-builds-only + assembly-builds-only + assembly-builds-only + assembly-builds-only -- the receiver of map is not proven an array: the call, the callback handed it, the element, the value passed on
        }
      `,
    },
  },
  {
    // canon: "awaiting a call is the call: `await` changes when its result
    // arrives, not what it is" (canonized 2026-09-25).
    name: "an awaited async factory is a factory call: its result passed on",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes/adapters/db-store.adapter.ts": `
        export const createDbStore = async (url: string) => ({ url, ready: true })
      `,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        import { createDbStore } from "./notes/adapters/db-store.adapter.ts"
        export const createNotesAssembly = async ({ url }: { url: string }) => {
          const store = await createDbStore(url)
          return { notes: createNotes({ store }) }
        }
      `,
    },
  },
  {
    // canon: "a composition unit's factory, another assembly's"; "a record of
    // services and shared model instances".
    name: "another assembly's call, passed on, and a record of services and a shared model instance returned",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/search/search.service.ts": `
        export const createSearch = (deps: { shared: unknown }) => ({ find: () => [deps.shared] })
      `,
      "src/shared.assembly.ts": `
        import { createLimits } from "./notes/limits.model.ts"
        export const createSharedAssembly = () => ({ limits: createLimits(10) })
      `,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        import { createSearch } from "./search/search.service.ts"
        import { createSharedAssembly } from "./shared.assembly.ts"
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const shared = createSharedAssembly()
          const limits = createLimits(10)
          return {
            notes: createNotes({ store: createFsStore(cwd), limits }),
            search: createSearch({ shared }),
            limits,
          }
        }
      `,
    },
  },
  {
    // canon: tech values include "a framework's context handle passed through
    // and never called"; "a call on one is not" a tech value.
    name: "a framework's handle passed through is green; called in the assembly, it is red",
    files: {
      ...NOTES,
      "src/auth/adapters/header-auth.adapter.ts": `
        export const createHeaderAuth = (deps: { request?: unknown; token?: unknown }) => ({ user: () => deps.token ?? deps.request })
      `,
      "src/auth.driver.ts": `
        import { createAuthAssembly, createTokenAssembly } from "./auth.assembly.ts"
        export const main = () => {
          process.on("request", (request: Request) => createAuthAssembly({ request }).notes.list())
          process.on("token", (request: Request) => createTokenAssembly({ request }).notes.list())
        }
      `,
      "src/auth.assembly.ts": `
        import { createNotes } from "./notes/notes.service.ts"
        import { createHeaderAuth } from "./auth/adapters/header-auth.adapter.ts"
        export const createAuthAssembly = ({ request }: { request: Request }) => {
          return { notes: createNotes({ store: createHeaderAuth({ request }) }) }
        }
        export const createTokenAssembly = ({ request }: { request: Request }) => {
          const auth = createHeaderAuth({ token: request.headers.get("x-token") }) // red: assembly-builds-only -- the handle called
          return { notes: createNotes({ store: auth }) }
        }
      `,
    },
  },
  {
    // Added at the detectors step, checkpoint 5, stamped red first: the
    // argument clause took any tech value, received or not.
    // canon: "Never a driver, never concrete tech: tech values arrive as
    // parameters" — a host global read in the assembly was not received: the
    // assembly discovers the tech itself. Way out: the driver hands it in,
    // `createNotesAssembly({ env: process.env })`.
    name: "the host read in an assembly is red, whole or by field: tech values arrive as parameters",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const fs = createFsStore(process.env) // red: assembly-builds-only -- the host passed whole, found, not received
          const env = process.env
          return { notes: createNotes({ store: fs, settings: process.env.HOME, index: env }) } // red: assembly-builds-only, assembly-builds-only -- the host read by field, and through a const: found, not received
        }
      `,
    },
  },
  {
    // canon: "Never a driver, never concrete tech: tech values arrive as
    // parameters" — the import is the layers cell (03's matrix: assembly →
    // concrete external), the call a non-factory call.
    name: "concrete tech imported into an assembly is red, and so is its call",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        import { realpathSync } from "node:fs"
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(realpathSync(cwd)) }) } // red: assembly-builds-only -- a call that builds nothing, the tech's
        }
        // missed red: assembly-builds-only -- the import of node:fs: concrete tech in an assembly; the matrix cell is not built yet
      `,
    },
  },
  {
    // Added at the detectors step, checkpoint 3: the row above used
    // node:path, which deblob ships pure.
    // canon: "A model call is allowed on the same terms as any other — its
    // result is passed on or returned". A pure builtin is model: `join` is the
    // model function the computed-argument row's way out names.
    name: "a pure builtin's function, its result passed on, is a model call: green",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/notes.assembly.ts": `
        import { join } from "node:path"
        ${IMPORTS}
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          return { notes: createNotes({ store: createFsStore(join(cwd, "notes")) }) }
        }
      `,
    },
  },
  {
    // canon: "what the assembly builds … never … member-accessed" — a child
    // assembly's record read for one service moves an instance sideways:
    // "Shared instances flow down, never sideways."
    name: "a service read out of another assembly's record and handed on is red: an instance moved sideways",
    files: {
      ...NOTES,
      ...DRIVER,
      "src/search/search.service.ts": `
        export const createSearch = (deps: { notes: unknown }) => ({ find: () => [deps.notes] })
      `,
      "src/shared.assembly.ts": `
        import { createNotes } from "./notes/notes.service.ts"
        import { createFsStore } from "./notes/adapters/fs-store.adapter.ts"
        export const createSharedAssembly = ({ cwd }: { cwd: string }) => ({
          notes: createNotes({ store: createFsStore(cwd) }),
        })
      `,
      "src/notes.assembly.ts": `
        import { createSearch } from "./search/search.service.ts"
        import { createSharedAssembly } from "./shared.assembly.ts"
        export const createNotesAssembly = ({ cwd }: { cwd: string; store: "fs" | "memory" }) => {
          const { notes } = createSharedAssembly({ cwd }) // red: assembly-builds-only -- a child assembly's record read for one service
          return { notes, search: createSearch({ notes }) }
        }
      `,
    },
  },
]

describe("assembly", () => {
  test.each(ROWS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
