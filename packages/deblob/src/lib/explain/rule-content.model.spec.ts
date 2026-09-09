import { existsSync, readFileSync } from "node:fs"
import { join, posix } from "node:path"
import { fileURLToPath } from "node:url"
import { describe, expect, test } from "vitest"

import { RULE_IDS } from "../check/rule.model.ts"
import {
  RULE_CARDS,
  canonicalRuleUrl,
  collectMdLinks,
  extractRulesSummary,
  ruleSummaryOf,
} from "./rule-content.model.ts"

const repoRoot = fileURLToPath(new URL("../../../../..", import.meta.url))

const architectureMd = () =>
  readFileSync(join(repoRoot, "docs/architecture.md"), "utf8")

describe("rule mapping", () => {
  test("is total over the rule list, every rule with at least one card", () => {
    expect(Object.keys(RULE_CARDS).sort()).toEqual([...RULE_IDS].sort())
    for (const id of RULE_IDS) {
      expect(RULE_CARDS[id].length, id).toBeGreaterThan(0)
    }
  })

  test("names only cards that exist in the repo", () => {
    for (const cards of Object.values(RULE_CARDS)) {
      for (const cardPath of cards) {
        expect(existsSync(join(repoRoot, cardPath)), cardPath).toBe(true)
      }
    }
  })

  test("pins the rule's URL to the binary's own release tag", () => {
    expect(canonicalRuleUrl("service-purity", "0.0.5")).toBe(
      "https://github.com/rixo/deblob/blob/v0.0.5/docs/architecture.md#service-purity",
    )
  })
})

describe("architecture.md anchors", () => {
  test("carries a slug anchor for every rule, in the list's order, and no numbered one", () => {
    const summary = extractRulesSummary(architectureMd())
    const positions = RULE_IDS.map((id) => {
      const at = summary.indexOf(`<a id="${id}"></a>`)
      expect(at, id).toBeGreaterThan(-1)
      return at
    })
    expect(positions).toEqual([...positions].sort((a, b) => a - b))
    expect(summary).not.toMatch(/<a id="rule-\d+">/)
  })

  test("throws loudly when the summary section is missing", () => {
    expect(() => extractRulesSummary("# nothing here")).toThrow(
      /no '### Summary' section/,
    )
  })

  test("extracts to end of document when the summary is the last section", () => {
    expect(extractRulesSummary("intro\n### Summary\n- rule")).toBe(
      "### Summary\n- rule",
    )
  })
})

describe("ruleSummaryOf", () => {
  const summary = [
    "### Summary",
    "",
    "**Layer rules:**",
    "",
    '- <a id="inward-deps"></a>`inward-deps` — **Some made-up first rule** —',
    "  body of the first rule, wrapped",
    "  across lines.",
    '- <a id="layer-in-path"></a>`layer-in-path` —',
    "  **Title with trailing period inside bold.** Body",
    "  with a [link label](#fragment) stripped to its text.",
    "",
    "**Another section:**",
    "",
    '- <a id="chain-purity"></a>`chain-purity` — **Last rule** — last body.',
  ].join("\n")

  test("splits title from body, joins the wrap, strips the anchor and the slug token", () => {
    expect(ruleSummaryOf(summary, "inward-deps")).toEqual({
      title: "Some made-up first rule",
      body: "body of the first rule, wrapped across lines.",
    })
  })

  test("drops the title's trailing period and inline-link syntax", () => {
    expect(ruleSummaryOf(summary, "layer-in-path")).toEqual({
      title: "Title with trailing period inside bold",
      body: "Body with a link label stripped to its text.",
    })
  })

  test("reads an entry ended by a section header or end of text", () => {
    expect(ruleSummaryOf(summary, "chain-purity").body).toBe("last body.")
  })

  test("throws on a missing anchor", () => {
    expect(() => ruleSummaryOf(summary, "stateless-modules")).toThrow(
      /no anchor for stateless-modules/,
    )
  })

  test("throws on an entry without a bold title", () => {
    expect(() =>
      ruleSummaryOf(
        '- <a id="blob-quarantine"></a>`blob-quarantine` — no bold here',
        "blob-quarantine",
      ),
    ).toThrow(/no bold title/)
  })

  test("parses every real rule out of the shipped excerpt", () => {
    const real = extractRulesSummary(architectureMd())
    for (const id of RULE_IDS) {
      const entry = ruleSummaryOf(real, id)
      expect(entry.title.length, id).toBeGreaterThan(0)
      expect(entry.body.length, id).toBeGreaterThan(0)
      expect(entry.body).not.toContain("<a id=")
      expect(entry.title, id).not.toMatch(/^`[a-z-]+`/)
    }
  })
})

describe("card links", () => {
  test("collects relative md targets, ignoring fragment links", () => {
    const links = collectMdLinks(
      "see [a](other.md) and [b](../up/two.md) and [c](#anchor) and [d](https://x.test/page)",
    )
    expect(links).toEqual(["other.md", "../up/two.md"])
  })

  test("form a closed set from the mapped cards — the shipped closure has no dead pointers", () => {
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

describe("knowledge INDEX rule names", () => {
  test("lists every rule's slug on its card's row", () => {
    const index = readFileSync(
      join(repoRoot, "skills/deblob/knowledge/INDEX.md"),
      "utf8",
    )
    const rows = [
      "dependency-matrix",
      "composition-rules",
      "packaging-visibility",
      "acyclic",
      "testing-contract",
      "testing-isolation",
    ]
    for (const cardName of rows) {
      const row = index
        .split("\n")
        .find((line) => line.includes(`[${cardName}]`))
      expect(row, cardName).toBeDefined()
      const cited = RULE_IDS.filter((id) =>
        RULE_CARDS[id].some((path) => path.endsWith(`/${cardName}.md`)),
      )
      expect(cited.length, cardName).toBeGreaterThan(0)
      for (const id of cited) {
        expect(row, `${cardName} ← ${id}`).toContain(`\`${id}\``)
      }
    }
  })
})
