# Chapter PLAN — placement debt

Scratch for the chapter: decisions to ratify, the step queue, and the finding
that motivated opening it as a chapter rather than four level-0 detours.

## Decisions to ratify at open (drafted 2026-09-10, Fable — none ruled yet)

- **Two problems, one chapter, five steps.** Problem 1 (knowledge ownership) is
  steps 01–02, pure model moves, shippable alone as a patch release. Problem 2
  (the run has no service) is steps 03–04 and carries the async flip. Step 05 is
  method only (skills and docs), added 2026-09-11. Kept in one chapter because
  all of it came out of one audit and one cause (the laundering pattern below);
  split if 01–02 ship and 03–04 stall.
- **The manifest kernel imports nothing.** The two-wildcard specifier grammar
  (`specifierPattern`, `specifierMatcher`) stays in `extraction/graph.model.ts`;
  the kernel takes compiled predicates injected (already the shape of
  `ResolveSurfaceOptions.disclosed`). Otherwise `manifest → extraction` meets
  `extraction/adapters/package-meta → manifest`: a service cycle on day one.
- **Async-first, no sync port.** Engine port async (`extract`, `resolve`),
  extraction service async, `externalLayerOf` async (the package-meta reader
  awaits manifest reads). Detectors stay sync and pure over the built graph.
  Flavor port unchanged (path-only, pure, public).
- **The check registry is derived, not mirrored.** Each detector exports the
  rules it cites; the registry composes them. The spec that today pins
  `CHECK_RULES` against the detectors goes — there is nothing left to drift.
- **`scripts/build-content.ts` enters coverage.** Its link-closure BFS is
  service-shaped logic living outside the governed subtree
  (`include: ["src/**"]`) — laundering by exclusion. Ruling wanted: place the
  walk in `explain` behind the fs port (step 03 or 04) and widen `include` to
  `scripts/**`, or rule scripts as assembly by designation. Draft leans to the
  first.
- **The gates ask for the owner (added 2026-09-11, from terrain; rewritten the
  same day after rixo's objection).** A trigger → use-case table (one owning use
  case per trigger) enters the method in two regimes. At the spec gate a blank
  or double cell is _allowed_: it records a deferral, the way blob records
  unplaced code. At consolidation (chapter close, where the test gate already
  sits) a blank cell is a finding: fill it or rule it. The objection that forced
  the rewrite: the partner's use cases were not nameable before the stages
  existed and ran — their spec did name use cases, the wrong ones — so asking
  for the owner at spec time asks for premature commitment; what was avoidable
  is the deferral having no return date (our step 09 ruled "assembly owns the
  sequence" as a fact, not as "until it grows", and nothing re-asked for five
  steps). The test-gate half is unchanged: the reviewer opens the owning suite
  per trigger and reads titles as domain behavior — that signal only exists at
  consolidation anyway. Dogfooded first in step 04's own spec, then written into
  `deblob-sdd` (api-section, review-gates) and `deblob-review` in step 05.
  Ruling wanted: step 05 here, or a CLI-board entry. ? Whether "consolidation"
  is always chapter close or can be a mid-chapter re-ask when a handler grows a
  second service call.
- **The driver sequences nothing.** Guide text, not a check: a verb handler is
  parse → one use-case call → present; two service calls in one handler is the
  smell. architecture.md's two-hats paragraph and the two assembly cards name
  the third hat. Rides step 04's Docs section, with the driver that first obeys
  it.

## Step queue

- `01_manifest-kernel` — **spec drafted**:
  [01_manifest-kernel/SPEC.md](./01_manifest-kernel/SPEC.md). `lib/manifest/`
  born: exports map, claim (one reader, two tolerances), reach. `check/surface`
  keeps the judge. The `config → check` edge dissolves.
- `02_check-registry` — `check/checks.model.ts`: the ordered check list with
  cited rules, composed from what each detector exports. `cli` derives
  `KNOWN_CHECKS` / `CHECK_RULES` / `rulesForTopic` from it; `main`'s `DETECTORS`
  table folds into step 04's run service. Small; may ride 01's commit if the
  seam agrees.
- `03_fs-kernel` — `lib/fs/`: `fs.port.ts` (async; `readFile → string | null`,
  `exists`, `stat → { size } | null` — the exact set five readers need, read as
  a debt ceiling), `glob.port.ts` (the coverage scan), `node-fs.adapter.ts`,
  `memory-fs.adapter.ts` (state exposed for assertions), a glob adapter over
  tinyglobby and one over the memory fs. Engine port + extraction service +
  package-meta reader go async. Loader, scan, content code become service
  functions taking the ports; their validation slides into model. The config
  `import()` stays a platform call in the loader, ruled out of the port.
- `04_run-service` — `lib/run/run.service.ts`: `createRun` over the ports and
  the flavor registry; use cases `status`, `check`, `explain` returning values
  (rendered text + exit code, or the structured results and the driver renders —
  decided at the step's API section). `main` becomes wiring, streams, exit
  codes. The driver spec keeps every golden; the run spec runs the same
  scenarios over the memory fs. Its spec carries the first trigger → use-case
  table (`status`, `check`, `explain`, each one cell), and its Docs section
  names the third hat in the guide.
- `05_gate-questions` — method step, once 04 has used the table:
  `deblob-sdd/knowledge/api-section.md` (the table as the section's index when a
  spec touches a trigger), `deblob-review/SKILL.md` (ninth question: every
  assembly definition named instantiate / connect / translate, the owning suites
  opened per trigger), `docs/sdd.md` §4 and the `review-gates` card in the same
  stroke. Docs and skills only; the self-review prompts in
  [research/terrain-use-cases-in-the-driver.md](./research/terrain-use-cases-in-the-driver.md)
  are its raw material.

Spec depth follows foundation: 01 fully; 02 as far as it is load-bearing for
01's seam; 03–05 as above until 02 lands.

## The laundering pattern

rixo, at open: "this assembly laundering blob logic is recurring. I resisted it
already a few times in review, and I'm afraid more is hiding in stuff that
passed the screening. That's agents abusing the mechanical verdict."

**What the instructions already say.** Four sites, all at placement time:
architecture.md § Assembly ("a decision or computation written in assembly isn't
wiring, it's blob hiding in the one layer whose label seems to allow it"), the
`blob` card, the `rules` card ("import privilege, not placement licence"), the
`placement` card ("keep it thin — every line of logic here is untestable"). Zero
sites at the review gate: the `deblob-review` pass has eight questions and none
asks about assembly. Zero sites on the instrument: the status line prints blob %
and never assembly %.

**Why that is not enough.** The placement instruction competes with the green
verdict, and the verdict wins because the verdict is what gets reported.
"`deblob check` green, 100% coverage" is a sentence an agent can write at
handback; "every definition in `main.ts` is wiring" is not, and nothing asks for
it. Assembly is the one layer whose rules are all permissions, so code that fits
nowhere else fits there without a single red line — the checker's silence reads
as approval.

**What the audit found hiding (2026-09-10).** `main.ts`: `colorsFor` (a decision
over env and TTY), `serviceCountOf` and `pathPrefixOf` (computation), the
inventory derivation written twice (`runStatus`, `runCheck`), the
`surfaceRan`/`surface === null` interplay deciding what the coverage line
prints. `scripts/build-content.ts`: the md link-closure BFS, outside coverage
altogether. Spec files (assembly by test naming): clean — module-level helpers
are test factories (graph builders, violation builders), the pattern the testing
canon prescribes; one spec re-derives `packageNameOf` inline
(`layers.model.spec.ts` `crossed`), a duplication, not laundering.

**Second instance, from terrain (2026-09-11).** A field note from the partner
monorepo's CLI, nine deblob steps in, every rule green — digest in
[research/terrain-use-cases-in-the-driver.md](./research/terrain-use-cases-in-the-driver.md).
Same pattern, seen from the other end: there the laundered spans are not stray
helpers, they are whole verbs. Each pipeline stage got a hexagon; the use cases
(what a user triggers) never got a service, so the driver sequences stages to
fulfil each verb, and the stage services' tests read as plumbing ("format X
dispatches to the X facade") — legible and green one at a time. The note gives
the class its name, and our Problem 2 is an instance of it: **a trigger with no
owning use case.** The helpers the audit listed (`serviceCountOf`,
`pathPrefixOf`, the inventory derived twice) are the residue of the missing
service, not the defect itself.

Three things the note adds that the draft above did not have:

- **The third hat.** The guide sanctions two hats in a CLI file: driver (parse,
  present) and assembly (instantiate, connect). Sequencing services to fulfil a
  verb is a third, sanctioned nowhere, and from one line away it looks like
  either of the other two — a loop over services reads as wiring, a branch on a
  result reads as presentation. This is why naming each assembly definition
  instantiate / connect / translate (lever 2) works at all: _sequence_ is the
  answer that has no name in the list.
- **The leak tell.** A service exporting something only the driver consumes to
  finish a verb is the missing use case poking through. Ours: `main` imports
  `tallySurface` from `check/surface.model.ts` to count a claim the status never
  judges — listed in the GOAL under problem 1, the same tell under a different
  heading.
- **The question is answerable top-down, before the code exists.** Per
  user-facing trigger, which one use case does it call? A table, no reading of
  implementation. Ours today:

  | Trigger   | Owning use case                                                                                                    |
  | --------- | ------------------------------------------------------------------------------------------------------------------ |
  | `status`  | none — `runStatus` in `main` sequences config, scan, surface, extraction, stats                                    |
  | `check`   | none — `runCheck` sequences the same, plus the detectors and the exit lane                                         |
  | `explain` | none — topic → rules resolution and the unknown-topic refusal sit in the `switch`; `main` calls the adapter itself |

  Three verbs, three blank cells. Step 04 fills them; step 05 makes the table a
  thing a spec carries.

**Levers, in the order the draft recommends** (rulings wanted; reordered
2026-09-11 after the terrain note — the two gate questions moved ahead because
they ask top-down and earlier):

1. **Trigger table, two regimes.** A spec that adds or changes a user-facing
   trigger (CLI verb, plugin hook, HTTP route) carries a two-column table in its
   API section: trigger → the one service use case it calls. At spec time a
   blank or double cell is a recorded deferral; at consolidation it is a
   finding. Buys: every deferral gets a return date, and the question is
   answered from a table, not from reading implementation. Does not buy: a right
   first cut (the partner's nine steps of stages were the price of learning what
   the verbs were), nor anything for stray computation that is not a verb
   (`colorsFor`); that stays lever 2's job. Born in step 04's spec, graduated to
   `deblob-sdd` in step 05.
2. **Review gate.** `deblob-review` gets a ninth question: _Assembly touched?_
   For every module-level definition in an assembly file, name which of
   instantiate / connect / translate-a-trigger it is; a handler that calls two
   use cases is a finding (sequence has no name in that list); any other answer
   is a finding — place it, or own it as blob (suffixless) so the debt stays
   visible. Then, for each trigger in the table, open the owning use case's
   suite: titles must read to someone who knows the domain and not the code
   ("dispatches to the facade" fails; "same source, record missing → throws
   not-found, nothing written" passes). The reading is already
   `testing-reviewer` canon; the table tells the reviewer which suite to open.
   Step 05.
3. **Guide text, not a rule.** architecture.md § Assembly (the two-hats
   paragraph), the `layer-assembly` card and `assembly-patterns` name the third
   hat and the litmus: a verb handler is parse → one use-case call → present;
   two service calls in one handler is the smell, however small each call is.
   Rides step 04's Docs section.
4. **Instrument.** The status and check inventory lines print assembly share by
   size next to blob (`49 files · 443kb · 0% blob · 8% assembly`). A number, no
   threshold, no rule. The terrain note weakens it: their driver was two thirds
   legitimate option tables and help text, so the share moves with help text as
   much as with laundering. Stays a CLI-board candidate, demoted from second to
   fourth.
5. **Not a rule.** "Assembly contains only wiring" is undecidable by shape.
   Proxies exist (an assembly file that imports no composition-unit factory is
   not assembling anything) and every one has a legitimate counterexample
   (`bin.ts`). Stays an Ideas entry at most.

## Open

- Step 04's API: does the run return rendered text or structured results? The
  render model is pure and already takes values; returning structures keeps
  `cli` the sink and the run free of `Colors`. Draft leans structures.
- Whether `config`'s loader service is a second service file in `config` or
  folds into `config.service.ts` (resolution is pure; loading takes ports).
- Assembly's role list as a closed set — initialize, wire, trigger by calling a
  service — and a driver declaration in config next to `assembly`, so the
  trigger → use-case table (step 05's gate question) is computed, not hand
  tabled. rixo's brief of 2026-09-12, from the graph spike:
  `history/future/graph-as-product/research/driver-extraction-2026-09-12.md`.
  Lands here or in arch-pass at graduation; the spike codes the declaration
  first.
- **Read the levers and the step queue as pre-verdict (note of 2026-09-13).**
  The talk of 2026-09-13 converged on the driver as the missing layer and on
  assembly as a point, not a layer: composition confined to the driver's
  prelude, one service call per trigger, no adapter calls from a driver, any
  other assembly-shaped code owned as blob. The decision record is owed
  separately; until it lands, four things above are superseded rather than
  wrong. Lever 5 ("undecidable by shape") argued at import level; the spike's
  step 04 attributes imports per trigger at function level on two codebases with
  zero residue, so the driver rules become checks. Lever 3 and step 04's Docs
  line ask to name "the third hat"; withdrawn — one role, three verbs
  (initialize, wire, call), the two-hats paragraph goes. Steps 02–05 get re-cut
  under that framing (the spike already cut 02 as a check service, not a
  registry). "Owning use case" per trigger survives as _primary use case_; the
  module-level "owner / reached" vocabulary of the spike is the one withdrawn.
  Step 01 and the research notes stand as written.
