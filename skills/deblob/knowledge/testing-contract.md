---
source: docs/architecture.md § Testing through the contract (rules 15–16)
---

# Testing through the contract

Tests go through the public API — input via the API, assertions on documented
behavior. **Structural, not stylistic**:

- Tests prove the contract holds: given these inputs, this guaranteed output or
  effect.
- No implementation details — not in how tests call, not in what they assert.
- Not part of the public contract → not tested. Changes without breaking the
  contract → no test breaks.
- Factory closures physically enforce it: you can't reach into the closure, only
  exercise the returned API.
- **Never export an internal "for tests."** Litmus: would the export survive
  deleting the tests? Genuine promotion to public API = fine; reaching into
  internals under cover of an export = violation.

Established practice, not invention: Parnas (information hiding), Meyer (Design
by Contract), Beck (refactoring must not break tests). The architecture makes it
enforceable by structure instead of discipline.

Companions: [testing-seams](testing-seams.md) (where NOT to test),
[testing-isolation](testing-isolation.md) (how to set up),
[testing-reviewer](testing-reviewer.md) (who tests are written for).
