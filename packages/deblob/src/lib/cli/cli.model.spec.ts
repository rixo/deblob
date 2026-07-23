import { describe, expect, it } from "vitest"

import { RULE_COUNT } from "../explain/rule-content.model.ts"
import {
  CHECK_RULES,
  KNOWN_CHECKS,
  parseCli,
  rulesForTopic,
} from "./cli.model.ts"

describe("parseCli", () => {
  describe("commands", () => {
    it("bare argv is the status command", () => {
      expect(parseCli([])).toEqual({
        config: null,
        noColor: false,
        action: { command: "status" },
      })
    })

    it("check with no names runs every known check", () => {
      expect(parseCli(["check"])).toEqual({
        config: null,
        noColor: false,
        action: {
          command: "check",
          checks: KNOWN_CHECKS,
          explain: false,
          explainOnly: false,
        },
      })
    })

    it("check with names runs the named subset, argv order kept", () => {
      expect(parseCli(["check", "ports", "layers"])).toMatchObject({
        action: { command: "check", checks: ["ports", "layers"] },
      })
    })

    it("explain takes exactly one topic", () => {
      expect(parseCli(["explain", "rule-4"])).toMatchObject({
        action: { command: "explain", topic: "rule-4" },
      })
    })
  })

  describe("flags", () => {
    it("--help and -h yield the help screen from anywhere", () => {
      expect(parseCli(["--help"])).toMatchObject({
        action: { command: "help" },
      })
      expect(parseCli(["-h"])).toMatchObject({ action: { command: "help" } })
    })

    it("check --help yields the check help screen", () => {
      expect(parseCli(["check", "--help"])).toMatchObject({
        action: { command: "check-help" },
      })
    })

    it("--version and -v print the version", () => {
      expect(parseCli(["--version"])).toMatchObject({
        action: { command: "version" },
      })
      expect(parseCli(["-v"])).toMatchObject({
        action: { command: "version" },
      })
    })

    it("-c / --config carries the explicit config path", () => {
      expect(parseCli(["-c", "some/made-up.config.ts", "check"])).toMatchObject(
        { config: "some/made-up.config.ts" },
      )
      expect(parseCli(["--config", "made-up.config.ts"])).toMatchObject({
        config: "made-up.config.ts",
      })
    })

    it("--no-color is carried", () => {
      expect(parseCli(["--no-color", "check"])).toMatchObject({
        noColor: true,
      })
    })

    it("--explain and --explain-only ride check", () => {
      expect(parseCli(["check", "--explain"])).toMatchObject({
        action: { explain: true, explainOnly: false },
      })
      expect(parseCli(["check", "--explain-only"])).toMatchObject({
        action: { explain: false, explainOnly: true },
      })
    })
  })

  describe("usage errors — exit 2 material, teaching messages", () => {
    const errorOf = (argv: string[]): string => {
      const parsed = parseCli(argv)
      if (!("error" in parsed)) throw new Error("expected a usage error")
      return parsed.error
    }

    it("unknown command names the valid commands", () => {
      const message = errorOf(["frobnicate"])
      expect(message).toContain("frobnicate")
      expect(message).toContain("check")
      expect(message).toContain("explain")
    })

    it("unknown check names the known set", () => {
      const message = errorOf(["check", "SOME_MADE_UP_CHECK"])
      expect(message).toContain("SOME_MADE_UP_CHECK")
      for (const check of KNOWN_CHECKS) expect(message).toContain(check)
    })

    it("unknown flag is a usage error", () => {
      expect(errorOf(["--some-made-up-flag"])).toContain("--some-made-up-flag")
    })

    it("explain without a topic, or with several, is a usage error", () => {
      expect(errorOf(["explain"])).toContain("topic")
      expect(errorOf(["explain", "rule-4", "rule-5"])).toContain("one topic")
    })

    it("--explain outside check is a usage error", () => {
      expect(errorOf(["--explain"])).toContain("--explain")
      expect(errorOf(["explain", "rule-4", "--explain-only"])).toContain(
        "--explain-only",
      )
    })

    it("--explain with --explain-only is contradictory", () => {
      const message = errorOf(["check", "--explain", "--explain-only"])
      expect(message).toContain("--explain")
      expect(message).toContain("--explain-only")
    })
  })
})

describe("rulesForTopic", () => {
  it("resolves rule-N and bare N to the rule", () => {
    expect(rulesForTopic("rule-4")).toEqual([4])
    expect(rulesForTopic("4")).toEqual([4])
    expect(rulesForTopic(`rule-${RULE_COUNT}`)).toEqual([RULE_COUNT])
  })

  it("resolves a check name to the rules it cites", () => {
    expect(rulesForTopic("layers")).toEqual(CHECK_RULES.layers)
    expect(rulesForTopic("ports")).toEqual([10])
  })

  it("rejects out-of-range rules and unknown topics", () => {
    expect(rulesForTopic("rule-0")).toBeNull()
    expect(rulesForTopic(`rule-${RULE_COUNT + 1}`)).toBeNull()
    expect(rulesForTopic("0")).toBeNull()
    expect(rulesForTopic("rule-04")).toBeNull()
    expect(rulesForTopic("SOME_MADE_UP_TOPIC")).toBeNull()
  })
})

describe("CHECK_RULES", () => {
  it("pins the detector↔rule map, every rule in range", () => {
    expect(CHECK_RULES).toEqual({
      dag: [13, 14],
      layers: [1, 4, 5, 6, 7, 8, 9],
      private: [12],
      barrels: [2],
      ports: [10],
    })
    for (const rules of Object.values(CHECK_RULES)) {
      for (const rule of rules) {
        expect(rule).toBeGreaterThanOrEqual(1)
        expect(rule).toBeLessThanOrEqual(RULE_COUNT)
      }
    }
  })

  it("keys are exactly the known checks", () => {
    expect(Object.keys(CHECK_RULES)).toEqual([...KNOWN_CHECKS])
  })
})
