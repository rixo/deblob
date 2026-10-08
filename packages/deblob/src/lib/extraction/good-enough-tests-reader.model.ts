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
 * never `vi.fn`'s implementation: a name not listed maps to no role. A group is
 * also a member of the registering function (`test.describe`, vitest's and
 * Playwright's): the one form a function a fixture declaration gave back has.
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
  "test.extend": { kind: "extension" },
  "it.extend": { kind: "extension" },
  "test.describe": { kind: "group" },
  "it.describe": { kind: "group" },
  "test.suite": { kind: "group" },
  "it.suite": { kind: "group" },
} as const satisfies Readonly<Record<string, Role>>

/**
 * The members that, called, register nothing and give a registering function
 * back: `test.each(rows)`, `it.for(rows)`, `describe.skipIf(condition)`. Read
 * off vitest's type declarations.
 */
const GIVING: ReadonlySet<string> = new Set(["each", "for", "skipIf", "runIf"])

/** The roles a registering function has: what such a member is a member of. */
const REGISTERING: ReadonlySet<string> = new Set([
  "group",
  "behavior",
  "verification",
])

/**
 * A suite by its name, `*.suite.*`: no runner this reader knows collects it by
 * default.
 */
const SUITES = ["**/*.suite.*"] as const

/**
 * The good-enough test reader: common conventions over every runner it knows —
 * the naming, the imports — and no runner's config read, no runner asked. What
 * it buys is a start on any codebase; a runner's own reader, where one exists,
 * is the precise one.
 *
 * What it is tested on: vitest, and nothing else. Every row and every test file
 * of deblob's own imports vitest. The other runners are claimed and their names
 * mapped from what they share with vitest, and none was ever run through the
 * reader: where one of them differs, the reader is wrong and no test says so.
 * Playwright has its own reader, tested by a unit spec of its roles.
 *
 * A spec file is assembly and driver in one (`test-is-outside`). Bound by
 * default to every file the flavor names a test. The file registers its hooks
 * by root calls into the runner, imports anything, defines anything, and makes
 * as many calls per hook as it likes — the four exemptions. Its hooks carry the
 * runners' roles.
 */
export const createGoodEnoughTestsReader = ({
  suites = SUITES,
  ...binding
}: ReaderBinding & {
  /** The files that are suites, by glob; a `.suite` name when not written. */
  suites?: readonly string[]
} = {}): TestReader => {
  // the longest listed name the chain starts with: `it.skip.each` is `it`,
  // `vi.mock` a mock, `vi.fn` none; own keys only (`constructor` is none)
  const roleOf: TestReader["roleOf"] = ({ chain }) => {
    for (let length = chain.length; length > 0; length -= 1) {
      const name = chain.slice(0, length).join(".")
      if (Object.hasOwn(ROLES, name)) return ROLES[name as keyof typeof ROLES]
    }
    return null
  }
  return {
    name: "good-enough-tests",
    ...binding,
    suites,
    tech: RUNNERS,
    roleOf,
    // a giving member last, on a name that registers: `test.skip.each`
    givesRegistrar: ({ chain }) => {
      const last = chain.at(-1)
      const role = roleOf({ chain })
      return (
        chain.length > 1 &&
        last !== undefined &&
        GIVING.has(last) &&
        role !== null &&
        REGISTERING.has(role.kind)
      )
    },
  }
}
