# explain

Rule numbers to teaching content, offline and version-matched with the binary.
Behind `deblob explain <topic...>` and `deblob check --explain`.

## API

- `rule-content.model.ts` — the one mapping with two consumers, the knowledge
  INDEX rule-range column and the CLI lookup. `RULE_COUNT` (17), `RULE_CARDS`
  (rule number → the knowledge cards that teach it, paths relative to the
  shipped `content/` directory, mirroring the repo layout so relative links keep
  resolving), `canonicalRuleUrl(rule)` (the `#rule-N` anchor in the architecture
  doc's Summary), `ruleSummaryOf(summaryMd, rule)` (title and body of one rule
  out of the summary excerpt), `extractRulesSummary` (the Summary section out of
  architecture.md), `collectMdLinks` (the link closure the build stage copies).
- `ExplainEntry` — rule, title, body, cards (slug and text), canonical URL: what
  `cli`'s `renderExplain` prints.

## Adapters

- `adapters/content.adapter.ts` — `readExplainEntries({ contentRoot, rules })`
  reads the shipped content into entries. `contentRoot` is injected: the bin
  anchors it at `dist/content` next to its own compiled location, tests point at
  fixtures.

The content itself is a build artifact: `scripts/build-content.ts` copies the
cards named by `RULE_CARDS` plus their link closure, and the architecture
Summary excerpt, into `dist/content` on `pnpm build` and on prepack. Nothing
under `dist/` is committed.

## What it does not do

No prose of its own: every sentence the user reads comes from the repo's
architecture doc and knowledge cards, verbatim. No network: the canonical URL is
printed, never fetched. No topic parsing: `rulesForTopic` lives in `cli`.
