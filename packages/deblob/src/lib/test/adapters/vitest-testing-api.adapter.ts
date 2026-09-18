/**
 * The testing API port over vitest — four one-liners, imported by adapter
 * specs.
 */

import { describe, expect, it } from "vitest"

import type { TestingApi } from "../testing-api.port.ts"

export const createVitestTestingApi = (): TestingApi => ({
  describe: (name, body) => describe(name, body),
  it: (name, body) => it(name, body),
  equal: (actual, expected) => expect(actual).toEqual(expected),
  matches: (actual, expected) => expect(actual).toMatchObject(expected),
})
