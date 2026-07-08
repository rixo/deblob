---
source: docs/architecture.md § Assembly (both sections)
---

# Assembly — the necessary evil

The outermost layer. Assembly doesn't translate between interfaces — it **builds
the system**: imports concrete adapters, reads config, calls factories, wires
ports, makes services available. Cross-cuts every domain, depends on everything,
coupled to the runtime — the one layer where "glue code" is a fair label, and
essentially untestable.

- The only code allowed to import composition units (`.service.ts`,
  `.adapter.ts`) and blob ([dependency-matrix](dependency-matrix.md)).
- **Discipline: keep it thin.** Every line of logic here can't be tested in
  isolation — push everything pushable into the service layer.
- A shared composition unit (service/adapter instance, e.g. one
  `createNodeFs()`) is instantiated once at the root and threaded down — central
  control of side-effect surfaces is assembly's point.
- Forms vary, role doesn't: CLI `main.ts` (eager root), DI container, Svelte
  context providers (lazy, hierarchical), a test setup function — test setup IS
  assembly ([testing-isolation](testing-isolation.md)).

**Driver vs assembly litmus**: "can I meaningfully define a port for this?" Yes
→ service code behind the port. No — abstracting the whole thing would marry a
huge indirection to its single implementation (React, SvelteKit, a CLI
framework) → assembly glue. Abstract _parts_ of big frameworks from a service's
scoped perspective (a routing port); never the whole framework.

In simple apps, driver and assembly share a file — fine; recognize the two hats
and separate when it grows.
