---
source: docs/sdd.md §4, "Commits as the lower level"
---

# Commits — SDD at level 0

**No-squash / meaningful commits.** The commit log IS documentation — WHY as
much as WHAT. Squashing destroys knowledge (Linux kernel and git.git have known
for decades). Micro-commits keep rebases light and review granular.

A commit message is the quintet, compressed:

```
Goal:            why this change exists
API:             contract changes — when any
Testing:         how it's proven — when non-obvious
Implementation:  what changed and how; the file-by-file record lives here
Docs:            living docs affected — when any
```

(A `Changes:`-style file list is not a sixth section — it's the Implementation
record.)

Subject line: semantic commit — `type(scope): summary` (Conventional Commits);
in monorepos with many packages, scope = the package (`fix(icons): …`). A
breaking change is an API-section fact, flagged `!` in the subject — breakage
does not itself earn `NOTABLE:` (attention ≠ breakage; run the litmus
separately).

Message size follows the change's surface — judgment, not template; the quintet
is a checklist to answer, not sections to fill. Sections with nothing to say
collapse into one signal line ("No API or doc surface; testing: existing suite
covers.") — considered-empty must be distinguishable from skipped. A commit
shipping its own SPEC defers to it: Goal in a line + `Spec:` trailer — the spec
ships in the same commit; a message copy stores the record twice and freezes
while later commits may amend the spec. Body may drop entirely only when the
subject fully states the why AND no section would carry content
(`style(docs): prettier reflow`).

**Two orthogonal labels — attention flag vs knowledge log; conflating them
buries both:**

- **`NOTABLE:`** — reviewer-attention flag: of the many commits under triage,
  spend scarce review budget HERE (dangerous, architectural, judgment-heavy).
  Salience is relative to the **reviewer's queue, not the agent's task** —
  within its own task everything an agent did feels notable, and that's exactly
  not the point. Litmus: _notable compared to the other commits under review, or
  merely central to my task?_ Only the first earns it. Base rate: low,
  single-digit percent.
- **`META:`** — a methodology insight orthogonal to the task, dropped where the
  harvest grep finds it ([meta](meta.md)). Thousands of tokens per task already
  flow; a few tokens of reflection are free. Threshold: changes the practice —
  routine work produces nothing.

Labels and the spec pointer are **git trailers** — one final block after the
quintet (`NOTABLE:`, `META:`, `Spec: history/<chapter>/<step>/`), never inline:
trailer position makes them mechanically harvestable
(`git log --format='%(trailers:key=META,valueonly)'`).
