---
name: deblob-commit
description:
  Use when committing or writing a commit message in a repository following
  deblob SDD conventions — a history/ directory of chapters (SPEC/GOAL/PLAN
  files) or commit bodies carrying Goal/API/Testing/Implementation/Docs
  sections.
---

# deblob-commit — the commit as level-0 spec

A commit message is a spec at the smallest scale, and the log is documentation:
WHY matters as much as WHAT. Write every message for a reviewer triaging many
commits — never for yourself.

## Subject

Semantic commit: `type(scope): summary` (Conventional Commits). In monorepos
with many packages, the scope names the package (`fix(icons): …`). Imperative
summary, states the what. Breaking change: `!` in the subject + the fact in the
API section — breakage does not itself earn `NOTABLE:`.

## Body — the quintet, compressed

```
Goal:            why this change exists
API:             contract changes — when any
Testing:         how it's proven — when non-obvious
Implementation:  what changed and how; the file-by-file record lives here
Docs:            living docs affected — when any
```

- The message scales with the surface of the change — judgment, not template.
  The quintet is a checklist to answer, not sections to fill.
- Sections with nothing to say collapse into one short line naming them ("No API
  or doc surface; testing: existing suite covers.") — one line separates
  considered-empty from skipped.
- Goal is never empty: a commit that can't state its why in one line isn't
  understood yet.
- A `Changes:`-style file list is not a sixth section — it IS the Implementation
  record.
- The commit ships its own SPEC (a step landing with its change)? **Defer to
  it**: Goal in a line + `Spec:` trailer, the spec carries the detail — the spec
  is in this very commit's tree; a message copy stores it twice and freezes
  while later commits may amend the spec. Commit-specific facts (deviations,
  gate results) stay in the message.
- Body drops entirely only under a strict litmus: the subject fully states the
  why AND no section would carry content (`style(docs): prettier reflow`).

## Granularity — no squash

Meaningful micro-commits, never squashed: each commit's WHY survives only
unsquashed. Micro-commits keep rebases light and review granular. The stance
binds **landed** history (past = merged): ironing an open arc's log — rebase,
reorder, reword, fixup — is normal, even desirable. No-squash is never an excuse
for sloppy commits.

## The arc — the chapter lifecycle at commit scale

A branch replays the chapter's lifecycle in the log:

- **Opening commit** — ships the spec (in-tree + `Spec:` trailer) AND authors
  the arc's public face: goal-stating subject, body that reads as an MR
  description — GitLab prefills MR title + description from the branch's
  **first** commit. Most of the face is knowable at opening (the goal); add
  detail as it becomes known.
- **Progress commits** — state what only this commit knows: deviations, gate
  results, surprises. Step context defers to the `Spec:` trailer.
- **Consolidation commit** — closes the arc: grand Goal restated, quintet at arc
  scale; the arc's record in the log.

Small arc = one commit carrying spec + work. When unsure: one commit.

## Labels — two, orthogonal; conflating them buries both

- **`NOTABLE:`** — reviewer-attention flag: spend scarce review budget HERE
  (dangerous, architectural, judgment-heavy). Litmus before flagging: _notable
  compared to the other commits under review, or merely central to my task?_
  Only the first earns it. Base rate: single-digit percent of commits.
- **`META:`** — a methodology insight, orthogonal to the task: something that
  changes the practice. Routine work produces nothing. Dropped in the message so
  the harvest grep finds it. An insight bigger than a trailer line belongs in a
  `META.md` file instead — placement ladder in
  [meta](../deblob-sdd/knowledge/meta.md).

Labels and the spec pointer are **git trailers** — one final block after the
quintet (`NOTABLE: <why>`, `META: <insight>`,
`Spec: history/<chapter>/<step>/`), never inline in sections: trailer position
keeps them mechanically harvestable.

## When you catch yourself thinking…

| Excuse                                     | Reality                                                                                                |
| ------------------------------------------ | ------------------------------------------------------------------------------------------------------ |
| "big task — the reviewer should see this"  | Salience is relative to the reviewer's queue, not your task. Run the litmus. ~6%.                      |
| "small change, a body is overkill"         | Run the drop litmus: why fully in subject AND no section content — else Goal, one line.                |
| "squash the fixups — clean history"        | Squash destroys the why. Meaningful micro-commits ARE clean history.                                   |
| "I'll put the insight in the PR"           | PR prose vanishes from the log. `META:` rides the commit; grep finds it.                               |
| "NOTABLE, and the insight goes in it too"  | Attention flag ≠ knowledge log. Two labels, orthogonal — conflating buries both.                       |
| "the SPEC explains it — copy it in"        | The spec ships in this commit. A copy stores it twice, then freezes stale. Goal + `Spec:`.             |
| "nothing to say for API, drop the section" | Name the empties in one line. Silent absence reads as skipped, not considered.                         |
| "breaking change — that's a NOTABLE"       | Breakage is an API fact + `!` in the subject. NOTABLE = queue-attention; run the litmus.               |
| "`wip:` to open the branch, polish later"  | The MR prefills from the FIRST commit. Author the face at opening — or you owe a rebase before the MR. |

## Deeper

Per judgment — the why behind the grammar:

- [commits](../deblob-sdd/knowledge/commits.md) — level-0 quintet, labels,
  no-squash rationale
- [meta](../deblob-sdd/knowledge/meta.md) — the methodology log, placement
  ladder
