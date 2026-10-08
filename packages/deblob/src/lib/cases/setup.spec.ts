import { describe, expect, test } from "vitest"

import { goodEnoughTests } from "../../readers.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The setup file: a file the test runner loads besides the specs, to prepare
 * what they run in. Two forms. A setup file (vitest's `setupFiles`) is loaded
 * in the test worker before each spec file: it registers on the test runner at
 * its root, matchers and hooks, as a spec does, and holds no test. A global
 * setup file (`globalSetup`) is loaded once, outside the workers: the test
 * runner calls the function it exports, and the teardown that function returns.
 * Both are test files (`test-is-outside`), in the root form: the test runner
 * starts them, nothing imports them. What a spec's root may do, theirs may;
 * what is red at a spec's root is red at theirs, with the same ways out.
 *
 * The stock test reader reads no runner's config, so it does not know which
 * files those are: the rows bind them by name (`include`). Unbound, a setup
 * file is blob.
 */

const VITEST = {
  "node_modules/vitest/package.json": JSON.stringify({
    name: "vitest",
    main: "./index.js",
  }),
  "node_modules/vitest/index.js": "module.exports = {}",
} as const

/** A package that mocks the network: its server is an instance, built by a call. */
const MSW = {
  "node_modules/msw/package.json": JSON.stringify({
    name: "msw",
    main: "./index.js",
  }),
  "node_modules/msw/index.js": "module.exports = {}",
} as const

/** The test reader, told which files the test runner loads besides the specs. */
const BOUND = {
  readers: {
    test: [
      goodEnoughTests({
        include: [
          "**/*.spec.ts",
          "**/vitest.setup.ts",
          "**/vitest.global-setup.ts",
        ],
      }),
    ],
  },
} as const

const SETUPS: readonly Row[] = [
  {
    // `stable-root`: a test file's root registers on its runner. A
    // matcher and the hooks every spec runs under are registrations; what a
    // hook does to the host, it does when the test runner fires it.
    name: "a setup file registers matchers and hooks at its root, and its hooks write to the host: green",
    config: BOUND,
    files: {
      ...VITEST,
      "vitest.setup.ts": `
        import { afterEach, beforeAll, beforeEach, expect, vi } from "vitest"
        expect.extend({
          toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
        })
        beforeAll(() => {
          process.env["TZ"] = "UTC"
        })
        beforeEach(() => {
          vi.useFakeTimers()
        })
        afterEach(() => {
          vi.useRealTimers()
          vi.restoreAllMocks()
        })
      `,
    },
  },
  {
    // `stable-root`: "performs no side effect". The exemption is
    // the registration, not the root: a write to the host there is a write at
    // load, as in a spec. The way out is the hook of the row above.
    name: "a write to the host at a setup file's root is red, as at a spec's: it goes in a hook",
    config: BOUND,
    files: {
      ...VITEST,
      "vitest.setup.ts": `
        import { beforeAll } from "vitest"
        process.env["LANG"] = "C" // red: stable-root -- a write to the host when the file loads
        beforeAll(() => {
          process.env["TZ"] = "UTC"
        })
      `,
    },
  },
  {
    // canon: "an instance exists only where it was called, reached
    // by argument and never by import"; "each test assembles its own
    // instance". A server built at the root is built at load and shared by
    // every test of the file, in a setup file as in a spec. The way out keeps
    // it in the hook: vitest runs the function a hook returns as its teardown.
    name: "an instance built at a setup file's root is built at load and shared: red; built in the hook that returns its teardown, green",
    config: BOUND,
    files: {
      ...VITEST,
      ...MSW,
      "src/at-root/vitest.setup.ts": `
        import { afterAll, beforeAll } from "vitest"
        import { setupServer } from "msw"
        const server = setupServer() // red: stable-root + stable-root -- a call into a package at load; and what it built, shared by every test
        beforeAll(() => server.listen())
        afterAll(() => server.close())
      `,
      "src/in-hook/vitest.setup.ts": `
        import { beforeAll } from "vitest"
        import { setupServer } from "msw"
        beforeAll(() => {
          const server = setupServer()
          server.listen()
          return () => server.close()
        })
      `,
    },
  },
  {
    // A global setup file exports the function the test runner
    // calls once: a function of a test file, which may spawn, write and hand
    // values to the specs. Nothing runs when the file loads, and the teardown
    // is what the function returns: no state at the root.
    name: "a global setup file's exported function spawns a process, provides a value and returns its teardown: green",
    config: BOUND,
    files: {
      ...VITEST,
      "vitest.global-setup.ts": `
        import { spawn } from "node:child_process"
        export default async function setup(project: { provide: (key: string, value: unknown) => void }) {
          const child = spawn("node", ["server.js"])
          project.provide("port", 3000)
          return async () => {
            child.kill()
          }
        }
      `,
    },
  },
  {
    // `stable-root`: "creates no mutable state". The two-export
    // form shares what setup started with teardown through a let at the root.
    // The way out is the row above: setup returns its teardown.
    name: "a let at a global setup file's root, to hand what setup started to teardown, is red: setup returns its teardown",
    config: BOUND,
    files: {
      ...VITEST,
      "vitest.global-setup.ts": `
        import { spawn } from "node:child_process"
        import type { ChildProcess } from "node:child_process"
        let child: ChildProcess | null = null // red: stable-root -- a let, written by setup and read by teardown
        export const setup = async () => {
          child = spawn("node", ["server.js"])
        }
        export const teardown = async () => {
          child?.kill()
        }
      `,
    },
  },
  {
    // The stock test reader names a test by its name alone. A
    // setup file it is not bound to has no kind: blob, counted, not judged.
    name: "a setup file the test reader is not bound to is blob: not judged",
    files: {
      ...VITEST,
      "vitest.setup.ts": `
        import { expect } from "vitest"
        process.env["LANG"] = "C"
        expect.extend({
          toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
        })
      `,
    },
  },
] as const

describe("the setup file: a test file the test runner loads", () => {
  test.each(SETUPS)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
