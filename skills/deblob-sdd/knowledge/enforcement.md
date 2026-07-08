---
source: docs/sdd.md §6
---

# Enforcement — light for prose, mechanical for code

Two materials, two regimes:

- **Specs are prose and creative thinking; they don't ship to production.**
  Lightest effective enforcement: file-structure constraints (numbered steps
  created in order) + always-loaded agent instructions. Heavier mechanisms
  (protocols, MCP tooling) add complexity — escalate only when discipline
  demonstrably fails.
- **The architecture is software — it IS the program's behavior** — and
  justifies CI-enforced tooling
  ([arch acyclic](../../deblob/knowledge/acyclic.md)): dependency DAG, matrix,
  composition, visibility, all checkable by shape.

Mechanizing deterministic checks unloads the scarce resources: review attention,
and tokens — **sending agents to verify deterministic properties is the wrong
tool for the job**. Skills carry judgment; tooling carries determinism.
