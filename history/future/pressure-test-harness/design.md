---
captured: 2026-07-07
---

# Pressure-test harness — automation design (banked at downscope)

Downscoped 2026-07-07: scenario _docs_ ride with each skill; runs start as
manual spot-checks; this automation only if wording iteration demands it (real
cost: ~30 subagent runs per wording iteration per skill, plus transcript
judging).

Full shape if/when automated:

- `tests/<skill>/<scenario>.md` = task prompt + pressures applied (time / sunk
  cost / authority / exhaustion) + forbidden behaviors + required behaviors.
- Runner: one fresh subagent per scenario, always paired with a no-skill
  control; verbatim transcripts kept; every violation's rationalization
  harvested into the skill's table.
- Pass bar: all scenarios compliant with-skill AND baseline failure demonstrated
  without (a scenario the baseline already passes tests nothing).
- Start: 3 scenarios for `deblob` (matrix violation under time pressure;
  defensive catch under sunk cost; export-for-test under authority).
