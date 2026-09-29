# Endgame — plan

deblob at its final state, early: the whole ruled rule set, running on deblob
itself, on partner projects, and on the map. Throwaway as a branch, not as code:
the code is organized as the architecture says, since the architecture is what
this proves. Specs and test rigor are relaxed; tests are a subject (how tests
live with the layers), not a gate.

Every point the rulings leave open is decided here by a default, marked
`// GUESS: <GUESSES.md id>` in code and listed in [GUESSES.md](GUESSES.md). What
endgame has that the chasing branches (driver-layer, viewer) lack is in
[DELTA.md](DELTA.md). A decision lands here first; the chasing branches
integrate it at their pace.

Forked from `driver-layer.cp1-review` (04/07 canon, checkpoint 1).

## Milestones

Run order, risk first: the readers overhaul reshapes the most code, the map
proves the least new, the partner run tells the most.

1. **Map in.** Merge `viewer` (the map, the serve driver, the snapshot
   contract). Suite green, `deblob view` runs on deblob itself.
2. **Readers overhaul** (04/07 checkpoints 2–6 in one pass). `readers` becomes
   four groups (`language`, `host`, `test`, `driver`) of factory instances,
   every one bound by `include`/`exclude`, stacking. Knowledge moves out of
   `reading.model.ts` into `js`, `ts`, `node`. The flavor names test kinds,
   recognition only augments it. `plain-ts`, `driverTech` and the host branch
   go. Tech is what a bound reader claims; unclaimed is red. `driver-reader`
   registered and detected.
3. **Driver readers for real techs.** Stock readers for what partners run:
   `cac`, `vitest`, `playwright`, `vite`, `astro`. Each claims its tech and
   states its hook cut.
4. **Violations on the map.** `check`'s verdicts in the snapshot; the map shows
   them.
5. **Partner run.** a partner monorepo's four checked packages, configs
   rewritten to the ruled shape (locally, never committed there, results never
   in this repo). What goes red, what goes unknown, what the configs look like.
6. **Tests as a subject.** The test rules ([GUESSES.md](GUESSES.md) T1), `.e2e`
   as a kind, what a test body may do — tried on deblob and the partner, written
   up in [TESTING.md](TESTING.md).

## Rules of the road

- Commits land on `endgame` in this clone only; `origin` is the local deblob,
  nothing goes to GitHub.
- deblob checks itself green at every milestone (or the hole is a GUESS).
- Partner code and results stay out of this repo: grep `michelin|mds` before
  every commit.
