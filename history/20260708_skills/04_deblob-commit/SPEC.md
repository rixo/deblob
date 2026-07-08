# Step 04 — the `deblob-commit` skill

## 1. Goals

An agent committing in a deblob-sdd repo produces level-0 specs: quintet body,
meaningful granularity, calibrated labels. RED targets: NOTABLE over-flagging
(task-centrality mistaken for queue-salience; ~6% observed base rate is the
calibration), body-less commits under time pressure, squash instinct ("clean up
history"), META/NOTABLE conflation.

## 2. API

- **`skills/deblob-commit/SKILL.md`** — one screen, self-sufficient (level-3
  bar); no `references/` dir — the grammar fits: subject grammar (see Docs),
  quintet body with empty-sections-drop (Goal never drops), `Changes:` = the
  Implementation record, no-squash, NOTABLE litmus verbatim + base rate, META
  bar, rationalization table seeded from RED.
- **Deeper → `../deblob-sdd/knowledge/{commits,meta}.md`** — cross-skill links;
  the cards were pre-written for this skill and the sdd skill (chapter PLAN),
  first use of the affordance. Same plugin, same repo — link modality grammar
  identical to the `deblob` skill.
- `description` evidence-phrased: committing in a repo with `history/` chapters
  or quintet-section commit bodies.
- `scenarios.md` rides in the step (S1 NOTABLE over-flag after a routine task;
  S2 body-less one-liner under time pressure; S3 squash under authority).

## 3. Testing

Meaning-preservation pass against `docs/sdd.md` §4 and the two knowledge cards;
relative links resolve. Manual spot-runs vs no-skill control per scenarios.md
(deferred gate, rixo — chapter exit).

## 4. Implementation

New skill directory picked up by the plugin's `skills/*/SKILL.md` discovery —
manifest untouched (version bumps when the four-skill set completes, step-00
ruling). Chapter PLAN queue item dissolved into this spec.

## 5. Docs

Rulings landed docs-first (`docs/sdd.md` §4 → `commits.md` card → the skill —
sdd.md was thinner on all four points before; the skill distills, never
invents):

- **Subject** (rixo, 2026-07-08): semantic commit — `type(scope): summary`
  (Conventional Commits); in monorepos with many packages, the scope names the
  package.
- **Size by judgment** (rixo, 2026-07-09): the message scales with the surface
  of the change; the quintet is a checklist to answer, not sections to fill.
- **The signal line** (rixo, 2026-07-09): supersedes "empty sections drop" —
  sections with nothing to say collapse into one short line naming them
  ("considered empty" must be distinguishable from "skipped"). Old phrasing
  removed from sdd.md (§3 ladder cell, §4) and the commits card.
- **Defer to shipped spec** (rixo, 2026-07-09): a commit carrying its own SPEC
  states Goal in a line and defers detail to the spec — the spec ships in the
  same commit's tree; a message copy stores the record twice and freezes while
  later commits may amend the spec (rationale corrected at review from "a copy
  diverges" — messages are frozen, the copy can't diverge, the spec does);
  commit-specific facts (deviations, gate results) stay in the message.
- **Trailers** (proposed at review, ratified 2026-07-09): `NOTABLE:`, `META:`
  and the new `Spec: history/<chapter>/<step>/` pointer are git trailers — one
  final block after the quintet, never inline. Trailer position makes them
  mechanically harvestable (`%(trailers:key=META,valueonly)`); `Spec:` is the
  defer-to-spec ruling's standing pointer form.
- **Breaking ≠ NOTABLE** (proposed at review, ratified 2026-07-09): a breaking
  change is an API-section fact flagged `!` in the subject (Conventional
  Commits); `NOTABLE:` stays orthogonal — attention ≠ breakage, litmus runs
  separately.
- **Trivial-body litmus** (proposed at review, ratified 2026-07-09): the body
  drops entirely only when the subject fully states the why AND no quintet
  section would carry content — closes the "subject says it all"
  rationalization.
