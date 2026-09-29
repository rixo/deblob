import { describe, expect, it } from "vitest"

import { createHostDriverReader } from "./host-driver-reader.adapter.ts"

describe("createHostDriverReader", () => {
  it("claims no package: the bound host readers claim its tech", () => {
    const reader = createHostDriverReader({ include: ["bin/*.ts"] })
    expect(reader).toMatchObject({ name: "host-driver", include: ["bin/*.ts"] })
    expect(reader.claims("node:fs")).toBe(false)
  })
})
