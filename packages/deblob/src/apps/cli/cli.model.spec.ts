import { describe, expect, it, test } from "vitest"

import { CHECK_RULES, KNOWN_CHECKS } from "../../lib/check/checks.model.ts"
import { RULE_IDS } from "../../lib/check/rule.model.ts"
import { isRuleNumber, parseCli, rulesForTopic } from "./cli.model.ts"

describe("parseCli", () => {
  describe("commands", () => {
    it("reads bare argv as the status command", () => {
      expect(parseCli([])).toEqual({
        config: null,
        noColor: false,
        action: { command: "status" },
      })
    })

    it("selects every known check when none is named", () => {
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

    it("selects the checks named, in argv order, and marks them explicit", () => {
      expect(parseCli(["check", "ports", "layers"])).toMatchObject({
        action: {
          command: "check",
          checks: ["ports", "layers"],
          explicit: true,
        },
      })
    })

    it("takes one or many explain topics — the check footer is pasteable", () => {
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
    it("yields the help screen for --help and -h", () => {
      expect(parseCli(["--help"])).toMatchObject({
        action: { command: "help" },
      })
      expect(parseCli(["-h"])).toMatchObject({ action: { command: "help" } })
    })

    it("yields the check help screen for check --help", () => {
      expect(parseCli(["check", "--help"])).toMatchObject({
        action: { command: "check-help" },
      })
    })

    it("yields the version for --version and -v", () => {
      expect(parseCli(["--version"])).toMatchObject({
        action: { command: "version" },
      })
      expect(parseCli(["-v"])).toMatchObject({
        action: { command: "version" },
      })
    })

    it("carries the explicit config path from -c / --config", () => {
      expect(parseCli(["-c", "some/made-up.config.ts", "check"])).toMatchObject(
        { config: "some/made-up.config.ts" },
      )
      expect(parseCli(["--config", "made-up.config.ts"])).toMatchObject({
        config: "made-up.config.ts",
      })
    })

    it("carries --no-color", () => {
      expect(parseCli(["--no-color", "check"])).toMatchObject({
        noColor: true,
      })
    })

    it("accepts --explain and --explain-only on check", () => {
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

    it("names the valid commands for an unknown command", () => {
      const message = errorOf(["frobnicate"])
      expect(message).toContain("frobnicate")
      expect(message).toContain("check")
      expect(message).toContain("explain")
    })

    it("names the known set for an unknown check", () => {
      const message = errorOf(["check", "SOME_MADE_UP_CHECK"])
      expect(message).toContain("SOME_MADE_UP_CHECK")
      for (const check of KNOWN_CHECKS) expect(message).toContain(check)
    })

    it("reports an unknown flag as a usage error", () => {
      expect(errorOf(["--some-made-up-flag"])).toContain("--some-made-up-flag")
    })

    it("reports explain without a topic as a usage error", () => {
      expect(errorOf(["explain"])).toContain("topic")
    })

    it("reports --explain and --explain-only outside check as usage errors", () => {
      expect(errorOf(["--explain"])).toContain("--explain")
      expect(
        errorOf(["explain", "service-purity", "--explain-only"]),
      ).toContain("--explain-only")
    })

    it("rejects --explain with --explain-only as contradictory", () => {
      const message = errorOf(["check", "--explain", "--explain-only"])
      expect(message).toContain("--explain")
      expect(message).toContain("--explain-only")
    })
  })
})

describe("rulesForTopic", () => {
  it("resolves a slug to the rule — every one in the list", () => {
    expect(rulesForTopic("service-purity")).toEqual(["service-purity"])
    for (const id of RULE_IDS) expect(rulesForTopic(id)).toEqual([id])
  })

  it("resolves a check name to the rules it cites", () => {
    expect(rulesForTopic("layers")).toEqual(CHECK_RULES.layers)
    expect(rulesForTopic("ports")).toEqual(["ports-types-only"])
  })

  it("rejects numbers (the 0.0.4 grammar), slug-shaped strangers, and anything else", () => {
    expect(rulesForTopic("4")).toBeNull()
    expect(rulesForTopic("rule-4")).toBeNull()
    expect(rulesForTopic("some-made-up-rule")).toBeNull()
    expect(rulesForTopic("SOME_MADE_UP_TOPIC")).toBeNull()
  })
})

describe("isRuleNumber", () => {
  it("spots the old citation forms, nothing else", () => {
    expect(isRuleNumber("4")).toBe(true)
    expect(isRuleNumber("rule-4")).toBe(true)
    expect(isRuleNumber("999")).toBe(true)
    expect(isRuleNumber("service-purity")).toBe(false)
    expect(isRuleNumber("rule-x")).toBe(false)
    expect(isRuleNumber("SOME_MADE_UP_TOPIC")).toBe(false)
  })
})

describe("view", () => {
  test("the bare verb takes the default port", () => {
    expect(parseCli(["view"])).toEqual({
      config: null,
      noColor: false,
      action: { command: "view", port: null },
    })
  })

  test("--port names the port; 0 is the OS's any-free-port, not an error", () => {
    expect(parseCli(["view", "--port", "4000"])).toMatchObject({
      action: { command: "view", port: 4000 },
    })
    expect(parseCli(["view", "--port", "0"])).toMatchObject({
      action: { command: "view", port: 0 },
    })
  })

  test.each([
    ["not a number", "FAKE"],
    ["not whole", "80.5"],
    ["negative", "-1"],
    ["above the range", "65536"],
    ["padded", " 80 "],
    ["empty", ""],
  ])("--port %s is a usage error that teaches the range", (_case, value) => {
    // `--port=x`, not `--port x`: a value starting with a dash is parseArgs's
    // own refusal otherwise, and this pins ours
    expect(parseCli(["view", `--port=${value}`])).toEqual({
      error: `--port wants a whole number from 0 to 65535 (0 = any free port) — got "${value}"`,
    })
  })

  test("an argument is a usage error — the projects come from config", () => {
    expect(parseCli(["view", "../FAKE_DIR"])).toEqual({
      error:
        'view takes no arguments (got "../FAKE_DIR") — the projects it shows come from config, key view.projects',
    })
  })

  test("--port on another command teaches rather than being ignored", () => {
    expect(parseCli(["check", "--port", "4000"])).toEqual({
      error:
        "--port rides deblob view only (it is the port the viewer is served on)",
    })
  })
})

test("a check-only flag on view teaches too", () => {
  expect(parseCli(["view", "--explain"])).toEqual({
    error:
      "--explain rides deblob check only (it explains the rules that fired)",
  })
})
