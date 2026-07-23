---
captured: 2026-07-23
---

# Dogfood run — step-10 diff, first live trial

Data-point log for the recipe's first run (subject: the step-10 mountain diff,
~836 tracked insertions + 10 untracked files, 29 tracked files). Purpose: inform
graduation into a proper deblob- skill — every friction, decision, and verdict
recorded here as it happens. Evolves during the review itself; rides with the
step-10 commit set per rixo's ruling at the gate.

## Scheme decisions made for this run (skill candidates)

- **Branch naming**: `review/<base-branch>/<utc-ts>/{base,slices,reviewed}` —
  `review/` prefix unambiguous, base branch keeps context, timestamp uniquifies.
  This run: `review/cli-v0/20260723-1549Z/*`.
- **Backup mechanics — uncommitted-tree variant** (recipe assumed a commit
  range; this run's mountain is a dirty working tree): full-tree snapshot commit
  built with a **temp index** (`GIT_INDEX_FILE` + `read-tree HEAD` + `add -A` +
  `commit-tree -p HEAD`) — the reviewer's real index is their review tracker and
  must never be touched. Branch stays inert; it is the invariant-1 anchor.
- **Index state is not in any commit**: staged-vs-unstaged distinction backed up
  separately (`git status --porcelain` + `git diff --cached` patch) before
  anything else. A skill must do this first, always.
- **Pre-staged work = a natural slice**: the reviewer's already-staged files
  (here: the two cycle-fix moves) turned out to be a coherent concern — ordered
  as slice 1 so part-done review is confirmed fast, not redone.

## Feedback-propagation protocol (pinned pre-replay, this run)

Review feedback → code changes mid-replay is expected, not exceptional
(invariant 1's "modulo feedback" clause). Handling, in order of escalation:

1. Feedback fixed in place, rides the current slice's `reviewed` commit.
2. Mechanical drift: remaining slices rebased onto the `reviewed` tip in the
   agent worktree before each next replay — conflicts resolved there, the
   reviewer never sees markers.
3. Semantic ripple (feedback invalidates later slice content — renames, golden
   regrowth): agent propagates through remaining slices and reruns affected
   tests before that slice replays. Pause point, not breakage.
4. End check = feedback ledger: `git diff base reviewed` after the last slice
   must equal exactly the accumulated feedback, each hunk traceable to a review
   note.
5. Full gate suite reruns before the real commit is cut — feedback voids prior
   green.

## Slice→final-commit mapping (pinned, this run)

Review slices are NOT final commits — slices size for engagement (one concern,
one sitting), final commits size for history (standalone, green, meaningful arc;
commits-accompany-not-split law). Expect many-to-few:

- Mapping declared before cutting: each slice tagged with its target final
  commit; the grouping itself gets a look before execution.
- Cutting = fresh path-grouped `git commit -- <paths>` sequence on the real
  branch from the reviewed tree (≡ final tree). File spanning two final commits
  → hunk staging, flag as friction.
- Standalone-green constraint applies per final commit, not per slice.
- This run: 6 slices → 1–2 final commits (step-10 single commit per the
  small-arc ruling; night cards ride-or-separate = rixo's open gate call).

## Open questions surfaced (rule at graduation)

- Green-per-slice: are slice commits required to typecheck/test green
  individually, or only the final tree? This run does not require it (slices are
  scaffolding; comprehension order ≠ TDD order) — observe whether red
  intermediate states hurt review.
- Mixed-concern files (predicted: `render.model.ts` — ExplainEntry removal =
  cycle-fix, dag blocks = wiring): hunk-level surgery frequency and cost — the
  recipe's "hard 10%" estimate gets its first measurement.

## Run log

- 2026-07-23 15:49Z — backup branch cut, index state saved. Slicing delegated to
  a Sonnet agent (main thread planned slices + briefs; agent executes git
  surgery in its own worktree — model-tiering data point for the skill: does the
  mechanical half hold up on a cheaper model?).

## Friction / observations

- 2026-07-23 ~16:00Z — slicing done (Sonnet agent, ~7.6 min, 54 tool calls, ~85k
  tokens): 6 slices, invariant 1 verified twice (agent + main thread), full
  coverage (33 files), main checkout untouched. **Model-tiering verdict: cheap
  model held the mechanical half fine** — incl. a byte-exact hunk split.
- **Hunk surgery cheaper than predicted**: of 33 files, exactly 1 needed a split
  (`render.model.ts`) and it worked cleanly — the NUL byte sat in an unchanged
  line, `git diff --text` never tripped binary mode. The predicted second mixed
  file (`cli.model.ts`) needed nothing (its import was already re-pointed in
  HEAD). "Hard 10%" estimate: this run measured ~3%, zero fallbacks.
- **NUL-byte gotcha sharpened**: `grep`/`diff` without `-a`/`--text` produce
  silently EMPTY output on the file (reads as "no matches", not "binary
  skipped"). Skill must mandate `--text`/`-a` on any file suspected binary.
- **Fresh worktree breaks commit hooks**: lefthook's prettier hook fails without
  `node_modules` (`ERR_PNPM_RECURSIVE_EXEC_FIRST_FAIL`). Agent symlinked
  `node_modules` from the main checkout (read-only use) rather than
  `--no-verify` — right call, skill should prescribe it.
- **Subagent cleanup overreach (incident)**: agent deleted the index-state
  backup files from the scratchpad — judged them "stale leftovers from a prior
  attempt" (they were the deliberate pre-run backup; it even flagged the
  deletion in its report, but after the fact). Recovered — live index was still
  intact, backup re-created and write-protected (`chmod a-w`). Skill rules
  derived: (1) agents delete only what they created; (2) backups are
  write-protected at creation; (3) backups live outside any path an agent is
  told to clean.

- **Binary-refusal reaches merge too**: cherry-picking slice 3 hit "Cannot merge
  binary files" on `render.model.ts` — the NUL-carrying blob sat on two sides of
  the 3-way merge, and the `diff` attribute that fixed plain `git diff` does not
  drive merges. Resolution recipe (protocol step 2, off the reviewer's screen):
  take the incoming slice's version, re-apply the feedback fix mechanically
  (perl), verify byte-level that the merged file = incoming + exactly the
  feedback lines, `cherry-pick --quit`, unstage. Skill lesson: a feedback fix
  touching a git-binary file turns every later slice that touches the same file
  into a manual (but scriptable) resolve.

## Feedback ledger (live)

- Slice 1 (2026-07-23): reviewer's plain `git diff` hit git's binary heuristic
  on `render.model.ts` (the file's literal 0x00 sort-key byte) — review blocked
  without `--text`. Feedback fix, ruled by rixo: replace the literal NUL with
  the `\u0000` escape in the template (identical runtime string, plain-text
  source, heuristic never trips again). Applied in place, rides slice 1; suite
  green after. Recipe lesson: an invisible byte that merely annoyed tooling
  became a review BLOCKER the moment review moved to plain `git diff` — slicing
  surfaces environment quirks the IDE was papering over. Residual: `git diff`
  stays binary-looking for this one slice (HEAD blob still holds the NUL);
  textual once committed. Slice 3 rebase may conflict near line 194 —
  propagation protocol step 2 handles it.

- Slice 5 (2026-07-23): direction-law paragraph read absolute ("parent stays
  import-blind to its children") — the nesting-packaging §12 nit, spotted
  independently by rixo at review (the paragraph triggered the question before
  the note's flag was raised — converging evidence the scoping was needed).
  Feedback fix: two closing sentences scoping blindness to the upward relation,
  component children freely importable, role picks direction, rule 13 enforces
  one direction per pair. Rides slice 5.

- Slice 6 (2026-07-23): sales-speech opening ("old pots — in reality, that's all
  we had") misrendered rixo's meaning — read as pots-as-constraint; intended:
  pots fully sound in their pre-AI birth context, the need is old, what changed
  is the balances. Rewritten, cross-ref to graph-as-product §Why now. Rides
  slice 6. Capture lesson: a card written from live discussion can compress a
  nuance into its opposite — the author's re-read at review is the only catch
  for this class.
- Slice 6, second touch: idea.md's "dogfood candidate — rixo rules whether to
  try" bullet was stale (we tried, same day) — now points here as graduation
  input #1.

## Verdict

Ruled 2026-07-23 (rixo, post-run): sliced review was a better, more engaging
experience than whole-diff review — graduation to a skill is on. Evidence from
the run: 6 missions, 4 substantive catches (a tooling review blocker, an
arch-canon scoping, a captured-meaning inversion, a stale cross-ref); zero
conflict markers reached the reviewer; invariants held end to end; final cut
produced 2 standalone-green commits from 6 slices. Graduation agenda on the card
(idea.md); board entry promoted to the staged queue same day.
