---
source: docs/sdd.md §1, "The API section covers internal seams"
---

# The API step — internal seams included

"API" reads as the consumer contract; stopping there leaves a whole bug class
unconstrained. A port improvised at code time gets cut at the wrong layer — and
a domain decision that slips to the far side of an injected boundary becomes
unreachable through the real composition: unit tests stub the port, the decision
vanishes from every tested path, all green while the wiring is broken.

**API = the contracts you commit to, at every layer that has one.** The spec
forces naming:

- the **ports** — boundaries to be injected;
- the **purity split** — pure model function vs effectful adapter;
- the **home of each domain decision** — which layer owns it; a domain decision
  must never hide inside an adapter.

**Guardrail — don't over-spec** (Piskala): NOT "spec every internal signature" —
that rots instantly and drowns signal. Force only the load-bearing contracts:
ports, pure/effectful boundary, decision placement — what's expensive to get
wrong and hard to move. Leaf signatures stay free.

**Test corollary**: a stub at a port erases everything on its far side. Domain
decisions belong on the _inside_ of the injected boundary (service or model);
the API spec naming the port-vs-domain split is what guarantees the placement.
