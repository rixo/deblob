import type { Role } from "./graph.model.ts"
import type { ReaderBinding } from "./recognition.model.ts"
import type { TestReader } from "./test-reader.model.ts"

/**
 * Playwright's names, in deblob's roles — `test` alone, its members for the
 * rest, and `expect.extend`, a declaration like `test.extend`. `test` states a
 * verification, as the generic reader reads a runner's `test`; `test.step` maps
 * to none: a step inside a test, no role in deblob's vocabulary, never
 * guessed.
 */
const ROLES = {
  "test.describe": { kind: "group" },
  test: { kind: "verification" },
  "test.beforeEach": { kind: "setup", scope: "each" },
  "test.beforeAll": { kind: "setup", scope: "all" },
  "test.afterEach": { kind: "teardown", scope: "each" },
  "test.afterAll": { kind: "teardown", scope: "all" },
  "test.extend": { kind: "extension" },
  // Playwright's gives a new `expect` back and changes none: a declaration
  "expect.extend": { kind: "extension" },
} as const satisfies Readonly<Record<string, Role>>

/**
 * A suite by its name, `*.suite.*`: Playwright collects `*.spec.*` and
 * `*.test.*` by default, and no such file.
 */
const SUITES = ["**/*.suite.*"] as const

/**
 * The Playwright runner: `@playwright/test` claimed, the generic reader's four
 * exemptions (a test file registers, imports and defines what it needs, makes
 * as many calls per hook as it likes — GUESS: T1, what a test body may do, is
 * not ruled). Bound by default to every file the flavor names a test — stack it
 * before `genericTestApi()` for the e2e files alone: `playwright({ include:
 * ["tests/**\/*.e2e.ts"] })`.
 */
export const createPlaywrightReader = ({
  suites = SUITES,
  ...binding
}: ReaderBinding & {
  /** The files that are suites, by glob; a `.suite` name when not written. */
  suites?: readonly string[]
} = {}): TestReader => ({
  name: "playwright",
  ...binding,
  suites,
  tech: ["@playwright/test"],
  // the longest listed name the chain starts with: `test.describe.only` is a
  // group, `test.skip` a verification; own keys only
  roleOf: ({ chain }) => {
    for (let length = chain.length; length > 0; length -= 1) {
      const name = chain.slice(0, length).join(".")
      if (Object.hasOwn(ROLES, name)) return ROLES[name as keyof typeof ROLES]
    }
    return null
  },
})
