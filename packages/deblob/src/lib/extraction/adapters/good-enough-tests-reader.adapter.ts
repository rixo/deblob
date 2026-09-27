import { packageNameOf } from "../graph.model.ts"
import type { Role } from "../graph.model.ts"
import type { Reader } from "../ports/reader.port.ts"

/**
 * The runners this reader knows — a census by necessity: the claim is what
 * makes `import { test } from "vitest"` a tech callee whose callback is a hook,
 * and the root registration call the exempt shape. The next runner is one
 * `driverTech` line away. A globals-mode runner is not read: a free `describe`
 * is a host global to this reader, never the runner — naming a runner's globals
 * is that runner's own reader's work.
 */
const RUNNERS: ReadonlySet<string> = new Set([
  "vitest",
  "jest",
  "@jest/globals",
  "node:test",
  "bun:test",
  "mocha",
  "ava",
  "uvu",
  "tap",
])

const SETUP_EACH: Role = { kind: "setup", scope: "each" }
const SETUP_ALL: Role = { kind: "setup", scope: "all" }
const TEARDOWN_EACH: Role = { kind: "teardown", scope: "each" }
const TEARDOWN_ALL: Role = { kind: "teardown", scope: "all" }

/**
 * The runners' names, in deblob's roles — the names the runners above share.
 * `it` states a behavior, `test` a verification: the house's split, the one the
 * behavior panel reads. `before` and `after` are the all-scope hooks of
 * `node:test` and mocha. A mock is a module factory (`vi.mock`, `jest.mock`),
 * never `vi.fn`'s implementation: a name not listed maps to no role.
 */
const ROLES: Readonly<Record<string, Role>> = {
  describe: { kind: "group" },
  suite: { kind: "group" },
  it: { kind: "behavior" },
  test: { kind: "verification" },
  beforeEach: SETUP_EACH,
  beforeAll: SETUP_ALL,
  before: SETUP_ALL,
  afterEach: TEARDOWN_EACH,
  afterAll: TEARDOWN_ALL,
  after: TEARDOWN_ALL,
  "vi.mock": { kind: "mock" },
  "jest.mock": { kind: "mock" },
}

/**
 * The test naming — canon: test files are recognized by their tech's globs.
 * `*.spec.*` and `*.test.*` over the script extensions, and anything under a
 * `__tests__` directory. A project with other test paths binds them in config
 * (`readers: { "good-enough-tests": [...] }`), on top of these.
 */
const TEST_FILES: readonly string[] = [
  "**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
  "**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
]

/**
 * The good-enough test reader: common conventions over every runner it knows —
 * the naming, the imports — and no runner's config read, no runner asked. What
 * it buys is a start on any codebase; a runner's own reader, where one exists,
 * is the precise one. A spec file is assembly and driver in one
 * (`test-is-outside`). It reads the test kind only, so its binding is what
 * makes a file a test file. The file registers its hooks by root calls into the
 * runner, imports anything, defines anything, and makes as many calls per hook
 * as it likes — the four exemptions. Its hooks carry the runners' roles.
 */
export const createGoodEnoughTestsReader = (): Reader => ({
  name: "good-enough-tests",
  files: TEST_FILES,
  kinds: ["test"],
  claims: (specifier) => {
    const pkg = packageNameOf(specifier)
    return pkg !== null && RUNNERS.has(pkg)
  },
  exempts: ["registration", "call-count", "services-only", "definitions"],
  // the longest listed name the chain starts with: `it.skip.each` is `it`,
  // `vi.mock` a mock, `vi.fn` none; own keys only (`constructor` is none)
  roleOf: (chain) => {
    for (let length = chain.length; length > 0; length -= 1) {
      const name = chain.slice(0, length).join(".")
      if (Object.hasOwn(ROLES, name)) return ROLES[name] as Role
    }
    return null
  },
})
