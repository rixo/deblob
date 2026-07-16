---
source: docs/sdd.md §4
---

# The review gates — where scarce attention goes

The economics: production got cheap, review stayed expensive — **review is the
bottleneck**. The methodology's job is concentrating human review attention
where it pays. Two gates:

1. **Spec gate** — human reviews Goals + API _before_ implementation runs away.
   Catches wrong-thing-building, implementation-driven design, surface bloat at
   the cheapest moment. The gate approves **direction**: far-future detail is
   placeholder until its ground is active; challenging every projection is
   paralysis by analysis — and frozen plans aren't canon anyway
   ([three-axes](three-axes.md)).
2. **Test gate** — human reads the tests as the behavioral spec at
   consolidation. Tests go through the public API, so they read as behavior
   statements
   ([arch testing-reviewer](../../deblob/knowledge/testing-reviewer.md)).
   Accepting a test that plainly says the API does something dumb is a review
   problem.

Between the gates, implementation review is **opportunistic — selective, never
passive**. Mechanically-enforced structure + 100% contract coverage carry the
weight.

**The System-2 surfaces.** Agents fail at systems thinking — they solve the
_case_, not the _class_; patch the instance without stepping to the generic. Two
spec surfaces hold that judgement: **API** (incl. public/internal boundary) and
**Implementation** (the approach, not the diff). The reviewer engages deliberate
attention exactly there; the question is always case-vs-class. Stakes are
asymmetric: a systems-thinking miss at the API is a ticket to the wrong
destination, its cost compounding later — the gate is the only cheap
catch-point. Tie the gate to this failure mode or it decays into ritual.
