/**
 * Reads the shipped teaching content (dist/content, built by build-content)
 * into explain entries. `contentRoot` is injected: the bin anchors it next to
 * its own compiled location, tests point at fixtures.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { ExplainEntry } from "../../cli/render.model.ts"
import {
  RULE_CARDS,
  canonicalRuleUrl,
  ruleSummaryOf,
} from "../rule-content.model.ts"

const slugOf = (cardPath: string): string =>
  (cardPath.split("/").pop() as string).replace(/\.md$/, "")

export const readExplainEntries = ({
  contentRoot,
  rules,
}: {
  contentRoot: string
  rules: readonly number[]
}): ExplainEntry[] => {
  const summary = readFileSync(
    join(contentRoot, "docs/rules-summary.md"),
    "utf8",
  )
  return rules.map((rule) => {
    const { title, body } = ruleSummaryOf(summary, rule)
    return {
      rule,
      title,
      body,
      // mapping totality over 1–RULE_COUNT is spec-enforced; out-of-range
      // rules died on the summary lookup above
      cards: (RULE_CARDS[rule] as readonly string[]).map((cardPath) => ({
        slug: slugOf(cardPath),
        text: readFileSync(join(contentRoot, cardPath), "utf8"),
      })),
      url: canonicalRuleUrl(rule),
    }
  })
}
