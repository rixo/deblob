import { describe, expect, test } from "vitest"

import { goodEnoughTests, playwright } from "../../readers.ts"
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
    // A fixture declaration gives a new registering function back and
    // registers nothing: at a suite's root it is a value like another. The
    // spec that imports it registers its tests with it, as with the test
    // runner's own function: the name is followed across files, as it is
    // inside one.
    name: "a fixture declared at a suite's root registers nothing there, and the spec that imports it registers tests with it: green",
    files: {
      ...FS,
      "src/fs/fs-fixture.suite.ts": `
        import { test as base } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        export const test = base.extend<{ fs: Fs }>({
          fs: async ({}, use) => {
            await use(createMemoryFs({}))
          },
        })
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { test } from "./fs-fixture.suite.ts"
        test("reads null", async ({ fs }) => {
          expect(await fs.readFile("/missing")).toBe(null)
        })
      `,
    },
  },
  {
    // What holds for the test runner's function holds for the one
    // a suite gives: its members register (\`test.skip\`, \`test.describe\`),
    // another name the suite exports for it is that function, and a group
    // registered with it is a group: what its body declares is shared.
    name: "the function a suite's fixture gives is the test runner's in everything: its members, another name the suite exports, and a group's body judged as a group's",
    files: {
      ...FS,
      "src/fs/fs-fixture.suite.ts": `
        import { test as base } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        export const test = base.extend<{ fs: Fs }>({
          fs: async ({}, use) => {
            await use(createMemoryFs({}))
          },
        })
        export const it = test
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { it, test } from "./fs-fixture.suite.ts"
        test.skip("is not run", async ({ fs }) => {
          expect(await fs.readFile("/missing")).toBe(null)
        })
        it("reads null", async ({ fs }) => {
          expect(await fs.readFile("/missing")).toBe(null)
        })
        test.describe("in a group", () => {
          let reads = 0 // red: stable-root -- a let, shared by the group's tests
          test("counts", async ({ fs }) => {
            reads += 1
            expect(await fs.readFile("/missing")).toBe(null)
          })
        })
      `,
    },
  },
  {
    // A fixture extends a fixture: the second suite imports the first one's
    // function and declares on it. The name is followed through both files.
    name: "a fixture declared on another suite's fixture is followed through both files: green",
    files: {
      ...FS,
      "src/fs/fs-fixture.suite.ts": `
        import { test as base } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        export const test = base.extend<{ fs: Fs }>({
          fs: async ({}, use) => {
            await use(createMemoryFs({}))
          },
        })
      `,
      "src/fs/seeded-fixture.suite.ts": `
        import { test as base } from "./fs-fixture.suite.ts"
        export const test = base.extend<{ seeded: string }>({
          seeded: async ({ fs }, use) => {
            await use((await fs.readFile("/a")) ?? "")
          },
        })
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { test } from "./seeded-fixture.suite.ts"
        test("reads what was seeded", async ({ seeded }) => {
          expect(seeded).toBe("")
        })
      `,
    },
  },
  {
    // The same declaration in a file with no kind. The name is followed there
    // too (ruled 2026-10-08): it holds the test runner's function, and blob
    // defines none. The spec registers its tests; the blob file keeps its own
    // verdicts, here an adapter imported outside an assembly.
    name: "the same fixture in a file with no kind is followed too: the spec registers tests, and the blob file keeps its own reds",
    files: {
      ...FS,
      "src/fs/fixtures.ts": `
        import { test as base } from "vitest"
        import type { Fs } from "./fs.port.ts"
        import { createMemoryFs } from "./adapters/memory-fs.adapter.ts"
        export const test = base.extend<{ fs: Fs }>({
          fs: async ({}, use) => {
            await use(createMemoryFs({}))
          },
        })
        // red: adapter-assembly-only, runtime-import -- blob importing an adapter
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { test } from "./fixtures.ts"
        test("reads null", async ({ fs }) => {
          expect(await fs.readFile("/missing")).toBe(null)
        })
      `,
    },
  },
  {
    // What following into blob costs: a fixtures file
    // in blob that imports nothing blob may not import gets no line, and
    // neither does the spec. Nothing pushes it to be named a suite; it counts
    // in the blob share. A function blob defines stays a call into blob.
    name: "a fixture in a blob file that breaks no rule is silent, with the spec; a function the blob file defines, called at the spec's root, stays red",
    files: {
      ...FS,
      "src/fs/fixtures.ts": `
        import { test as base } from "vitest"
        export const test = base.extend<{ path: string }>({ path: "/missing" })
        export const describePaths = () => {
          test("has a path", ({ path }) => {})
        }
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { describePaths, test } from "./fixtures.ts"
        test("has a path", ({ path }) => {
          expect(path).toBe("/missing")
        })
        describePaths() // red: stable-root -- a call into a blob's function when the spec loads
      `,
    },
  },
  {
    // \`test.each(rows)\` registers nothing and gives a function back, which
    // registers when it is called, as \`test\` does: a suite may export it, a
    // spec may keep it under a name, and \`test.for\`, \`test.skipIf\` and
    // \`test.runIf\` are the same. The reader says which members are of that
    // sort; the name is followed like a fixture's.
    name: "the function test.each gives registers nothing where it is made and registers tests where it is called: exported by a suite, or kept under a name in the spec, green",
    files: {
      ...FS,
      "src/fs/paths.suite.ts": `
        import { test } from "vitest"
        export const eachPath = test.each(["/a", "/b"])
        export const onLinux = test.runIf(true)
        export const eachOnLinux = test.runIf(true).each(["/a"])
        export const eachSkipped = test.skip.each(["/a"])
      `,
      "src/fs/reads.spec.ts": `
        import { expect, it } from "vitest"
        import { eachOnLinux, eachPath, eachSkipped, onLinux } from "./paths.suite.ts"
        const eachDepth = it.for([1, 2])
        eachPath("reads %s", (path) => {
          expect(path).toBeDefined()
        })
        onLinux("reads on linux", () => {
          expect(1).toBe(1)
        })
        eachOnLinux("reads %s on linux", (path) => {
          expect(path).toBeDefined()
        })
        eachSkipped("does not read %s", (path) => {
          expect(path).toBeDefined()
        })
        eachDepth("reads at depth %i", (depth) => {
          expect(depth).toBeDefined()
        })
      `,
    },
  },
  {
    // Only what the reader says gives a registering
    // function registers. A mock function made at a suite's root is a call
    // into the runner when the suite loads; what it gives is the runner's, and
    // no registering function: the spec's call to it is a call into the runner
    // when the spec loads, and no registration.
    name: "what a call into the runner gave is the runner's, and registers only if the reader says so: a mock function made at a suite's root is red there, and red again called at a spec's root",
    files: {
      ...FS,
      "src/fs/spies.suite.ts": `
        import { vi } from "vitest"
        export const onRead = vi.fn() // red: stable-root + stable-root -- a call into the runner when the suite loads, and what it made is shared by the tests
      `,
      "src/fs/reads.spec.ts": `
        import { expect, it, vi } from "vitest"
        import { onRead } from "./spies.suite.ts"
        onRead() // red: stable-root -- a call into the runner when the spec loads, and no registration
        // false unknown: stable-root -- the reader does not know what vi.fn() gave, made in another file or in this one
        // red: stable-root -- a mock function kept at a spec's root records its calls: state the tests share
        const kept = onRead
        // false unknown: stable-root -- the same, made here
        // red: stable-root -- a mock function kept at a spec's root
        const made = vi.fn()
        it("was called", () => {
          expect([onRead, kept, made]).toBeDefined()
        })
      `,
    },
  },
  {
    // A suite passes on another suite's wiring function by a re-export; the
    // spec's call registers the tests, as it would called from the first
    // suite, and the function it hands runs in the tests. The function is
    // found in the file that declares it, through the re-export.
    name: "a suite's wiring function re-exported by another suite and called at a spec's root is a registration: green",
    files: {
      ...FS,
      "src/fs/fs.suite.ts": SUITE,
      "src/test/all.suite.ts": `
        export { describeFs } from "../fs/fs.suite.ts"
      `,
      "src/fs/adapters/memory-fs.adapter.spec.ts": `
        import { describeFs } from "../../test/all.suite.ts"
        import { createMemoryFs } from "./memory-fs.adapter.ts"
        describeFs("createMemoryFs", async () => createMemoryFs({}))
      `,
    },
  },
  {
    // The root decides, not the name: a spec file whose
    // root only declares a fixture registers nothing, so a test file may
    // import it, as it may a spec whose root is quiet.
    name: "a spec file whose root only declares a fixture registers nothing: another spec imports it and registers tests with it, green",
    files: {
      ...FS,
      "src/fs/fs-fixture.spec.ts": `
        import { test as base } from "vitest"
        export const test = base.extend<{ path: string }>({ path: "/missing" })
      `,
      "src/fs/reads.spec.ts": `
        import { expect } from "vitest"
        import { test } from "./fs-fixture.spec.ts"
        test("has a path", ({ path }) => {
          expect(path).toBe("/missing")
        })
      `,
    },
  },
  {
    // Playwright's \`expect.extend\` gives a new
    // \`expect\` back and changes nothing: a declaration, like its
    // \`test.extend\`. Its reader says so. (vitest's and jest's write the
    // runner's own \`expect\` and give nothing back: an act, red at a suite's
    // root — the row "a matcher registered in a suite's function".)
    name: "Playwright's expect.extend at a suite's root declares a new expect and registers nothing, by its reader: green",
    config: { readers: { test: [playwright()] } },
    files: {
      ...FS,
      "node_modules/@playwright/test/package.json": JSON.stringify({
        name: "@playwright/test",
        main: "./index.js",
      }),
      "node_modules/@playwright/test/index.js": "module.exports = {}",
      "src/test/matchers.suite.ts": `
        import { expect as base } from "@playwright/test"
        export const expect = base.extend({
          toBeRed: (received: unknown) => ({ pass: received === "red", message: () => "not red" }),
        })
      `,
      "src/colors.spec.ts": `
        import { test } from "@playwright/test"
        import { expect } from "./test/matchers.suite.ts"
        test("is red", () => {
          expect("red").toBeDefined()
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
