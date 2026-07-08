---
source: docs/sdd.md §3 (shape, ladder, SPEC.md family)
---

# The materialization ladder — one shape, four sizes

The spec shape — Goals → API → Testing → Implementation → Docs — is the same at
every scale: a commit, a file, a directory, a directory of steps. **The fractal
is the learning model**: learn the shape once, read any unit of history. The
claim survives only with zero exceptions — a scale that seems to demand its own
shape is a modelling smell, never a licence.

Only materialization scales:

| Level | Form                                              | For                                   |
| ----- | ------------------------------------------------- | ------------------------------------- |
| **0** | Commit message — quintet as compressed sections   | contained side-show found mid-mission |
| **1** | Directory + single `SPEC.md` (embedded sections)  | most planned work — one unit          |
| **2** | Directory + split section files (`1-goals.md`, …) | sections earn their own files         |
| **3** | Directory of steps — each step itself a spec      | big work, chronological slices        |

- **From level 1 up, a move IS a directory — no exceptions.** Sort survives
  dirs-first viewers; growth upgrades in place (add files next to SPEC.md); the
  fractal stays exceptionless.
- `SPEC.md` joins the caps-role family (GOAL, PLAN, META): file named by role,
  identity carried by the directory. Cost owned: nothing imports a spec, the dir
  name is always in view.
- The ladder is explicit permission to keep small things small — level 1 is ONE
  file in its directory. **When unsure: level 1.**
- Levels 1–3 = planned work; level 0 = a genuinely contained detour discovered
  mid-task. "Contained" is load-bearing: stumbling on a need is NOT a licence to
  skip planning a full refactor. Judgement always.

Recursion and chapter anatomy: [chapters](chapters.md). Commit grammar:
[commits](commits.md).
