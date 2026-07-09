# Step 05 — the `deblob-review` skill

## 1. Goals

An agent about to hand back a checkpoint runs the self-review pass instead of
pattern-matching "tests green → done". RED targets (from
`docs/self-review-checklist.md`, Honest limits — observed, not invented): the
tests-green→done stop; judgment defects invisible to tooling (stale comments,
broken promises, silent failure); "units green in the package" lying about
integrated state; running the pass only after the user asks (them doing the QA
the pass replaces).

Honest scope (chapter GOAL verbatim): sparsely defined by nature — v0 IS the
checklist; the real list grows by harvesting REDs from usage into questions to
ask. "Self" is under suspicion: adversarial review by fresh subagents plausibly
beats self-review; anticipated in a note, not built here.

## 2. API

- **`skills/deblob-review/SKILL.md`** — one screen, level-3 bar, no
  `references/` dir. Content, distilled from the checklist:
  - **When**: before every checkpoint handback — not after the user asks.
  - **The pass**: the 8 questions, compressed (stale prose; broken promises;
    silent failure; consistency; dead refs; tsc + downstream consumer build;
    coverage on touched runtime; specs/docs accuracy).
  - **What catches what**: tsc / coverage / grep+read / real consumer build —
    the tool-to-defect map, kept (the checklist's core insight: items 1–3 are
    the judgment class no tool sees; the list is the intervention).
  - **Rationalization table** seeded from RED: "tests green, done"; "the
    compiler would have caught it"; "units pass, integration is a follow-up";
    "user will review anyway"; "small diff, no pass needed".
  - **Subagent note** (anticipation, one paragraph): fresh-eyes reviewers with
    one `deblob` card + the diff as crash course, main agent arbitrates —
    pointer, not machinery.
- **`description`** evidence-phrased: about to report a task complete, hand back
  for review, or claim tests pass in a repo following deblob conventions.
- **`scenarios.md`** rides in the step: S1 tests-green→done under time pressure;
  S2 silent-failure swallow defended under sunk cost ("refactoring now would
  lose the afternoon"); S3 package-green claimed done under exhaustion while the
  downstream consumer build breaks.

## 3. Testing

Meaning-preservation pass (two-pass authoring contract,
`docs/contributing/prompt-optimized-authoring.md`): every compressed checklist
item traced back to `docs/self-review-checklist.md` for lost constraints — the
checklist's parentheticals carry the instructions (e.g. "grep consumers BEFORE
removing a field", "check the actual %"), easy to kill in compression. Relative
links resolve. Manual spot-runs vs no-skill control per scenarios.md (deferred
gate, rixo — chapter exit).

## 4. Implementation

New skill directory picked up by the plugin's `skills/*/SKILL.md` discovery —
manifest untouched (version bumps when the four-skill set completes, step-00
ruling). Chapter PLAN queue item dissolves into this spec.

## 5. Docs

**Absorb and delete** (chapter GOAL says "tombstones it"; ruled at the diff
review, rixo 2026-07-09: delete outright — a tombstone earns its keep only
against real external inbound links, absent here; the fold is recorded in this
SPEC and the commit, and a pointer-only file is residue in the living docs): the
checklist was working material ("scratch notes, not polished methodology" — its
own header), so no docs-first landing is due; the skill is the operational home,
per the chapter's bar ("every ground rule an agent needs lives in the skill").
The why the skill points at already lives in `docs/sdd.md` §4 (review economics,
the gates).

- `docs/self-review-checklist.md` → deleted.
- Referrer updates, same commit (docs-are-the-source-of-truth protocol):
  - `docs/implementation-guide.md` §"error management" link → the skill;
  - `README.md` docs-table row: "working material… will fold into a skill" →
    skills row fact (folded, where);
  - `skills/deblob/references/handling-failure.md` pointer → the skill.
