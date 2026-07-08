---
source: docs/sdd.md §3, "META: the methodology log"
---

# META — the methodology log

History records _what happened_; living docs record _what is_. Neither fits an
observation about **the practice itself**, surfaced while doing the work. That's
META: a history-axis, append-only log of methodology insights, harvested later
by grep (`history/**/META.md` + commit `META:` labels) into the living
methodology docs. The filename IS the index — naming consistency is the
cornerstone.

- **Bar: salient methodology insight** — something that changes the _practice_.
  Task findings belong in steps and commits; doc corrections go upstream in the
  docs; routine work produces nothing.
- **Entries dated and themed**, append-only.
- **Placement follows the triggering work's form**, same ladder as the spec:
  commit-scale → `META:` section in the message ([commits](commits.md)); any
  move from level 1 up → `META.md` in its directory (always its own file, never
  a spec section — META is off-topic by nature, and a move is always a
  directory); chapter-spanning → chapter-root META.md; project-spanning →
  `history/META.md` ([chapters](chapters.md)).

Distinct from `NOTABLE:` — attention flag vs knowledge log; conflating them
buries both ([commits](commits.md)).
