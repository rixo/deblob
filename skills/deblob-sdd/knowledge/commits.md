---
source: docs/sdd.md §4, "Commits as the lower level"
---

# Commits — SDD at level 0

**No-squash / meaningful commits.** The commit log IS documentation — WHY as
much as WHAT. Squashing destroys knowledge (Linux kernel and git.git have known
for decades). Micro-commits keep rebases light and review granular.

A commit message is the quintet, compressed — empty sections drop:

```
Goal:            why this change exists
API:             contract changes — when any
Testing:         how it's proven — when non-obvious
Implementation:  what changed and how; the file-by-file record lives here
Docs:            living docs affected — when any
```

(A `Changes:`-style file list is not a sixth section — it's the Implementation
record.)

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
