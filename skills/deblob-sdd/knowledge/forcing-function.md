---
source: docs/sdd.md §1
---

# The forcing function — ordering as constraint

Asking the right questions in the right order forces good architecture. Each
section **constrains** the next — skip one and the downstream section loses its
constraint. Same mechanism as TDD: the constraint IS the value.

The quintet:

| Section            | Forces                                                                                                                  |
| ------------------ | ----------------------------------------------------------------------------------------------------------------------- |
| **Goals**          | Articulate success before touching anything — prevents building the wrong thing.                                        |
| **API**            | Name the contracts you commit to, public AND internal seams ([api-section](api-section.md)).                            |
| **Testing**        | Answer "how do we prove this works as intended?" — strategy + completion gates ([testing-section](testing-section.md)). |
| **Implementation** | The code; part plan, mostly post-hoc record of what it actually does.                                                   |
| **Docs**           | Plan the living-doc impact upfront ([docs-section](docs-section.md)).                                                   |

**Depth is discretionary; the answer is not.** Minimum per section = the
high-level answer to its question — Testing's is the strategy, not necessarily a
test catalog; Docs' is the plan, not drafted docs. More detail whenever
complexity warrants or the author wants it. What's forced is that the question
gets _answered_ before moving on — never a word count.

The quintet materializes at every scale: [ladder](ladder.md).
