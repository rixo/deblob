# PLAN — rolling roadmap

> The outermost chapter's PLAN ([sdd](../wip/sdd.md) §3): scratch where the
> next chapters stage. Consolidates continuously — items shed into chapters
> and living docs as they crystallize. Absorbed the former "operation manual"
> (which was this file, misnamed).

## Staged next

1. **Promote `wip/` → `docs/`** — README rewritten as front door (what deblob
   is, map, install); merge `wip` branch → `main`. Unblocks the citable
   architecture-doc story (consuming repos currently cite a ghost file).
2. **Reconcile `sdd.md` with the field audit** (private capture, 2026-07-07):
   - level-0 grammar: reconcile with the practiced
     `Goal/Changes/API/Implementation` form — `Changes` maps into the
     quintet's Implementation (the record of what changed); no new section
     kind;
   - split **NOTABLE** (reviewer-attention flag, feeds the review gates) from
     **META** (methodology log, feeds the harvest) — include calibration:
     salience is relative to the reviewer's queue, not the agent's task;
     expected base rate low (~6% observed); litmus: "notable compared to the
     other commits under triage, or merely central to my task?";
   - name the recurring support sections (Decisions log, Open questions /
     Out of scope, Commits trailer);
   - **ruled: `3-testing`** (not `3-tests`) — the section answers "how do we
     prove this works as intended?", not a minute catalog of tests to
     implement; align the quintet table's "Tests" wording;
   - **`5-docs` is a hard upfront requirement, not a trailing nicety**: the
     spec gate must answer "how is this taught? which existing living docs
     are affected from the get-go?" before implementation runs — the step
     most likely to be glossed over, so homework comes before play. Design
     the enforcement for it and for PLAN-cleanup (0% self-execution observed
     — the gap is enforcement, not design);
   - **rule on the `> **What this is.**` doc-header blockquote**: keep or
     clean out. Leaning noise — tokens spent restating what a proper learning
     path (humans) and progressive disclosure (agents) should carry; datapoint:
     superpowers, far deeper-resourced on agent behavior, doesn't do it. Until
     ruled: stop adding new ones.
3. **Scaffold** — pnpm workspace, `.claude-plugin/plugin.json`,
   `packages/cli` skeleton, `tests/` for skill scenarios.
4. **Skills GREEN** — order: `deblob` → `deblob-commit` → `deblob-review` →
   `deblob-sdd` (last: depends on item 2 landing). Per skill: SKILL.md under
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
   its RED list (item 5 harness). Distribution ruled: skills via git plugin
   marketplace, CLI via npm — skills carry judgment, CLI carries determinism
   (sdd §6). Authoring per superpowers' writing-skills method (MIT).
5. **Pressure-test harness** — concrete shape, not vibes:
   `tests/<skill>/<scenario>.md` = task prompt + pressures applied (time /
   sunk cost / authority / exhaustion) + forbidden behaviors + required
   behaviors. Runner: one fresh subagent per scenario, always paired with a
   no-skill control; verbatim transcripts kept; every violation's
   rationalization harvested into the skill's table. Pass bar: all scenarios
   compliant with-skill AND baseline failure demonstrated without (a scenario
   the baseline already passes tests nothing). Start: 3 scenarios for
   `deblob` (matrix violation under time pressure; defensive catch under
   sunk cost; export-for-test under authority).
6. **CLI v0** — service DAG, module cycles, dependency matrix by suffix,
   composition rules, `private/` boundary, barrel detection. Dogfood against
   a production codebase.
7. **Architecture doc touches** — `XxxService` (not `XxxServiceAPI`) in
   examples; Store pattern reality check (zero `.store.ts` in practice —
   role, not file kind). (Rule 10 stands as written: ports are types only —
   an earlier softening idea was a misreading, since reverted in the guide.)

## Parked / awaiting material

- **Coverage tooling note** — how transitive-100% on test utils is actually
  measured; → implementation guide §8 once the recipe exists.
- **Svench flavor guide** — second implementation guide (context-composition
  flavor: bare layer filenames, `use*` hooks, context-tree assembly); proves
  "several valid guides, one foundation" with a real second data point. After
  the factory-injection guide stabilizes.
- **README/living-doc structure** (sdd open question) — next normalization
  target after the above.
