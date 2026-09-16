import { beforeEach, describe, expect, test } from "vitest"

import { createAppService } from "./app.service.ts"
import { createMemoryStore } from "./store.adapter.ts"
import { createLegacyThing } from "../legacy.ts"

let counter = 0

describe("app service", () => {
  beforeEach(() => {
    counter = 0
  })

  test("checks through the store", () => {
    const app = createAppService({ store: createMemoryStore() })
    const result = app.check({ cwd: "." })
    const other = app.status({ cwd: "." })
    createLegacyThing()
    expect(result.ok).toBe(true)
    expect(other.ok).toBe(true)
  })
})
