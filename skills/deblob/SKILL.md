---
name: deblob
description:
  Use when creating or editing code in a codebase that has layer-suffixed files
  (*.model.ts, *.service.ts, *.adapter.ts, *.port.ts) or private/ directories
  inside service folders — the deblob hexagonal architecture. Covers code
  placement, imports, error handling, and tests.
---

# deblob — architecture flight manual

This codebase is layered. Every file declares its layer by suffix; every layer
has hard rules. Your job: place code correctly, then prove it.

## The five layers (innermost first)

- **model** (`*.model.ts`) — pure domain knowledge: types, pure functions,
  constants. No effects, no outward imports.
- **ports** (`*.port.ts`) — type-only contracts at boundaries. The contract,
  nothing else.
- **service** (`*.service.ts`) — use cases, decisions, orchestration. Factory +
  injected dependencies. Composition unit.
- **adapters** (`*.adapter.ts`) — port implementations for one concrete
  technology. Composition unit.
- **assembly** — wiring: the only code that imports composition units and calls
  their factories.

## Placement — always the first question

What is this code? **knowledge → model · decision → service · translation to a
concrete tech → adapter · boundary contract → port · wiring → assembly.** Unsure
model vs service: does it _know_ (model) or _decide_ (service)?

Read [placement](references/placement.md) before creating or moving files. Read
[crossing-services](references/crossing-services.md) before importing from
another service.

## The loop

1. Implement per the cards.
2. **Run** the guardrails — typecheck, coverage, `deblob check` where present.
   Run them; never simulate, never skip. Invocation commands come from the
   project's own docs (CLAUDE.md, run skills).
3. Iterate until green.
4. Self-review (use the `deblob-review` skill if available).
5. Only then hand off.

## Non-negotiables

- Layer suffix on every file. Suffixless = unplaced code; only assembly may
  import it.
- No `index.ts` barrels — the layer stays visible in every import path.
- `*.service.ts` / `*.adapter.ts`: imported by assembly only (`import type`
  exempt).
- `private/` is sealed — nothing outside the service imports from it, types
  included.
- Dependencies point inward. Services never touch concrete I/O (`node:fs`, HTTP,
  DB) — that goes behind a port.
- No defensive catch. Catch = known recovery, or enrich-and-rethrow with
  `{ cause }`. A swallowed failure is worse than a crash.
- Tests go through the public contract. Never export an internal "for tests".

## When you catch yourself thinking…

| Excuse                               | Reality                                                                              |
| ------------------------------------ | ------------------------------------------------------------------------------------ |
| "it's just a helper"                 | Helpers have layers too. Place it, or it's blob (assembly-only).                     |
| "export it so the test can reach it" | Would the export survive deleting the tests? No → violation.                         |
| "catch, just to be safe"             | Swallowed failures ship corrupt output with no trace. Loud beats safe.               |
| "return `[]` on failure — graceful"  | That's lying to the caller. Throw, or model the degradation explicitly.              |
| "exclude test utils from coverage"   | Utils reach 100% transitively, or they're dead weight or hiding something.           |
| "helpers in `__tests__/`"            | Runners execute that dir. Shared utils live in `test/` service dirs.                 |
| "a barrel would be convenient"       | Barrels erase the layer from import paths — every rule becomes uncheckable by shape. |

## Cards

- Creating a service / adding code → [placement](references/placement.md)
- Using another service / sharing types →
  [crossing-services](references/crossing-services.md)
- Errors → [handling-failure](references/handling-failure.md)
- Tests → [writing-tests](references/writing-tests.md)
- Import legality lookup → [rules](references/rules.md)

Link grammar: an imperative "read X" is part of the procedure. Anything under a
`## Deeper` section is optional — per judgment, for non-clear-cut calls.

## Install (adopting repo)

Add to the repo's CLAUDE.md: "This codebase follows the deblob architecture —
load the `deblob` skill before writing code."
