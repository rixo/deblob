# Step 03 — assembly is not blob

Origin: observed agent failure mode (rixo, 2026-07-08) — "assembly = necessary
evil, untestable, may import anything" read as a free pass to stuff logic in
assembly, bypassing model/service extraction.

## 1. Goals

Sharpen one distinction across the corpus: **blob is unqualified code, owned as
debt; assembly is code _ruled_ necessary for wiring** — necessary evil, not lazy
default. Corollary stated wherever the free-pass reading can arise: import
privilege is not placement licence; logic hidden in assembly is blob under a
label that seems to allow it — if it's blob, own it as blob (suffixless,
assembly-only importable), don't launder it.

## 2. API

The ruling's homes (audit findings drive the list — see Implementation):

- **`docs/architecture.md` intro** — the retrofit story's "That's the blob —
  assembly before it's been organised" is the source conflation; rephrased to
  blob = code awaiting a layer, owned as debt.
- **`docs/architecture.md` § Assembly — the necessary evil** — gains the
  explicit contrast paragraph: assembly is not blob; import privilege ≠
  placement licence; genuinely unplaced code is owned as blob, visibly.
- **`docs/implementation-guide.md` §6** — the `build<Name>Service()` helper's
  "may import anything" gets its counterweight at the point of statement.
- **Derived views, same change** (two-axis rule): `blob.md` (mirror of the intro
  conflation), `layer-assembly.md` (the contrast), `assembly-patterns.md`
  (mirror of §6), `dependency-matrix.md` + `references/rules.md` (the matrix's
  `assembly | anything` row gets the one-line caveat).
- **`SKILL.md`** — rationalization table row: "it's just wiring".

## 3. Testing

Meaning-preservation pass per touched card against its source section; all
relative links resolve; `source:` stamps intact. RED material for spot-runs:
under time pressure, agent writes a decision/computation directly in `main.ts`
(or a `build*` helper) rationalizing "it's just wiring" / "assembly may import
anything" — with-skill run must extract to service/model or explicitly own the
code as blob.

## 4. Implementation

Audit method: two read-only sweep agents (skills corpus, docs) classifying every
assembly/blob characterization as CONFLATES / RISKY / CLEAN against the ruling.
Findings:

- CONFLATES: `architecture.md` intro ("assembly before it's been organised");
  `blob.md` mirroring it ("a stage: assembly before it has been organised").
- RISKY: guide §6 helper line ("may import anything", no counterweight);
  `assembly-patterns.md` mirroring it; the matrix row `assembly | anything` in
  `dependency-matrix.md` and `rules.md`.
- CLEAN: 40+ other mentions — `placement.md`'s assembly bullet ("keep it thin —
  every line of logic here is untestable") already states the discipline well
  and anchors the wording.

Chapter PLAN: queue item dissolved into this spec; remaining queue renumbered
(commit 04, review 05, sdd 06).

## 5. Docs

Ruling lands in `docs/architecture.md` first (the why lives there), guide §6
next, then propagates to the derived views in the same change (step-02
precedent). No new docs; no living doc left stating the old phrasing.
