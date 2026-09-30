import { describe, expect, it, test } from "vitest"

import { CHECK_RULES, KNOWN_CHECKS } from "./checks.model.ts"
import { RULE_IDS } from "./rule.model.ts"

describe("CHECK_RULES", () => {
  it("maps each detector to the rules it cites", () => {
    expect(CHECK_RULES).toEqual({
      dag: ["no-service-cycle", "no-runtime-cycle"],
      layers: [
        "inward-deps",
        "service-purity",
        "blob-quarantine",
        "service-assembly-only",
        "adapter-assembly-only",
        "runtime-import",
        "public-unit",
        "assembly-driver-only",
        "driver-not-imported",
        "boot-one-call",
        "test-is-outside",
        "driver-calls-services",
        "assembly-builds-only",
      ],
      private: ["private-sealed"],
      barrels: ["layer-in-path"],
      ports: ["ports-types-only"],
      surface: ["layer-in-path", "chain-purity"],
      modules: ["stable-root"],
      assembly: ["assembly-builds-only"],
      driver: [
        "wiring-outside-hooks",
        "hook-one-call",
        "driver-calls-services",
        "driver-hooks-only",
        "sub-driver-wiring",
      ],
      boot: ["boot-one-call"],
    })
  })

  it("keys exactly the known checks", () => {
    expect(Object.keys(CHECK_RULES)).toEqual([...KNOWN_CHECKS])
  })

  test("no rule slug collides with a check name — the topic grammar resolves checks first", () => {
    for (const id of RULE_IDS) {
      expect(KNOWN_CHECKS as readonly string[]).not.toContain(id)
    }
  })
})
