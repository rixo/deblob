---
source: docs/architecture.md § The acyclic dependency rule (rules 13–14)
---

# The acyclic dependency rule

Two levels, both CI-enforced by tooling — never by trusting humans or agents to
trace graphs:

**Service level (architectural).** Service dependencies form a DAG. ANY file in
A importing ANY file in B = an A→B edge — layers are irrelevant: A.model→B.model
plus B.service→A.model is still a cycle, and neither service can be extracted,
moved, or reasoned about independently. When a cycle threatens, apply the
sharing progression ([sharing](sharing.md)). Type-only imports count as edges
here (packaging, not composition — see [composition-rules](composition-rules.md)
rule 8).

**Module level (sanity).** No circular runtime imports between files, even
within one service: circular ESM typically works in dev and **silently fails in
production** — opaque `undefined` errors in minified code, brutally hard to
trace. Type-only circular references are exempt at this level (not an ESM
problem).

Enforcement is a hard requirement, not an aspiration: file-level detectors
(madge, dpdm) catch module cycles; service-level enforcement needs
boundary-aware tooling. Both belong in CI.
