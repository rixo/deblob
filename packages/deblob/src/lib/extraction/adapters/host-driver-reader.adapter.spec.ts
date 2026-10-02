import { describe, expect, it } from "vitest"

import { createHostDriverReader } from "./host-driver-reader.adapter.ts"
import { isTechPackage } from "../tech.model.ts"

describe("createHostDriverReader", () => {
  it("claims no package: the bound host readers claim its tech", () => {
    const reader = createHostDriverReader({ include: ["bin/*.ts"] })
    expect(reader).toMatchObject({ name: "host-driver", include: ["bin/*.ts"] })
    expect(isTechPackage(reader.tech, "node:fs")).toBe(false)
  })
})
