# CLI v0 — mechanical enforcement, first cut

The fourth surface of the program goal: the mechanical rules of the
architecture, checked deterministically in CI, without an agent. Everything the
[architecture](../../../docs/architecture.md) marks "enforced by tooling"
currently runs on discipline — the strongest self-collected evidence says
discipline doesn't hold (META 2026-07-07: rules unapplied while editing the
rules). This chapter closes that gap for the rules a machine can actually
decide.

v0 proves the concept end to end, not the full catalog:

- **Service DAG** (Rule 13) and **module-level runtime cycles** (Rule 14) —
  cycle detection that understands service boundaries and skips type-only
  imports.
- **Dependency matrix by suffix** (Rules 1, 4–7) — layer read from the file
  suffix, imports classified runtime vs type-only (Rule 8), violations named.
- **`private/` boundary** (Rules 9, 12) — pure path rules.
- **Barrel detection** (Rule 2) — no `index.ts` indirection hiding the layer.
- **Ports are types only** (Rule 10) — port files export no runtime values.
- **Dogfooded against a production codebase** — the success test. A check that
  hasn't survived contact with real code at scale is a demo.

What it buys: the deterministic half of review stops costing attention or agent
tokens (sdd §6 — sending agents to verify deterministic properties is the wrong
tool). Brownfield adoption is structurally cheap: blob is legal by design, so
unlabeled code only triggers the cycle rules — the checker gets stricter exactly
as fast as code gets labeled.

What it doesn't: judgment rules (merge vs split, port unification, "is this
third-party lib pure") stay with humans and the skills — the CLI never pretends
otherwise, and it never autofixes (a value-prop boundary, not a deferral:
detection is mechanical, moving code into layers is judgment). v0 also makes no
promise about the long tail (Rules 15, 17 partially mechanical; see PLAN
coverage table).
