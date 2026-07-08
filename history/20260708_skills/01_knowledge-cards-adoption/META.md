# META — knowledge cards adoption

2026-07-08 — card authoring & corpus shape:

- **Provenance stamps ≠ narrative headers.** The parked doc-header-blockquote
  ruling conflated narrative fluff (killable) with provenance (load-bearing: the
  hook for staleness tooling and the SSOT contract). Ruling: narrative headers
  die; provenance lives as machine-parseable YAML frontmatter
  (`source: docs/… § …`) — data belongs in frontmatter, not in a styled quote.
- **Index by question beats index by topic.** Agents arrive holding a question,
  not a taxonomy. One flat question-index sufficed at 36 cards; sub-indexes
  added nothing (revisit past ~80 cards).
- **Cross-domain knowledge coupling is thinner than it feels.** Authoring
  suggested "one graph, not two"; measurement said 4 cross-domain links out of
  70 — feeling overstated it by an order of magnitude, and the measurement (one
  grep) settled a placement debate the narrative couldn't. Measure before
  architecting for sharing.
- **Compression is content-shaped.** Rule/table material compresses hard with
  zero loss (matrix, quintet, grammar). Narrative-argument material resists —
  the meaning-preservation pass vetoed ~30%-shorter drafts because the
  _argument_ is the content. Uniform compression targets are the wrong goal.
- **Cards must not cite history.** A card wanting empirical evidence from
  `history/META.md` surfaced the rule: evidence either graduates into docs (the
  META→docs harvest loop) or the citation goes — a derived view citing the
  history axis breaks the derivation contract and the staleness check.
- **Flavor leaks at card granularity.** Concept cards occasionally carry
  flavor-level detail; the arch/guide altitude boundary blurs when slicing this
  thin. Accepted pragmatically; revisit if `implem/` cards make it confusing.

2026-07-08 — research-move lifecycle (feeds sdd's unsettled "research-step
internal conventions"):

- **Research working docs dissolve at consolidation, like PLAN scratch.** The
  move used ad-hoc caps files (TRACKER, FINDINGS) — role-named but outside the
  caps-name family, a naming deviation. The knowledge migrated where sdd already
  says it goes: decisions → the fed implementation step's SPEC, methodology
  observations → META, open questions → SPEC/PLAN. Candidate convention: a
  research move needs no standing exit report — the implementation step it feeds
  IS the exit artifact.
- **A fully-adopted research move doesn't need to be its own step.** It first
  stood as a numbered step with record files; review collapsed it into the
  implementation step it fed (level-1 SPEC, META as this section — the placement
  ladder handled it). A research step earns standing when its output outlives or
  exceeds one implementation step; here everything it produced was consumed by
  the next move.
- **Adoption-bound artifacts should skip their research-home in git.**
  Committing 36 cards in a research dir, then `git mv`-ing them one step later,
  is churn without information. Chronology stays honest through the spec's
  narrative.
