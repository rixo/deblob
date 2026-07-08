---
source: docs/sdd.md §2
---

# Two axes — history vs living docs

The organizing principle. A project needs two different things, each of which
**rots if mixed with the other**:

| Axis                      | Indexed by | Lifecycle           | Answers                              |
| ------------------------- | ---------- | ------------------- | ------------------------------------ |
| **History** (`history/`)  | Time       | Append-only archive | _why / how did we get here_          |
| **Living docs** (READMEs) | Location   | Always-current      | _what is it right now_ — today's API |

- History kept current becomes lies about the past. READMEs made historical
  become stale half-updates. Refusing to mix keeps both honest.
- **Rule for agents: history answers _why_, never _what-is_.** A frozen
  chapter's constraints may be stale **by design** — never read a chapter as a
  description of the present.
- **A plan only survives until contact with reality. Past plans in history are
  NOT canon.** Canon = living docs + the _latest_ plans (current outermost PLAN,
  active chapter's spec). A frozen SPEC records what was decided and done at its
  date; its forward-looking parts died when reality answered. Reading an old
  roadmap as commitment is the same axis-mixing error.
- Consolidation lives on the living side; the chronology stays where it is —
  never dissolved into one giant doc. Scratch (PLAN, WIP) is cleaned at
  consolidation; its knowledge migrates to steps, commits, living docs.
- History is durable project knowledge and stays in the repo. "It could
  influence agents" — influencing agents is the entire value proposition,
  governed by the rule above.
