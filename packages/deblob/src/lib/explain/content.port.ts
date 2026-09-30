/**
 * The shipped teaching content, read by rule: its summary, verdicts and cards,
 * each entry's URL pinned to `version`. `contentRoot` is where the build put
 * the content — the install's to say.
 */

import type { RuleId } from "../check/rule.model.ts"
import type { ExplainEntry } from "./rule-content.model.ts"

export interface ContentReader {
  readExplainEntries(options: {
    contentRoot: string
    rules: readonly RuleId[]
    version: string
  }): Promise<ExplainEntry[]>
}
