---
source: docs/sdd.md §1, "Spec the operation over the domain"
---

# Spec the operation over the domain, not the cases

A recurring generation failure — agents, and deadline-pressured humans:
**enumerate the visible cases instead of stating the general operation.** The
mechanism is incentive, not ignorance: locally-passing output gets rewarded, and
covering the cases you can see is the safe way to pass. A model can recite "fold
over the domain, don't enumerate" and still enumerate while generating —
reciting a rule and reaching for it are different acts.

When a step's correctness depends on generality, the spec forces the general
form:

- **Name the domain and state the operation over the whole of it** — plainly, at
  the point of implementation, not only in the preamble. A fold over the domain,
  not a list of its known members.
- **Any measured count is evidence the set is open-ended** — never a target to
  enumerate.
- **A test asserts the openness** — an input carrying an unseen case still
  passes; a re-enumeration fails the gate by its shape.

This is the generation-time face of the systems-thinking gap the review gates
exist for ([review-gates](review-gates.md)).
