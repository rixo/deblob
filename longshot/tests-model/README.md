# The test kind — and the atoms under every rule

Opened 2026-09-30 night / 2026-10-01 with rixo, as agenda item 1 of the
talk-through (T1 what a test body may do + T5 a test file's root). It started as
a test question and ended on a canon-wide finding. Nothing here is ruled into
canon yet; everything here is what rixo heard and did not object to, or said
himself. Next session closes it. Input before it:
[../TESTS-DOSSIER.md](../TESTS-DOSSIER.md) (real snippets, counts) — evidence
now, no longer the frame.

## RESUME HERE

Last sessions: 2026-10-01 evening, rixo weighed SYNTHESIS item by item;
2026-10-02 and 2026-10-05, item 8(c), the router (closed, § The router thread
below). This folder, `../REVIEW.md` and `../TESTS-DOSSIER.md` committed on
`longshot` 2026-10-02. Nothing to canon yet, no commit without a go.

1. Read § Ruled from the synthesis — the session's outcome, in ruling order. The
   frame is settled: criterion A (an atom = one detection, one verdict); rule =
   atom, one flat level, no molecules; behavior only in rules; a kind is a plain
   list of slugs (not "layer": layers ⊂ kinds); the position lives in the rule
   (`hook-one-path` / `test-one-path`), roles refused; canon's `## Rules`
   becomes a flat one-line-per-rule list. SYNTHESIS items 1–7 closed; item 8
   partly.
2. Context if needed: § The finding, § What is held,
   [SYNTHESIS.md](SYNTHESIS.md) (the reports and raw decompositions sit beside
   it).
3. **Next, in order.** Before all of it (rixo, 2026-10-05): the reader revealer,
   a second CLI over a switch-case router with a fully custom reader, to settle
   the reader port's final cut; its rows go in `longshot/revealer/`. Then:
   1. Item 8 leftovers, one at a time: (a) a legacy blob entry called green
      (654-658) vs `stable-root` — likely solved by the split (blob lists no
      root rule, it claims nothing): verify, then confirm with rixo; (b) e2e
      (263 "a test kind" vs 1022-1023 "outside the graph") — v1 scope says e2e
      out, likely wording only; (c) **CLOSED 2026-10-05, see below** (the CLI
      root driver's `createRouter` from `router.model.ts`: the 24 reports read
      red because canon's wording was wrong, not the design; green as built).
   2. The owed rule: branches and loops in driver wiring (the definition rule's
      dissolution leans on it).
   3. Build the rules × kinds table (placeholder slugs) — the proof that every
      kind recomposes with no exception. Not shown until then.
   4. The test kind's final list from that table.

**The router thread — item 8(c) and the `tech` key (2026-10-02 to 10-05,
closed). Supersedes what this README said before 2026-10-02; GUESSES D4 carries
the outcome.**

Rulings by rixo (firm, 2026-10-02):

- A driver can use a tech, vendor (`cac`) or home-brew; a reader (a `.driver`
  concern) is what lets deblob judge the driver; deblob does not care whether
  userland uses vendor or its own. Any code under the user's `include` is judged
  by every existing rule by its kind, whatever it is used for (deblob judges
  structure, never domain). The 24 atom-hunt reports read the router red because
  canon's wording was wrong (a line saying a model cannot be claimed as tech),
  not because the design was.
- Claims are a DECLARED LIST, never a function ("almost impossible to declare by
  mistake, all too easy to accept by mistake"). The key is `tech` (ruled
  2026-10-02), project files spelled `./root-relative-path`. DONE and committed
  (longshot checkpoint 1, "a reader's tech is a declared list"). Host readers
  followed 2026-10-06: a host reader declares `tech` too, its builtin modules.
- A `.router` kind is dead (the driver would need the rules, not a kind).
- The hole (a vendor router like `cac` can hold domain logic too; a claim can
  hide a driver→model edge) is to be CONFESSED in canon, not guarded: no nanny
  guards, the claim is the user's own explicit act.
- Card: GUESSES C2, the boot hands the driver its app
  (`main(router, cli, argv)`). HIGH on 2026-10-02, LOW since 2026-10-05 (reasons
  in the card).

The question of the thread: how a home-brew tech (a project file) is identified
to the reader AND reaches the driver legally. Facts VERIFIED by running the
longshot self-check:

- At checkpoint 1 the shipped shape is green: the driver imports the file its
  reader lists as tech and builds the router itself; `cli.driver.ts`,
  `commands.driver.ts`, `router.model.ts` carry no violation (run 2026-10-05;
  baseline 239 violations, 61 unknown).
- A driver may import NO project kind: model, service, adapter all red
  (`service-assembly-only`, `adapter-assembly-only`, `driver-no-model`); only
  assembly factories. I had told rixo "driver→service is the normal path":
  WRONG.
- Router built by the assembly and handed to the driver as a parameter (tried,
  "option 2"): commands.driver.ts goes red ("hands router.flag a function"): a
  handed instance is NOT tech to the reader, so no hook cut. 24 new violations.
  Abandoned. Cause, by reading the code (2026-10-05): the instance's origin is
  the assembly factory (`createCliAssembly`, member `router`), not the router
  file, and the reader does not follow assembly bodies. The first diagnosis ("a
  parameter no caller binds") was WRONG: the graph pass does bind parameters
  from call sites.
- A root `app.run()` is red too (`wiring-outside-hooks`): serve.driver.ts:11 and
  snapshot.driver.ts:11, old reds, not mine. I had said serve was accepted:
  WRONG.

Options that were on the table, and what became of each:

- (a) Keep the exempt edge, narrowed to a MODEL or SERVICE target, adapter red
  (rixo: "model or service is the only legal kind to claim"). The edge skip was
  never removed from the committed code; the narrowing is NOT decided, it waits
  on the revealer (the file claim itself may not survive it).
- (b) A claim naming an assembly-built instance. Grew on 2026-10-03 into "a
  claimed file makes its imports AND the instances born from it tech, by
  origin", ruled 2026-10-05 and WITHDRAWN the same day: its premise was wrong,
  the origin of an assembly-built instance is the assembly factory, so the rule
  would not reach the case it was made for. Dropped with it: type-based
  identification, and a rule reading a root driver's parameters as tech (C2).
- (c) The router outside the judged code: ruled out by rixo, 2026-10-03.

Outcome (rixo, 2026-10-05): we were generalizing the base to fit one home-brew
tech. The tech's whole role goes to its reader: the reader receives the AST and
says "this is a hook, its body is here", and how the driver receives its tech;
case-specific hard points are the reader's job, not base config or rules. The
base keeps one generic contract: it honours what a reader claims. A tech built
in an assembly or handed in stays unsupported until a reader's own cut covers
it; "no cut, so blob" is not an accepted hole, it is the revealer's target.

Build state: `packages/` is at checkpoint 1, clean; the abandoned option-2 edits
are gone from this clone (a patch is kept in the private tracking repo). Still
to do if (a)'s narrowing is picked after the revealer: skip in `layers.model.ts`
(`edge.claim === "reader"`) only when the target's layer is model or service;
corpus rows in `cases/readers.spec.ts` (claimed model green, claimed adapter
red, unclaimed red, claimed file keeps its kind's rules); the canon sentence
(the line saying a model cannot be claimed as tech, ~line 621 of
`docs/architecture.md`: "what a reader lists as tech is tech to its driver,
wherever the file lives; a claimed file keeps its kind and its own rules").
Commit lesson: `git commit -- <paths>` ignores untracked files; a new file needs
an explicit `git add` first.

Found on the way, 2026-10-05, not fixed: canon `docs/architecture.md` says "a
lazily loaded feature is a lazily imported assembly" (~l.503) and "an assembly
importing another, at startup" (~l.592); a lazy facade written in an assembly is
red (`assembly-builds-only`, verified by running). The revealer's lazy rows
decide which sentence stays.

Rest of the plan, in order: the reader revealer; item 8 leftovers (a) legacy
blob entry vs `stable-root`, (b) e2e wording; the owed rule (branches and loops
in driver wiring); the rules × kinds table; the test kind's final list; host
readers' `claims` to `tech`. Road: longshot → port clean to driver-layer → main
→ next 0.0.x; an interim longshot build for other consumers is an open ordering
question.

4. Placeholder slugs so far (named for real when each rule is born, 2–3 kebab
   words): `hook-one-call`, `hook-one-path`, `hook-passes-event`,
   `hook-returns-only`, `test-one-path`, `test-asserts`, `root-immutable`,
   `root-no-ambient`, `inside-no-ambient`, `assembly-importers`,
   `driver-importers`, `driver-one-wiring`.

How to work with rixo on this (asked 2026-10-01): one question at a time, plain
words, no compressed bullets (a paragraph he could not parse = "monkey drown");
never re-propose the v1 shortcut; prior-art terms mapped to ours philosophically
only (Cockburn's "driver" is not our `.driver`).

## The finding — molecules mistaken for atoms (rixo's words, kept)

Canon's rules are bundles. Some rules we took for atoms are molecules: parts
glued together in the factory. When two bundles include the same part, the
remaining parts and the bundles CAN'T fit together — the duplicated or confused
parts block. That is not a puzzle and not a physics: it is a provably impossible
task, left to the consumer. Rules that only connect by being shipped in the same
package, never touching, are "exceptions bundled in city clothes". The ten
exceptions canon carves for tests (`test-is-outside` and around) were the
symptom; the cause is the slicing.

The unifying atoms might exist, a naming away. Two already show inside canon's
text (verified against canon's sentences, the full slicing NOT tried):

- **"Unconditional"** — a clause of `hook-one-call` ("the call is
  unconditional"), and what `boot-one-call` judges (a corpus row:
  `if (process.argv.length > 2) main()` is red, "a branch"). A test's "no
  `if`/`switch`/loop" is the same atom.
- **"What is shared cannot change"** — `stable-root`'s own why ("a test that
  imports it gets the module every other test got, and nothing it runs changes
  what the next test sees" — test isolation, word for word). A test writing no
  outer binding, and a test file's root holding nothing mutable, are the same
  atom; only the sharing differs (a module root is shared by its importers; a
  test file's root and `describe`-level bindings by its tests).

Then `stable-root` = _shared cannot change_ + a remainder (_loading does
nothing, reads nothing_ — whose why is importers, and nothing imports a test).
Presented that way, a rule is never shown minus a piece ("stable-root minus
something" reads arbitrary, ad hoc, tyrannical); a kind carries a selection of
atoms ("something-rule, used in tests; stable-root = something-rule + the
remainder" reads as predictable rule of law). Formulation is a real stake.

**Why only now (rixo):** the atoms were a target we couldn't aim for before the
layer set was complete. A decomposition over "all of it + 1 unknown" can't
converge: the unknown kind's needs would be missing, and whatever atoms came out
would be cut to the kinds known so far. Test was the last kind; with it in view,
the full slicing becomes solvable.

**Ruled by rixo: atomizing IS the work, not a v1 shortcut.** The proposal
"extract only the atoms tests need for v1" was refused: closing v1 as we can
without disturbing the rest is the trap — urgency sealing the package with maybe
the death seed in it. Test is the last layer v1 needs; we have all the layers
and almost all the pieces; precipitation = accident. Take the breath before
committing. Possibility of a death seed is what slop is; deblob promises the AI
without the slop — eat this cost, not the death seed.

## Ruled from the synthesis (2026-10-01)

- **The atom criterion is the check.** An atom is one detection with one
  verdict. Two whys sharing one detection make one atom, not two; one why
  needing two detections makes two atoms. A why with no detection of its own is
  not an atom: it is a union of atoms (`driver-calls-services`, retired as a
  rule) or a confessed hole (`only-driver-listens`, until a reader can see it).
  Refused: by why (atoms without a detector = wishes); both (one fact reported
  twice); whys-6's "split when exemption needs it" (exemption back in the
  definition, and the atom set would move whenever a kind does).
- **Rule = atom. One flat level, no molecules.** No rule contains another.
  Today's slugs are not kept: nobody has seen them, all get recut freely. A rule
  is named by its slug, which violations cite; "rule" is the word in prose,
  "slug" when the token is meant.
- **Behavior lives in rules only.** Each rule has exactly one detector (shared
  machinery underneath, like the machine-name list, is implementation). The rest
  is bodywork:
  - **why** — the link back to canon. Every rule has at least one; every why has
    at least one rule (a why without one = a wish).
  - **kind** — a collection of rules, no behavior. Each selection carries a
    scope and the why it buys there; dropping one selection touches no other.
    Deciding which kind a file is belongs to readers, not to kinds.
  - **check** — a detector family; internal, no longer a public topic (agent's
    guess, to confirm when the CLI is touched).
- **"Kind", not "layer".** Every layer is a kind; not every kind is a layer
  (test, e2e, blob). "Layer" stays the word for the ordered subset (inward
  imports, the matrix). A hook is not a kind: it is a position inside a driver.
- **Shape:** whys → rules ← kinds. Rules shared both ways (straight-line: two
  whys, two kinds) make diamonds: a multi-rooted DAG, a polyhierarchy, not a
  tree.
- **What dissolving the molecules buys:** composition becomes expressible, with
  no exception lists. Not yet shown: that every kind recomposes cleanly. That
  needs the rules × kinds table built. The hunt's remaining contradictions
  (type-import value, importer lists missing the test, the test's closed
  definition list) each become one cell to fill, not prose exceptions.

- **The position lives in the rule, not in the selection** (roles refused). A
  check run at two positions is two rules: `hook-straight-line`,
  `test-straight-line`; `root-no-machine-read`, `pure-no-machine-read`. Siblings
  share a stem, so the kinship shows; detectors share code underneath. A kind is
  a plain list of slugs. Refused: one positional rule with `@ position` on each
  selection — the position would be needed on every violation line, list and
  `explain` anyway, so it re-spells the slug and adds a concept (a closed
  vocabulary of positions) for nothing. Reconsider only if one check needs many
  scoped copies (the hunt shows pairs at most).
- **What canon's `## Rules` becomes:** a flat list, one line per rule (slug, one
  sentence verdict, its why linked back to the prose). The prose sections
  (Driver, Boot, Testing…) stay and each ends with its kind's list (or one rules
  × kinds table). Exemption phrases vanish. Rough guess: ~30 slugs today → 50 to
  60 one-line rules. Grouping by family first, presentation open.
- **SYNTHESIS items 3 and 7 close together: the test lists neither half of
  "loading does nothing".** `stable-root` splits into `root-immutable` (the test
  lists it: isolation) and "loading does nothing" (registration, reads, stored
  machine reads at root — the test does not list it: its why is importers, and
  nothing imports a test). With that half unlisted, nothing turns registration
  red, so no rule makes it green: no `test-root-registers`, no reader
  "effect-free" declaration. Most runs kept the machine-read half on tests
  without arguing; refused on the importers why (held option b stands).
- **SYNTHESIS item 4: the test's one-path rule covers every function the test
  file defines**, not just test bodies (closes § Open's helper question). No
  call graph (misses callbacks, aliases, functions passed as values), no closed
  definition list needed. A loop no test reaches is dead code: strictness costs
  nothing. Way out = placement: the helper leaves as what it is (fake → adapter,
  builder → model, matcher → driver; canon 1017-1021). Remaining door, its own
  question next: a blob file imported only by tests (canon 1218-1219 says never,
  nothing checks it).
- **No rule for blob imported only by tests (refused, nanny).** Blob is the
  declared opt-out: it claims nothing, and no blob is red anywhere for its
  content or its importers (`blob-quarantine` guards the other side: who may
  import it). A loop moved to blob is not laundered: laundering = hidden under a
  green verdict; blob is visible, honest debt. Canon 1218-1219 is placement
  advice in a rule's voice; wording fix owed at the canon rewrite ("shared test
  code is placed by what it is; left in blob, it is debt like any blob"). Its
  other half, "…or test kind", is a real rule: nothing imports a test.
- **SYNTHESIS item 5: the test is a named member of the importer gates**, not
  exempted. An assembly is imported only by drivers, assemblies and tests (fixes
  482 vs 1214-1217, shared test factory); a driver only by a boot, drivers and
  tests (fixes 641 vs 634, `registerMatchers`; and a driver's own spec). Still
  red: a test importing a boot; a service importing a test assembly. Why: a test
  checks units, assemblies and drivers are units; these gates are composition
  rules seen from the target, and the test was already held free of composition
  rules. Slugs recut (placeholders `assembly-importers`, `driver-importers`).
- **SYNTHESIS item 6: each rule's line states whether type-only imports count,
  decided by its why.** Free where the why is calls or implementation (service /
  adapter importer gates; driver → model, `layers.model.ts:160`); counted where
  it is meaning, ownership or no contract (`inward-deps` — a model
  type-importing a port is red; blob; assembly / driver / boot importer gates;
  `private-sealed`; `no-service-cycle`). The code already does exactly this
  (`layers.model.ts:2-4,42,160`); only canon's wording conflicts: 881-883 "a
  driver or an assembly may type-import from any layer" overreaches (means: from
  any layer with a contract shape) — fix at the canon rewrite. `runtime-import`
  stops being a rule: it becomes a property of the rules it covered.
- **SYNTHESIS item 8, closed by earlier rulings:** `driver-calls-services`
  retired (a union, criterion A); the double report of a machine read in a model
  gone (`root-no-ambient` / `inside-no-ambient`, a model lists the second only).
- **SYNTHESIS item 8, "definition" depth → the definition rule dissolves**
  (rixo's criterion: a binding is fine if, written in place, it leaves no
  definition — judged on the initializer, not actual inlinability, since a
  binding used twice can't be inlined). Applied all the way, everything inlines
  (named helpers, module-level functions, classes; recursion is a loop), so
  "definition" was never a check of its own: a stand-in for "logic is here". Its
  why (residue parked in the outside kinds) is carried by what code does where
  it lands: call rules, the argument rule (tech values, instances, literals),
  sub-driver import rule, branch/loop rules. Retired: canon's definition clauses
  (443-446 "function, class, variable"; `driver-hooks-only`, assembly's and
  boot's). Reader today already reads a callback handed to a non-tech callee
  inline (`reading.model.ts:1880-1905`); the hook cut is positional (a function
  written in place as the argument of a claimed tech call), so detection is
  syntactic and reliable. Confessed gap: hook objects (Vite plugin methods) read
  as definitions until their reader cut (`framework-readers.model.ts`) — moot
  once definitions don't count. Refused: (a) every function at any depth
  (collides with canon's assembly loops with factory arms,
  `plugins.map((p) => createPlugin(p))`, an exception again).
  - **Owed hole: branches and loops in driver wiring** (canon silent, 8 runs
    flagged). Until its rule exists, a ternary inside `main` is green.
  - **Kept, its own why: `driver-one-wiring` (placeholder) — a driver names no
    function besides its wiring function.** Why: navigation — grouping is a
    sub-driver file (`commands.driver.ts`), not a second function in the parent.
    Check: a function bound to a name (declaration or `const x = () => …`) in a
    driver file, other than the exported wiring function; hooks (in place) and
    inline callbacks are unnamed, so never counted. Not for assembly (canon 480:
    as many assembly functions per file as the author wants); boot covered by
    its one-call rule. Side effect, not the reason: catches
    `const fmt = (x) => …` inside `main`.
- **`main` is expected in a driver:** it is the root driver's wiring function,
  the one the boot calls (`boot-one-call`).

## What is held (said, not objected to)

The test kind:

- **A test is its own kind, outside the layers, like boot** — not "driver +
  assembly minus ten exceptions". Its one thing: check units — build them, call
  them, assert. The "test is driver" lineage came from Cockburn's "tests drive
  the app": his driving actor is a high-level role, not our `.driver` kind — a
  parallel that holds philosophically only.
- **Imports:** packaging rules apply as to everyone (`private-sealed` has no
  kind exemption — `check/private.model.ts`; a test inside a service folder may
  reach that service's `private/`, a test elsewhere may not); composition rules
  don't, because a test builds what it checks. One sentence over canon's
  existing rule families, not an exception list. Implication noted: a gate
  touches nobody's privates. rixo may find more limits.
- **One path** (no statement-level `if`/`switch`/loop; an `if` whose only arm
  throws is an assertion). Launch: a branch or loop lets a test pass without
  asserting (`apps/cli/commands.driver.spec.ts:871`, green over an empty list).
  Landing: the reader never simulates; the test says the same thing every run.
  Loses nothing but writing comfort; way out usually `test.each`. rixo: yes.
- **Writes nothing outside itself** — shared state makes tests order-dependent
  (passes alone, fails in suite, or the reverse). Landing: each test reads
  alone. rixo: yes, "very the goal".
- **A test file's root holds nothing that can change** — same why as above, from
  the other side. Work at load (fixture paths, file reads, top-level `await`, a
  suite registered) is free: the remainder's why does not apply. rixo: settled;
  presentation stake above.
- **A test asserts at least once.** Bare minimum: no measuring, not a test — "an
  observation". In.
- **Named after its subject** (`x.model.spec.ts` → `x.model.ts`): a flavor
  concern (file names and how they map to the map are flavor, not canon).
  Kicked. It is the door to "the one act" and to the gate later.

The frame (thesis, rixo 2026-10-01 — in the agent's memory, not yet in a repo):

- **The arc:** deblob encodes as much meaning as possible into structure
  (mechanical, deterministic — the checker, the only part under our control),
  the agent acts in the remaining space, the human asks "does it make sense".
  The structure must have pre-delivered legibility for that landing. Every rule
  answers two filters: launch (can the checker enforce it?) and landing (what
  does it make legible?). Enforceable but illegible = ceremony; legible but
  unenforceable = wish.
- **Structure, not wish:** wording that reaches agreement between people ("too
  thin to need it", "stable public API", "test behavior, not structure") is a
  hole when an agent implements exactly what is written. Extract the checkable
  structure from prior art; flag every judgment word.
- **Two kinds of tests below e2e:** solitary (scaffolding, the agent's, low
  review, needs the test-kind rules checked — high value for the tool) and
  sociable / gate (c/si keystone — carbon/silicon: the gate challenges spec and
  code alike; its job is rescuing the human's engagement). Gate-specific rules
  are out of v1, doors kept open. E2e out of scope.
- **Prior art, filiation confirmed:** deblob's 2026-06-26 notes already said
  "Tests go through the contract — input via public API, assertions on
  documented behavior, no implementation details" — Ian Cooper's "TDD, where did
  it all go wrong" (NDC 2013). What broke it: anything can have a public API
  (fractal little bricks are proper services, not gate-worthy). Actionable part:
  in normalized deblob, behavior is observable at the entry points.
  Fields/Fowler solitary vs sociable: a past debate, both cheap now. AAA (Bill
  Wake, named 2001), Four-Phase Test (Meszaros 2007), Given-When-Then: the same
  three moments. Gherkin/DSL: out of v1; rixo's doubt stands (every DSL has
  glue; Gherkin's may be reviewable fact by fact) until a POC.

## Open

- ~~Helpers defined in a test file~~ — closed 2026-10-01 (SYNTHESIS item 4):
  `test-one-path` covers every function the test file defines.
- **The full atom set** — § The method.
- Shared test code placement (fake = adapter, test factory = assembly, builder =
  model, shared matcher/suite = driver) is canon today; to re-read against the
  atoms.

## The method (rixo's call)

Name the atoms by many independent tries, not one clever one: ~20–50 Sonnets
decompose every canon rule into atoms independently; one or a few Opus score the
quorum (which atoms recur, which rules decompose the same way, which parts sit
in two bundles); rixo weighs the conclusion, slowly. Tokens burnt, clock time
saved; the method guarantees the death seed is found, not hoped away.

Run: launched 2026-10-01, workflow `canon-atoms`, run id `wf_d102f244-049` (task
`w4rlsdg88`). 24 Sonnets, read-only, over longshot's canon
(`docs/architecture.md`), in three framings of 8 — rules-first, whys-first,
kinds-first — to decorrelate them (same model, same prompt otherwise: the counts
are correlated, not independent draws; the scorers are told to say what that
means). Each returns atoms (name, statement, why, check, landing, canon lines),
every slug as a molecule of atoms plus its remainder (judgment words = holes),
the kinds' selections, the shared parts, the test kind, the helper question.
Three Opus score the quorum independently: stable atoms (≥ 2/3 of runs),
contested, idiosyncratic, rules as molecules, shared parts (the candidate death
seeds — the section that matters most), the test kind, confidence.

Why 24: an atom's support is a proportion; at n = 24 a 95% interval is about ±20
points at worst, enough to separate "most runs find it" (≥ 2/3) from "a few runs
find it" (≤ 1/3) with no overlap; 50 would tighten it to about ±14 for twice the
tokens, worth it only if the scorers report a crowded middle.

Results: the transcript dir holds `journal.jsonl` with every return; the agent
writes the three reports and its own one-page synthesis into this folder
(`atoms-report-{1,2,3}.md`, `SYNTHESIS.md`) when the run completes.

## Other threads, parked while this runs

- **The dossier's side finding** (presentation, ours to fix on longshot, not yet
  done): the report repeats one line per reaching site with the same anchor
  (`apps/cli/commands.driver.spec.ts` line 77 ×63, line 27 ×40), and the
  `sub-driver-wiring` message does not name the hook it comes from.
- **The census script is stale**: `longshot/test-census.ts` imports
  `createProjectSource`/`extractionFor`, gone since the placement recut. A
  working variant (config via `createConfigAssembly(fs).loadConfigAt(root)`,
  graph via `createJudgeAssembly(fs).judge(config)`) was run from the session
  scratchpad, not saved. Fix the script in place when next needed.
- **Numbers at a7fc57a**: self-check 239 reds, 208 in test files (144
  `stable-root`: 28 sites act at load, 17 mutable, 42 unknown; 64
  `sub-driver-wiring`, all the CLI gate's per-test registration).
- **The talk-through agenda after this** ([../REVIEW.md](../REVIEW.md)): D7 + D8
  with L4, the L-series, the P-series, R-series. The tests item is superseded by
  this folder.
- **deblob main repo**: rixo's checkout sits on `driver-layer.cp1-review` (cp1
  canon committed there, not yet on `driver-layer`); the `configLoads` bug (L8)
  is owed to `driver-layer`; `main` carries two unpushed docs commits (landscape
  check, the `## Why` card).
- **Agent memory written this session** (outside the repo): the arc and the
  gate's mission (thesis threads), structure-not-wish, Cockburn's driver is not
  ours, ship-useful-not-complete (scope: v1 ships what we have, clean, holes
  named — but atomizing is in, ruled).
