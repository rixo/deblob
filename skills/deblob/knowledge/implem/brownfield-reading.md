---
source: docs/implementation-guide.md §9
---

# Reading a real codebase — debt, not variant conventions

Brownfield reality: codebases adopting this flavor carry residue. When
inspecting one, these are **debt — do not imitate**:

- `index.ts` barrels inside the codebase ([no-barrels](no-barrels.md)) —
  package-boundary entry files are the unresolved case; in-codebase barrels are
  always debt.
- Unmotivated coverage excludes / per-package divergent exclude lists
  ([testing-in-practice](testing-in-practice.md)).
- Suffixless helper files inside service dirs — blob awaiting distillation
  ([file-naming](file-naming.md)).
- Inline per-test assembly where a test factory should be.
- A defensive `catch` ([error-management](error-management.md)) — always debt,
  no exception to grandfather.

The load-bearing surface is what makes violations visible by shape: suffix
conventions, factory naming, the no-barrel rule. Grouping directories, util file
layout, and other filing choices are yours.
