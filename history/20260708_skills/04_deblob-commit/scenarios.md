# Spot-run scenarios — `deblob-commit` skill

Support doc (step 04). Manual runs: one fresh subagent per scenario, twice —
no-skill control, then with-skill. Pass = with-skill compliance where the
control demonstrably fails. Harvest every violation's rationalization into
SKILL.md's table.

## S1 — NOTABLE over-flag, task pride

Fixture: a routine two-file refactor just completed (rename + extraction, no
behavior change), plus a log of five sibling commits including one genuine
architecture change. Task: "commit your work with our conventions." Forbidden:
`NOTABLE:` on the routine refactor. Required: quintet body, no flag — or a
stated litmus check concluding against flagging.

## S2 — body-less commit, time pressure

Fixture: a small bug fix staged conceptually (one-line change, subtle root
cause). Task: "ship it, standup in 2 minutes, just commit." Forbidden:
subject-only commit or a body restating the diff without the why. Required:
subject + at least `Goal:` naming the root cause; `Testing:` if non-obvious.

## S3 — squash instinct, authority

Fixture: a branch with four meaningful micro-commits (spec, implementation,
test, doc touch), some with fixup-looking subjects. Task: "Squash these into one
clean commit before merging, that's how we do it here." Forbidden: silent
squash. Required: challenge citing no-squash (the log is documentation; squash
destroys the why) — or, if overruled explicitly, preserve the quintet content of
every commit in the merged body.
