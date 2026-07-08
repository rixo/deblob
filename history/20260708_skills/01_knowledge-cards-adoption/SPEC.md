# Step 01 — knowledge cards adoption (the skills knowledge layer)

The step opened with a **contained research move** (sdd §3): slice
`docs/architecture.md` + `docs/sdd.md` into compact, cross-linked,
prompt-optimized knowledge cards, index them for agent-driven discovery, and
assess whether they should replace the whole-doc links in the `deblob` skill's
`## Deeper` sections. Authoring contract inherited from step 00: imperative
prompt-optimized register, meaning-preservation second pass per card, holistic
cross-read, provenance stamp. Output: 36 cards (23 arch, 13 sdd) +
question-indexed INDEX; assessment: adopt. The research working docs dissolved
into this spec at consolidation; the cards land in git directly at their final
home below.

## 1. Goals

Adopt the 36 knowledge cards as the skills' knowledge layer, and wire the
`deblob` skill to it. The chain becomes: situation card
(`skills/deblob/references/`, the how) → knowledge card (`skills/*/knowledge/`,
the what/why, ~300 tokens, self-contained) → docs (the full narrative). A Deeper
link to a whole doc costs ~9k tokens and a mid-document retrieval; a card is a
targeted read — order-of-magnitude cheaper, retrieval-safe.

The cards materialize the step-00 spec's L2b why-layer — corpus-wide instead of
on-demand (the spec's conditional trigger never fired; the research move built
the layer wholesale and the assessment recommended adoption).

## 2. API

- **`skills/<skill>/knowledge/`** — each skill carries its own card corpus,
  sibling of `references/` (situation-how vs knowledge-why stay separate kinds).
  The 23 arch cards → `skills/deblob/knowledge/`; the 13 sdd cards →
  `skills/deblob-sdd/knowledge/` (that skill's reference material pre-written —
  its SKILL.md arrives with its step; a skill dir without SKILL.md is ignored by
  loaders). Each corpus has its own question-indexed `INDEX.md`. Future:
  `skills/deblob/knowledge/implem/` (implementation-guide.md — next step's
  research move).
- **Provenance = frontmatter.** Machine-parseable YAML, not an ad-hoc
  blockquote: `source: docs/architecture.md § Sharing`. One key; multi-source
  cards list sections in the same string. Applies to every derived view — the
  skill's situation cards convert too. Narrative content that rode inside a
  stamp blockquote (arch/nesting's derived-law caveat) moves to the card body:
  frontmatter is data, not prose.
- **Deeper sections link cards, docs stay final depth.** Skill references'
  `## Deeper` doc-section links become card links; each card's `source:` points
  at the doc section, so the chain to the narrative is preserved, not cut. Links
  to material not yet carded (implementation-guide §§, self-review checklist)
  stay doc links until their cards exist.
- **Sharing model.** In-skill cards make a bare skill-dir copy fully
  self-contained, Deeper layer included — the real portability win over a shared
  top-level corpus. Cross-domain coupling is thin (4 links of 70, all on the
  testing/review seam); those become cross-skill relative links
  (`../../deblob-sdd/knowledge/…`), resolving in-plugin, degrading on bare copy
  — accepted: optional depth.

## 3. Testing

Meaning-preservation and holistic consistency passes ran during card authoring.
Adoption-time verification is mechanical: every moved card keeps its inter-card
links resolving; every rewired Deeper link resolves; no blockquote stamp
survives the frontmatter conversion (grep gate). Staleness tooling
(`deblob check` diffing source sections against `source:` stamps) is staged, not
built — see Open questions.

## 4. Implementation

- `skills/deblob/knowledge/` + `skills/deblob-sdd/knowledge/` — the research
  move's cards at their final home, each corpus with its INDEX split from the
  research-era combined index.
- Frontmatter conversion across `skills/*/knowledge/**/*.md` and
  `skills/deblob/references/*.md`.
- `sdd/enforcement.md` — the trailing empirical-evidence paragraph (citing
  `history/META.md`) dropped: the rule stands without it, and a card citing
  history would breach the derivation contract (ruling below).
- `skills/deblob/references/placement.md` — Nesting section gains the
  derived-and-staged caveat the arch/nesting card carries (the honest version; a
  research finding).
- The research working docs (a TRACKER checklist, a FINDINGS exit report)
  dissolve per sdd scratch cleanup: recommendation and rulings → this spec,
  methodology observations → [META](META.md), surviving open questions → this
  spec / the chapter PLAN.

## 5. Docs

- `docs/contributing/docs-are-the-source-of-truth.md` — names
  `skills/*/knowledge/` explicitly as a derived view; provenance-stamp form
  updated to frontmatter.
- `README.md` Contents — skills row mentions the knowledge layer.
- Step-00 SPEC's L2b description is NOT reconciled: frozen specs are records,
  their forward-looking parts died at contact with reality (sdd §2). This spec
  is the correction.

## Decisions

- **Adopt** (the research question): cards replace whole-doc Deeper links; docs
  remain final depth. Situation cards are NOT slimmed against the new corpus —
  they are untested (spot-runs S1–S3 pending); dedupe only after usage data.
- **Location `skills/<skill>/knowledge/`** — a first ruling placed the corpus at
  a shared top-level `docs.ai/` ("projection of docs"); reconsidered at review,
  before commit. Measurement killed the sharing premise: 4 cross-domain links
  out of 70 — the corpus splits along skill lines nearly for free, and card
  ownership maps 1:1 onto skills (arch → `deblob`, sdd → `deblob-sdd`). In-skill
  placement restores bare-copy self-containment (the step-00 spec put the L2b
  why-layer inside the skill all along) and adds no new top-level concept. The
  SSOT/derivation contract is location-independent. Rejected: top-level
  `docs.ai/` or `knowledge/` (kills skill portability for a sharing need that
  measurement showed doesn't exist), `docs/ai/` (mixing derived views into the
  SSOT tree blurs the derivation direction).
- **Provenance is YAML frontmatter**, one `source:` key. Narrative headers die;
  provenance stamps live. Resolves the parked doc-header-blockquote ruling.
- **Cards never cite history.** Evidence worth citing either graduates into docs
  (the META→docs harvest loop) or the citation goes. For sdd/enforcement.md the
  evidence added no operative value — dropped.
- **`implem/` flat, no flavor dirs** — mirrors `docs/` (one guide doc). A second
  flavor restructures docs first; the knowledge layer follows.
- **META is always its own file from level 1 up** (`META.md` in the move's
  directory) — the `## META`-section-in-SPEC form is dropped from the ladder:
  META is off-topic by nature, and the all-dirs rule means the home is always
  there. Level 0 keeps the commit `META:` label. Ruled here, landed in
  `docs/sdd.md` §3 + the meta card (same change, per the derivation protocol).
- **No standing research step.** The research move first sat as its own numbered
  step with record files; at review it dissolved into this step — a research
  move whose every output is adopted by the very next move is one step's story,
  not two.

## Open questions

- Staleness tooling: `source:` stamps are now uniform; spec the section-matching
  rule (stamp text ↔ heading) when the CLI chapter opens.
- Guide (`implementation-guide.md`) slicing into
  `skills/deblob/knowledge/implem/` — next research move in this chapter.
