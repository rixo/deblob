/**
 * Rule-number resolution — one mapping, two consumers: the knowledge INDEX
 * rule-range column and the `deblob explain` lookup (CLI step). Rule numbers
 * are architecture.md § Summary's numbering; anchors `#rule-N` live there.
 *
 * Card paths are relative to the package's `content/` dir, which mirrors the
 * repo layout so verbatim copies keep their relative cross-links resolvable.
 */

const card = (name: string): string => `skills/deblob/knowledge/${name}.md`

export const RULE_COUNT = 17

/**
 * Hand-authored on purpose: which card explains a rule is editorial judgment —
 * nothing to derive it from (anchors carry numbers, not card assignments). This
 * mapping is the single source of truth; the knowledge INDEX's Rules column is
 * tested against it, and the spec enforces totality over 1–RULE_COUNT and an
 * anchor per rule, so drift in any direction fails the suite.
 */
export const RULE_CARDS: Readonly<Record<number, readonly string[]>> = {
  1: [card("dependency-matrix")],
  2: [card("dependency-matrix")],
  3: [card("dependency-matrix")],
  4: [card("dependency-matrix")],
  5: [card("dependency-matrix")],
  6: [card("composition-rules")],
  7: [card("composition-rules")],
  8: [card("composition-rules")],
  9: [card("composition-rules")],
  10: [card("composition-rules")],
  11: [card("composition-rules")],
  12: [card("packaging-visibility")],
  13: [card("acyclic")],
  14: [card("acyclic")],
  15: [card("testing-contract")],
  16: [card("testing-isolation")],
  // service discipline — no v0 detector cites it, but the mapping stays
  // total over the summary's numbering so a stray citation still resolves
  17: [card("layer-service")],
}

// `main` until first publish — released versions should pin their own tag so
// shipped citations survive main drift (PLAN § Future).
export const canonicalRuleUrl = (rule: number): string =>
  `https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-${rule}`

/**
 * Relative md link targets of a card (fragment links excluded) — the edges the
 * build's closure copy and the link-integrity test both walk.
 */
export const collectMdLinks = (markdown: string): string[] =>
  [...markdown.matchAll(/\]\(([^)#]+\.md)\)/g)].map(
    (match) => match[1] as string,
  )

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
