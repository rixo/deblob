import type { Role } from "./graph.model.ts"
import type { TestReader } from "./test-reader.model.ts"
import type { ReaderBinding } from "./recognition.model.ts"

/**
 * The runners this reader knows — a census by necessity: the claim is what
 * makes `import { test } from "vitest"` a tech callee whose callback is a hook,
 * and the root registration call the exempt shape. The next runner is its own
 * reader, or an inline one stacked before this one. A globals-mode runner is
 * not read: a free `describe` is unclaimed to this reader, never the runner —
 * naming a runner's globals is that runner's own reader's work.
 */
const RUNNERS: readonly string[] = [
  "vitest",
  "jest",
  "@jest/globals",
  "node:test",
  "bun:test",
  "mocha",
  "ava",
  "uvu",
  "tap",
]

const SETUP_EACH = { kind: "setup", scope: "each" } as const satisfies Role
const SETUP_ALL = { kind: "setup", scope: "all" } as const satisfies Role
const TEARDOWN_EACH = {
  kind: "teardown",
  scope: "each",
} as const satisfies Role
const TEARDOWN_ALL = { kind: "teardown", scope: "all" } as const satisfies Role

/**
 * The runners' names, in deblob's roles — the names the runners above share.
 * `it` states a behavior, `test` a verification: the house's split, the one the
 * behavior panel reads. `before` and `after` are the all-scope hooks of
 * `node:test` and mocha. A mock is a module factory (`vi.mock`, `jest.mock`),
 * never `vi.fn`'s implementation: a name not listed maps to no role.
 */
const ROLES = {
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
  "test.extend": { kind: "fixture" },
  "it.extend": { kind: "fixture" },
} as const satisfies Readonly<Record<string, Role>>

/**
 * The good-enough test reader: common conventions over every runner it knows —
 * the naming, the imports — and no runner's config read, no runner asked. What
 * it buys is a start on any codebase; a runner's own reader, where one exists,
 * is the precise one. A spec file is assembly and driver in one
 * (`test-is-outside`). Bound by default to every file the flavor names a test.
 * The file registers its hooks by root calls into the runner, imports anything,
 * defines anything, and makes as many calls per hook as it likes — the four
 * exemptions. Its hooks carry the runners' roles.
 */
export const createGoodEnoughTestsReader = (
  binding: ReaderBinding = {},
): TestReader => ({
  name: "good-enough-tests",
  ...binding,
  tech: RUNNERS,
  // the longest listed name the chain starts with: `it.skip.each` is `it`,
  // `vi.mock` a mock, `vi.fn` none; own keys only (`constructor` is none)
  roleOf: ({ chain }) => {
    for (let length = chain.length; length > 0; length -= 1) {
      const name = chain.slice(0, length).join(".")
      if (Object.hasOwn(ROLES, name)) return ROLES[name as keyof typeof ROLES]
    }
    return null
  },
})
