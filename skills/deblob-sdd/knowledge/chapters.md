---
source: docs/sdd.md §3 (recursion, spec depth, outermost chapter, terminology)
---

# Chapters, steps, and the outermost chapter

**A chapter is a spec of specs.** At chapter scale, sections distribute into
child specs: each step (`00_`, `01_`, …) is a full spec of its own slice and
picks its own ladder form — the recursion has no fifth form, only the same four
at the next depth. The all-dirs rule recurses (steps are directories).

At the chapter root, what binds the children:

- `GOAL.md` — the chapter's goals section, its own file because it outlives
  every step.
- `PLAN.md` — NOT part of the shape: scratch where the plan churns before
  crystallizing into steps; cleaned at consolidation, knowledge migrating to
  steps and commits.

**Nest where a concern begins, not where a count is reached.** Flat siblings
express sequence; nesting expresses ownership. `07 08 09…` siblings all serving
one concern is the smell; `07_concern/` with its own GOAL and steps is the fix.

**Spec depth follows foundation stability**: active step fully; later steps as
far as they're load-bearing and their premises settled; looser further out. Full
up-front detail = waterfall cost (one early mistake trashes downstream); no
forward spec = the ordering loses its constraint.

**The lifecycle recurses too**: a branch replays the chapter's temporal shape at
commit scale — opening commit ships the spec and authors the arc's face,
progress commits state only what they know, a consolidation commit closes the
arc ([commits](commits.md)).

**The outermost chapter**: the project itself, rooted at `history/` —
`history/GOAL.md` (the program's stable why), `history/PLAN.md` (roadmap scratch
and the project board — [future](future.md); the file persists because the
project never consolidates, but **no item outlives its own ripening**: work
begins → a chapter is born → the item dissolves into it; items stay thin;
spec-grade detail piling up means the item has outgrown its card — committed:
open the chapter; not committed: materialize into `future/` as an unborn
chapter), `history/META.md` ([meta](meta.md)). A PLAN allowed to hold work
forever would bypass the whole system.

Naming: `history/DATE_topic/` (+ issue ref when one exists). Reserved undated
names at any chapter root: `GOAL.md`, `PLAN.md`, `SPEC.md`, `META.md`,
`future/`, `archive/` — undated-vs-dated is the future-vs-born discriminator.
Archive older chapters to `history/archive/` when unwieldy; filenames are the
index.
