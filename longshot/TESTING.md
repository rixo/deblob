# Longshot — how tests live with the layers, in practice

Milestone 6. Measured, not ruled: a census of every test file's hooks
([test-census.ts](test-census.ts), over the extraction) on deblob, the viewer
and four partner packages (anonymous here), plus what running the rules on them
showed.

## Where a test sits

- **Named by the flavor** (`.spec`, `.test`, `.e2e`), read by a test reader:
  `genericTestApi` by default, `playwright` stacked before it for e2e trees. A
  test file is a driver and an assembly in one (`test-is-outside`): it imports
  anything, adapters and fakes included, and nothing imports it.
- **No reader, red** (`driver-reader`): writing `test: []`, or a runner no
  reader claims, makes every test file red on its own line — the premises do not
  cover it. On the partners' trees every test file was read: vitest by
  `genericTestApi`, Playwright by `playwright`.
- **Unit and e2e differ by reader, not by kind.** Both are the test kind; the
  e2e ones claim `@playwright/test`, carry its roles, and import built output
  (`dist/`) — a check run needs the build there, or it cannot resolve them.

## What a test body holds (T1)

Leaf hooks (a test's own body; a `describe` holds hooks, not calls):

| project   | leaf hooks | `if`/`switch` | loop | write | unconditional, no write |
| --------- | ---------- | ------------- | ---- | ----- | ----------------------- |
| deblob    | 977        | 46 (5%)       | 47   | 10    | 614                     |
| viewer    | 61         | —             | —    | 4     | 43                      |
| partner A | 45         | 0             | 0    | 1     | 44                      |
| partner B | 211        | 1             | 5    | 7     | 188                     |
| partner C | 465        | 19 (4%)       | 7    | 2     | 407                     |
| partner D | 175        | 15 (9%)       | 1    | 0     | 138                     |

- **"No writes" is nearly free**: 0–2% of hooks write, everywhere.
- **"Unconditional" hinges on what counts as a branch.** Real decisions
  (`if`/`switch`) are 0–9%; loops 0–5%. The reader also counts `??`, `?.` and
  branches inside a `.map` callback as control — in deblob that is 292 hooks,
  all data shaping inside an assertion (`expect(x?.layer ?? [])`), none a
  decision. Option C as the reader reads today would be mostly noise; C with "a
  branch is a statement-level `if`/`switch`/loop" costs 1–10%.
- The provisional exemption (A, `hook-one-call` skipped whole) hides both.

Evidence for the bet on C, with a condition: judge statement-level control only.

## Test roots (T5)

`stable-root` reds on test files' roots, per project: deblob 144 (59 unknown),
viewer 6, partners 13–30. The shape is the same everywhere: a table of cases or
a fixture bound at the spec's root (`const rows: Row[] = [...]`), red as mutable
or unknown for a type name not followed. A test file is read once by its runner,
so the state is not shared across importers (nothing imports it) — the reason
`stable-root` exists does not hold there. Evidence for exempting a test's root,
as its definitions already are.

## Testing a driver

- Canon: a driver so thin nothing in it needs a test; test the service.
- deblob's own CLI is tested in-process through `main(io)`: the world injected
  into the driver. A root driver's wiring function takes nothing and reads its
  tech itself — so the in-process test shape and the rule disagree; the
  restructure (C1) moves those tests onto a `cli.service`, the driver left to
  one smoke run. Not done: blocked on C1.
- The corpus tests the rules through `assembleCase` — an assembly wiring the
  real chain over memory adapters, the shape canon asks of a test.

## What the rules did to tests on partners

- Only `stable-root` (root tables) and a `sub-driver-wiring` on one partner's
  test calling a driver's wiring function. No test read as a driver violation
  otherwise: the four exemptions hold.
