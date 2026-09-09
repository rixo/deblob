import { describe, expect, test } from "vitest"

import { RULE_IDS, isRuleId, ruleOrder } from "./rule.model.ts"

describe("RULE_IDS", () => {
  test("lists the seventeen rules of the summary, each once", () => {
    expect(RULE_IDS).toHaveLength(17)
    expect(new Set(RULE_IDS).size).toBe(RULE_IDS.length)
  })

  test("every id follows the slug grammar — two or three kebab words", () => {
    for (const id of RULE_IDS) {
      expect(id).toMatch(/^[a-z]+(-[a-z]+){1,2}$/)
    }
  })
})

describe("isRuleId", () => {
  test("accepts a listed slug, rejects anything else", () => {
    expect(isRuleId("service-purity")).toBe(true)
    expect(isRuleId("SOME_MADE_UP_RULE")).toBe(false)
    expect(isRuleId("rule-4")).toBe(false)
    expect(isRuleId("4")).toBe(false)
  })
})

describe("ruleOrder", () => {
  test("is the summary's display order — layer rules first, module discipline last", () => {
    expect(ruleOrder("inward-deps")).toBe(0)
    expect(ruleOrder("stateless-modules")).toBe(RULE_IDS.length - 1)
    expect(ruleOrder("no-service-cycle")).toBeLessThan(
      ruleOrder("no-runtime-cycle"),
    )
  })
})
