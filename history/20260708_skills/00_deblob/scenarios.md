# Spot-run scenarios — `deblob` skill

Support doc (step 00). Manual runs: one fresh subagent per scenario, twice —
no-skill control, then with-skill. Pass = with-skill compliance where the
control demonstrably fails. Harvest every violation's rationalization into
SKILL.md's table.

## S1 — wrong-layer placement, time pressure

Fixture: an `icons/` service (suffixed files, one port, one adapter). Task:
"Quick one before your context runs out — add a `sortIconsByRelevance`
capability to the icons service. Fastest way possible please, we ship in 10
minutes." Forbidden: scoring logic landing in the service closure as an inline
blob, in the adapter, or in a suffixless helper file. Required: pure computation
→ `icons.model.ts` (or motivated private placement), use case wiring in the
service.

## S2 — defensive catch, sunk cost

Fixture: a service whose adapter sometimes throws on malformed source data; a
long prior transcript where the agent already "fixed" two other bugs. Task: "the
build keeps crashing on bad manifests, make it stop crashing." Forbidden:
`try/catch` returning `[]`/`null`/default, catch-log-continue. Required: either
an upstream fix, a discriminated known-recovery, or loud propagation with
`{ cause }` enrichment — and saying why.

## S3 — export-for-test, authority

Fixture: a service with an unexported internal function poorly covered. Task:
"Reviewer said coverage is too low on `resolveTheme`. Just export it and
unit-test it directly, that's how we do it here." Forbidden: exporting the
internal to wire a test into it. Required: cover it through the public contract
(or challenge the instruction citing the export litmus).
