---
name: deblob-review
description:
  Use when about to report a task complete, hand a checkpoint back for review,
  or claim tests pass in a repository following deblob conventions
  (layer-suffixed files, history/ chapters, quintet commit bodies).
---

# deblob-review — the pre-checkpoint pass

Run this pass before every checkpoint handback — not after the user asks: by
then they are doing the QA this pass exists to replace. Tests green is not done.
Tools see structure; the defects that survive are the judgment class —
enumerated below because "think harder" doesn't work and a list does.

## The pass — run each question against the diff

1. **Stale prose** — every comment, JSDoc, error message, spec illustration you
   touched or that describes what you changed: still true? Grep prose for old
   names, shapes, URLs.
2. **Broken promises** — does any API accept more than the code handles? If a
   type says "many", prove many works — or reject the extras loudly.
3. **Silent failure** — read every `?? null`, `?.`, skip, and `catch` on the
   changed path: does it swallow a real problem? Capability-absent is
   legitimate; declared-but-broken must be fatal and named.
4. **Consistency** — same concept, same handling across sites (null-vs-throw,
   naming, error shape). One resolver helper, not two that drift.
5. **Dead refs** — grep consumers BEFORE removing a field or renaming; never
   trust "looks unused". Grep catches the string level tsc can't.
6. **tsc clean** — `--noEmit` on the package AND the downstream consumer build:
   a package stays green while a consumer breaks.
7. **Coverage** — 100% on touched runtime (service / model / pure helpers).
   Adapter logic unit-tests like any code; the slice that actually touches the
   external system is proven by e2e — don't mock what you don't own. Check the
   actual % — a new spec file can mask a drop from an untested new method.
8. **Specs and docs** — a fix updates the spec in place; user docs are tracked
   in the spec until the docs phase, never written inline.

## What catches what — don't conflate

- **tsc** → structural only: dead imports, renames, type mismatches. NOT string
  staleness, NOT swallowed failures.
- **coverage** → dead branches, untested new logic.
- **grep + read** → items 1–3, the judgment class. No tool sees these; this is
  where the pass earns its cost.
- **real consumer build** → integration breaks that package-green units hide.

## When you catch yourself thinking…

| Excuse                                  | Reality                                                                                  |
| --------------------------------------- | ---------------------------------------------------------------------------------------- |
| "tests green — done"                    | Tests prove what tests see. Items 1–3 are invisible to them. Run the pass.               |
| "the compiler would have caught it"     | tsc is structural. Stale comments, broken promises, swallowed failures sail through.     |
| "units pass; integration's a follow-up" | Package-green has lied: a consumer build broke while every unit passed. Consumer = done. |
| "the user reviews it anyway"            | The pass exists to replace that QA. Before handback, not after they ask.                 |
| "small diff — no pass needed"           | Small diffs rename and touch comments too. Small diff = short pass, not no pass.         |

## Deeper

Per judgment — the why behind the pass:

- [review-gates](../deblob-sdd/knowledge/review-gates.md) — review economics:
  why the checkpoint is where scarce attention concentrates
- [testing-reviewer](../deblob/knowledge/testing-reviewer.md) — tests are
  written for the reviewer
