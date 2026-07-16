# Step 07 — arc recursion: the chapter lifecycle at commit scale

## 1. Goals

Extend the fractal claim from the artifact (quintet at four sizes — already law)
to the arc's **lifecycle**: a branch replays the chapter's lifecycle at commit
scale — the tree holds the artifact, the log holds the lifecycle. (The capture's
original phrase "a chapter at level 0" was ruled out at the spec gate: ladder
levels classify artifact materialization, not temporal shape — the opening
commit ships an in-tree SPEC, so the same work unit is a level-1+ move on the fs
side.) Close the message-grammar gap: today only the spec-shipping commit is
regulated; progress commits and arc-closing have no rules. Fold in the GitLab
correction (2026-07-16, reverses the 2026-07-09 belief): MR title + description
prefill from the branch's **first** commit, not its last — the MR facade is the
opening commit's job.

RED targets: progress commits restating chapter context instead of deferring to
the spec; arcs that end with no consolidation record; opening commits with
throwaway subjects (the MR facade then owed a rebase or hand-authoring); MR
descriptions hand-written when the log should assemble them.

## 2. API

The doctrine surface — contracts this step commits to:

- **The spine.** The chapter's temporal shape (opening GOAL → steps, each
  spec'ing only its own slice → consolidation into living docs) recurses to
  commit scale: **opening commit** ships the SPEC → **progress commits**, each
  carrying only what that commit knows → **consolidation commit** covering the
  whole arc. Degenerate case folds in: a small arc = one commit carrying spec +
  work (current practice); materialization scales like the ladder — when unsure,
  one commit.
- **Opening commit — the arc's public face.** Ships the spec (in-tree + `Spec:`
  trailer) AND carries the arc's presentation: goal-stating subject + body that
  reads as an MR description (GitLab prefills MR title + description from the
  branch's first commit). Most of the face is knowable at opening — the goal;
  detail is added as it becomes known. (Gate correction 2026-07-16: "additive
  only / authored once at birth" over-hardened a loose GitLab observation into
  law — dropped.)
- **No-squash binds landed history only** (gate correction 2026-07-16, made
  explicit against misreading): past = merged. Ironing an open arc's log —
  rebasing hard near the end, reorder, reword, fixup — is normal, even
  desirable; no-squash never excuses a sloppy log.
- **Progress commits — message scope.** A commit states what only _it_ knows:
  deviations, gate results, surprises. Step context defers to the `Spec:`
  trailer — never restated. (Corollary of defer-to-spec, already law at §4; this
  extends it from the spec-shipping commit to every commit after.)
- **Consolidation commit — the arc's record.** Restates the grand Goal, quintet
  at arc scale, closes the arc in the log. Its value is the record and the
  review surface — the MR-prefill motivation is dead per the first-commit
  correction, and the ruling stands without it.
- **Explicitly NOT ratified** (parked until a RED demands, 2026-07-09 noise-trap
  call): repo-resolvable references as a general rule; a granularity criterion
  (reviewer context switches).

Landing surfaces, docs-first: `docs/sdd.md` (§3 consolidation, §4 commit
grammar), then `deblob-commit` + `deblob-sdd` skills, `commits` + `chapters`
cards.

## 3. Testing

Meaning-preservation both directions against the 2026-07-09 facade-discussion
capture (chapter PLAN) and the 2026-07-16 correction. Consistency sweep: zero
surviving "last commit" claims (grep MR/GitLab across docs + skills). Dogfood
gate: the next real multi-commit arc runs the grammar end to end — opening face,
scoped progress messages, consolidation commit — and the resulting MR needs no
hand-authoring.

## 4. Implementation

Docs-first per landing order: sdd.md § edits, then skill/card touches
(`deblob-commit` SKILL grammar, `commits.md`, `chapters.md` consolidation note).
The chapter PLAN's 07 entry dissolves into this spec; the outermost board's
gitlab-MR Ideas card graduates here (payload absorbed above — bijection kept).

## 5. Docs

This step IS living-doc work: `docs/sdd.md`, two skills, two cards. README
untouched (its workflow row is already generic).
