import { describe, expect, test } from "vitest"

import { goodEnoughTests } from "../../readers.ts"
import { assembleCase } from "./runner/cases.assembly.ts"
import type { Row } from "./runner/markers.model.ts"
import { AS_MARKED } from "./runner/markers.model.ts"

/**
 * The suite: tests written in a file of their own, which a spec file registers
 * by calling it. The most common reason is a port with several adapters: its
 * suite states once what every adapter must do, and each adapter's spec
 * registers those tests against its own adapter — the literature's contract
 * tests (an abstract test case, its subject supplied by a factory). A test file
 * is assembly and driver in one, its tech the runner, and the runner starts it.
 * A driver has a second form, the sub-driver, whose wiring function the root
 * calls; the suite is that form for a test file: a file of the test kind that
 * the runner does not collect and a spec calls. It is named by the test reader
 * (`suites`, a `.suite` name by default), imports its runner, and its tests are
 * a test file's. Nothing in it is an exception. Only a test file imports test
 * code; a file whose root acts is imported by nothing, and a suite's root
 * registers nothing, so a test file may import it; a call to a function that
 * registers is a registration, and that function's body is a group's body.
 */

const VITEST = {
  "node_modules/vitest/package.json": JSON.stringify({
    name: "vitest",
    main: "./index.js",
  }),
  "node_modules/vitest/index.js": "module.exports = {}",
} as const

/** A port and one adapter of it: what a suite is about. */
const FS = {
  ...VITEST,
  "src/fs/fs.port.ts": `
    export interface Fs {
      readFile(path: string): Promise<string | null>
    }
  `,
  "src/fs/adapters/memory-fs.adapter.ts": `
    import type { Fs } from "../fs.port.ts"
    export const createMemoryFs = (files: Readonly<Record<string, string>>): Fs => ({
      readFile: async (path) => files[path] ?? null,
    })
  `,
} as const

/** The port's suite: its wiring function registers the port's tests. */
const SUITE = `
  import { describe, expect, it } from "vitest"
  import type { Fs } from "./fs.port.ts"
  export const describeFs = (name: string, make: () => Promise<Fs>) => {
    describe(name, () => {
      it("reads null for a missing path", async () => {
        const fs = await make()
        expect(await fs.readFile("/missing")).toBe(null)
      })
    })
  }
`

const SUITES: readonly Row[] = [
  {
    // The sub-driver's sentence transposed: "a driver imports
    // another driver only to call its wiring function, during its own wiring"
    // — a spec's wiring is its root, and what the call does there is register
    // tests. The function handed is the subject's factory: the tests call it.
    name: "a spec calling a suite's wiring function at its root is a registration; the function it hands runs in the tests",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": SUITE,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", async () => createMemoryFs({}))
      `,
    },
  },
  {
    // Canon: "each test assembles its own instance". The suite is
    // handed a factory; an instance built in the call's arguments is built
    // when the spec loads and shared by every test of the suite.
    name: "an instance built in the arguments of a suite's call is built at load: red",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": `
        import { describe, expect, it } from "vitest"
        import type { Fs } from "./fs.port.ts"
        export const describeFs = (name: string, fs: Fs) => {
          describe(name, () => {
            it("reads null for a missing path", async () => {
              expect(await fs.readFile("/missing")).toBe(null)
            })
          })
        }
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", createMemoryFs({})) // red: stable-root -- the adapter is built when the spec loads, one instance for every test
      `,
    },
  },
  {
    // A suite registers when a spec calls it. A registration at
    // its root would run on the spec's import, under no name the spec gave.
    name: "a suite's own root registers nothing: a describe there runs on import, red; a list that can change is red as in a spec",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": `
        import { describe, expect, it } from "vitest"
        const seen: string[] = [] // red: stable-root -- a list every test of every spec shares
        describe("every fs", () => { // red: stable-root -- registered when a spec imports the suite, not when it calls it
          it("is seen", () => {
            expect(seen).toEqual([])
          })
        })
        export const describeFs = (name: string) => {
          describe(name, () => {
            it("has a name", () => {
              expect(name).toBeDefined()
            })
          })
        }
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.suite.ts"
        describeFs("createMemoryFs")
      `,
    },
  },
  {
    // `test-is-outside`, "only a test file imports a test file": test code is
    // outermost, and the test runner stays out of the program.
    name: "a model importing a suite is red: only a test file imports a suite",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": SUITE,
      "src/fs/names.model.ts": `
        import { describeFs } from "./fs.suite.ts"
        export const nameOf = () => describeFs.name
        // red: inward-deps -- the import of fs.suite: a model reaching outward
        // red: test-is-outside -- the import of fs.suite: only a test file imports a suite
      `,
    },
  },
  {
    // A suite is a test file to another suite: it calls the other's
    // wiring function during its own.
    name: "a suite calling another suite's wiring function during its own is green",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": SUITE,
      "src/fs/watched-fs.suite.ts": `
        import { describe, expect, it } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { describeFs } from "./fs.suite.ts"
        export const describeWatchedFs = (name: string, make: () => Promise<Fs>) => {
          describeFs(name, make)
          describe(name + ", watched", () => {
            it("still reads null for a missing path", async () => {
              const fs = await make()
              expect(await fs.readFile("/missing")).toBe(null)
            })
          })
        }
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeWatchedFs } from "../watched-fs.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeWatchedFs("createMemoryFs", async () => createMemoryFs({}))
      `,
    },
  },
  {
    // `stable-root`: "a file whose root acts is imported by nothing". It is the
    // root that decides, not the name: a spec file whose root registers
    // nothing is imported and called like a suite. The name is for the test
    // runner, which collects a spec and would find no test in this one.
    name: "a spec file whose root registers nothing is imported by a spec and called like a suite; one whose root registers is not",
    files: {
      ...FS,
      "src/fs/fs-promises.spec.ts": SUITE,
      "src/fs/missing.spec.ts": `
        import { expect, it } from "vitest"
        export const MISSING = "/missing"
        it("names a missing path", () => {
          expect(MISSING).toBe("/missing")
        })
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs-promises.spec.ts"
        import { MISSING } from "../missing.spec.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs " + MISSING, async () => createMemoryFs({}))
        // red: test-is-outside -- the import of missing.spec: its root registers
      `,
    },
  },
  {
    // A matcher shared by several specs is registered on the test runner: test
    // business, and a registration. Its file imports the runner like any test
    // file, and the spec calls it at its root.
    name: "a matcher registered in a suite's function, called at a spec's root, is a registration: green",
    files: {
      ...FS,
      "src/test/matchers.suite.ts": `
        import { expect } from "vitest"
        export const registerMatchers = () => {
          expect.extend({
            toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
          })
        }
      `,
      "src/colors.spec.ts": `
        import { expect, it } from "vitest"
        import { registerMatchers } from "./test/matchers.suite.ts"
        registerMatchers()
        it("is red", () => {
          expect("red").toBeDefined()
        })
      `,
    },
  },
  {
    // A test file is given what a test needs, and a suite is the part of it
    // that is shared: a test factory several specs use builds with fakes,
    // seeds, branches on what the test asks, and hands the fakes back. In an
    // assembly file each of those is red; here it is a test's setup, and
    // nothing but a test file imports it.
    name: "a test factory shared by specs lives in a suite: it builds with fakes, seeds, branches and hands the fakes back, green",
    files: {
      ...FS,
      "src/fs/fs-reader.service.ts": `
        import type { Fs } from "./fs.port.ts"
        export const createFsReader = ({ fs }: { fs: Fs }) => ({
          read: (path: string) => fs.readFile(path),
        })
      `,
      "src/fs/fs-reader.suite.ts": `
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        import { createFsReader } from "./fs-reader.service.ts"
        export const createTestFsReader = async ({ seeded = true }: { seeded?: boolean } = {}) => {
          const fs = createMemoryFs(seeded ? { "/a": "A" } : {})
          const reader = createFsReader({ fs })
          if (seeded) await reader.read("/a")
          return { reader, fs }
        }
      `,
      "src/fs/fs-reader.service.spec.ts": `
        import { expect, it } from "vitest"
        import { createTestFsReader } from "./fs-reader.suite.ts"
        it("reads what was seeded", async () => {
          const { reader } = await createTestFsReader()
          expect(await reader.read("/a")).toBe("A")
        })
      `,
    },
  },
  {
    // The spec's call to a suite's function is a registration because the
    // function registers. One that registers nothing and acts is a call that
    // acts when the spec loads, as from any file.
    name: "a suite's function that registers nothing, called at a spec's root, is no registration: it acts when the spec loads, red",
    files: {
      ...FS,
      "src/test/cwd.suite.ts": `
        export const enterTmp = () => {
          process.chdir("/tmp")
        }
      `,
      "src/cwd.spec.ts": `
        import { expect, it } from "vitest"
        import { enterTmp } from "./test/cwd.suite.ts"
        enterTmp() // red: stable-root -- the function registers nothing: it changes the host's directory when the spec loads
        it("runs in tmp", () => {
          expect(1).toBe(1)
        })
      `,
    },
  },
  {
    // A CONFESSED LIMIT, found 2026-10-08. A fixture declaration gives a new
    // registering function back and registers nothing: at a suite's root it
    // is a value like another, and the spec that imports it registers with
    // it. The reader gets both ends wrong: it takes the declaration for a
    // registration at the suite's root, and it does not follow the name into
    // the spec (it does inside one file).
    name: "a fixture declared at a suite's root and imported by a spec registers nothing where it is declared, and registers tests in the spec: green, missed twice",
    files: {
      ...FS,
      "src/fs/fs-fixture.suite.ts": `
        import { test as base } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        // false red: stable-root -- a fixture declaration registers nothing: it gives a function back
        export const test = base.extend<{ fs: Fs }>({
          fs: async ({}, use) => {
            await use(createMemoryFs({}))
          },
        })
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { test } from "./fs-fixture.suite.ts"
        // false unknown: stable-root -- the test runner's function under a name a suite exports: not followed across files
        test("reads null", async ({ fs }) => {
          expect(await fs.readFile("/missing")).toBe(null)
        })
      `,
    },
  },
  {
    // Which files are suites is the test reader's to say, by an
    // argument to its factory; a name it does not list is no suite.
    name: "the reader's suites argument names the suites: another name is a suite, and .suite no longer is",
    config: {
      readers: { test: [goodEnoughTests({ suites: ["**/*.shared.ts"] })] },
    },
    files: {
      ...FS,
      "src/fs/fs.shared.ts": SUITE,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.shared.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", async () => createMemoryFs({}))
      `,
      "src/fs/names.suite.ts": `
        export const NAMES = ["a"] as const
      `,
      "src/fs/names.model.ts": `
        import { NAMES } from "./names.suite.ts"
        export const firstName = () => NAMES[0]
        // red: blob-quarantine -- names.suite is no suite to this reader: an unnamed file, blob
      `,
    },
  },
  {
    // A suite's wiring function runs when the spec that calls it loads, and
    // what it declares is shared by every test the call registers: a group's
    // body in a function's clothes. Its groups are groups.
    name: "a suite's wiring function is judged like a group's body: a let or a changeable list declared there, or in a group it registers, is shared by the tests: red",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": `
        import { describe, expect, it } from "vitest"
        import type { Fs } from "./fs.port.ts"
        export const describeFs = (name: string, make: () => Promise<Fs>) => {
          let made = 0 // red: stable-root -- a let, shared by the tests this call registers
          describe(name, () => {
            const SEEN: string[] = [] // red: stable-root -- changeable, shared by the group's tests
            it("reads null for a missing path", async () => {
              const fs = await make()
              made += 1
              SEEN.push(name)
              expect(await fs.readFile("/missing")).toBe(null)
            })
          })
        }
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", async () => createMemoryFs({}))
      `,
    },
  },
  {
    // A CONFESSED LIMIT. The reader takes it that a function handed to a
    // suite runs in the tests; the suite is where that is checked. Here the
    // suite calls it in its wiring function, so when the spec loads. The line
    // is seen, as an unknown: the reader does not tell what a parameter holds
    // (a test's call site binds none), where the truth is red.
    name: "a suite calling the function it is handed while registering runs it at load: red in the suite, seen as an unknown",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": `
        import { describe, expect, it } from "vitest"
        import type { Fs } from "./fs.port.ts"
        export const describeFs = (name: string, make: () => Fs) => {
          const fs = make() // false unknown: stable-root, stable-root -- the function handed is called when the spec loads, and what it made is shared by the tests
          describe(name, () => {
            it("reads null for a missing path", async () => {
              expect(await fs.readFile("/missing")).toBe(null)
            })
          })
        }
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../fs.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", () => createMemoryFs({}))
      `,
    },
  },
] as const

describe("the suite: a test file's sub form", () => {
  test.each(SUITES)("$name", async (row) => {
    const { judge } = assembleCase(row.files)
    const { expectedFailures, ...match } = await judge(row)
    if (expectedFailures.length > 0) console.info(expectedFailures.join("\n"))
    expect(match).toEqual(AS_MARKED)
  })
})
