import { packageNameOf } from "../graph.model.ts"
import type { Reader } from "../ports/reader.port.ts"

/**
 * The runners this reader knows — a census by necessity: the claim is what
 * makes `import { test } from "vitest"` a tech callee whose callback is a hook,
 * and the root registration call the exempt shape. The next runner is one
 * `driverTech` line away; a globals-mode runner needs no entry, `describe` and
 * `test` as free names are tech by the reading's table.
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

/**
 * The test naming — canon: test files are recognized by their tech's globs.
 * `*.spec.*` and `*.test.*` over the script extensions, and anything under a
 * `__tests__` directory. A project with other test paths binds them in config
 * (`readers: { "test-runner": [...] }`), on top of these.
 */
const TEST_FILES: readonly string[] = [
  "**/*.{spec,test}.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
  "**/__tests__/**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}",
]

/**
 * The test reader: a spec file is assembly and driver in one
 * (`test-is-outside`). It reads the test kind only, so its binding is what
 * makes a file a test file. The file registers its hooks by root calls into the
 * runner, imports anything, defines anything, and makes as many calls per hook
 * as it likes — the four exemptions.
 */
export const createTestRunnerReader = (): Reader => ({
  name: "test-runner",
  files: TEST_FILES,
  kinds: ["test"],
  claims: (specifier) => {
    const pkg = packageNameOf(specifier)
    return pkg !== null && RUNNERS.has(pkg)
  },
  exempts: ["registration", "call-count", "services-only", "definitions"],
})
