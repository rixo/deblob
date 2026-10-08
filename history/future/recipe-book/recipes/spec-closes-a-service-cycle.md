---
captured: 2026-09-18
from: driver-layer step 04, checkpoint 2
status: NOT RATIFIED — kept for a fresh-eye assessment (rixo, 2026-09-18). To re-discuss then: likely folds into harness-is-service-plus-front as its "where it lives" paragraph; the one fact to keep either way — a spec file marks no unit root, so a spec outside every unit opens no DAG edge, which is what lets a corpus read across units without becoming a dependency of any (a line for the harness recipe or the DAG knowledge card)
---

# A suite shared across units closes a cycle between them

**Problem.** Some test code is shared across the specs of several units and
itself imports those units: a harness over the whole chain, a fixture builder, a
suite that builds from two units. Wherever you file it, the specs that use it
import it, and the DAG counts every file, specs and suites included. Put it in
unit A and A's own specs are fine, but B's specs importing it make B depend on A
while the suite depends on B. The cycle check fires the moment the suite sits
"next to the specs that use it". (Probed 2026-10-08: a suite in `a/` importing
`b/`'s service, called by `b/`'s spec, is `no-service-cycle` on both files.)

**The move.** Give the shared test code a place of its own, above everything it
wires, and let the specs that use it live next to it rather than next to the
units they exercise. A spec file carries no layer suffix and marks no unit root,
so a spec sitting outside every unit opens no edge in the DAG. What is shared
imports downward only. A suite that serves one unit, a port's suite called by
its adapters' specs, stays next to that port: nothing crosses.

**Why it is right.** A corpus of behavior tests over the whole chain is a thing
of its own, not a facet of any one unit (rustc's `tests/ui` is the precedent). A
spec outside every unit is what lets it read across units without becoming a
dependency of any.

**The instance in deblob.** The verdict corpus. The harness imported the
detectors of `check/`, config, extraction and fs; placed in `check/` next to the
check specs, the self-check reported one `no-service-cycle` violation. Moved:

```
lib/cases/                 no unit root here: the corpus files sit in no unit
  layers.spec.ts           describe("layers"), the rows
  dag.spec.ts
  runner/                  a unit of its own, imports downward only
    markers.model.ts
    ports/check.port.ts
    runner.service.ts
    cases.assembly.ts
```

Self-check back to zero violations.

**Where.** `lib/cases/`.
