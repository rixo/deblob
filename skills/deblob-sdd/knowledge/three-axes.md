---
source: docs/sdd.md §2
---

# Three axes — history, living docs, the future

The organizing principle. A project needs three different things, each of which
**rots if mixed with another**:

| Axis                                 | Indexed by      | Lifecycle                    | Answers                                            |
| ------------------------------------ | --------------- | ---------------------------- | -------------------------------------------------- |
| **History** (`history/`)             | Time            | Append-only archive          | _why / how did we get here_                        |
| **Living docs** (READMEs)            | Location        | Always-current               | _what is it right now_ — today's API               |
| **Future** (PLAN boards + `future/`) | Priority, topic | Gestating — born as chapters | _what's intended next_ — intent, not yet knowledge |

- History kept current becomes lies about the past. READMEs made historical
  become stale half-updates. Future items outliving their truth become a backlog
  of lies — never read a card as commitment without checking age (`captured:`)
  and whether the work already shipped.
- **The asymmetry**: history is preserved (append-only), living docs are
  maintained (always-current), the future is kept honest by **turnover** — every
  item ends as a born chapter or gets dropped; an item that stops moving is the
  rot. Board and payload mechanics: [future](future.md).
- **Rule for agents: history answers _why_, never _what-is_.** A frozen
  chapter's constraints may be stale **by design** — never read a chapter as a
  description of the present.
- **A plan only survives until contact with reality. Past plans in history are
  NOT canon.** Canon = living docs + the _latest_ plans (current outermost PLAN,
  active chapter's spec). A frozen SPEC records what was decided and done at its
  date; its forward-looking parts died when reality answered. Reading an old
  roadmap as commitment is the same axis-mixing error.
- Consolidation lives on the living-docs axis; the chronology stays where it is
  — never dissolved into one giant doc. Scratch (PLAN, WIP) is cleaned at
  consolidation; its knowledge migrates to steps, commits, living docs.
- History is durable project knowledge and stays in the repo. "It could
  influence agents" — influencing agents is the entire value proposition,
  governed by the rule above.
