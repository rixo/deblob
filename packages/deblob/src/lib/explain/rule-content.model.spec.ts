import { existsSync, readFileSync } from "node:fs"
import { join, posix } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, it } from "vitest"

import {
  RULE_CARDS,
  RULE_COUNT,
  canonicalRuleUrl,
  collectMdLinks,
  extractRulesSummary,
} from "./rule-content.model.ts"

const repoRoot = fileURLToPath(new URL("../../../../..", import.meta.url))

const architectureMd = () =>
  readFileSync(join(repoRoot, "docs/architecture.md"), "utf8")

describe("rule mapping", () => {
  it("is total over the summary's numbering, every rule with at least one card", () => {
    for (let rule = 1; rule <= RULE_COUNT; rule += 1) {
      expect(RULE_CARDS[rule], `rule ${rule}`).toBeDefined()
      expect(RULE_CARDS[rule]!.length).toBeGreaterThan(0)
    }
    expect(Object.keys(RULE_CARDS)).toHaveLength(RULE_COUNT)
  })

  it("names only cards that exist in the repo", () => {
    for (const cards of Object.values(RULE_CARDS)) {
      for (const cardPath of cards) {
        expect(existsSync(join(repoRoot, cardPath)), cardPath).toBe(true)
      }
    }
  })

  it("builds the canonical anchor URL for a rule", () => {
    expect(canonicalRuleUrl(4)).toBe(
      "https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-4",
    )
  })
})

describe("architecture.md anchors", () => {
  it("carries a #rule-N anchor for every rule of the summary", () => {
    const summary = extractRulesSummary(architectureMd())
    for (let rule = 1; rule <= RULE_COUNT; rule += 1) {
      expect(summary).toContain(`<a id="rule-${rule}"></a>`)
    }
  })

  it("throws loudly when the summary section is missing", () => {
    expect(() => extractRulesSummary("# nothing here")).toThrow(
      /no '### Summary' section/,
    )
  })

  it("extracts to end of document when the summary is the last section", () => {
    expect(extractRulesSummary("intro\n### Summary\n1. rule")).toBe(
      "### Summary\n1. rule",
    )
  })
})

describe("card links", () => {
  it("collects relative md targets, ignoring fragment links", () => {
    const links = collectMdLinks(
      "see [a](other.md) and [b](../up/two.md) and [c](#anchor) and [d](https://x.test/page)",
    )
    expect(links).toEqual(["other.md", "../up/two.md"])
  })

  it("form a closed set from the mapped cards — the shipped closure has no dead pointers", () => {
    const seen = new Set<string>()
    const queue = Object.values(RULE_CARDS).flat()
    while (queue.length > 0) {
      const path = queue.shift() as string
      if (seen.has(path)) continue
      seen.add(path)
      expect(existsSync(join(repoRoot, path)), path).toBe(true)
      const source = readFileSync(join(repoRoot, path), "utf8")
      for (const target of collectMdLinks(source)) {
        queue.push(posix.normalize(posix.join(posix.dirname(path), target)))
      }
    }
    expect(seen.size).toBeGreaterThan(0)
  })
})

describe("knowledge INDEX rule ranges", () => {
  it("shows each mapped range on its card's row", () => {
    const index = readFileSync(
      join(repoRoot, "skills/deblob/knowledge/INDEX.md"),
      "utf8",
    )
    const rows: [card: string, range: string][] = [
      ["dependency-matrix", "1–5"],
      ["composition-rules", "6–11"],
      ["packaging-visibility", "12"],
      ["acyclic", "13–14"],
      ["testing-contract", "15"],
      ["testing-isolation", "16"],
    ]
    for (const [cardName, range] of rows) {
      const row = index
        .split("\n")
        .find((line) => line.includes(`[${cardName}]`))
      expect(row, cardName).toBeDefined()
      expect(row, cardName).toContain(range)
    }
  })
})
