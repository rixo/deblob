/**
 * Reads the shipped teaching content (dist/content, built by build-content)
 * into explain entries. `contentRoot` is injected: the bin anchors it next to
 * its own compiled location, tests point at fixtures. `version` is the binary's
 * own — the URL each entry prints is pinned to its release tag. The disk is the
 * fs port's; content the build promised and did not ship is a broken package,
 * loud.
 */

import { join } from "node:path"

import type { RuleId } from "../../check/rule.model.ts"
import type { Fs } from "../../fs/fs.port.ts"
import type { ExplainEntry } from "../rule-content.model.ts"
import {
  RULE_CARDS,
  canonicalRuleUrl,
  ruleSummaryOf,
} from "../rule-content.model.ts"

const slugOf = (cardPath: string): string =>
  (cardPath.split("/").pop() as string).replace(/\.md$/, "")

export const createContentReader = ({ fs }: { fs: Pick<Fs, "readFile"> }) => {
  const shipped = async (path: string): Promise<string> => {
    const text = await fs.readFile(path)
    if (text === null) throw new Error(`shipped content missing: ${path}`)
    return text
  }

  const readExplainEntries = async ({
    contentRoot,
    rules,
    version,
  }: {
    contentRoot: string
    rules: readonly RuleId[]
    version: string
  }): Promise<ExplainEntry[]> => {
    const summary = await shipped(join(contentRoot, "docs/rules-summary.md"))
    return Promise.all(
      rules.map(async (rule) => {
        const { title, body } = ruleSummaryOf(summary, rule)
        return {
          rule,
          title,
          body,
          cards: await Promise.all(
            RULE_CARDS[rule].map(async (cardPath) => ({
              slug: slugOf(cardPath),
              text: await shipped(join(contentRoot, cardPath)),
            })),
          ),
          url: canonicalRuleUrl(rule, version),
        }
      }),
    )
  }

  return { readExplainEntries }
}
