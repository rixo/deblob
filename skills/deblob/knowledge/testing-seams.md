---
source: docs/architecture.md § Architectural seams are not test instructions
---

# Seams are not test surfaces

The architecture creates internal seams everywhere — ports between sub-services,
private adapters, fractal nesting. They are **refactoring affordances** (places
where implementation can move without disturbing the rest), NOT an instruction
to test at each one. "Ports all the way down" does not mean "test surfaces all
the way down" — the pattern's point is the opposite: tests live at the boundary
that defines the contract.

**Default posture: test at the hexagon boundary.** Internals — extractors,
dispatchers, private helpers — are exercised through the public contract.

Internal unit tests are the exception, justified only when:

- **(a)** closed input set + pure logic, exhaustively testable in isolation (a
  path parser, a small algorithmic helper); or
- **(b)** reaching the case through the contract needs an absurd or contrived
  fixture, and the unit gives meaningfully better diagnostics.

Outside those, internal-seam tests do concrete harm:

1. **Test surface explosion** — symmetric internals invite symmetric test files;
   coverage climbs while the contract stays under-tested.
2. **Refactor friction** — tests pinned to internals neutralize the
   architecture's whole point (internals free to move).
3. **Diagnostic noise** — a failing unit test says _implementation moved_; a
   failing contract test says _behavior changed_. During refactors the first is
   noise, the second signal.
