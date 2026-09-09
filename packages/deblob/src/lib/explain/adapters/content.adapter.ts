/**
 * Reads the shipped teaching content (dist/content, built by build-content)
 * into explain entries. `contentRoot` is injected: the bin anchors it next to
 * its own compiled location, tests point at fixtures. `version` is the binary's
 * own — the URL each entry prints is pinned to its release tag.
 */

import { readFileSync } from "node:fs"
import { join } from "node:path"

import type { RuleId } from "../../check/rule.model.ts"
import type { ExplainEntry } from "../rule-content.model.ts"
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
  version,
}: {
  contentRoot: string
  rules: readonly RuleId[]
  version: string
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
      cards: RULE_CARDS[rule].map((cardPath) => ({
        slug: slugOf(cardPath),
        text: readFileSync(join(contentRoot, cardPath), "utf8"),
      })),
      url: canonicalRuleUrl(rule, version),
    }
  })
}
