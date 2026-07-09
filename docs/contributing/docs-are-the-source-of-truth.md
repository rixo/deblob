# Docs are the source of truth — everything else is a derived view

Read this before touching `docs/` or `skills/`: it defines which file you edit
when a rule changes, and what happens if you pick wrong. Its companion,
[prompt-optimized authoring](./prompt-optimized-authoring.md), defines the
register the agent-facing side is written in.

## The model

- **`docs/`** is the human narrative and the **single source of truth** —
  theory, guide, methodology.
- **Skill cards** (`skills/*/references/`) and **knowledge cards**
  (`skills/*/knowledge/`) are **derived views**: the same rules distilled for
  agents, each stamped with its provenance — a machine-parseable frontmatter
  line (`source: docs/… § …`).
- Derived views **never evolve on their own**. A view that contradicts its
  source is a bug in the view, always.

## The protocol

1. A rule changes → the change lands in `docs/` first.
2. The change propagates to every view whose provenance stamp covers the touched
   section (grep the stamps).
3. Propagation is part of the same change — not a follow-up. A review that
   accepts 1 without 2 accepts a lie in the skill.

## Why views at all (and not just pointers)

Agents mid-task read targeted, situation-sized material. Recall degrades as
context grows (the model's attention budget depletes — Anthropic calls it
context rot), and retrieval is weakest for content in the middle of long inputs
(Liu et al.) — so pointing an agent at a whole document to answer one situated
question both costs and misses. SSOT survives by **derivation direction**, not
by abstinence from copies. Staleness between source and views is mechanically
checkable (planned with the CLI).

## References

- Liu et al. (2023),
  [Lost in the Middle: How Language Models Use Long Contexts](https://arxiv.org/abs/2307.03172)
  (TACL) — performance degrades significantly when relevant information sits in
  the middle of long contexts.
- Anthropic,
  [Effective context engineering for AI agents](https://www.anthropic.com/engineering/effective-context-engineering-for-ai-agents)
  — recall accuracy decreases as context grows; recommends just-in-time loading
  of targeted context over exhaustive upfront loading.
