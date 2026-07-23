---
captured: 2026-07-23
---

# Sales speech — old pots, new balances

Captured post-session (rixo, solo thinking while preparing for bed, 2026-07-23 —
closes the 07-22/23 night arc; kin cards: `../graph-as-product/`,
`../review-slicing/`). The deblob pitch, precised.

## The frame

We cook in old pots — forged before AI was anything to think about, and fully
sound in their birth context: the need they answer is old (proto-forms of this
arch predate the AI era in rixo's own projects — see graph-as-product §Why now).
The nature (~physics) of things hasn't changed, so the old principles hold —
Cockburn, Martin, Lakos, Evans; the arch doc already says it ("the contribution
is making the principles prescriptive and implementable, not the principles
themselves"). But **the balances have changed** — and "balances" means precisely
_resource availability_: like going from having coal to having petrol, the
physical laws have not changed, the scarcities and abundances have. Code
production became abundant; reviewer engagement and agent big-picture became
scarce. So we apply _different decisions_, in accord with old principles, to
cater for _new objectives_ — review attention economics, agent locality, code
raining.

Honest by construction: old principles credited, new decisions owned, nothing
claimed invented that wasn't. The no-overselling rule applies to the speech
itself.

## The pillars as decision guides

Each pillar is a lens that turns a principle into a house decision:

- **Review attention economics**
  - _Cut the waste_ → the 100%-through-public-API coverage bar, decoded:
    coverage buys confidence that the code is **fully represented in the tests**
    — efficacy, not efficiency. Consequence: reviewing tests ≈ reviewing code,
    and tests are more readable than code (canon's
    tests-written-for-the-reviewer section); through-public means the tests must
    make sense as behavior statements. The coverage bar is a pillar-1 decision,
    not a quality fetish — same connection-shape as the rule-13 raison d'être
    found this session (standing decision, value-level why attached late).
  - _System 2 attention is the scarce input_ → review slicing
    (`../review-slicing/` — working alias deblob-review-carbon; the suffix
    instinct won): slice by reviewable concerns.
- **Mitigate the locality problem** → the graph/zoom navigator
  (`../graph-as-product/` — name candidate: **archonaute**), on the closed-set
  grammar + defined roles.

## Disposition

- Feeds: README/pitch material at publish time; the naming candidates are
  recorded on their respective cards.
- The coverage-as-representation decoding is also a docs-rationale candidate
  (why the 100% bar — currently stated as rule, not decoded as pillar-1
  economics); weigh at the same time as the rule-why touches in
  `../arch-pass/PLAN.md`.
