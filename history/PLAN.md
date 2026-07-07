# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../docs/sdd.md) §3): scratch where the
> next chapters stage. Consolidates continuously — items shed into chapters
> and living docs as they crystallize. Absorbed the former "operation manual"
> (which was this file, misnamed).

## Staged next

1. **Scaffold** — chapter born: `history/20260707_scaffold/` (repo layout is
   its API section). Workspace + plugin manifest + harness home only; no CLI
   skeleton.
2. **Skills GREEN** — order: `deblob` → `deblob-commit` → `deblob-review` →
   `deblob-sdd` (last: depends on the sdd-field-reconciliation chapter). Per skill: SKILL.md under
   ~500 words (trigger-only `description: Use when…`, hard rules, decision
   points), companion reference files for anything heavy, rationalization
   table seeded from its documented failures. RED material per skill:
   - `deblob`: import/matrix violations, defensive catch, export-for-test,
     coverage-exclusion instinct, `__tests__` instinct, barrel instinct;
   - `deblob-commit`: NOTABLE over-flagging (~6% base rate), body-less
     commits, squash instinct;
   - `deblob-review`: self-review-checklist "honest limits" section verbatim
     (tests-green→done pattern-match); absorbs the checklist, then tombstone;
   - `deblob-sdd`: section drift, PLAN sprawl, scratch wedged into step
     numbering, case-enumeration instead of domain operation.
   Exit per skill: with-skill micro-test passes on the scenarios drawn from
   its RED list (item 3 harness). Distribution ruled: skills via git plugin
   marketplace, CLI via npm — skills carry judgment, CLI carries determinism
   (sdd §6). Authoring per superpowers' writing-skills method (MIT).
   Includes the enforcement design for `5-docs` and PLAN hygiene (prescriptions
   landed in sdd; the mechanism lands here and/or in the CLI).
3. **Pressure-test harness** — downscoped (2026-07-07): scenario *docs* ride
   with each skill; runs start as manual spot-checks; the automation below
   only if wording iteration demands it (real cost: ~30 subagent runs per
   wording iteration per skill, plus transcript judging). Full shape if/when
   automated:
   `tests/<skill>/<scenario>.md` = task prompt + pressures applied (time /
   sunk cost / authority / exhaustion) + forbidden behaviors + required
   behaviors. Runner: one fresh subagent per scenario, always paired with a
   no-skill control; verbatim transcripts kept; every violation's
   rationalization harvested into the skill's table. Pass bar: all scenarios
   compliant with-skill AND baseline failure demonstrated without (a scenario
   the baseline already passes tests nothing). Start: 3 scenarios for
   `deblob` (matrix violation under time pressure; defensive catch under
   sunk cost; export-for-test under authority).
4. **CLI v0** — service DAG, module cycles, dependency matrix by suffix,
   composition rules, `private/` boundary, barrel detection. Dogfood against
   a production codebase. **Opens with a research move**: boundary-detection
   approach, config shape, ts-morph vs madge/dpdm, output format — no design
   exists yet.
5. **Architecture doc touches** — `XxxService` (not `XxxServiceAPI`) in
   examples; Store pattern reality check (zero `.store.ts` in practice —
   role, not file kind). (Rule 10 stands as written: ports are types only —
   an earlier softening idea was a misreading, since reverted in the guide.)

## Parked / awaiting material

- **Doc-header blockquote ruling** (`> **What this is.** …`): keep or clean
  out — leaning noise vs learning path (humans) and progressive disclosure
  (agents); superpowers doesn't do it. Until ruled: no new ones.

- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Svench flavor guide** — second implementation guide (context-composition
  flavor: bare layer filenames, `use*` hooks, context-tree assembly); proves
  "several valid guides, one foundation" with a real second data point. After
  the factory-injection guide stabilizes.
- **README/living-doc structure** (sdd open question) — next normalization
  target after the above.
