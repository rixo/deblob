# explain

Rule names to teaching content, offline and version-matched with the binary.
Behind `deblob explain <topic...>` and `deblob check --explain`. Rule identity
(`RULE_IDS`, `RuleId`) lives with its producers in `check/rule.model.ts`; this
is the explain-side companion.

## API

- `rule-content.model.ts` — the one mapping with two consumers, the knowledge
  INDEX rules column and the CLI lookup. `RULE_CARDS` (rule slug → the knowledge
  cards that teach it, total over `RuleId` by type; paths relative to the
  shipped `content/` directory, mirroring the repo layout so relative links keep
  resolving), `canonicalRuleUrl(rule, version)` (the `#<slug>` anchor in the
  architecture doc's Summary, pinned to the binary's own release tag),
  `ruleSummaryOf(summaryMd, rule)` (title and body of one rule out of the
  summary excerpt, located by its slug anchor), `extractRulesSummary` (the
  Summary section out of architecture.md), `collectMdLinks` (the link closure
  the build stage copies).
- `ExplainEntry` — rule, title, body, cards (slug and text), canonical URL: what
  `cli`'s `renderExplain` prints.

## Adapters

- `adapters/content.adapter.ts` —
  `readExplainEntries({ contentRoot, rules, version })` reads the shipped
  content into entries. `contentRoot` is injected: the bin anchors it at
  `dist/content` next to its own compiled location, tests point at fixtures.
  `version` is the binary's own, for the pinned URL.

The content itself is a build artifact: `scripts/build-content.ts` copies the
cards named by `RULE_CARDS` plus their link closure, and the architecture
Summary excerpt, into `dist/content` on `pnpm build` and on prepack. Nothing
under `dist/` is committed.

## What it does not do

No prose of its own: every sentence the user reads comes from the repo's
architecture doc and knowledge cards, verbatim. No network: the canonical URL is
printed, never fetched. No topic parsing: `rulesForTopic` lives in `cli`.
