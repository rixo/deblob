import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * `inert-modules`, by what canon says the rule buys: a module's evaluation
 * creates no mutable state and performs no side effect, so importing a file
 * does nothing and the file can be tested in its own right. What is red at root
 * follows from that sentence and the known shapes are not a closed list — a
 * binding whose immutability the syntax does not prove, a call that reaches the
 * tech, runs a use case, or goes into a local function of a layer that may
 * touch the tech, and a root statement that still does something when the
 * module is evaluated. A factory call is neither: a factory is a function and
 * does nothing until called, so the call is the lane both targets use to get
 * around the rule, not the crime (ruled 2026-09-19 — a callee's name draws no
 * verdict). Exempt by kind: the boot's one call, and a spec file's registration
 * calls into the runner. Assembly and driver get no exception — each builds
 * inside its function.
 *
 * Every row cites the canon sentence it embodies. A row that cannot cite one is
 * a row where policy was invented in a test and dressed as a case; the citation
 * is also what makes a row reviewable in a minute rather than twenty.
 *
 * A row marked **UNSTAMPED** has not had its verdict read and accepted, or
 * carries an open question. It runs like any other — the corpus is the queue —
 * but it is not the golden gate: it cannot be cited as proof, and a detector
 * agreeing with it would mean only that an agent wrote the marker and an agent
 * wrote the detector. Rows are stamped while red, before the detector exists,
 * since watching a case pass makes it very hard to judge on its own merits. The
 * stamp is on the verdict — is this what deblob should say — never on the
 * implementation.
 *
 * An unmarked row is stamped: its verdict has been read and accepted.
 */

const ROOT_CALLS: readonly Row[] = [
  {
    // canon: "Root calls are the lane both targets use to get around the rule,
    // not the crime: a factory call at root is not itself the violation, what it
    // binds is, when that binding is not provably immutable."
    name: "a factory called at a model's root is not itself a violation: the call is legal, the binding is what must be proven",
    files: {
      "src/rates.model.ts": `
        export const createRates = () => ({ base: 1 })
      `,
      "src/table.model.ts": `
        import { createRates } from "./rates.model.ts"
        const RATES = createRates() // red: inert-modules -- a call result is not provably immutable — the binding, not the call
        export const BASE: number = createRates().base
        export const scale = (n: number) => n * 2
        export const DOUBLE: number = scale(1)
      `,
    },
  },
  {
    // canon: the same sentence, read the other way — the green half. No clause
    // makes a callee's name a signal (ruled 2026-09-19).
    name: "a model's own function called at root is legal whatever it is named: create* draws no verdict",
    files: {
      "src/limits.model.ts": `
        export const limitOf = (n: number) => Math.min(n, 10)
      `,
      "src/quota.model.ts": `
        import { limitOf } from "./limits.model.ts"
        export const CAP: number = limitOf(42)
        export const createQuota = () => ({ cap: CAP })
        export const QUOTA: Readonly<{ cap: number }> = createQuota()
      `,
    },
  },
  {
    // canon: "a call that … goes into a local function of a file whose layer may
    // touch the tech — an adapter's, a blob's — where the reader cannot rule the
    // side effect out". Flag F1, closed 2026-09-20: the layer is the signal.
    name: "a local function called at root is legal in a model and red in an adapter: the adapter's layer may touch the tech",
    files: {
      "src/label.model.ts": `
        export const labelOf = (name: string) => "label:" + name
        export const DEFAULT: string = labelOf("default")
      `,
      "src/clock/adapters/system-clock.adapter.ts": `
        export const nameOf = (name: string) => "clock:" + name
        export const NAME: string = nameOf("system") // red: inert-modules -- a local of an adapter, whose layer may touch the tech — the side effect cannot be ruled out
        export const createSystemClock = () => ({ now: () => Date.now() })
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". The body is read at the site, so the
    // tech call is a root call. Flag F6, closed 2026-09-20: one red, at the tech
    // call's own line, not a second on the local call.
    name: "a tracked local is read as the root's own body: a tech call inside it is red where the call sits",
    files: {
      "src/cli.driver.ts": `
        const readHome = () => {
          const home = process.cwd() // red: inert-modules -- the helper's body is the root's, so its tech call is a root call
          return home.length
        }
        export const HOME_LENGTH: number = readHome() // via: inert-modules -- the root call that runs readHome's body on import
        export const main = () => {
          process.on("ready", () => readHome())
        }
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". In a service the same read is
    // also `ambient-access` (added 2026-09-21, when that rule was ruled).
    name: "a service calling into tech at root is red: a host global is the tech's, a language global is not",
    files: {
      "src/paths.service.ts": `
        export const HOME: string = process.cwd() // red: inert-modules, ambient-access -- tech reached at import time, and the environment discovered
        export const ONE_LABEL: string = String(1)
        export const createPaths = () => ({ home: HOME })
      `,
    },
  },
  {
    // canon: "A property read is presumed free of side effects and a call is
    // not: `if (process.env["X"])` at root is green, `process.cwd()` at root is
    // red, stored or not". An adapter, so that `ambient-access` stays out.
    name: "in a condition at root, a tech property read is green and a tech call is red: a read is presumed effect-free, a call is not",
    files: {
      "src/server/adapters/env-server.adapter.ts": `
        if (process.env["SOME_MADE_UP_DEBUG"]) {
          throw new Error("made up")
        }
        if (process.cwd() === "/") { // red: inert-modules -- a call, presumed to have side effects
          throw new Error("made up")
        }
        export const createEnvServer = () => ({ port: 3000 })
      `,
    },
  },
  {
    // canon: the binding half, plus "a call that … runs a use case". One red,
    // on the binding: an assembly call counted as tech-reaching too would put
    // two reds of one slug on one line, a shape the marker grammar cannot write.
    name: "a driver building its assembly at root is red on the binding and on the use case it calls next",
    files: {
      "src/app.service.ts": `
        export const createApp = () => ({ run: () => 1 })
      `,
      "src/cli.assembly.ts": `
        import { createApp } from "./app.service.ts"
        export const createCliAssembly = () => ({ app: createApp() })
      `,
      "src/cli.driver.ts": `
        import { createCliAssembly } from "./cli.assembly.ts"
        const services = createCliAssembly() // red: inert-modules -- a call result is not provably immutable
        services.app.run() // red: inert-modules -- a use case runs at import time
        export const main = () => {
          process.on("ready", () => services.app.run())
        }
      `,
    },
  },
  {
    // canon: "Two shapes are exempt by kind: the boot's one call, and a spec
    // file's registration calls into the runner." Flag F3, ruled red 2026-09-20:
    // `main()` at a spec root is not a registration.
    name: "a spec file: registrations into the runner are legal, an instance and a let at root are red, a helper function is code",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/app.service.ts": `
        export const createApp = () => ({ run: () => 1 })
      `,
      "src/cli.assembly.ts": `
        import { createApp } from "./app.service.ts"
        export const createCliAssembly = () => ({ app: createApp() })
      `,
      "src/cli.driver.ts": `
        import { createCliAssembly } from "./cli.assembly.ts"
        export const main = () => {
          const services = createCliAssembly()
          process.on("ready", () => services.app.run())
        }
      `,
      "src/cli.spec.ts": `
        import { describe, expect, it } from "vitest"
        import { createApp } from "./app.service.ts"
        import { main } from "./cli.driver.ts"
        const app = createApp() // red: inert-modules -- a call result is not provably immutable, and every test shares it
        let calls = 0 // red: inert-modules -- mutable state at spec root
        const twice = (n: number) => n * 2
        main() // red: inert-modules -- the driver's wiring runs at import time — the exemption is registrations into the runner, not any call
        describe("app", () => {
          it("runs", () => {
            calls += 1
            expect(app.run()).toBe(twice(0) + 1)
          })
        })
      `,
    },
  },
  {
    // canon: "the boot's one call" exempt, and "Assembly and driver need no
    // exception — each builds inside its function."
    name: "the boot's one call is exempt by kind; an assembly gets no exception, it builds inside its function",
    files: {
      "src/app.service.ts": `
        export const createApp = () => ({ run: () => 1 })
      `,
      "src/cli.assembly.ts": `
        import { createApp } from "./app.service.ts"
        const app = createApp() // red: inert-modules -- built at import time, and a call result is not provably immutable
        export const createCliAssembly = () => ({ app })
      `,
      "src/cli.driver.ts": `
        import { createCliAssembly } from "./cli.assembly.ts"
        export const main = () => {
          const services = createCliAssembly()
          process.on("ready", () => services.app.run())
        }
      `,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        main()
      `,
    },
  },
]

const READONLY_BINDINGS: readonly Row[] = [
  {
    // canon: "proof being a primitive type, `as const`, a readonly array, record,
    // map or set, or `Object.freeze` over a literal, each proven to its depth".
    // The green half, form by form.
    name: "every form whose immutability the syntax proves is legal at a model's root",
    files: {
      "src/forms.model.ts": `
        export function declared() { return 1 }
        export class Declared {}
        export enum Level { Low, High }
        export const LITERAL = 1
        export const REGEX = /x/
        export const TEMPLATE = \`a\${LITERAL}\`
        export const NEGATED = -LITERAL
        export const SUMMED = LITERAL + 1
        export const NOTHING = undefined
        export const EITHER = LITERAL || "fallback"
        export const CHOSEN = LITERAL ? "a" : "b"
        export const ARROW = () => 1
        export const CLASS_EXPR = class {}
        export const AS_CONST = { a: 1 } as const
        export const AS_CONST_DEEP = { a: { b: 1 } } as const
        export const ANGLE_CONST = <const>{ a: 1 }
        export const AS_READONLY = { a: 1 } as Readonly<{ a: number }>
        export const FROZEN = Object.freeze({ a: 1 })
        export const { a: FROZEN_A } = Object.freeze({ a: 1 })
        export const READONLY_RECORD: Readonly<{ a: number }> = { a: 1 }
        export const READONLY_ARRAY: ReadonlyArray<number> = [1]
        export const READONLY_MAP: ReadonlyMap<string, number> = new Map()
        export const READONLY_SET: ReadonlySet<number> = new Set()
        export const READONLY_LIST: readonly number[] = [1]
        export const UNION: Readonly<{ a: number }> | readonly number[] = [1]
        export const PRIMITIVE: number = Math.max(1, 2)
        export const LITERAL_TYPE: "a" | "b" = "a"
        export const BY_INITIALIZER: string | { mutable: boolean } = "u"
        export default "a default literal"
      `,
    },
  },
  {
    // canon: the same clause's limits — "`as const` is deep, `Readonly<…>` is one
    // level, a named type the reader cannot resolve proves nothing".
    // `Readonly<Map<…>>` red and `ReadonlyMap<…>` green (the row above) are one
    // word apart: Readonly marks properties, a Map's mutators are methods.
    name: "every form the syntax does not prove is red at a model's root: proof is per level, and a named type proves nothing",
    files: {
      "src/forms.model.ts": `
        type Table = Readonly<{ a: number }>
        export let counter = 0 // red: inert-modules -- let
        export var legacy = 0 // red: inert-modules -- var
        export const RESULT = Math.max(1, 2) // red: inert-modules -- a call result, nothing proven
        export const RECORD = { a: 1 } // red: inert-modules -- a record literal without as const
        export const LIST = [1] // red: inert-modules -- an array literal without as const
        export const CACHE = new Map<string, number>() // red: inert-modules -- a mutable collection
        export const MEMBER = RECORD.a // red: inert-modules -- a member read, not followed
        export const ALIASED = RESULT // red: inert-modules -- another binding, not followed
        export const AWAITED = await Promise.resolve(1) // red: inert-modules -- an awaited value
        export const TABLE: Table = { a: 1 } // red: inert-modules -- an alias annotation the reader cannot see through
        export const WRAPPED: Readonly<Table> = { a: 1 } // red: inert-modules -- the wrapper is readonly, its member is a named type — unproven
        export const NESTED: Readonly<{ inner: { n: number } }> = { inner: { n: 1 } } // red: inert-modules -- Readonly is one level, the inner record is mutable
        export const FROZEN_SHALLOW = Object.freeze({ inner: { n: 1 } }) // red: inert-modules -- a freeze is one level, the inner literal is not frozen
        export const MUTABLE_MAP: Readonly<Map<string, number>> = new Map() // red: inert-modules -- Readonly over a Map keeps the mutators — set still compiles
        export const MAP_OF_UNPROVEN: ReadonlyMap<string, Table> = new Map() // red: inert-modules -- readonly at the map, a named type at its values
        export const { a: PICKED } = RECORD // red: inert-modules -- destructured from a binding, not from Object.freeze
        export default { a: 1 } // red: inert-modules -- a default export of a record literal
      `,
    },
  },
  {
    // canon: "A value read from the tech is proven by no type: stored in a root
    // binding, it captures the machine's state at load time". An alias does not
    // launder it: the tech object bound at root is captured state itself, and a
    // read through it is still a read of the tech. An adapter, so that
    // `ambient-access` stays out.
    name: "a tech read stored at root is red whatever its type, and an alias does not launder it",
    files: {
      "src/server/adapters/env-server.adapter.ts": `
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: inert-modules -- captured at load time — the type proves nothing about the source
        const env = process.env // red: inert-modules -- the tech's own object, captured
        export const SOME_MADE_UP_HOST: string = env["SOME_MADE_UP_HOST"] ?? "localhost" // red: inert-modules -- still a read of the tech, through the alias
        export const createEnvServer = () => ({ port: SOME_MADE_UP_PORT })
      `,
    },
  },
  {
    // canon: "turns this half off in config anyway (`mutableModuleState:
    // true`), which lifts the bindings and nothing else", and "the config
    // setting, being about state, does not lift" a call. A property read of the
    // tech stored at root is state, so it passes; a tech call is presumed to
    // have side effects, so it stays red. An adapter, so that no layer rule
    // weighs in: the setting is the only thing on trial.
    // Pins "no" to a question that stays open with F5 (the driver row above):
    // whether the setting would lift the call clause if the two merged.
    name: "mutableModuleState lifts the bindings only: mutable state and a stored tech read pass, a tech call at root stays red",
    files: {
      "src/cache/adapters/memory-cache.adapter.ts": `
        export let counter = 0
        export const CACHE = new Map<string, number>()
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000"
        export const HOME: string = process.cwd() // red: inert-modules -- a call is presumed to have side effects — the setting is about state
        export const createMemoryCache = () => ({ hit: () => counter++ })
      `,
    },
    config: { mutableModuleState: true },
  },
]

const ROOT_STATEMENTS: readonly Row[] = [
  {
    // canon: `blob-quarantine`, "Blob importing blob is fine: blob claims
    // none." A rule judges what a file claims, so blob is exempt from every
    // rule but the ones protecting another layer's claim. The side effect does
    // leak to an importer, and quarantine is what bounds that — containment,
    // not a second rule reaching in (rixo 2026-09-21: "having shit in your
    // codebase is gonna stink somewhere; we're containing it as much as we
    // can").
    name: "blob is judged by nothing here: the same statements that are red in a model draw no verdict in an unplaced file",
    files: {
      "src/legacy/wiring.ts": `
        export const STATE: { n: number } = { n: 0 }
        STATE.n = 1
        delete STATE["gone"]
        throw new Error("blob does what it wants")
      `,
      "src/state.model.ts": `
        export const COUNT: number = 0
        COUNT_HOLDER.n = 1 // red: inert-modules -- the same shape, in a file that claims something
      `,
    },
  },
  {
    // canon: "a root statement that is neither of those and still does
    // something when the module is evaluated: an assignment, a `delete`, and
    // their like". Landed 2026-09-21 on this row's account: the citation had
    // nothing to point at, since canon enumerated two shapes and called the
    // list closed. rixo ruled the set open — canon names the known shapes, the
    // corpus pins what the rule means.
    name: "a statement at root that is not a call or a definition is red: an assignment, a delete",
    files: {
      "src/state.model.ts": `
        export const STATE: Readonly<{ n: number; extra?: number }> = { n: 0, extra: 1 }
        STATE.n = 1 // red: inert-modules -- a module's evaluation mutates nothing
        delete STATE.extra // red: inert-modules
      `,
    },
  },
  {
    // canon: the same sentence, read the other way — a re-export does nothing
    // when the module is evaluated: it binds no name here, and the edge it
    // makes is the import graph's, judged by the import rules.
    name: "a re-export at root does nothing on evaluation: a barrel draws no verdict",
    files: {
      "src/rates.model.ts": `
        export const RATE: number = 1
      `,
      "src/all.model.ts": `
        export * from "./rates.model.ts"
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". A branch is no shelter: the arms
    // are root code.
    name: "a branch at root is read through for its arms: a tech call inside one is red on its own line",
    files: {
      "src/guard.model.ts": `
        export const SOME_MADE_UP_DEBUG: boolean = false
        if (SOME_MADE_UP_DEBUG) {
          console.log("debug") // red: inert-modules -- a tech call at root, under a branch or not
        }
        export const isDebug = () => SOME_MADE_UP_DEBUG
      `,
    },
  },
  {
    // canon: "A `throw` is not one: it creates no state and touches nothing
    // outside, and a crash on import is the author's call to make." rixo
    // 2026-09-21: guarding a crash the author wrote on purpose is nannying.
    name: "a throw at root is the author's call: green under a branch or bare",
    files: {
      "src/guard.model.ts": `
        export const SOME_MADE_UP_FLAG: boolean = true
        if (!SOME_MADE_UP_FLAG) {
          throw new Error("made up")
        }
        throw new Error("made up, unconditional")
      `,
    },
  },
  {
    // canon: the same sentence. A loop is no shelter either: its body runs on
    // import, once per turn.
    name: "writing to a module-level object inside a loop at root is red on its own line",
    files: {
      "src/counts.model.ts": `
        export const SOME_MADE_UP_COUNTS: Readonly<{ n: number }> = { n: 0 }
        for (const key of ["a", "b"]) {
          SOME_MADE_UP_COUNTS.n = key.length // red: inert-modules -- a module's evaluation mutates nothing, in a loop or not
        }
      `,
    },
  },
]

/**
 * Inlining and lexical scope, as the program's own behavior. A tracked local's
 * body is read at each site, and a binding introduced at the site — here a
 * callback's parameter, the one scope a root statement can open — must not
 * capture a name the body reads. The pair is a control and its shadow: the same
 * red on the same line whatever the site rebinds. If scope leaked, the second
 * row would report nothing and a `process.cwd()` at import time would ship
 * green.
 */
const INLINED_SCOPE: readonly Row[] = [
  {
    // canon: "a call that reaches the tech", through the inlining ruling
    // (PLAN, 2026-09-20): the body is judged where the substitution puts it.
    name: "a tracked local reaching the host is red at its own line when it is inlined into a root callback",
    files: {
      "src/paths.model.ts": `
        const readHome = () => process.cwd() // red: inert-modules -- the host's tech at import time, at the line the inlined body puts it
        export const HOMES: readonly string[] = ["a"].map(() => readHome()) // via: inert-modules -- the root callback that runs readHome's body on import
      `,
    },
  },
  {
    // canon: as above. The falsification of the scope half of the inlining
    // ruling: leak the site's scope into the body and this row reports nothing.
    name: "the same local, at a site whose callback parameter rebinds the very name it reads: the red is unmoved",
    files: {
      "src/paths.model.ts": `
        const readHome = () => process.cwd() // red: inert-modules -- the callback's own \`process\` is not the one readHome reads
        export const HOMES: readonly string[] = ["a"].map((process) => readHome()) // via: inert-modules -- the root callback that runs readHome's body on import
      `,
    },
  },
]

describe("modules", () => {
  describe("an inlined body reads the scope it was written in", () => {
    test.each(INLINED_SCOPE)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      expect(await judge(row)).toEqual(AS_MARKED)
    })
  })

  describe("a root call is red when it reaches the tech, runs a use case, or enters a local of an impure layer", () => {
    test.each(ROOT_CALLS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      expect(await judge(row)).toEqual(AS_MARKED)
    })
  })

  describe("a root binding is red unless the syntax proves it immutable", () => {
    test.each(READONLY_BINDINGS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      expect(await judge(row)).toEqual(AS_MARKED)
    })
  })

  describe("a module's evaluation performs no side effect", () => {
    test.each(ROOT_STATEMENTS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      expect(await judge(row)).toEqual(AS_MARKED)
    })
  })
})
