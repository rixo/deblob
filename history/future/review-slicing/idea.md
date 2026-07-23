---
captured: 2026-07-23
---

# Review slicing — mountain diff → focused review missions

Popped at the close of the 2026-07-22/23 night session (rixo — "like a llm pops
the next token, out of sheer activation mechanic"). Back to pillar 1, review
attention economics (see `../graph-as-product/idea.md` §Why now). Candidate
first dogfood: the step-10 diff itself, morning after. Eventually a deblob
skill. Naming note: `deblob-review` is taken (existing agent-side pre-handback
checklist skill) — this is the reviewer-side sibling; name ruled at graduation.
Working alias since the sales-speech capture: **deblob-review-carbon** (rixo,
2026-07-23 — the suffix instinct won; see `../sales-speech/idea.md`).

## Pillar 1, named more precisely: engagement, not attention

Attention and engagement are the same currency (Kahneman): engaged review is
System 2 — slow, deliberate, effortful, and _scarce_ (depletable budget).
Skimming is System 1 — fast, automatic, pattern-matching on autopilot; it spends
time without paying attention. Review value comes from System 2 engagement only,
and engagement collapses past a diff-size threshold while time-spent keeps
scaling — that's why a mountain diff gets worse-than-linear review. Problem
statement, casual observation: a big full diff is hard to engage, harder to
engage meaningfully. Tried & true engineering answer to "too big": divide and
conquer.

Kinship: this is the locality countermeasure (pillar 2, graph-as-product)
applied to _change_ instead of space — a mountain diff has the same
too-big-to-engage, redraw-per-hunk problem a codebase has; slicing is zooming
for diffs. The two pillars are one mechanism pointed at two objects.

## The workflow (rixo's sketch)

Current practice: go through the diff in the IDE — read, stage (or feedback);
the index is the reviewer's reviewed-hunks tracker. Works ok-ish; breaks down on
mountains.

The idea: a handful of well-sentenced instructions + llm magic oven →

1. Agent creates a review branch and slices the mountain into successive
   concern- and progression-focused commits _with gusto_ (intelligence and
   judgment — this is the llm part, not mechanizable).
2. Back to the starting-point commit on a dedicated `reviewed` branch.
3. Replay slices one by one, each left **uncommitted in the working tree**: the
   IDE shows a limited, all-related set of red/green lines with the concern and
   scope spelled out (slice commit message = mission brief: concern, scope, what
   to verify, spec links).
4. Reviewer reads, stages as they review (index ritual intact, per slice),
   feedback loops fix in place, commit, next slice.

Suddenly a mountain diff with mixed concerns is a clean set of focused review
missions.

## Recipe sketch (mechanics — to become the skill's git playbook)

- Slice in an agent-owned worktree/branch so the reviewer's index stays theirs
  throughout.
- Replay per slice: `git cherry-pick --no-commit <slice>` then unstage all —
  working tree carries exactly the slice; reviewer stages as they read; commit
  reuses the slice's mission-brief message.
- **Invariant 1 — no loss, modulo feedback**: tree at last slice ≡ original diff
  after slicing (`git diff` empty against the original tree — slicing must never
  invent or drop a hunk). During replay the review may feed back changes, so the
  end-state check relaxes to: every divergence from the original diff traces to
  a review feedback, none silent. Mechanics are git's bread and butter (3-way
  merge did the heavy lifting decades ago).
- **Invariant 2 — clean chaining**: slices apply in order without conflict.
  File-level slicing first; hunk-level patch surgery only when one file mixes
  concerns (the hard 10%).
- **Slice-for-review ≠ slice-for-history**: slice commits are scaffolding. After
  the last mission, the reviewed tree equals the full diff and the real
  commit(s) are cut per the agreed plan (commits-accompany-not-split stays law —
  e.g. step 10 remains one commit, same message). The review branches are
  discarded or kept as review record — ruled at graduation.

## Relations

- Kin: the board's "Pause-for-review-before-commit — canon candidate" idea —
  same family (review workflow, sdd gate mechanics); this is its big sibling.
  Graduation should consider them together.
- Kin: `../graph-as-product/idea.md` — pillar economics; slicing = zooming for
  diffs.
- Dogfood candidate: the step-10 mountain diff (2026-07-23 morning) — ruled try,
  and run same day: see [dogfood-step10.md](./dogfood-step10.md) for the full
  data-point log (scheme decisions, feedback-propagation protocol,
  slice→final-commit mapping, friction, ledger, verdict). Graduation input #1.
- Home when it graduates: skill territory (skills chapter lineage), not CLI — no
  command-inventory gate; naming must resolve the `deblob-review` collision.
- Horizon beyond the skill (rixo, at closing — the dojo beside the sword shop):
  IDE + git diff is the ad hoc solution to this workflow; it gets the job done,
  but a dedicated review UX with an agent interactively guiding you through what
  you're actually reviewing could beat it. Not scoped, not promised — named so
  the ceiling is on record.
