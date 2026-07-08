---
source: docs/architecture.md § Test isolation, § The test factory pattern
---

# Test isolation — setup is assembly, fixtures are adapters

**Test setup is assembly** (Rule 16): a test creates its service instance by
calling the factory with test-purpose dependencies. Everything follows:

- **Fixtures are adapters** — canned data implementing a port. Production
  adapters are fair game too if side effects are controlled and the test stays
  deterministic; what matters is isolation and determinism, not provenance.
- **Each test assembles its own instance** — each factory call owns its closure
  state; isolation is structural, no shared mutable state.
- **Production config never enters a test** — config is an adapter; tests inject
  test config ([pattern-config](pattern-config.md)).
- **Shared fixtures follow the sharing progression** like any shared code
  ([sharing](sharing.md)).

**The test factory pattern** — use it systematically, even for small files: one
factory per test module wrapping assembly with sensible defaults (real adapters
with fixture data, nominal config, mock ports); each test overrides only what
its scenario is about. Default argument values — harmful in production factories
— are appropriate here (no code splitting to defeat). Benefits: uniformity,
readability (a test's overrides announce its intent), assembly noise out of test
bodies, compounding LOC savings.

Pure model functions need no factory — plain arguments in, values out.
