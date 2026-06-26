# Agents fail at systems thinking — why API + Implementation review is load-bearing

Raw consideration — empirical, from growing experience driving agents. Folds into
sdd.md §4 (review gates) later.

## The failure mode

Repeated, across models — even frontier, even top-tier: **agents fail at systems
thinking.** They solve the *case*; they don't (not spontaneously, anyway) step
back to find the *generic* solution. Procedural, not functional. They patch the
instance instead of seeing the class.

The implications cascade everywhere; no need to enumerate. The point here is what
it means for the method.

## Why it stresses the SDD forcing sections

The standard structure's forcing sections exist for exactly this. Two are prime
review surface where the human reviewer **must** fully engage active attention —
Kahneman System 2, deliberate, not passive auto-accept:

- **API** (incl. the public/internal boundary)
- **Implementation**

These are where the generic-vs-case judgement actually lives, and where the agent
is weakest. So they are precisely where passive acceptance is most dangerous.

## Stakes

Failure here = **buying a ticket to the wrong destination.** No amount of
after-the-fact course correction fixes it. You're suntanning on an ice sheet —
and the practical implementation has suddenly become *way* harder. The cost lands
later and compounds; the review gate is the only cheap place to catch it.

## What to do with it

Lands in sdd.md §4 (review gates): name API + Implementation as the **System-2
surfaces** — explicit instruction that the reviewer must actively engage, not
rubber-stamp, *because* the agent's systems-thinking blind spot concentrates risk
there. Tie the "why" to this failure mode so the gate isn't ritual.
