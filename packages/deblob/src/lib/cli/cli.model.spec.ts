import { describe, expect, test } from "vitest"

import { RULE_IDS } from "../check/rule.model.ts"
import {
  CHECK_RULES,
  KNOWN_CHECKS,
  isRuleNumber,
  parseCli,
  rulesForTopic,
} from "./cli.model.ts"

describe("parseCli", () => {
  describe("commands", () => {
    test("bare argv is the status command", () => {
      expect(parseCli([])).toEqual({
        config: null,
        noColor: false,
        action: { command: "status" },
      })
    })

    test("check with no names runs every known check", () => {
      expect(parseCli(["check"])).toEqual({
        config: null,
        noColor: false,
        action: {
          command: "check",
          checks: KNOWN_CHECKS,
          explicit: false,
          explain: false,
          explainOnly: false,
        },
      })
    })

    test("check with names runs that subset, argv order kept; `explicit` records that check names were passed on the command line rather than defaulted", () => {
      expect(parseCli(["check", "ports", "layers"])).toMatchObject({
        action: {
          command: "check",
          checks: ["ports", "layers"],
          explicit: true,
        },
      })
    })

    test("explain takes one or many topics — the check footer is pasteable", () => {
      expect(parseCli(["explain", "service-purity"])).toMatchObject({
        action: { command: "explain", topics: ["service-purity"] },
      })
      expect(
        parseCli(["explain", "layer-in-path", "blob-quarantine", "ports"]),
      ).toMatchObject({
        action: {
          command: "explain",
          topics: ["layer-in-path", "blob-quarantine", "ports"],
        },
      })
    })
  })

  describe("flags", () => {
    test("--help and -h yield the help screen from anywhere", () => {
      expect(parseCli(["--help"])).toMatchObject({
        action: { command: "help" },
      })
      expect(parseCli(["-h"])).toMatchObject({ action: { command: "help" } })
    })

    test("check --help yields the check help screen", () => {
      expect(parseCli(["check", "--help"])).toMatchObject({
        action: { command: "check-help" },
      })
    })

    test("--version and -v print the version", () => {
      expect(parseCli(["--version"])).toMatchObject({
        action: { command: "version" },
      })
      expect(parseCli(["-v"])).toMatchObject({
        action: { command: "version" },
      })
    })

    test("-c / --config carries the explicit config path", () => {
      expect(parseCli(["-c", "some/made-up.config.ts", "check"])).toMatchObject(
        { config: "some/made-up.config.ts" },
      )
      expect(parseCli(["--config", "made-up.config.ts"])).toMatchObject({
        config: "made-up.config.ts",
      })
    })

    test("--no-color is carried", () => {
      expect(parseCli(["--no-color", "check"])).toMatchObject({
        noColor: true,
      })
    })

    test("--explain and --explain-only ride check", () => {
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

    test("unknown command names the valid commands", () => {
      const message = errorOf(["frobnicate"])
      expect(message).toContain("frobnicate")
      expect(message).toContain("check")
      expect(message).toContain("explain")
    })

    test("unknown check names the known set", () => {
      const message = errorOf(["check", "SOME_MADE_UP_CHECK"])
      expect(message).toContain("SOME_MADE_UP_CHECK")
      for (const check of KNOWN_CHECKS) expect(message).toContain(check)
    })

    test("unknown flag is a usage error", () => {
      expect(errorOf(["--some-made-up-flag"])).toContain("--some-made-up-flag")
    })

    test("explain without a topic is a usage error", () => {
      expect(errorOf(["explain"])).toContain("topic")
    })

    test("--explain outside check is a usage error", () => {
      expect(errorOf(["--explain"])).toContain("--explain")
      expect(
        errorOf(["explain", "service-purity", "--explain-only"]),
      ).toContain("--explain-only")
    })

    test("--explain with --explain-only is contradictory", () => {
      const message = errorOf(["check", "--explain", "--explain-only"])
      expect(message).toContain("--explain")
      expect(message).toContain("--explain-only")
    })
  })
})

describe("rulesForTopic", () => {
  test("resolves a slug to the rule — every one in the list", () => {
    expect(rulesForTopic("service-purity")).toEqual(["service-purity"])
    for (const id of RULE_IDS) expect(rulesForTopic(id)).toEqual([id])
  })

  test("resolves a check name to the rules it cites", () => {
    expect(rulesForTopic("layers")).toEqual(CHECK_RULES.layers)
    expect(rulesForTopic("ports")).toEqual(["ports-types-only"])
  })

  test("rejects numbers (the 0.0.4 grammar), slug-shaped strangers, and anything else", () => {
    expect(rulesForTopic("4")).toBeNull()
    expect(rulesForTopic("rule-4")).toBeNull()
    expect(rulesForTopic("some-made-up-rule")).toBeNull()
    expect(rulesForTopic("SOME_MADE_UP_TOPIC")).toBeNull()
  })
})

describe("isRuleNumber", () => {
  test("spots the old citation forms, nothing else", () => {
    expect(isRuleNumber("4")).toBe(true)
    expect(isRuleNumber("rule-4")).toBe(true)
    expect(isRuleNumber("999")).toBe(true)
    expect(isRuleNumber("service-purity")).toBe(false)
    expect(isRuleNumber("rule-x")).toBe(false)
    expect(isRuleNumber("SOME_MADE_UP_TOPIC")).toBe(false)
  })
})

describe("CHECK_RULES", () => {
  test("pins the detector↔rule map", () => {
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
      ],
      private: ["private-sealed"],
      barrels: ["layer-in-path"],
      ports: ["ports-types-only"],
      surface: ["layer-in-path", "chain-purity"],
    })
  })

  test("keys are exactly the known checks", () => {
    expect(Object.keys(CHECK_RULES)).toEqual([...KNOWN_CHECKS])
  })

  test("no rule slug collides with a check name — the topic grammar resolves checks first", () => {
    for (const id of RULE_IDS) {
      expect(KNOWN_CHECKS as readonly string[]).not.toContain(id)
    }
  })
})
