---
captured: 2026-07-17
---

# `deblob docs` — the SDD command family

Gathering the scattered threads (board card, chapter decisions, skills-chapter
carried note) into one unborn home. Ruled: the family exists, separate from
`check` — audience split: `check` is the architecture product, pitchable to any
TS team; `docs` is methodology tooling for repos running the full SDD system.
Not v0 (command inventory decision).

## The seed check (from the board card): derived-view staleness

Knowledge cards are derived views of `docs/`, provenance-stamped
(`source: docs/architecture.md § heading`). The check: every stamp resolves,
drift surfaces. To spec: the stamp-text ↔ heading matching rule — exact vs
normalized matching, and what counts as stale (heading gone = hard fail; content
changed since the stamp = signal? via what — section hash, git log on the file
since a stamped date?). Deterministic core only; "is the card still faithful" is
judgment — CLI surfaces, agent/human judges (the CLI↔agent split shape).

## Candidate checks, unruled (the chapter PLAN's open rider)

- **Board ↔ `future/` bijection** — sdd §3 calls it "mechanically checkable":
  every card has a payload pointer that resolves, every `future/` entry has a
  card. The entire consistency surface, per the sdd's own words.
- **Step-dir numbering** — numbered steps created in order (sdd §6's
  file-structure constraint, currently discipline-only).
- **`5-docs` / PLAN hygiene** — skills chapter carried note; least designed,
  most judgment-adjacent — may not be mechanical at all.
- **Packaged explain-content sync** (new kin, 2026-07-17) — shipped cards vs
  repo `skills/` sources; same derived-view-vs-source shape as staleness.

## Audience (2026-07-17, rixo probing)

Not deblob-repo-only — general to **any repo running the SDD methodology**,
which is a shipped product (GOAL success test: adopt architecture AND
methodology from this repo alone). Every adopter grows the same checkable
surfaces: stamped derived views, a PLAN board, `future/` payloads, numbered
steps. `docs` is to the methodology what `check` is to the architecture; the
deblob repo is user #1 (dogfood), not the market. Prerequisite for generality:
the conventions must be specced, not house habits — the stamp matching rule and
bijection shape named above are exactly that promotion. Knowingly narrower
market than `check` (SDD adopters only) — the audience split working as
intended.

Called out (2026-07-17, rixo): the generality story is aspiration — external
adopters today: zero. What survives without it: staleness (self-collected
evidence, META 2026-07-07 + the 07-17 stash recovery being partly stamp-drift
repair) and explain-content sync (mandatory build-integrity check the moment
`explain` ships). The rest exists only if the sdd-§6 bar is met at graduation;
dying there is a designed outcome for this capture.

## Boundaries

- sdd §6's own warning applies to us: enforcement stays lightest-effective; a
  check earns its place only where discipline demonstrably fails (META
  2026-07-07 is the evidence for staleness-class failures; bijection breaks
  silently by nature). No check for what adjacency-review already catches.
- Same no-autofix stance as `check`.

Sequenced: after v0 ships (family staged, not v0). Rule the candidate list
in/out when this graduates — don't drift into it from the `check` work.
