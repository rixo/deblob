import { packageNameOf } from "../graph.model.ts"
import type { Tech } from "../ports/tech.port.ts"

/**
 * The runners this tech knows — a census by necessity: the claim is what makes
 * `import { test } from "vitest"` a tech callee whose callback is a hook, and
 * the root registration call the exempt shape. The next runner is one
 * `driverTech` line away; a globals-mode runner needs no entry, `describe` and
 * `test` as free names are tech by the reader's table.
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
 * The test tech: a spec file is assembly and driver in one
 * (`test-is-assembly-and-driver`). It registers its hooks by root calls into
 * the runner, imports anything, defines anything, and makes as many calls per
 * hook as it likes — the four exemptions.
 */
export const createTestRunnerTech = (): Tech => ({
  name: "test-runner",
  kinds: ["test"],
  claims: (specifier) => {
    const pkg = packageNameOf(specifier)
    return pkg !== null && RUNNERS.has(pkg)
  },
  exempts: ["registration", "call-count", "services-only", "definitions"],
})
