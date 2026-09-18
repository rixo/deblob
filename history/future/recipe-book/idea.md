---
captured: 2026-09-18
---

# Recipe book — hard situations, elegant deblob moves

Popped at the close of the driver-layer step 04 checkpoint 2 review (rixo,
2026-09-18): one night produced half a dozen situations where the layers seemed
to have no clean answer, and each had one once the tension was named. Those
moves are worth more than the code they produced, and they are guidance, not
canon: canon states rules, a recipe states a tension and the move that dissolves
it.

## Where it lives when it graduates

The deblob skill's progressive-disclosure slot: a "when stuck" index in
`SKILL.md`'s Deeper section, one line per hardship, pointing at a
`knowledge/recipes/<slug>.md` card each (~300 tokens, the existing card budget).
Opened when an agent or a human is in hardship, never read cold. Not
`docs/architecture.md`; possibly a `docs/recipes.md` if the cards want a
human-first source the way other knowledge cards cite the docs — ruled at
graduation.

## More than recipes, maybe

The first harvest already holds two other kinds: a _gotcha_ (two verdicts in one
test, named apart — "when you catch yourself thinking…" material, the card form
agents have said they love in the skills) and _illustration_ for a story that is
a chapter of its own (tests pin verdicts, the `deblob-test` chapter). So the
chapter may graduate as a practical guide with sections — recipes, gotchas,
worked examples — rather than a recipe list. Ruled at graduation; until then
every file says what kind it is in its frontmatter.

## The recipe shape

Situation (what one is trying to do) → tension (why the obvious placement is
wrong, which rule it trips) → the move → why it is right (which principle it
serves) → where it landed (a file, a step). Kept short: a card, not a chapter.
Every recipe is a real one that happened here, dated; no speculative recipes.
Two exclusions: a problem that cannot be stated without our situation, and a
house opinion deblob takes no side on (async-first, for one) — that is placement
and layering only, the domain where deblob has a verdict.

## Collecting

`recipes/` in this directory, one file per situation, added as they happen —
capture is one file, no ceremony. The board card lists the count. Graduation:
`git mv` to a dated chapter whose steps write the index and the cards into the
skill, then the sweep.
