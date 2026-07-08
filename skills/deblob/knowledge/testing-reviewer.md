---
source: docs/architecture.md § Tests are written for the reviewer
---

# Tests are written for the reviewer

Beyond going through the contract, tests optimize for **reading, not writing**.
The reviewer reads the suite as the behavioral specification
([sdd review gates](../../deblob-sdd/knowledge/review-gates.md), test gate) —
that only works, and only stays cheap, if every test is legible as a behavior
statement:

- Shape obvious: **given X, when I do Y with Z, I expect A, B and C** — visible
  in the test body, not reconstructed from helpers.
- **Unit under test at a glance** — named in the title, the exercised call
  prominent.
- **Fixture → assertion reads naturally** — inputs and expectations close enough
  to compare by eye; inline the values the assertion is about.

A suite optimized for writing — clever helpers, data-driven indirection, DRY-ed
setup hiding the scenario — can hit 100% coverage and still defeat the review
gate: illegible tests cost exactly the reviewer attention the whole system
exists to save. **Duplication between tests is cheaper than illegibility at the
gate.**

The test factory serves this ([testing-isolation](testing-isolation.md)):
assembly noise leaves the body; what remains is the scenario.
