import { describe, expect, it } from "vitest"

import { runWeb } from "./fronts.ts"
import { GATE_TOKEN } from "./gate.ts"
import { createGateAssembly } from "./gate.assembly.ts"

// The web front's own rows: behavior only this front has, so no agnostic row
// can say it — here, authorization.
describe("createWeb", () => {
  describe("authorize", () => {
    it("refuses a request without a token, reaching no use case", async () => {
      const gate = createGateAssembly({ token: GATE_TOKEN })
      const response = await runWeb(gate, {
        method: "POST",
        path: "/notes",
        body: { text: "milk" },
        token: null,
      })
      expect(response.status).toBe(401)
      expect(await gate.store.all()).toEqual([])
    })

    it("refuses a request with a wrong token", async () => {
      const gate = createGateAssembly({ token: GATE_TOKEN })
      expect(
        (await runWeb(gate, { method: "GET", path: "/notes", token: "nope" }))
          .status,
      ).toBe(401)
    })

    it("refuses every request when no token is configured", async () => {
      const gate = createGateAssembly({ token: undefined })
      expect(
        (
          await runWeb(gate, {
            method: "GET",
            path: "/notes",
            token: "undefined",
          })
        ).status,
      ).toBe(401)
    })
  })
})
