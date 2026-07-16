---
source: docs/sdd.md §1 (section table, "On TDD and test ordering")
---

# The Testing step — strategy, not catalog

The Testing section answers **"how do we prove this works as intended?"** — the
verification strategy, **including completion criteria and gates** ("done
when…"). Thinking _how do we verify_ before committing to an approach forces
decoupling: can't test without IoC.

- A _thinking_ step, not strict TDD. Strict TDD with agents works only under
  tight supervision (its benefit: preventing tests that test wind);
  unsupervised, agents cheat grossly at it.
- Test-first vs implementation-first: **out of scope for this methodology — it
  imposes no tactic, and never present one as its rule.** A project or team is
  free to adopt their own; follow theirs when stated. (Conviction exists —
  red-first, falsifiability — but tactics aren't what this method provides.)
- The _mechanical_ forcing function lives elsewhere: **100% coverage through the
  public API**
  ([arch testing-contract](../../deblob/knowledge/testing-contract.md)) — which
  requires a sufficiently unblobby codebase to pull off.
- Detail level: the strategy is the minimum; enumerating tests is welcome when
  complexity warrants ([forcing-function](forcing-function.md)).
