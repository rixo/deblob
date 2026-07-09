# Prompt-optimized authoring — writing for machine readers

Read this before writing or editing any agent-facing artifact: `SKILL.md` files,
reference cards (`skills/*/references/`), knowledge cards
(`skills/*/knowledge/`). It defines the register those files are written in, and
the verification pass that authoring is not complete without.

## The register split

- **`docs/`** is human-first narrative — explanation, rationale, room to
  breathe. This file is written in it.
- **Agent-facing artifacts** are prompt-optimized prose: imperative,
  situation-keyed, front-loaded, respectful of the reader-agent's context
  budget. The style itself is an instrument for compliance — an agent mid-task
  skims; what it must do has to survive the skim.

The split is deliberate. Neither register is allowed to leak into the other:
narrative flourish in a card wastes the reader-agent's attention budget;
compressed card-speak in `docs/` loses the human.

## The golden rules

1. **Every word and sentence intends to influence a behavior.** Stylistic
   elegance is a non-goal — hunt and kill flourishes. A sentence that reads
   beautifully but changes nothing about what the reader-agent does is dead
   weight wearing makeup.
2. **Token economy — but never at the cost of meaning or understanding.**
   Compression that drops the constraint is worse than verbosity.
3. **Double-check rule 2 every time.** It is all too easy to kill meaning by
   saving tokens. Authoring is two-pass by contract; the second pass runs the
   meaning-preservation check in both directions:
   - **flourish hunt** — rule 1 applied to what survived drafting;
   - **compression audit** — trace each compressed statement back to its source
     for lost constraints or instructions. Example of the failure: "— litmus."
     names the concept but drops the instruction; "run the litmus" keeps it.

One addendum, learned the hard way: **verify rationale truth, not just
compression.** A plausible-sounding rationale can be logically wrong while
reading fine (caught in practice: "a copied spec diverges" — commit messages are
frozen, so no; the real cost is duplication plus a stale-frozen copy). A wrong
rationale in a card doesn't just waste tokens — it teaches the reader-agent a
false generalization.

## Provenance

The register was set as the authoring contract of the skills chapter's step 00
(`history/20260708_skills/00_deblob/SPEC.md`, "Prose register") and reaffirmed
as the three rules above on 2026-07-09.

See also: [docs are the source of truth](./docs-are-the-source-of-truth.md) —
which file to edit when a rule changes; this file is about how to write it once
you know where.
