---
source: docs/sdd.md §3, "The future: the board and unborn chapters"
---

# The future — board and unborn chapters

Future work is plan material — never invent a new doc kind or tracker for it:
the board is a role of PLAN, the payload is a chapter minus its date. Hard
separation: orchestration state lives on the board, all of it; payload lives in
the tree, none of the state.

- **Board = a PLAN's `## Future` section** (the outermost PLAN's is the project
  board; a chapter's PLAN boards its own `future/`). Its body is the staged
  queue — ordered, top item = next chapter born. Staged means _will do_, nothing
  more: fully-specified or a bare name, both legal. The one marked subsection,
  `### Ideas`, is the capture pool — maybes, unordered, zero-cost entry.
  **Position is priority**; there is no priority field. Everything else rides as
  card annotation: `— blocked: <what>`, the payload pointer, opt-in tags (size /
  area / depth) for self-service picking.
- **Payload = `future/<topic>/`, an unborn chapter**: a directory always
  (all-dirs rule), quintet and ladder applying inside as in any move — minus the
  date. **No state in the tree**: no status dirs, no draft suffixes, no stage in
  filenames — file-tree backlogs rot exactly there (state encoded in locations
  nobody moves). Tree answers only "where is the payload for card X".
- **Graduation = dating rename.** Work begins →
  `git mv history/future/<topic> history/<date>_<topic>`; the card dissolves.
  Always a plain rename, never file→dir conversion; nothing copied, nothing left
  to rot.
- **Fractal + sweep.** Any chapter may grow its own `future/` mid-work — capture
  is one new dir with one file, no ceremony. Consolidation sweeps it empty: each
  item graduates into a step, hoists to the parent's `future/`, or dies with the
  scratch.
- **Invariant, lintable**: board cards ↔ `future/` entries form a bijection —
  every entry has a card, every pointer resolves. `captured: <date>` on each
  item keeps age visible.
- Never add a Done section — graduation already removed the card; done work is
  the chapter itself. A card whose work shipped is a missed graduation: remove
  it.
