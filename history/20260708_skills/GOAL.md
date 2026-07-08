# Skills — the flight manual, materialized

Make the methodology executable by agents: four skills shipping in the repo's
plugin channel, each one a lookup-grade flight manual for its surface — judgment
rules only, mechanical rules stay with the CLI (sdd §6).

- `deblob` — architecture daily rules (step 00, flagship);
- `deblob-commit` — level-0 commit grammar + NOTABLE/META calibration;
- `deblob-review` — pre-checkpoint self-review (absorbs
  `docs/self-review-checklist.md`, then tombstones it). **Honest status:
  sparsely defined by nature** — v0 is the checklist; the real list grows by
  harvesting REDs from usage into "questions to ask". And "self" is under
  suspicion: adversarial review by fresh subagents (possibly other models)
  plausibly beats self-review; the `deblob` cards double as their focused crash
  courses, the main agent arbitrates. That architecture is anticipated, not
  built here;
- `deblob-sdd` — specs and history conventions.

Authoring per superpowers' writing-skills method (MIT): SKILL.md under ~500
words, trigger-only `description: Use when…`, rationalization tables seeded from
our documented agent failures (each step's SPEC lists its RED material).
Companion reference files for anything heavy; skills point at `docs/` for the
why — never duplicate it (two-axis hygiene).

Skills are complete operational distillations — the flight manual proper. Docs
are pointed at for the _why_ only; every ground rule an agent needs lives in the
skill (level-3 bar: all correct decisions on the ground without the full
vision).

Exit for the chapter: all four skills load from the **local** plugin (no
publication or listing anywhere — confidence before marketing), each passes
manual spot-runs of its scenarios (with-skill compliance on cases where the
no-skill baseline demonstrably fails), README skills row flips from _planned_.
