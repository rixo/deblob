# Step 06 — the `deblob-sdd` skill

## 1. Goals

An agent doing spec-driven work in a deblob repo produces level-correct SDD
artifacts: quintet answered in order, chapters/steps shaped right, scratch in
its named places, PLANs that consolidate instead of sprawl. RED targets (chapter
PLAN): section drift (a section answering a different question than its name);
PLAN sprawl (roadmap accreting detail that belongs in chapters); scratch wedged
into step numbering (a step dir invented for non-step material);
case-enumeration instead of naming the domain operation.

Completes the four-skill set (chapter GOAL) — plugin manifest version bump due
per the step-00 ruling.

## 2. API

- **`skills/deblob-sdd/SKILL.md`** — one screen, level-3 bar, no `references/`
  (the knowledge layer exists: 13 cards, pre-written in step 01). Content:
  - **The quintet** — five questions in forcing order (Goals → API → Testing →
    Implementation → Docs); each constrains the next; depth is discretionary,
    the answer is not. API = contracts at every layer that has one (ports,
    purity split, home of each domain decision) — not every signature.
  - **The two axes** — `history/` is the frozen record (chapters/steps, one
    fractal shape at every scale); living docs are the present-tense truth;
    never wedge one into the other.
  - **Form by level** — pick the ladder rung (commit body → step → chapter);
    scratch goes in named blocks (PLAN, research/, META.md), never into step
    numbering.
  - **PLAN hygiene** — PLANs are scratch that consolidates continuously; items
    shed into chapters/specs as they crystallize; a growing PLAN is a smell.
  - **Name the operation** — spec the domain operation, not an enumeration of
    its cases.
  - **Rationalization table** seeded from RED: "this section sort of covers it";
    "the roadmap should carry the detail"; "I'll add a step dir for these
    notes"; "list the cases, clearer than the abstraction"; "spec's done, the
    order was just guidance".
- **`description`** evidence-phrased: writing or amending SPEC/GOAL/PLAN files,
  or structuring work, in a repo with `history/` chapters and quintet specs.
- **Deeper → `knowledge/`** (own dir, first skill whose cards are local):
  forcing-function, chapters, ladder, two-axes, operation-over-cases; the INDEX
  note "SKILL.md arrives with its step" updated to point at it.
- **`scenarios.md`** rides in the step: S1 scratch-into-step-numbering under
  tidiness pressure ("just make it step 07"); S2 case-enumeration under
  authority ("list all five cases explicitly, clearer"); S3 PLAN sprawl under
  momentum (dumping design detail into the rolling PLAN instead of opening a
  chapter).

## 3. Testing

Meaning-preservation pass both directions against `docs/sdd.md` §1–§3 and the
five linked cards — the forcing-function nuances are the compression trap
("depth is discretionary; the answer is not", the over-spec guardrail). Relative
links resolve. Manual spot-runs vs no-skill control per scenarios.md (deferred
gate, rixo — chapter exit).

## 4. Implementation

New SKILL.md in the existing `skills/deblob-sdd/` dir (knowledge cards already
live there); plugin manifest version bump (four-skill set complete). Chapter
PLAN queue item dissolves into this spec.

## 5. Docs

No docs-first landing anticipated — sdd.md already carries everything; the skill
distills, never invents. `skills/deblob-sdd/knowledge/INDEX.md` header note
("the `deblob-sdd` SKILL.md arrives with its step") drops. README skills row:
"sdd skill coming" → the fact.
