---
source: docs/sdd.md §3 ("Two kinds of moves", "Support docs")
---

# Moves and support docs

Every step is one of two kinds of **move** (kinds identified so far):

- **Implementation** — most steps. Fully standardized: the quintet, fractal,
  recursive, no variants ([ladder](ladder.md)).
- **Research** — sometimes needed before an implementation step. Free-form:
  collects knowledge into its own file or directory and **changes nothing
  outside itself** — that containment is the definition, not a guideline. A real
  numbered step (the exploration happened there in the chronology), but not
  directly implementable: no quality gates constrained it; it turns open ground
  into input for a later implementation step, which runs under full gates,
  always.

**Support docs** — allowed alongside steps at any scale; they serve the work
without advancing it:

- **Scratch** — PLAN.md, WIP notes; churns, cleaned at consolidation.
- **META** — the methodology log ([meta](meta.md)).
- Whatever else a chapter genuinely needs, named for what it is.

**Named recurring support sections** (standardize, don't rediscover):

- `## Decisions` — rulings logged so they aren't re-debated (rejected options
  included).
- `## Open questions` / `## Out of scope` — deferred-work pointers: named,
  parked, not lost.
- `## Commits` — the hashes that implemented the spec, closing the loop to
  level 0.
