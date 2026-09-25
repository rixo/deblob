import { describe, expect, test } from "vitest"

import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * `stable-root`, by what canon says the rule buys: a module's evaluation
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
 * implementation. Where the reader gets a stamped verdict wrong, the line marks
 * an expected failure with `false red` or `missed red`; a reader limit is never
 * written as its wrong verdict.
 *
 * A red is proven or unknown, and the stamp says which. `red` claims a proven
 * one. Where the reader answers unknown — it can prove the line neither right
 * nor wrong — the line marks `false unknown`, alone when the truth is green,
 * stacked above a `red` when the truth is red: the limit is to be lifted.
 * `stubborn unknown` is for a limit we tried to lift and kept; it is the one
 * stamp of the reader's answer rather than the truth, and its why says why.
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
        // false unknown: stable-root -- a call's result is not followed yet
        const RATES = createRates() // red: stable-root -- a call result is not provably immutable — the binding, not the call
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
        export const NAME: string = nameOf("system") // red: stable-root -- a local of an adapter, whose layer may touch the tech — the side effect cannot be ruled out
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
          const home = process.cwd() // red: stable-root -- the helper's body is the root's, so its tech call is a root call
          return home.length
        }
        export const HOME_LENGTH: number = readHome() // via: stable-root -- the root call that runs readHome's body on import
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
        // missed red: ambient-access -- the environment discovered; ambient-access is not built yet
        export const HOME: string = process.cwd() // red: stable-root -- tech reached at import time
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
        if (process.cwd() === "/") { // red: stable-root -- a call, presumed to have side effects
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
        // false unknown: stable-root -- a call's result is not followed yet
        const services = createCliAssembly() // red: stable-root -- a call result is not provably immutable
        services.app.run() // red: stable-root -- a use case runs at import time
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
        // false unknown: stable-root -- a call's result is not followed yet
        const app = createApp() // red: stable-root -- a call result is not provably immutable, and every test shares it
        let calls = 0 // red: stable-root -- mutable state at spec root
        const twice = (n: number) => n * 2
        main() // red: stable-root -- the driver's wiring runs at import time — the exemption is registrations into the runner, not any call
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
        // false unknown: stable-root -- a call's result is not followed yet
        const app = createApp() // red: stable-root -- built at import time, and a call result is not provably immutable
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
  {
    // canon: "a call that reaches the tech". A `new` is a call; `Worker` is the
    // host's. The binding stores the call's result and adds no red.
    name: "a new of a host class at root is a call reaching the tech",
    files: {
      "src/jobs/adapters/worker-pool.adapter.ts": `
        export const WORKER = new Worker("./w.js") // red: stable-root -- a new is a call, and Worker is the host's: the tech reached on import
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". Awaiting it adds nothing: the call
    // runs on import either way.
    name: "an awaited tech call at root is a tech call at root",
    files: {
      "src/http/adapters/fetch-status.adapter.ts": `
        const STATUS_URL = "https://example.test/status"
        export const RES: Response = await fetch(STATUS_URL) // red: stable-root -- fetch reaches the tech on import; await adds nothing
      `,
    },
  },
  {
    // canon: "a call that reaches the tech", and the inlining principle (ruled
    // 2026-09-20): a function called where it is written runs its body there.
    name: "an immediately invoked function runs its body at root: a tech call inside it is red where it sits",
    files: {
      "src/log/adapters/console-log.adapter.ts": `
        export const X: number = (() => { // via: stable-root -- the call that runs the body on import
          console.log("x") // red: stable-root -- the body runs on load, so its tech call is a root call
          return 1
        })()
      `,
    },
  },
  {
    // canon: "its evaluation creates no mutable state, stores nothing read from
    // the machine". A static field initializer runs when the class is
    // evaluated — on load, for a class at root. An adapter, so that
    // `ambient-access` stays out.
    name: "a static field initializer runs on load: a read of the clock stored there is red",
    files: {
      "src/clock/adapters/system-clock.adapter.ts": `
        export class Clock {
          static started = Date.now() // red: stable-root -- a read of the clock stored on load, in a writable static
        }
      `,
    },
  },
  {
    // canon: "its evaluation creates no mutable state". A call's result stored
    // adds nothing to the call — unless the binding is reassignable: a `let` or
    // a writable static is state whatever it holds, so the line carries both.
    name: "a red call stored in a let or a writable static is two reds: the call, and the state",
    files: {
      "src/paths/adapters/cwd-paths.adapter.ts": `
        export let CWD = process.cwd() // red: stable-root, stable-root -- the call reaches the tech; a let is state whatever it holds
        export class Paths {
          static cwd = process.cwd() // red: stable-root, stable-root -- the same, in a writable static
        }
      `,
    },
  },
  {
    // A static field is a root binding (ruled 2026-09-26).
    // canon: "its evaluation creates no mutable state". A root class's static
    // fields are made when the class is evaluated, on load: `readonly` is their
    // `const`, a writable one is reassignable like a `let`. A method is code.
    name: "a root class's static fields are root bindings: writable is state, readonly is judged by what it holds",
    files: {
      "src/counter.model.ts": `
        const KEY = "k"
        export class Counter {
          static count = 0 // red: stable-root -- a writable static is state on the class, reassignable like a let
          static #instances = 0 // red: stable-root -- private, still reassignable
          static "label" = "c" // red: stable-root -- a quoted name, the same field
          static [KEY] = 1 // red: stable-root -- a computed name, the same field
          static pending: number // red: stable-root -- no initializer, still writable
          static readonly MAX = 3
          static readonly LIMIT: number = 3
          static readonly EMPTY: string
          declare static seeded: boolean
          static readonly NAMES = ["a"] // red: stable-root -- readonly, but an array literal keeps its mutators
          static create() {
            return new Counter()
          }
        }
        export const Tally = class {
          static total = 0 // red: stable-root -- a class expression at root is evaluated on load too
        }
      `,
    },
  },
  {
    // canon: "performs no side effect". A static block runs when the class is
    // evaluated.
    name: "a static block runs on load: a tech call inside it is red",
    files: {
      "src/log/adapters/console-log.adapter.ts": `
        export class Logger {
          static {
            console.log("loaded") // red: stable-root -- a static block runs on load, its tech call with it
          }
        }
      `,
    },
  },
  {
    // canon: "Root calls are the lane … not the crime". A decorator is a call on
    // class evaluation; a model's own function called at root is legal, its
    // body judged where it sits (ruled 2026-09-24).
    name: "a model's own decorator on a root class is a model call at root: legal",
    files: {
      "src/seal.model.ts": `
        export const sealed = <T>(target: T, _context: ClassDecoratorContext): T => target
      `,
      "src/point.model.ts": `
        import { sealed } from "./seal.model.ts"
        @sealed
        export class Point {}
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". A tech decorator on a root class
    // runs on import: registration into a global registry, the container
    // pattern (ruled 2026-09-24).
    name: "a tech package's decorator on a root class is a call reaching the tech",
    files: {
      "node_modules/@nestjs/common/package.json": JSON.stringify({
        name: "@nestjs/common",
        main: "./index.js",
      }),
      "node_modules/@nestjs/common/index.js": "module.exports = {}",
      "src/repo/adapters/nest-repo.adapter.ts": `
        import { Injectable } from "@nestjs/common"
        @Injectable() // red: stable-root -- the tech's decorator runs on import and registers the class
        export class Repo {}
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". A member's decorator runs when the
    // class is evaluated, as the class's does; an instance field's initializer
    // runs at construction, not on load.
    name: "a tech package's decorator on a member of a root class is a call reaching the tech",
    files: {
      "node_modules/typeorm/package.json": JSON.stringify({
        name: "typeorm",
        main: "./index.js",
      }),
      "node_modules/typeorm/index.js": "module.exports = {}",
      "src/users/adapters/user-row.adapter.ts": `
        import { Column } from "typeorm"
        export class UserRow {
          @Column() // red: stable-root -- the tech's decorator runs when the class is evaluated, on load
          name = String(1)
        }
      `,
    },
  },
  {
    // canon: "whatever sits at root runs on import" — a default parameter does
    // not sit at root: it runs at call time. An adapter, since in a model
    // `ambient-access` is red in a function too.
    name: "a tech call in a default parameter runs at call time, not on load",
    files: {
      "src/clock/adapters/system-clock.adapter.ts": `
        export const stampOf = (at: number = Date.now()) => at
      `,
    },
  },
  {
    // canon: "a host global is the tech's, a language global is not" (row "a
    // service calling into tech at root").
    name: "a language global called at a model's root is not the tech",
    files: {
      "src/defaults.model.ts": `
        const DEFAULTS = { a: 1, b: 2 } as const
        export const KEYS: readonly string[] = Object.keys(DEFAULTS)
      `,
    },
  },
  {
    // canon: "holds anything that differs from one load to the next" names
    // machine reads. A symbol's identity is fresh per load, like any literal's,
    // and literals are legal; red would be an ultra-orthodox read (ruled
    // 2026-09-24).
    name: "a symbol created at a model's root is legal: a fresh identity, like any literal",
    files: {
      "src/token.model.ts": `
        export const TOKEN: unique symbol = Symbol("token") // false unknown: stable-root -- unique symbol is not read yet
      `,
    },
  },
  {
    // canon: "a call that … goes into a local function of a file whose layer may
    // touch the tech". Across files through the one legal route, a private
    // file of its own service (`public-unit`): an adapter importing a public
    // adapter is `adapter-assembly-only` already.
    name: "a function of the service's private adapter file, called at an adapter's root, is red: its layer may touch the tech",
    files: {
      "src/clock/private/naming.adapter.ts": `
        export const nameOf = (name: string) => "clock:" + name
      `,
      "src/clock/adapters/system-clock.adapter.ts": `
        import { nameOf } from "../private/naming.adapter.ts"
        export const NAME: string = nameOf("x") // red: stable-root -- a function of an adapter file, whose layer may touch the tech
      `,
    },
  },
  {
    // canon: "a local function of a file whose layer may touch the tech — an
    // adapter's, a blob's", and the exemption list is closed: a spec file's
    // registration calls, nothing else.
    name: "a spec file calling a blob's function at root is red: only its registrations are exempt",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/legacy/fixtures.ts": `
        export const loadFixture = () => ({ a: 1 })
      `,
      "src/fixtures.spec.ts": `
        import { expect, it } from "vitest"
        import { loadFixture } from "./legacy/fixtures.ts"
        const DATA = loadFixture() // red: stable-root -- a blob's function run on import; not a registration
        it("reads", () => {
          expect(DATA.a).toBe(1)
        })
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". A tagged template is a call.
    name: "a tech package's tagged template at root is a call reaching the tech",
    files: {
      "node_modules/sql-template-tag/package.json": JSON.stringify({
        name: "sql-template-tag",
        main: "./index.js",
      }),
      "node_modules/sql-template-tag/index.js": "module.exports = {}",
      "src/users/adapters/sql-users.adapter.ts": `
        import sql from "sql-template-tag"
        export const ALL_USERS = sql\`select * from users\` // red: stable-root -- a tagged template calls the tag on import
      `,
    },
  },
  {
    // canon: "A property read is presumed free of side effects and a call is
    // not". A getter is a function, and the presumption holds.
    name: "a property read at a model's root is presumed free, a getter included",
    files: {
      "src/holder.model.ts": `
        const holder = Object.freeze({ get value() { return 1 } })
        export const V: number = holder.value
      `,
    },
  },
  {
    // canon: "a call that reaches the tech". An optional call is a call.
    name: "an optional tech call at root is a tech call",
    files: {
      "src/log/adapters/warn-log.adapter.ts": `
        process.emitWarning?.("x") // red: stable-root -- an optional call is a call, the tech reached on import
      `,
    },
  },
  {
    // canon: "Two shapes are exempt by kind: the boot's one call". `.catch` is
    // a second call; the exemption covers the one. Also `boot-one-call`
    // ("nothing else … called").
    name: "a boot chaining a call on its one call is red: the exemption is the one call",
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
        export const main = async () => {
          const services = createCliAssembly()
          process.on("ready", () => services.app.run())
        }
      `,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        // missed red: boot-one-call -- "nothing else … called": a second call beside the one; the boot check is not built yet
        // missed red: stable-root -- a second call on import, the tech's; the exemption is the one call, bare; the reader takes .catch for a language call
        main().catch(console.error)
      `,
    },
  },
  {
    // canon: "the boot's one call" — awaited or voided, still the one call.
    name: "a boot awaiting or voiding its one call makes the one call",
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
        export const main = async () => {
          const services = createCliAssembly()
          process.on("ready", () => services.app.run())
        }
      `,
      "src/cli.boot.ts": `
        import { main } from "./cli.driver.ts"
        await main()
      `,
      "src/worker.boot.ts": `
        import { main } from "./cli.driver.ts"
        void main()
      `,
    },
  },
  {
    // canon: "a spec file's registration calls into the runner" — a mock, a
    // matcher, a table of rows are registrations, the call on a call's result
    // included.
    name: "a spec file's registrations into the runner are exempt: a mock, a matcher, a table",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/clock/adapters/system-clock.adapter.ts": `
        export const createSystemClock = () => ({ now: () => Date.now() })
      `,
      "src/clock.spec.ts": `
        import { describe, expect, it, vi } from "vitest"
        import { createSystemClock } from "./clock/adapters/system-clock.adapter.ts"
        const ROWS = [{ name: "a" }] as const
        vi.mock("./clock/adapters/system-clock.adapter.ts")
        expect.extend({
          toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
        })
        describe.each(ROWS)("$name", () => {
          it("builds", () => {
            expect(createSystemClock()).toBeDefined()
          })
        })
      `,
    },
  },
  {
    // canon: "a spec file's registration calls into the runner" — the runner,
    // not the host: an exemption list is closed.
    name: "a spec file calling the host at root is red: only its runner's calls are registrations",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/cwd.spec.ts": `
        import { expect, it } from "vitest"
        process.chdir("/tmp") // red: stable-root -- a call into the host at a spec's root: not the runner
        const FIXTURE = import.meta.resolve("./fixture.json") // red: stable-root -- the host's resolver, called at a spec's root: not the runner
        it("runs in tmp", () => {
          expect(process.cwd()).toBe("/tmp")
        })
      `,
    },
  },
  {
    // canon: "a call is presumed to have side effects … until the tech's reading
    // declares that call effect-free". `import()` is a call into the host's
    // module loader: a presumption, not a proven instability — the loaded
    // module is cached, a static import loads the same (ruled 2026-09-24).
    // Inside a function it is the lazy load, and green.
    name: "a dynamic import at root is a call into the loader, awaited or not; inside a function it is the lazy load",
    files: {
      "src/heavy.model.ts": `
        export const HEAVY = 1
      `,
      "src/loader.model.ts": `
        import("./heavy.model.ts") // red: stable-root -- a call into the module loader on import; a static import says the same
        await import("./heavy.model.ts") // red: stable-root -- awaited, the same call
        export const HEAVY_MODULE = await import("./heavy.model.ts") // red: stable-root -- stored, the same call; the binding adds nothing
        export const loadHeavy = () => import("./heavy.model.ts")
      `,
    },
  },
  {
    // canon: `test-is-outside`, "Shared test code gets none of this and is
    // placed by what it is: a fake or in-memory implementation is an adapter
    // … a data builder model". Judged as its kind, only tests using it or not.
    name: "shared test code is judged as its kind: a fake adapter storing the clock at root is red, a data builder model is green",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/test/fake-clock.adapter.ts": `
        const STARTED = Date.now() // red: stable-root -- a read of the clock stored at root, in a fake as in any adapter
        export const createFakeClock = () => ({ now: () => STARTED })
      `,
      "src/test/note.model.ts": `
        export const buildNote = (over: { readonly title?: string }) => ({ title: "t", ...over })
      `,
      "src/clock.spec.ts": `
        import { expect, it } from "vitest"
        import { createFakeClock } from "./test/fake-clock.adapter.ts"
        import { buildNote } from "./test/note.model.ts"
        it("builds", () => {
          expect(buildNote({}).title).toBe("t")
          expect(createFakeClock().now()).toBeGreaterThan(0)
        })
      `,
    },
  },
  {
    // canon: `test-is-outside`, "a matcher … registered on the runner a driver
    // whose wiring function the spec file calls with the tech". Read through
    // the inlining principle, the call at the spec's root is its body,
    // `expect.extend(…)`: a registration into the runner, the exemption
    // `stable-root` names (ruled 2026-09-25).
    name: "a spec calling a shared matcher driver's wiring function at root is a registration: inlined, it is the runner's",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/test/matchers.driver.ts": `
        export const registerMatchers = (expect: { extend: (matchers: object) => void }) => {
          expect.extend({
            toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
          })
        }
      `,
      "src/colors.spec.ts": `
        import { expect, it } from "vitest"
        import { registerMatchers } from "./test/matchers.driver.ts"
        registerMatchers(expect)
        it("is red", () => {
          expect("red").toBeDefined()
        })
      `,
    },
  },
  {
    // canon: "a driver whose wiring function the spec file calls with the
    // tech" — the tech is the runner the file is read for: a wiring function
    // handed the host sets up the host's tech on import, like `main()`.
    name: "a spec calling a shared driver's wiring function with the host at root is red: only the runner handed on is a registration",
    files: {
      "node_modules/vitest/package.json": JSON.stringify({
        name: "vitest",
        main: "./index.js",
      }),
      "node_modules/vitest/index.js": "module.exports = {}",
      "src/test/cwd.driver.ts": `
        export const enterTmp = (host: { chdir: (path: string) => void }) => {
          host.chdir("/tmp")
        }
      `,
      "src/cwd.spec.ts": `
        import { expect, it } from "vitest"
        import { enterTmp } from "./test/cwd.driver.ts"
        enterTmp(process) // red: stable-root -- the driver's wiring runs at import time, handed the host, not the runner
        it("runs in tmp", () => {
          expect(1).toBe(1)
        })
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
    // level". `Readonly<Map<…>>` red and `ReadonlyMap<…>` green (the row above)
    // are one word apart: Readonly marks properties, a Map's mutators are methods.
    name: "every form the syntax does not prove is red at a model's root: proof is per level",
    files: {
      "src/forms.model.ts": `
        export let counter = 0 // red: stable-root -- let
        export var legacy = 0 // red: stable-root -- var
        export const RESULT = Math.max(1, 2) // false unknown: stable-root -- a number, but the result of Math.max is not known yet: built-in knowledge
        export const RECORD = { a: 1 } // red: stable-root -- a record literal without as const
        export const LIST = [1] // red: stable-root -- an array literal without as const
        export const CACHE = new Map<string, number>() // red: stable-root -- a mutable collection
        export const MEMBER = RECORD.a // false unknown: stable-root -- a number, but a member read is not followed yet
        export const ALIASED = RESULT // false unknown: stable-root -- a number, but RESULT's call result is not known yet
        export const AWAITED = await Promise.resolve(1) // false unknown: stable-root -- a number, but an awaited value is not followed yet
        export const NESTED: Readonly<{ inner: { n: number } }> = { inner: { n: 1 } } // red: stable-root -- Readonly is one level, the inner record is mutable
        export const FROZEN_SHALLOW = Object.freeze({ inner: { n: 1 } }) // red: stable-root -- a freeze is one level, the inner literal is not frozen
        export const MUTABLE_MAP: Readonly<Map<string, number>> = new Map() // red: stable-root -- Readonly over a Map keeps the mutators — set still compiles
        export const { a: PICKED } = RECORD // false unknown: stable-root -- a number, but a destructured part is not followed yet
        export default { a: 1 } // red: stable-root -- a default export of a record literal
      `,
    },
  },
  {
    // canon: "proof being a primitive type, `as const`, a readonly array,
    // record, map or set, or `Object.freeze` over a literal, each proven to
    // its depth". Ruled 2026-09-22 (rixo), form by form: a record type whose
    // members are all `readonly` is a readonly record without the wrapper; a
    // function is code, not state; `Record<K, V>` is the standard spelling of
    // a record; a freeze of a name freezes the very object bound to it; a name
    // is followed to what it is bound to.
    name: "the readonly forms beyond the wrapper: a readonly type literal, a function member, Readonly<Record>, a freeze through a name, a name followed",
    files: {
      "src/more-forms.model.ts": `
        export const POINT: { readonly x: number; readonly y: number } = { x: 1, y: 2 }
        export const HALF: { readonly x: number; y: number } = { x: 1, y: 2 } // red: stable-root -- one member is not readonly
        export const DEEP: { readonly list: number[] } = { list: [1] } // red: stable-root -- readonly member, mutable array
        export const HANDLERS: Readonly<{ run: () => void }> = { run: () => {} }
        export const LABELS: Readonly<Record<string, string>> = { a: "x" }
        export const TABLE: Record<string, string> = { a: "x" } // red: stable-root -- a Record without Readonly
        const BASE = { a: 1 } // red: stable-root -- the object itself, until frozen
        export const FROZEN_BASE = Object.freeze(BASE)
        const LIMIT = 10
        export const FROZEN_LIMIT = Object.freeze({ a: LIMIT })
        let seed = 1 // red: stable-root -- let
        export const SEEDED = seed || 2
      `,
    },
  },
  {
    // Coverage sweep, 2026-09-24; verdicts agreed by rixo.
    // canon: the same clause, forms no row wrote: `Readonly<T[]>` is a
    // readonly array, a readonly tuple is proven to its depth, a name bound
    // to a function is code; a freeze of a call's result is readonly when
    // what the call returns is a literal of immutable entries (re-stamped
    // 2026-09-24: the old red pinned the reader's limit as the verdict).
    name: "a readonly array however written, a readonly tuple to its depth, a name bound to a function, a freeze of a call returning a record of numbers",
    files: {
      "src/tuples.model.ts": `
        const double = (n: number) => n * 2
        const createTable = () => ({ a: 1 })
        export const LIST: Readonly<number[]> = [1]
        export const PAIR: readonly [number, string] = [1, "a"]
        export const NESTED_PAIR: readonly [number, number[]] = [1, []] // red: stable-root -- a readonly tuple holding a mutable array
        export const TWICE = double
        export const FROZEN_CALL = Object.freeze(createTable()) // false unknown: stable-root -- the call returns a record of numbers, frozen: readonly; a call's result is not followed yet
      `,
    },
  },
  {
    // Coverage sweep, 2026-09-24; verdicts agreed by rixo. Re-stamped
    // broken the same day (step 06, rixo: "can't do our job because of a
    // tech problem", the situation of a syntax error): deblob reads syntax,
    // not types, so code that parses but does not compile reaches the
    // reader, and some of it the reader cannot interpret at all. Not a type
    // check — tsc owns type errors; this is deblob unable to read the line.
    name: "a line deblob cannot read is broken: a readonly wrapper without its type arguments, a freeze of nothing (typed or not), a Record without its value type",
    files: {
      "src/broken.model.ts": `
        export const BARE: ReadonlyMap = new Map() // broken -- ReadonlyMap without its type arguments
        export const EMPTY_FREEZE = Object.freeze() // broken -- a freeze of nothing
        export const HALF_RECORD: Readonly<Record<string>> = {} // broken -- Record without its value type
        export const TYPED_EMPTY: Readonly<{ a: number }> = Object.freeze() // broken -- a freeze of nothing, whatever the type says
      `,
    },
  },
  {
    // 2026-09-24 (step 06); ruled by rixo: a file that does not parse is the
    // same situation, broken, exit 2 — it was a crash before. No line to
    // claim: the marker sits alone at the end of the file.
    name: "a file that does not parse is broken",
    files: {
      "src/unparsed.model.ts": `
        export const RATE: number =
        // broken -- the file does not parse
      `,
    },
  },
  {
    // 2026-09-24 (step 06); ruled by rixo: a broken run declines to certify
    // (exit 2) but still reports every verdict it reaches — in other files,
    // and on the other lines of a file broken on one.
    name: "a broken run still reports every verdict it reaches, beside the broken line and in other files",
    files: {
      "src/a.model.ts": `
        export let counter = 0 // red: stable-root -- let
      `,
      "src/b.model.ts": `
        export const BARE: ReadonlyMap = new Map() // broken -- ReadonlyMap without its type arguments
        export let other = 1 // red: stable-root -- let
      `,
    },
  },
  {
    // Coverage of the census both ways, 2026-09-24 (step 06); verdicts
    // agreed by rixo. canon: "proof being a primitive type, `as const`, a readonly
    // array, record, map or set, or `Object.freeze` over a literal, each
    // proven to its depth" — and what is mutable by construction is proven
    // red, not left unknown: a name bound to a mutable collection is that
    // collection, an index signature not readonly takes new entries. A call
    // signature is code. A member of no type compiles only with `noImplicitAny`
    // off (TS7008 under strict) and is `any`, which declares nothing:
    // `stubborn unknown`, no reader can prove it (agreed with rixo).
    name: "the census both ways: a name bound to a mutable collection, a writable index signature, a call signature, a spread inside a freeze, a member of no type",
    files: {
      "src/census.model.ts": `
        const CACHE = new Map<string, number>() // red: stable-root -- a mutable collection
        export const SAME_CACHE = CACHE // red: stable-root -- the same Map, by its name
        export const CALLABLE: { (): number } = () => 1
        export const COUNTS: { [key: string]: number } = {} // red: stable-root -- an index signature not readonly takes new entries
        const LIMITS = { a: 1 } as const
        export const SPREAD = Object.freeze({ ...LIMITS }) // false unknown: stable-root -- entries of numbers, frozen: readonly; a spread inside a freeze is not followed yet
        export const UNTYPED: { readonly a } = { a: 1 } // stubborn unknown: stable-root -- a member of no type is any, which declares nothing: no reader can prove it
      `,
    },
  },
  {
    // Coverage sweep, 2026-09-24. Verdicts agreed by rixo
    // 2026-09-24: Readonly covers methods too and a method is code; a readonly
    // index signature over a proven value is a readonly record; a key and a
    // unique symbol are primitives. Unwrapped, a method stays red: TS cannot
    // mark it readonly, so it can be reassigned. The freeze of an import
    // follows the 2026-09-22 rulings — a freeze of a name freezes the very
    // object bound to it, a name is followed to what it is bound to — across
    // a file boundary: derived from them, accepted at review 2026-09-24.
    name: "readonly forms the reader does not read yet: a method under Readonly, a readonly index signature, keyof, unique symbol, a freeze of an imported object",
    files: {
      "src/base.model.ts": `
        export const BASE_TABLE = { a: 1 } // red: stable-root -- the object itself, until frozen
      `,
      "src/unread.model.ts": `
        import { BASE_TABLE } from "./base.model.ts"
        const SHAPE = { a: 1 } as const
        const firstKey = (): "a" => "a"
        export const STOPPABLE: Readonly<{ stop(): void }> = { stop: () => {} } // false unknown: stable-root -- method signatures are not read yet
        export const LOOSE_STOP: { stop(): void } = { stop: () => {} } // red: stable-root -- a method can be reassigned: TS cannot mark it readonly
        export const COUNTS: { readonly [key: string]: number } = {} // false unknown: stable-root -- index signatures are not read yet
        export const KEY: keyof typeof SHAPE = firstKey() // false unknown: stable-root -- keyof is not read yet
        export const ID: unique symbol = Symbol() // false unknown: stable-root -- unique symbol is not read yet
        export const FROZEN_IMPORT = Object.freeze(BASE_TABLE) // false unknown: stable-root -- an import is not followed to its object yet
      `,
    },
  },
  {
    // Found by the self-check when the binding clause landed:
    // `PROTOTYPE_METHODS` in the reader builds its set through a root
    // `flatMap` whose callback declares locals, and those read as root
    // bindings. canon: "State lives in factory closures: a factory is a
    // function … an instance exists only where it was called" — a callback's
    // local is made fresh by each call, never module state. The callback's
    // calls still run on import, and are judged where they sit.
    name: "a local declared inside a root callback is the callback's, not a module binding",
    files: {
      "src/lengths.model.ts": `
        export const LENGTHS: readonly number[] = ["a", "bb"].map((name) => {
          const length = name.length
          return length
        })
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
        export const SOME_MADE_UP_PORT: string = process.env["SOME_MADE_UP_PORT"] ?? "3000" // red: stable-root -- captured at load time — the type proves nothing about the source
        const env = process.env // red: stable-root -- the tech's own object, captured
        export const SOME_MADE_UP_HOST: string = env["SOME_MADE_UP_HOST"] ?? "localhost" // red: stable-root -- still a read of the tech, through the alias
        export const createEnvServer = () => ({ port: SOME_MADE_UP_PORT })
      `,
    },
  },
  {
    // 2026-09-24 (step 06); verdicts agreed by rixo. canon, amended the same
    // day: "A
    // module's own location (`import.meta.url`, `__dirname`) is presumed not
    // to be one: it is the module's identity, fixed at load, and no test is
    // expected to vary it — unlike what else `import.meta` may carry
    // (`import.meta.env` is the environment)." An adapter, so that
    // `ambient-access` stays out.
    name: "a module's own location is not a read of the machine; the rest of import.meta is",
    files: {
      "src/paths/adapters/paths.adapter.ts": `
        export const HERE: string = import.meta.url
        export const FOLDER: string = import.meta.dirname
        export const OLD_FOLDER: string = __dirname
        export const MODE: string = import.meta.env.MODE // red: stable-root -- the environment, captured at load time
        export const META = import.meta // red: stable-root -- the host's object, env among it
        export const createPaths = () => ({ here: HERE })
      `,
    },
  },
  {
    // canon: "A value read from the machine is proven by no type: a value read
    // from the tech, the clock, randomness", and "A call's result stored at
    // root adds nothing to the call". A read of the machine stored at root
    // breaks the same-on-every-load guarantee however it is reached: inside a
    // callback that runs on import, through a language method, passed as an
    // argument, inside a local function called at root, from the clock or the
    // entropy source. A read in a condition stores nothing and stays green. A
    // call's result is not a read: the call is red where it sits, and storing
    // it adds nothing — so the binding line below the call carries no red of
    // its own. An adapter, so that `ambient-access` stays out.
    name: "a read of the machine stored at root is red however it is reached: a root callback, a method on it, an argument, a local function, the clock, randomness",
    files: {
      "src/boot/adapters/machine-reads.adapter.ts": `
        export const NAMES: readonly string[] = ["a"].map(() => process.env["SOME_MADE_UP_USER"] ?? "") // red: stable-root -- the callback runs on import and its read is stored
        export const TRIMMED: string = process.env["SOME_MADE_UP_NAME"]?.trim() ?? "" // red: stable-root -- a method on the read still stores it
        export const COUNT: number = Math.max(parseInt(process.env["SOME_MADE_UP_COUNT"] ?? ""), 0) // red: stable-root -- passed through calls, the read is still what is stored
        const drawSomeMadeUpNumber = () => Math.random()
        export const DRAWN: number = drawSomeMadeUpNumber() // red: stable-root -- the local's body is read, and it reads the entropy source
        export const STARTED: number = Date.now() // red: stable-root -- the clock
        export const SEED: number = Math.random() // red: stable-root -- the entropy source
        export const TODAY = new Date() // red: stable-root -- the clock, and a mutable Date
        if (Math.random() > 2) throw new Error("made up")
        export const LONGEST: number = Math.max(1, 2)
        export const CWDS: readonly string[] = ["a"].map(() =>
          process.cwd(), // red: stable-root -- a call, red where it sits; the binding above stores its result and adds no red
        )
        export const createMachineReads = () => ({ names: NAMES })
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
        export const HOME: string = process.cwd() // red: stable-root -- a call is presumed to have side effects — the setting is about state
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
        COUNT_HOLDER.n = 1 // red: stable-root -- the same shape, in a file that claims something
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
        STATE.n = 1 // red: stable-root -- a module's evaluation mutates nothing
        delete STATE.extra // red: stable-root
      `,
    },
  },
  {
    // 2026-09-24 (step 06); verdicts agreed by rixo. canon: "a root statement
    // that … still does something when the module is evaluated". A statement
    // the reader does not recognise can be neither cleared nor convicted: an
    // unknown, not a proven red. `debugger` changes nothing a module holds, so
    // the truth is green.
    name: "a root statement the reader does not recognise is unknown, not a proven red",
    files: {
      "src/pause.model.ts": `
        export const RATE: number = 1
        debugger // false unknown: stable-root -- it changes nothing, but the reader does not recognise a debugger statement yet
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
          console.log("debug") // red: stable-root -- a tech call at root, under a branch or not
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
          SOME_MADE_UP_COUNTS.n = key.length // red: stable-root -- a module's evaluation mutates nothing, in a loop or not
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
        const readHome = () => process.cwd() // red: stable-root -- the host's tech at import time, at the line the inlined body puts it
        export const HOMES: readonly string[] = ["a"].map(() => readHome()) // via: stable-root -- the root callback that runs readHome's body on import
      `,
    },
  },
  {
    // canon: as above. The falsification of the scope half of the inlining
    // ruling: leak the site's scope into the body and this row reports nothing.
    name: "the same local, at a site whose callback parameter rebinds the very name it reads: the red is unmoved",
    files: {
      "src/paths.model.ts": `
        const readHome = () => process.cwd() // red: stable-root -- the callback's own \`process\` is not the one readHome reads
        export const HOMES: readonly string[] = ["a"].map((process) => readHome()) // via: stable-root -- the root callback that runs readHome's body on import
      `,
    },
  },
]

/**
 * Type-name following (SPEC 04/01_type-names). canon: "proof being a primitive
 * type, `as const`, a readonly array, record, map or set, or `Object.freeze`
 * over a literal, each proven to its depth", and "a named type the reader
 * cannot resolve proves nothing" — read the other way: a name the reader can
 * resolve proves what it names. A name is resolved where it is written, the way
 * TypeScript resolves it, and stands for the declaration it lands on; the
 * verdict is the one that declaration's type would get written out in place.
 * One row per kind of declaration a name can land on, then the step's boundary,
 * the cycle, and a tripwire for the forms no row lists.
 */
const TYPE_NAMES: readonly Row[] = [
  {
    name: "an alias stands for its body: a readonly one proves, a mutable one does not",
    files: {
      "src/tables.model.ts": `
        type Table = Readonly<{ a: number }>
        type Loose = { a: number }
        export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet
        export const WRAPPED: Readonly<Table> = { a: 1 } // false unknown: stable-root -- type names are not followed yet
        export const MAP_OF_PROVEN: ReadonlyMap<string, Table> = new Map() // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const LOOSE: Loose = { a: 1 } // red: stable-root -- the alias names a mutable record
        // false unknown: stable-root -- type names are not followed yet
        export const LOOSE_IN_LIST: readonly Loose[] = [] // red: stable-root -- a readonly list of mutable records
      `,
    },
  },
  {
    name: "a generic alias stands for its body with the arguments substituted, a missing one taking its default",
    files: {
      "src/boxes.model.ts": `
        type Frozen<T> = Readonly<T>
        type Boxed<T = number> = { readonly value: T }
        export const FROZEN: Frozen<{ a: number }> = { a: 1 } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const FROZEN_OUTER: Frozen<{ inner: { n: number } }> = { inner: { n: 1 } } // red: stable-root -- Readonly is one level, the substituted inner record is mutable
        export const BOXED: Boxed = { value: 1 } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const BOXED_RECORD: Boxed<{ n: number }> = { value: { n: 1 } } // red: stable-root -- the argument is a mutable record
      `,
    },
  },
  {
    // An interface is every declaration of it, merged, and
    // every interface it extends; under Readonly<…> its members are wrapped
    // one level, as a type literal's are.
    name: "an interface stands for its members, merged and inherited: proven when every one is readonly and proven",
    files: {
      "src/points.model.ts": `
        interface Point { readonly x: number; readonly y: number }
        interface Loose { readonly x: number; y: number }
        interface Merged { readonly a: number }
        interface Merged { b: number }
        interface Base { n: number }
        interface Derived extends Base { readonly m: number }
        interface ReadonlyBase { readonly n: number }
        interface Extended extends ReadonlyBase { readonly m: number }
        export const ORIGIN: Point = { x: 0, y: 0 } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const LOOSE: Loose = { x: 0, y: 0 } // red: stable-root -- y is not readonly
        export const WRAPPED_LOOSE: Readonly<Loose> = { x: 0, y: 0 } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const MERGED: Merged = { a: 1, b: 2 } // red: stable-root -- the second declaration adds a mutable member
        // false unknown: stable-root -- type names are not followed yet
        export const DERIVED: Derived = { n: 1, m: 2 } // red: stable-root -- n, inherited, is mutable
        export const EXTENDED: Extended = { n: 1, m: 2 } // false unknown: stable-root -- type names are not followed yet
      `,
    },
  },
  {
    name: "an enum stands for its values, which are primitives",
    files: {
      "src/colors.model.ts": `
        enum Color { Red, Green }
        export const DEFAULT_COLOR: Color = Color.Red // false unknown: stable-root -- type names are not followed yet
      `,
    },
  },
  {
    // The name resolves in the file that declares it,
    // through a re-export and through `export *`, imported type-only or not.
    name: "an imported name stands for what the target file exports under it, re-exports followed",
    files: {
      "src/shapes.model.ts": `
        export type Table = Readonly<{ a: number }>
        export type Loose = { a: number }
        export interface Point { readonly x: number }
      `,
      "src/relay.model.ts": `
        export type { Table } from "./shapes.model.ts"
      `,
      "src/everything.model.ts": `
        export * from "./shapes.model.ts"
      `,
      "src/uses.model.ts": `
        import type { Table, Loose } from "./shapes.model.ts"
        import { type Point } from "./everything.model.ts"
        import type { Table as Relayed } from "./relay.model.ts"
        export const TABLE: Table = { a: 1 } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const LOOSE: Loose = { a: 1 } // red: stable-root -- the imported alias names a mutable record
        export const POINT: Point = { x: 0 } // false unknown: stable-root -- type names are not followed yet
        export const RELAYED: Relayed = { a: 1 } // false unknown: stable-root -- type names are not followed yet
      `,
    },
  },
  {
    // A declaration in scope wins over the standard wrapper,
    // as it does for TypeScript.
    name: "a local declaration named like a standard wrapper shadows it",
    files: {
      "src/shadow.model.ts": `
        type Readonly<T> = T
        export const SHADOWED: Readonly<{ a: number }> = { a: 1 } // missed red: stable-root -- this Readonly is the local one, which keeps the record as it is; type names are not followed yet
      `,
    },
  },
  {
    // The step's boundary, written with the right verdicts: every value here
    // is readonly, so every line is green. This step does not follow these
    // names and the reader answers unknown on all five: each is an expected
    // failure, saying what it waits for.
    name: "a readonly type reached through a class, typeof, a qualified name, a mapped type or a package proves",
    files: {
      "node_modules/some-made-up-package/package.json": JSON.stringify({
        name: "some-made-up-package",
        main: "./index.js",
        types: "./index.d.ts",
      }),
      "node_modules/some-made-up-package/index.js": "module.exports = {}",
      "node_modules/some-made-up-package/index.d.ts": `
        export type SomeMadeUpType = { readonly a: number }
      `,
      "src/shapes.model.ts": `
        export type Table = Readonly<{ a: number }>
      `,
      "src/boundary.model.ts": `
        import type * as shapes from "./shapes.model.ts"
        import type { SomeMadeUpType } from "some-made-up-package"
        class Spot { readonly x = 1 }
        const BASE = { a: 1 } as const
        type Mapped = { readonly [K in "a"]: number }
        export const SPOT: Spot = new Spot() // false unknown: stable-root -- class types are not followed yet
        export const COPY: typeof BASE = { a: 1 } // false unknown: stable-root -- typeof is not followed yet
        export const QUALIFIED: shapes.Table = { a: 1 } // false unknown: stable-root -- qualified names are not followed yet
        export const MAPPED: Mapped = { a: 1 } // false unknown: stable-root -- mapped types are not read yet
        export const PACKAGED: SomeMadeUpType = { a: 1 } // false unknown: stable-root -- a package's types are the next step
      `,
    },
  },
  {
    // A name already being proven counts as proven; the
    // rest of the type still decides.
    name: "a type that reaches itself is proven when nothing along the way is mutable",
    files: {
      "src/lists.model.ts": `
        type List = { readonly head: number; readonly next: List | null }
        type Link = { readonly next: Link | null; value: number }
        export const EMPTY: List = { head: 0, next: null } // false unknown: stable-root -- type names are not followed yet
        // false unknown: stable-root -- type names are not followed yet
        export const LONE: Link = { next: null, value: 0 } // red: stable-root -- value is not readonly
      `,
    },
  },
  {
    // Tripwire: a name renamed on import and re-exported
    // under a third name. Following the name passes it for free; a reader
    // built as one branch per row above does not.
    name: "a name renamed on import and re-exported under another name still lands on its declaration",
    files: {
      "src/shapes.model.ts": `
        export type Table = Readonly<{ a: number }>
      `,
      "src/middle.model.ts": `
        import type { Table as Grid } from "./shapes.model.ts"
        export type { Grid as Sheet }
      `,
      "src/uses.model.ts": `
        import type { Sheet } from "./middle.model.ts"
        export const SHEET: Sheet = { a: 1 } // false unknown: stable-root -- type names are not followed yet
      `,
    },
  },
]

describe("modules", () => {
  describe("an inlined body reads the scope it was written in", () => {
    test.each(INLINED_SCOPE)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      const { expectedFailures, ...match } = await judge(row)
      if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
      expect(match).toEqual(AS_MARKED)
    })
  })

  describe("a root call is red when it reaches the tech, runs a use case, or enters a local of an impure layer", () => {
    test.each(ROOT_CALLS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      const { expectedFailures, ...match } = await judge(row)
      if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
      expect(match).toEqual(AS_MARKED)
    })
  })

  describe("a root binding is red unless the syntax proves it immutable", () => {
    test.each(READONLY_BINDINGS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      const { expectedFailures, ...match } = await judge(row)
      if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
      expect(match).toEqual(AS_MARKED)
    })
  })

  describe("a type name is followed to what it names", () => {
    test.each(TYPE_NAMES)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      const { expectedFailures, ...match } = await judge(row)
      if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
      expect(match).toEqual(AS_MARKED)
    })
  })

  describe("a module's evaluation performs no side effect", () => {
    test.each(ROOT_STATEMENTS)("$name", async (row) => {
      const { judge } = assembleCase(row.files)
      const { expectedFailures, ...match } = await judge(row)
      if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
      expect(match).toEqual(AS_MARKED)
    })
  })
})
