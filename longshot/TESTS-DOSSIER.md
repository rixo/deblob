# Tests dossier — what a test body may do, and a test file's root

Prepared 2026-09-30 for the talk-through (agenda item 1, T1 + T5). Two
questions, ruled together: the way out of the first lands in the second (see
"How the two interlock"). Snippets are deblob's own, at `path:line` in
`packages/deblob/`; partner projects appear as counts only
([TESTING.md](TESTING.md)). Numbers are longshot's self-check at a7fc57a: 208 of
its 239 reds sit in test files — 144 `stable-root`, 64 `sub-driver-wiring`.

Verified = read in the code or the report. Approximate = from the census script,
whose hook lines are not exact.

## Question 1 — what a test body may do

Canon today (`test-is-outside`): a test body is a hook, and "the hook count and
services-only do not apply". By the letter, the rest of `hook-one-call` applies.
The driver check exempts test bodies from `hook-one-call` entirely — ruled
provisionally, and not trusted.

### The options

- **A — exempt (today).** A test body is judged by nothing in `hook-one-call`.
- **B — the letter.** Everything but the count: unconditional, arguments as
  received, the result never read. 976 reds on deblob when first built. This
  reads any use of a result as a violation, which leaves `expect(result.x)` red
  and `checkLayers(graph)` green — a split with no reason in a test.
- **C — two test rules of their own**, each with its why:
  - **Unconditional.** Why: a branch or loop lets a test pass without asserting
    (`for` over `[]`, `if (x) expect(…)` with `x` false).
  - **No writes.** Why: no mutable setup shared across tests, no dependence on
    test order.
- **D — the gate test is a driver** (an add-on to C, from the chapter PLAN
  input). A test that connects at the use cases is judged as a driver: one use
  case per `it`.

### C needs three cuts, each traced to its why

As the reader reads today, C would be mostly noise: 292 hooks in deblob branch
only on `??`/`?.` inside an `expect`. Each cut below keeps what the why covers
and drops what it doesn't:

1. **Control = a statement-level `if`/`switch`/loop in the hook's own body.**
   `??`, `?.` and `?:` shape data. They cannot skip an assertion. Callbacks the
   hook hands to something else (a fake handler, a scripted peer) belong to the
   fake, not to the test's path.
2. **An `if` whose only arm throws is an assertion, not a branch.** The only
   path that skips the rest is the failing one. deblob has about 20 of these
   (`if (!main) throw new Error("main not read")`), all written to narrow a
   type.
3. **A write is an assignment to a binding declared outside the hook.** Only
   such a binding is shared across tests. A hook-local `let` (spy counters,
   `let thrown` around a `try`) is shared with nothing.

### Real bodies against the options

Verdicts: 🔴 red, 🟢 green. "C" means C with the three cuts.

| #   | Snippet (where)                                                                                                                                                                           | A   | B              | C              | What the verdict buys                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --- | -------------- | -------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `const { code, out } = await run(["--version"])` then `expect(code).toBe(0)` (`apps/cli/commands.driver.spec.ts:134`)                                                                     | 🟢  | 🔴 result read | 🟢             | B's red has no reason in a test: reading the result is the point of a test.                                                                                                                                                        |
| 2   | `for (const { path } of snapshot.modules) { const dir = …; if (dir !== "") expect(dirs).toContain(dir) }` (`apps/cli/commands.driver.spec.ts:871`)                                        | 🟢  | 🔴             | 🔴 loop + if   | **The real target.** If `modules` is empty, or every path sits at the root, the test is green and asserts nothing. Way out: assert the length first, or `test.each`.                                                               |
| 3   | `for (const topic of ["4", "rule-4"]) { const { code, … } = await run(["explain", topic]); expect(…) }` (`apps/cli/commands.driver.spec.ts:590`)                                          | 🟢  | 🔴             | 🔴 loop        | A loop over a literal list cannot be empty, so the why barely holds. `test.each` reads better anyway (one row per failure). Cheap and honest red.                                                                                  |
| 4   | `long.body = …; for (const line of output.split("\n")) { if (line.startsWith("https://")) continue; expect(…) }` (`lib/report/render.model.spec.ts:2405`)                                 | 🟢  | 🔴             | 🔴 loop        | The loop asserts per line and can skip every line. The write is to a local object: free under cut 3.                                                                                                                               |
| 5   | `if (!main) throw new Error("main not read")` (`lib/extraction/reading.model.spec.ts:176`, ~20 sites)                                                                                     | 🟢  | 🔴             | 🟢 cut 2       | Without cut 2: 20 reds, way out `assert(main)` (`node:assert`, which narrows too). Doable, buys nothing the why asks for.                                                                                                          |
| 6   | `if (expectedFailures.length > 0) console.info(…)` in every corpus row (`lib/cases/modules.spec.ts:1531` and the other `cases/*.spec.ts`)                                                 | 🟢  | 🔴             | 🔴 if          | Skips no assertion. It prints the confessed known failures. Way out: a shared reporting hook (a driver the spec file wires). **Unclear what the red buys.**                                                                        |
| 7   | `let thrown; try { await extractReading(…) } catch (e) { thrown = e }` then `expect(isExtractionError(thrown))` (`lib/extraction/extraction.service.spec.ts:1386`)                        | 🟢  | 🔴             | 🟢 local write | `await expect(p).rejects.toMatchObject(…)` reads better, but nothing is shared. A style matter, not this rule's.                                                                                                                   |
| 8   | `let clients = 0; channel.onClient(async () => { clients += 1 })` then `expect(clients).toBe(0)` (`lib/snapshot/adapters/ws-channel.adapter.spec.ts:95`)                                  | 🟢  | 🔴             | 🟢 cut 3       | A spy: the write sits in a callback handed to the unit, on a binding local to the test.                                                                                                                                            |
| 9   | `receive(url, 3, (ws, received) => { if (received.length === 1) ws.send(…); if (received.length === 2) ws.send(…) })` (`apps/serve/serve.spec.ts:~113`)                                   | 🟢  | 🔴             | 🟢 cut 1       | A scripted client talking to the server. These are the "step-by-step async observation" shapes the ruling-time bet feared C couldn't express. They survive because the branches belong to the peer, not the test.                  |
| 10  | `let dir, root` at `describe` level, assigned in `beforeAll(async () => { dir = await mkdtemp(…); root = join(dir, "bundle"); … })` (`lib/view/adapters/fs-bundle.adapter.spec.ts:12-21`) | 🟢  | 🔴             | 🔴 outer write | **The real target:** setup shared across tests through a mutable binding. Way out: `const dir = await mkdtemp(…)` at the file's root (legal only under Question 2's option b or c), or a per-test factory (one temp dir per test). |
| 11  | `let isolated` at `describe` level, set in a test, removed in `afterEach(() => { if (isolated) await rm(…) })` (`lib/config/adapters/loader.adapter.spec.ts:333-339`)                     | 🟢  | 🔴             | 🔴 outer write | Cleanup through a shared binding. Way out: `onTestFinished(() => rm(dir))` inside the test. The test reader would need that role.                                                                                                  |
| 12  | `start()` → `registerCommands(createRouter(), createCliOver(…))` in each test (`apps/cli/commands.driver.spec.ts:77`)                                                                     | 🔴  | 🔴             | 🔴             | `sub-driver-wiring`, 64 reds under every option (see below).                                                                                                                                                                       |

What C costs on deblob (approximate): loops ~49 hooks, non-guard `if`s ~25,
outer writes 2 sites (rows 10 and 11; the `let resolved` counter in
`package-meta.adapter.spec.ts:34` is local to a fixture helper, a spy). About 75
edits, mostly `test.each` and length asserts. On partners: `if`/`switch` 0–9% of
hooks, loops 0–5%, writes 0–2% (before cut 3, so fewer after).

### Row 12: a test wiring the driver it drives

The CLI gate builds a fresh router and registers the commands in every test.
`sub-driver-wiring` says "never a hook". Its why, in canon: "calling a
sub-driver from inside a hook … would let one hook chain two calls through one
level of indirection". That is the count, and the test tech already exempts the
count. Each test is the process starting over, so wiring there is the test's
setup, the same as building a service in it.

- **Proposed:** a test hook may call a driver's wiring function. The clause's
  why doesn't hold where the count is exempt. 64 reds go, no code change.
- **Under D instead:** the gate registers once, in the file's wiring, and every
  test shares one router. That breaks canon's "each test assembles its own
  instance" (§ Test isolation): the recording terminal would carry output from
  one test into the next.

### D, against the two gates deblob has

- **The CLI gate:** see above. D wants one wiring and isolation wants one per
  test.
- **The corpus gate**
  (`test.each(ROWS)(…, async (row) => { const { judge } = assembleCase(row.files); const { expectedFailures, ...match } = await judge(row); if (…) console.info(…); expect(match).toEqual(…) })`):
  assembly in a hook, a use case, a branch, a print, the result read — about 4
  reds per row. The way out is a facade service written for the rule's sake.
- **Undefined so far:** what makes a test a gate test, in a way the reader can
  see.

**Recommendation for Question 1: C with the three cuts, plus row 12's proposal;
D stays an idea.** Of the two why-bearing clauses, C keeps what catches real
faults (rows 2, 10, 11) and drops what only restyles (rows 1, 5, 7, 8, 9).
Doubt: row 6 is red under C with nothing to show for it; it may point to a
fourth cut (an `if` that holds only a print?), or to the print moving out.
Neither is decided.

## Question 2 — a test file's root

`stable-root` judges every module's root. Canon's why: "a test that imports it
gets the module every other test got". Nothing imports a test file, so that half
of the why is void there. The other half still holds: canon § Test isolation,
"No shared mutable state between tests". A test file's root is shared by every
test in the file. Canon already exempts the registration calls only
(`test-is-outside`: "`stable-root` exempts the registration, not mutable
state").

### The options

- **a — judged as today.** Registration exempt, everything else red.
- **b — split by the why.** Work done at load is free: host and tech reads,
  fixture paths, a contract suite registered, top-level `await` setup. A test
  file loads once per run and nothing else sees it. Mutable data and instances
  of the units stay red: those are what tests would share.
- **c — exempt entirely.** The census's reading.

### The reds, by shape (longshot self-check, test files)

| Shape                                                       | Sites (report lines) | a   | b                   | c   |
| ----------------------------------------------------------- | -------------------- | --- | ------------------- | --- |
| Acts at load                                                | 28 (69)              | 🔴  | 🟢 except instances | 🟢  |
| Mutable data                                                | 17 (17)              | 🔴  | 🔴                  | 🟢  |
| Unknown: a type name or return not followed (reader limits) | 42 (58)              | ⚪  | ⚪                  | 🟢  |

The unknowns are reader debt under any option except c. A better reader flips
them to green or red, per the unknown criterion. Partner projects: 13–30 root
reds each, all the same shapes.

### Real roots against the options

| #   | Snippet (where)                                                                                                                                                             | a                       | b               | c   | What the verdict buys                                                                                                                                                                                   |
| --- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------- | --------------- | --- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | `const ROWS: readonly Row[] = [...]` (`lib/cases/assembly.spec.ts:83`)                                                                                                      | ⚪                      | ⚪              | 🟢  | Already written correctly. The reader doesn't follow `Row`. A reader fix, not a ruling.                                                                                                                 |
| 2   | `const options = { classifyEntry: …, mirror: { dist: "src" }, disclosed: () => false }` (`lib/check/surface.model.spec.ts:71`)                                              | 🔴                      | 🔴              | 🟢  | Every test in the file shares it. `as const` proves nobody changes it. Cheap.                                                                                                                           |
| 3   | `const here = (p) => fileURLToPath(new URL(p, import.meta.url))`, then `const violatingDir = here("__fixtures__/violating")` ×20 (`apps/cli/commands.driver.spec.ts:27-48`) | 🔴 ×40                  | 🟢              | 🟢  | A fixture path computed once at load. Nothing to protect. Under a, twenty paths turn into functions.                                                                                                    |
| 4   | `const VERSION = JSON.parse(readFileSync(…package.json…)).version` (`apps/cli/commands.driver.spec.ts:30`)                                                                  | 🔴                      | 🟢              | 🟢  | A read of the machine, stored. In a test that runs once per run, it can't differ between tests.                                                                                                         |
| 5   | `const { configAt, discoverConfig, … } = createConfigLoader({ fs: createNodeFs() })` (`lib/config/adapters/loader.adapter.spec.ts:17-23`)                                   | 🔴                      | 🔴 instance     | 🟢  | The unit under test built once and shared. Canon: "each test assembles its own instance". Way out: a test factory called in each test.                                                                  |
| 6   | `createResolverTestSuite({ api: createVitestTestingApi() }).run({ … })` (`lib/extraction/adapters/fs-resolver.adapter.spec.ts:13`)                                          | 🔴 "a use case at root" | 🟢 registration | 🟢  | A shared contract suite, registered at load. Under a, the way out is placement: the suite as a driver whose wiring the spec calls with the tech (canon's shape for shared hooks).                       |
| 7   | `const extractions = new Map(await Promise.all(…parse every fixture…))` (`lib/extraction/reading.model.spec.ts:101`)                                                        | 🔴 ×2                   | 🔴 Map          | 🟢  | Parse once, read by every test, for speed. Under b the load is free and the `Map` needs `ReadonlyMap`. Under a, the work moves into `beforeAll` plus an outer `let`, which is red under Question 1's C. |
| 8   | Question 1's row 10, rewritten: `const dir = await mkdtemp(…)` at the root (`lib/view/adapters/fs-bundle.adapter.spec.ts`)                                                  | 🔴                      | 🟢              | 🟢  | Q1-C's way out for shared setup. Only b and c allow it.                                                                                                                                                 |

What b costs on deblob: the 17 mutable sites (`as const` or a readonly type)
plus the root-built instances (row 5 and its kind: the loader, scan and content
adapters, 3 files; the readers built in `extraction.service.spec.ts:56`) moved
into test factories. The four contract suites registered at root (row 6 and its
kind: the fs and resolver suites) go green. The unknowns wait on the reader.
What it buys: every table a test file shares is provably unchanged, and no test
shares a unit instance with another. Its known cost: a test runner evaluates the
root even when a filter skips every test in the file, so setup at load runs for
nothing. That's slower, not wrong.

**Recommendation for Question 2: b.** Canon names two reasons for the rule; the
one that fails for a test file's root is dropped, the one that holds is kept. c
throws out the isolation reason with it (row 5 goes green: a shared instance of
the unit under test). a keeps a reason that doesn't hold (rows 3, 4, 6: 40+ reds
on fixture paths).

## How the two interlock

C forbids outer writes, so shared one-time setup has three homes: the root
(legal under b), a per-test factory (more I/O), or nothing. With a + C, row 10
and row 7 have only the per-test factory. With b + C, both keep their one-time
setup, provably immutable. Ruling C without b pushes costs onto every fixture
that is expensive to build.

## Side finding, not for ruling (presentation)

The report prints one line per reaching site with the same anchor: line 77 ×63
and line 27 ×40 in `apps/cli/commands.driver.spec.ts`. The `stable-root` lines
name the reaching site ("reached from …:29"); the `sub-driver-wiring` lines
don't name the hook. Proposed, on longshot: name the hook's line in the
`sub-driver-wiring` message, and group identical anchors with their sites
listed. Presentation, ours to fix.

## To rule

1. Question 1: C with the three cuts? (Or A, B, or C with other cuts.)
2. Row 12: may a test hook call a driver's wiring?
3. Row 6: the corpus's `if (…) console.info(…)` — red under C, or a fourth cut?
4. Question 2: b? (Or a or c.)
5. D: stays an idea until a gate test is something the reader can see?
