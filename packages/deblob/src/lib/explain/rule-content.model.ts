/**
 * Rule content — one rule id to what `deblob explain` teaches about it: the
 * knowledge cards (editorial), the pinned URL, and the parser that reads a
 * rule's entry out of architecture.md § Summary. Identity lives with its
 * producers, in `check/rule.model.ts`; this is the explain-side companion.
 *
 * Card paths are relative to the package's `content/` dir, which mirrors the
 * repo layout so verbatim copies keep their relative cross-links resolvable.
 */

import type { RuleId } from "../check/rule.model.ts"

/** One shipped knowledge card, resolved for printing. */
export type ExplainCard = { slug: string; text: string }

/** One rule's teaching bundle — what `deblob explain` renders. */
export type ExplainEntry = {
  rule: RuleId
  title: string
  body: string
  cards: readonly ExplainCard[]
  url: string
}

const card = (name: string): string => `skills/deblob/knowledge/${name}.md`

/**
 * Hand-authored on purpose: which card explains a rule is editorial judgment —
 * nothing to derive it from. Total over `RuleId` by construction (the record
 * type); the knowledge INDEX's Rules column is tested against it, so drift in
 * either direction fails the suite.
 */
export const RULE_CARDS: Readonly<Record<RuleId, readonly string[]>> = {
  "inward-deps": [card("dependency-matrix")],
  "layer-in-path": [card("dependency-matrix")],
  "chain-purity": [card("dependency-matrix")],
  "service-purity": [card("dependency-matrix")],
  "blob-quarantine": [card("dependency-matrix")],
  "service-assembly-only": [card("composition-rules")],
  "adapter-assembly-only": [card("composition-rules")],
  "type-only-exempt": [card("composition-rules")],
  "private-exempt": [card("composition-rules")],
  "ports-types-only": [card("composition-rules")],
  "unified-port": [card("composition-rules")],
  "private-sealed": [card("packaging-visibility")],
  "no-service-cycle": [card("acyclic")],
  "no-runtime-cycle": [card("acyclic")],
  "test-through-contract": [card("testing-contract")],
  "test-setup-assembly": [card("testing-isolation")],
  // service discipline — no v0 detector cites it, but the mapping stays
  // total over the summary so a stray citation still resolves
  "stateless-modules": [card("layer-service")],
}

/**
 * The rule's full text, pinned to the binary's own release tag so a shipped
 * citation survives main drift. `version` is the package's — the bin reads it
 * for `--version` and hands it down. A dev build cites a tag that does not
 * exist yet; the release flow tags before it publishes, so every published
 * binary's URLs resolve.
 */
export const canonicalRuleUrl = (rule: RuleId, version: string): string =>
  `https://github.com/rixo/deblob/blob/v${version}/docs/architecture.md#${rule}`

/**
 * Relative md link targets of a card (fragment links excluded) — the edges the
 * build's closure copy and the link-integrity test both walk.
 */
export const collectMdLinks = (markdown: string): string[] =>
  [...markdown.matchAll(/\]\(([^)#]+\.md)\)/g)].map(
    (match) => match[1] as string,
  )

export type RuleSummary = { title: string; body: string }

/**
 * One rule's entry out of the shipped rules-summary excerpt: located by its
 * slug anchor, `title` from the bold span (trailing period dropped — the
 * explain heading recases it), `body` the rest, whitespace collapsed, the
 * anchor, the leading slug token and inline-link syntax stripped.
 */
export const ruleSummaryOf = (summaryMd: string, rule: RuleId): RuleSummary => {
  const lines = summaryMd.split("\n")
  const anchor = `<a id="${rule}"></a>`
  const start = lines.findIndex((line) => line.includes(anchor))
  if (start === -1) {
    throw new Error(`rules summary has no anchor for ${rule}`)
  }
  const end = lines.findIndex(
    // the next entry or a family header, both at column 0 — a wrapped line
    // is indented, even when it opens with the bold title
    (line, index) => index > start && /^(?:- |\*\*)/.test(line),
  )
  const text = lines
    .slice(start, end === -1 ? lines.length : end)
    .join(" ")
    .replace(/^\s*-\s*/, "")
    .replace(anchor, "")
    .replace(/^\s*`[a-z-]+`\s*—\s*/, "")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/\s+/g, " ")
    .trim()
  const match = /^\*\*(.+?)\*\*\s*(?:—\s*)?(.*)$/s.exec(text)
  if (!match) {
    throw new Error(`${rule} summary entry has no bold title`)
  }
  return {
    title: (match[1] as string).replace(/\.$/, "").trim(),
    body: (match[2] as string).trim(),
  }
}

/**
 * The § Summary section of architecture.md, verbatim — the per-rule text source
 * shipped as `content/docs/rules-summary.md`. Shared by the sync-content script
 * and the sync test.
 */
export const extractRulesSummary = (architectureMd: string): string => {
  const lines = architectureMd.split("\n")
  const start = lines.findIndex((line) => line.trim() === "### Summary")
  if (start === -1) {
    throw new Error("architecture.md has no '### Summary' section")
  }
  const end = lines.findIndex(
    (line, index) => index > start && line.startsWith("## "),
  )
  return lines.slice(start, end === -1 ? lines.length : end).join("\n")
}
