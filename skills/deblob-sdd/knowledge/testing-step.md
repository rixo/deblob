---
source: docs/sdd.md §1 (step table, "On TDD and test ordering")
---

# The Testing step — strategy, not catalog

The Testing section answers **"how do we prove this works as intended?"** — the
verification strategy, **including completion criteria and gates** ("done
when…"). Thinking _how do we verify_ before committing to an approach forces
decoupling: can't test without IoC.

- A _thinking_ step, not strict TDD. Strict TDD with agents works only under
  tight supervision (its benefit: preventing tests that test wind);
  unsupervised, agents cheat grossly at it.
- Test-first vs implementation-first with agents: **genuinely unsettled** — fast
  agent iteration makes mid-implementation discovery common, and tests can grind
  the flow. No strong opinion held; don't pretend one.
- The _mechanical_ forcing function lives elsewhere: **100% coverage through the
  public API**
  ([arch testing-contract](../../deblob/knowledge/testing-contract.md)) — which
  requires a sufficiently unblobby codebase to pull off.
- Detail level: the strategy is the minimum; enumerating tests is welcome when
  complexity warrants ([forcing-function](forcing-function.md)).
