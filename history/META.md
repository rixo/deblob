# META — project-spanning methodology log

> Append-only ([sdd](../docs/sdd.md) §3). Insights about the practice itself,
> surfaced while working, harvested later into the living methodology docs.

## 2026-07-07 — the outermost PLAN is mortal per item

Probing "what does PLAN-as-temporary-artifact mean for the root PLAN" exposed a
loophole: a legitimately-permanent rolling PLAN is a blank check to bypass SDD
entirely — all work lives forever as staged scratch, no chapters born, no gates
fire, history stays empty. Resolution: same mortal object at every scale; the
outermost chapter merely lacks a terminal event, so dissolution is per-item,
triggered by chapter birth. Corollary smell: spec-grade detail accumulating in a
PLAN item means a chapter wants to be born — caught red-handed the same day (the
roadmap items were carrying full spec payloads).

## 2026-07-07 — plans are not canon; the gate approves direction

Reviewing the scaffold spec surfaced a reviewer posture worth naming: approve
the direction while _knowing_ some spec'd details won't survive (the layout
extension rules, say) — challenging every projection at the gate is paralysis by
analysis: demanding up-front certainty about ground nobody has stood on yet, the
classic waterfall mistake. This only works if the system spells out the flip
side: a plan survives until contact with reality, so **past plans in history are
not canon** — canon is living docs + latest plans. Both now stated in sdd (§2
agent rule, §4 spec gate).

## 2026-07-07 — rules unapplied while editing the rules (enforcement-gap evidence)

A full day spent editing sdd.md — including its commit-grammar section — and
none of the day's commits used the level-0 quintet, nor did the planned work get
a chapter. The rules were _in the context window_ and still didn't drive
behavior: knowledge in view ≠ behavior, without something that loads and
enforces it (skills, always-on instructions, CI). Strongest self-collected
RED-phase evidence yet for the flight-manual work; also calibrates expectations
for coworkers' compliance.

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
Fix: a move IS a directory from level 1 up — `DATE_topic/SPEC.md` — recursing to
steps (`01_topic/SPEC.md`). Cost accepted knowingly: many files named `SPEC.md`
(the caps-role family already ate this with GOAL/PLAN/META; nothing imports a
spec; the dir name carries identity).

## 2026-07-07 — `history/` over `specs/`: the anti-rot signal is the argument

Considered renaming the axis directory `specs/`. Kept `history/` on one blessed
rationale: the name does standing guard duty — it encodes "stale by design, read
for why, never for what-is" directly in the path, guarding agents (and humans)
against treating a frozen chapter as spec-of-record. A doc is a spec at
authoring time; the directory stores it at rest, and at rest it is history.

## 2026-07-07 — sanitize by invention, never by redaction

Two rounds of leak-scrubbing taught the same lesson twice. Redacting a real
reference (swapping a ticket prefix, blanking a number) leaves the _shape_ of
the real thing — a dangling pointer to something unreachable, or a fictional
stand-in that still mirrors real work item by item. Both are disinformation. The
correct move is invention: examples come from a deliberately fictional domain
(here: icons / manifest / themes), designed once and reused consistently across
all docs, with no mapping back to any real codebase. And a leak sweep is only
complete when it covers **commit messages** — file contents pass while commit
bodies leak.

## 2026-07-07 — private shadow repo for source material

Practice research drips with client context that must not leak into a public
methodology repo. Working pattern: a private sibling repo (same history-axis
conventions) holds the raw captures — audits, inventories, postmortems, with
rulings recorded in place — and the public repo receives only sanitized
distillates (doc edits, generic examples). The handoff queue in each private
capture is the bridge. Research moves whose material is sensitive get a private
home without losing the methodology's shape.
