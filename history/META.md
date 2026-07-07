# META — project-spanning methodology log

> Append-only ([sdd](../wip/sdd.md) §3). Insights about the practice itself,
> surfaced while working, harvested later into the living methodology docs.

## 2026-07-07 — the recursion has a top

Weeks of methodology work kept re-deriving "where were we, what's next?" in
conversation — the tell that GOAL and PLAN were missing at project scale. The
fractal already predicted the fix: the project is the outermost chapter,
`history/` is its directory, `history/GOAL.md` + `history/PLAN.md` +
`history/META.md` its binding docs. No new concept — one more turn of the same
crank. Corollary: the doc we had drifted into calling an "operation manual"
(ground rulings awaiting a home, staged next-steps) was never a doc kind of its
own — it was the outermost PLAN, misnamed. Naming a thing wrong hid that it
already had a place in the system.

## 2026-07-07 — all-dirs ladder reinstated (single-file moves were a mistake)

Field audit showed single-file chapters (level 1 as a loose `DATE_topic.md`)
break three things: chronological sort in dirs-first file viewers (files and
dirs never interleave), stable addressing (growth forces file→dir conversion,
breaking paths), and the fractal's no-exceptions claim (its first exception).
Fix: a move IS a directory from level 1 up — `DATE_topic/SPEC.md` — recursing
to steps (`01_topic/SPEC.md`). Cost accepted knowingly: many files named
`SPEC.md` (the caps-role family already ate this with GOAL/PLAN/META; nothing
imports a spec; the dir name carries identity).

## 2026-07-07 — `history/` over `specs/`: the anti-rot signal is the argument

Considered renaming the axis directory `specs/`. Kept `history/` on one blessed
rationale: the name does standing guard duty — it encodes "stale by design,
read for why, never for what-is" directly in the path, guarding agents (and
humans) against treating a frozen chapter as spec-of-record. A doc is a spec at
authoring time; the directory stores it at rest, and at rest it is history.

## 2026-07-07 — sanitize by invention, never by redaction

Two rounds of leak-scrubbing taught the same lesson twice. Redacting a real
reference (swapping a ticket prefix, blanking a number) leaves the *shape* of
the real thing — a dangling pointer to something unreachable, or a fictional
stand-in that still mirrors real work item by item. Both are disinformation.
The correct move is invention: examples come from a deliberately fictional
domain (here: icons / manifest / themes), designed once and reused
consistently across all docs, with no mapping back to any real codebase. And
a leak sweep is only complete when it covers **commit messages** — file
contents pass while commit bodies leak.

## 2026-07-07 — private shadow repo for source material

Practice research drips with client context that must not leak into a public
methodology repo. Working pattern: a private sibling repo (same history-axis
conventions) holds the raw captures — audits, inventories, postmortems, with
rulings recorded in place — and the public repo receives only sanitized
distillates (doc edits, generic examples). The handoff queue in each private
capture is the bridge. Research moves whose material is sensitive get a private
home without losing the methodology's shape.
