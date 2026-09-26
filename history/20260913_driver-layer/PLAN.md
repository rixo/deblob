# Chapter PLAN — driver layer

Scratch for the chapter: the canon review board (every item found on the first
draft, its status, the edit it implies), the decisions ratified along the way,
and the step queue. The canon draft is committed as bb4bb3c; edits land on top
of it, reviewed by rixo per checkpoint, one commit per batch of ruled items.

Status words: **DONE** (edit in the working tree or committed), **RULED** (rixo
decided, edit pending), **OPEN** (needs a decision), **PRE-EXISTING** (not from
the draft, noted for the ruleset's completeness).

## Rulings so far (2026-09-15)

- **Boot is a layer.** `.boot.ts` (plus an optional config glob, mirroring
  `assembly`, for a framework that owns the file name). Two rights, nothing
  more: import a single driver; call its wiring function once, at module root,
  with no arguments. Defines nothing, holds nothing, touches no tech — `process`
  and `document` are the driver's. Nothing imports a boot; every boot is a root
  of the import graph, one per entry point. It is the one module whose
  evaluation performs a call, which is what makes `stateless-modules` hold
  everywhere else without exception. Outermost: `… < drivers < boot`. Slug
  proposal: `boot-one-call`.
- **`stateless-modules` restated.** The intent is no mutable module state; the
  second target is no side effect at evaluation; root calls are the lane both
  use to get around the rule, not the crime (`Object.freeze` at a model root is
  what the rule wants). A root call is legal only when its callee is declared
  pure and its result immutable. Enforcement in tiers: a root call to a factory
  is red once the flavor identifies factories (step 02); a root call into tech
  or a composition unit is already red by imports; readonly-typed root bindings
  are an opt-in config, because some target codebases are untyped. The driver
  exception dies; a root driver builds inside its wiring function and reads its
  tech there; a lazy assembly caches in that function's closure.
- **Test files get the root-registration right.** A spec file's evaluation calls
  the runner's registration API (`describe`, `test`) at root, unbounded, by the
  test tech's shape. Mutable state at spec root stays forbidden (each test
  assembles its own instance).
- **Root drivers take no arguments.** `main()` not `main(io)`: a wiring function
  takes tech and instances only from a parent driver.
- **Translation as a facade service is taxonomic, not a contradiction of
  intent.** Cockburn's driving adapter is, in deblob, the driver file plus the
  facade service; ruling the translation as a service buys it ports and contract
  tests instead of blob. The domain services stay tech-blind, which is the
  intent both authors protect. One owned sentence in canon; the Ports section's
  "inside" scoped to the domain services; parse and render are use cases only
  under deblob's level-blind definition, not Cockburn's.
- **Flavors identify factories — a step of this chapter**, not a future idea:
  the assembly reader's model-callee case, the root-call rule above, and the CLI
  rework all need it.
- **The load, declared (2026-09-15).** By default an assembly makes no use-case
  call and config is loaded inside the use case that needs it. The exception: a
  load, a use case the graph depends on (the config service's). Loads are
  declared, not inferred — nothing in a call's shape tells a load from a use
  case run for its effect, and a "result consumed" check is gamed as easily. The
  project declares the allowed use cases (config key, step 01: file + function,
  one or a list); any assembly may await any declared one, several if the graph
  needs several config sources; an undeclared call is red with the declaration
  as the resolution. No per-assembly tuple (rename cost for nothing on an honour
  mechanism), no count (useless once declared). Results are tech values: factory
  arguments, conditions, loops, nothing computes on them. Canon states the
  principle only; the key's shape is CLI spec. Restores the research note's
  "root awaits one load"; the implementation guide's lazy `getConfig()` is the
  pre-canon form. Multiple Mains rejected as the general answer (tedious, DRY);
  choosing adapters from config data is the normal case.
- **Branch or loop is wiring** when what it tests or iterates is a parameter or
  a loaded value, compared to a literal or for truthiness, with factory-call
  arms. A condition reading an instance or a value computed from one is the
  launder; "every call is a factory call" already kills computed conditions, the
  instance read is what the rule adds. "Makes no decision" → "decides nothing
  but which factory to call". Not a last resort: choosing the implementation is
  the composition root's job (Seemann); building two instances to use one is a
  container's habit, rejected.
- **Small fixes taken**: Humble Object credited to Meszaros (Feathers's humble
  dialog box as origin); "primary use case" / "instrumental use case" stated as
  our aliases; Martin's Main mapped to the split (now boot + driver + assembly);
  the "most boring file" line dropped as load-bearing zero.
- **Assembly does not return adapters, except when called by a test (2026-09-15,
  row 51).** Corollary: an assembly that returns adapters can only be called by
  tests. That is the whole rule. A longer version landed the same night and was
  cut back by rixo as over-built for a file kind with zero instances in any
  repo: three-holder reasoning, a test-side / production-side split by graph
  reachability, a reader clause tracking adapter factory results, and "what a
  later chunk shares arrives as a service". Returned assembly closures for lazy
  groups were rejected earlier the same evening. None of it is to be re-proposed
  before a real assembly file exists. Shared model instances stay returnable (a
  store handed to the tech). Lazy init is service logic (row 52).
- **Readonly root bindings: checked by default, opt-out (2026-09-16, step 02).**
  Reverses the opt-in above. The only reason for opt-in was untyped codebases,
  and it made every typed one pay for them; a rule the tool states and does not
  enforce is not a rule, the escape is one config line
  (`mutableModuleState: true` — the key names the loose mode, rixo: a switch
  says what was allowed), and a default loosened later breaks nobody where one
  tightened later breaks every green run. The fact is syntactic (no type
  checker: a heuristic, holes on the strict side — rixo: "ok for now, latent
  bugs long term"), carded under Ideas for a later iteration. Config key, not a
  flavor property: naming is the flavor's, a type annotation is the language's.
  Canon's sentence follows in the same commit.
- **Unknown is for reader deficiency only (2026-09-17, step 03).** The
  half-known-tech fence (a callback the reading cannot cut, an unparsed file, a
  tech no reader rules) is lenient because the checker lacks the knowledge.
  Everywhere the reader has the full tree and the closed grammar — a callback
  handed to a language call, a parameter with several call sites, a call on a
  call's result, an assignment at module root — "unknown, not judged" was the
  same fence applied by resemblance, and it is wrong there: with full knowledge,
  what cannot be positively read as legal is judged as it reads. Parameters with
  disagreeing call sites are read once per world, each judged as the only
  caller, infractions attributed to the inducing site, no violation for the
  disagreement itself; the open part shrinks to genuine ignorance. The audit and
  its rulings: SPEC 03 § The open part, audited.

## Ruling 2026-09-19 — factories are not a model concern

Reverses the first enforcement tier of "`stateless-modules` restated" above, and
step 02's premise with it. The ruling's own first sentence is what stands: the
intent is no mutable module state and no side effect at evaluation, so that a
module can be imported, and tested, without anything happening. Root calls are
the lane, not the crime. Factories are functions; they do nothing unprompted.

What the flavor's word actually bought, audited in
`research/factories-in-model-2026-09-19.md`: a verdict drawn from a naming
convention no compiler checks, about a property the tool cannot see. In the
layers where "factory" is load-bearing — service, adapter, assembly, blob — the
file's kind already decides and the name is never consulted. In model, "factory"
is ordinary language for a function that returns something stateful, and deblob
has no interest in it. The implementation guide's own convention
(`create<Name><Kind>`) is scoped to composition units; the flavor applied it to
the model layer.

Ruled, three parts:

1. **The state claim moves to the readonly half, and that half gets tightened**
   to what the language proves: primitives and unions of them, `readonly T[]`
   and `Readonly<{…}>` over proven members, `Object.freeze` over a literal. A
   named type reference is unresolvable, so unproven. Today's list accepts
   `Readonly<Store>` and a freeze of anything — the hole the factory rule was
   unknowingly patching, in the half that can actually close it.
2. **The root-call half keeps only the side effects it can see** — tech calls,
   use-case calls, locals in impure layers — and drops `factory` and
   `local factory: true`. `isFactory` loses its last consumer.
3. **Assembly keeps canon's own sentence**: a call result is passed on or
   returned, never branched on, computed with, or member-accessed. Row 37's
   model-factory epicycle collapses into it.

**The method question behind it** (`history/META.md`, 2026-09-19): the rule was
defended by citing canon rather than by tracing it to a benefit canon states.
The litmus from here — a rule is grounded only if it traces to a stated why;
short of that, either the rule is fanaticism or canon is lacking, and both get
closed, not argued away.

**Plan, in order, with a stop in the middle** (rixo, 2026-09-19 — damage control
before more building):

1. Criterion written first, so the audit has a test to apply — done,
   `history/META.md`.
2. Blast radius measured before calling it damage — done: no released version
   enforces factory-ness (`KNOWN_CHECKS` has no `modules`, and no assembly,
   driver or boot check exists). What shipped is the rule's text, through canon
   and `explain`, plus the flavor's public name. Docs and unlanded code, no
   migration.
3. Wide audit against the criterion, read-only — done, the research note above:
   canon (seven sites), the chapter PLAN, the frozen SPECs 01–03, the reader and
   graph types, the config docstrings, the skill, the corpus row names. Two
   negatives recorded: no other new rule draws a verdict from a name, and the
   new slugs' knowledge cards are unwritten.
4. **Stop and reassess** — rixo reads the table and rules the scope: a
   corrective step, an amendment to 04, or a revert of 02. Not pre-decided; a
   revert would also lose what 02 got right (readonly as a fact, test sites not
   binding, the reading's structure).
5. Then fix in dependency order — canon first (it is the contract the specs
   cite), then the corpus re-verdicted against it, row names included, then the
   rules and the reader, then deblob's own self-check count re-measured under
   the tightened readonly list. The corpus comes before the detectors by the
   method ruled at 03's handback: cases first, judged as verdict rows without
   opening a detector. An earlier draft of this line put the corpus last, which
   read as re-verdicting after the code was already written.

Nothing parked: the red corpus is untracked and inert, it conflicts with no
edit, and re-verdicting its rows is the sharpest test that the fix is real. (An
earlier version of this line invoked a blanket ban on `git stash` as rixo's
rule. It was never his — an agent invented it and it was quoted back at him for
eleven days, 2026-09-21. The real constraint is narrower: `stash pop` without
`--index` flattens the staged half, which is his review backlog.)

## Ruling 2026-09-21 — one rule end to end first, stamp while red

The chapter had built a wide red frontier before anything closed: a canon draft,
54 board rows, a reader of 886 statements at 100% unit coverage — and **no check
in the program consumes a `FileReading` at all**. The rules that will are this
chapter's remaining steps. Measured, not argued: the corpus alone already
executes 75% of the reader's statements while observing none of them. That is a
batch, not a red-green cycle, and it is what "building on wind" named.

The correction is the cycle, not a rewind. Nothing built is thrown away; what
stops is adding to the reader before a verdict consumes it.

**The ladder.** `stateless-modules` clause by clause, each closing corpus rows,
the first carrying the missing wiring (a `modules` check, `KNOWN_CHECKS`,
`CHECK_RULES`, detector registration in the CLI and the corpus assembly):

| clause                                         | closes         | running |
| ---------------------------------------------- | -------------- | ------- |
| A — a root statement that still does something | R12            | 1       |
| B — a binding the syntax does not prove        | R1, R10        | 3       |
| C — a call reaching the tech                   | R4, R5, R13-15 | 8       |
| the `mutableModuleState` opt-out               | R11            | 9       |
| D — a call running a use case                  | R6             | 10      |
| F — the exemptions by kind                     | R7, R8         | 12      |
| E — a call into a local of an impure layer     | R3             | 13      |

A is first because it is the smallest thing that can carry the wiring, not
because it is worth the most — the first clause does not count for itself. C is
where the inlining work becomes observable at all.

**The ladder is not the chapter, and it is important not to read it as such.**
The GOAL is a closed verb list for every kind outside the hexagon, and canon
already carries eleven rules for it: `test-is-assembly-and-driver`,
`assembly-builds-only`, `assembly-driver-only`, `wiring-outside-hooks`,
`one-call-per-hook`, `driver-calls-services-only`, `driver-defines-hooks-only`,
`driver-to-driver-wiring`, `driver-not-imported`, `boot-one-call`, and
`stateless-modules` restated. `RULE_IDS` registers one of them — the last, which
pre-existed. The other ten have no rule id, no detector, and **no corpus rows**:
`modules.spec.ts` covers `stateless-modules` alone. So the ladder ends with the
wiring built and one rule of eleven proven end to end, which is the point of
doing it first and is roughly where the chapter's real cost begins. Each
remaining rule wants the same four steps — canon sentence, rule id, cases
stamped while red, detector — and the cases for them are unwritten.

Found on the way and pre-existing: canon's anchor is
`test-is-assembly-and-driver` while `RULE_IDS` still says `test-setup-assembly`.
A rename that never reached the code, and the cause of the two failing `explain`
tests. In scope here — the GOAL asks that slugs in code follow canon.

**Why this rule first and not the ones we want.** Assembly laundering is what we
are impatient to watch evaporate, and it cannot be reached early: the new rules
are interlocked, an assembly without drivers and boot stops a program dead, and
a partial set does not reduce laundering — it relocates it to whichever new
layer is still unruled. The chapter closes as a set or not at all, so the order
inside the set is free — and it is bought cheapest by the one rule that already
has its slug registered and its cases written.

**deblob flags itself red meanwhile** (rixo): accepted, and not the same quality
of red as a finished tool reporting on itself. The checker is half-built, so its
output is not yet a judgement on this codebase — holding the build to a green
self-check would mean tuning the rules to what the code already does, which is
backwards. The exemption ends with the chapter: once the set is complete, a red
self-check means the code is wrong, not the meter.

**Two stamps per clause**, because they answer different questions: rixo agrees
the corpus row's verdict is right (the machinery works), then the same clause
reads sanely on code neither of us wrote (the target is right). Only the second
speaks to whether the vision holds, and only real adoption can settle it.

**Stamp while red.** A row is stamped before its detector exists — once a case
is seen to pass, "it works" is very hard to argue with. A row carries the canon
sentence it embodies; one that cannot cite a sentence is policy invented in a
test. Unstamped rows run as the queue but are not the gate and prove nothing: an
agent wrote the marker and an agent would write the detector, and green would
mean only that the two agree. Six rows are marked UNSTAMPED today.

**Not now, deliberately.** Running the chain over an outside codebase is a
smoke-and-remedy check on a clause that already works, not a prerequisite and
not evidence about the vision: shapes counted in code written the old way rank
by the past, and the rules most load-bearing for this architecture are exactly
the ones that cannot fire there. The method itself — two test sets with the
high-level as the golden gate, mutation testing over line coverage, coverage
measured per set — gets its own chapter when it has paid off once here, on the
plan's own rule: do not prescribe the method before it has earned it.

**Renamed the same evening: `stateless-modules` is `inert-modules`** (rixo). The
rule forbids two things at module root, mutable state and side effects on
import, and since the day's ruling that a tech read stored at root captures the
machine's state, it forbids what "stateless" does not name at all — a `: string`
bound from `process.env` is red. `pure-modules` was considered and set aside:
`service-purity`, `chain-purity` and the `pure` config key are about what a
module's code may touch, judged by imports and layers, where this rule is about
what loading the file does, in every layer, adapters included. "Inert" says it:
loading neither acts nor leaves anything that could change. Code, canon, skills
and the current plans carry the new name; this file's earlier sections and the
dated chapters keep the old one as written. A rule name is public API: the
rename ships as a breaking change, alongside `test-setup-assembly` →
`test-is-assembly-and-driver`.

**Renamed later that night: five outside-rule slugs, back to the slug grammar**
(rixo). Registering `test-is-assembly-and-driver` in `RULE_IDS` failed the
grammar test — two or three kebab words, ruled when the rules were first named
(`history/20260908_rule-names/SPEC.md:51`). Canon carried four more names over
three words, set in the 2026-09-13 talk before anyone checked them against the
grammar; nothing had registered them, so nothing had failed. rixo kept the
grammar ("constraints are good for you") and each name was redone short:
`test-is-assembly-and-driver` → `test-is-outside` (a spec file is the outside
with its restrictions loosened, not both kinds' rules at once),
`one-call-per-hook` → `hook-one-call` (sibling of `boot-one-call`),
`driver-calls-services-only` → `driver-calls-services`,
`driver-defines-hooks-only` → `driver-hooks-only` (after `ports-types-only`),
`driver-to-driver-wiring` → `sub-driver-wiring` (the rule is about imports, the
moment of the wiring call and its arguments, not imports alone). Canon, code,
skills and the step queue carry the new names; this file's earlier sections, the
step SPECs and the research keep the old ones as written.

**Renamed 2026-09-23: `inert-modules` is `stable-root`** (rixo). The bindings
ruling of 2026-09-22 gave the rule its why: what sits at a module's root must be
the same on every load and for the whole run, or the tests importing it are not
repeatable. "Inert" names the mutability half and the side effects, not the
determinism half — a clock or random value stored at root neither acts nor
changes, yet differs from one load to the next. "Stable" names the why, and
"root" names what the rule judges. `clean-modules` and `clean-root` were
considered and set aside: "clean" is already the word for a run with no
violations (exit 0) and says nothing of what the rule checks; `pure-modules`
again collides with `service-purity` and `chain-purity`. Where "stable" is hard
to pin in a given shape, the name gives the effort its question. Code, canon,
skills and the current plans carry the new name; this file's earlier sections
keep the old one as written. Breaking, like the renames before it.

## Ruling 2026-09-20 — inlining is the reading principle, not a rule's clause

Where the reader can conceptually inline a callee, it inlines it and the
ordinary rules judge the resulting code. **`Can` means certainty**: the callee
is uniquely determined and its body fully resolved. Any doubt and the call
itself is judged as a call — which puts it back under the layer rule, red
wherever the layer may touch the tech. Doubt costs a red when the call is
load-bearing, and that is the intended direction.

The reader already does this three times and states it nowhere, each written as
its own special case (`extraction/README.md` § the open part, landed in 03): a
tracked local read at each site as the site's own text, a callback read inline
where it is handed, a call's result called inline classified by its value. The
work is naming the principle; widening it is the payoff. Both halves generalize
together — the concept in canon, the mechanism in the reader — and they come
along step 04, not after it: the detector is written in this frame or it is
written twice.

Why this way and not the other one. The alternative considered was proving a
callee pure — a whitelist of forms, sound by construction. It is the same
outcome taken by the complicated end: purity asks a universal question about a
function (every site, every argument, a fixpoint over the call graph), inlining
asks a local one about one site. Inlining also needs no new rule vocabulary,
since after substitution the existing rules apply unchanged, and it gives the
better diagnostic — the violation reports at the tech call, not at the caller.

What follows for the rules:

- A root binding initialized by a call the reader inlined is judged on what the
  substitution leaves behind, not on the call. Corpus row 4 is already written
  this way: `HOME_LENGTH: number = readHome()` is neutral on the binding, and
  the red sits on `process.cwd()` at its own line. No row changes.
- The clause about a call into a local of a file whose layer may touch the tech
  is the **fallback** for callees inlining cannot follow, not a parallel rule.
  That is the whole of what the layer decides.
- What inlining cannot follow, and what therefore stays red: a method on a
  value, a callee reached through a binding, a reassignable one, a cycle,
  anything past a depth budget.
- Being exported is not an obstacle. Inlining is per site, so each site
  substitutes on its own and needs no claim about the others.
- The trap to build against is scope, not effects. An inlined body's free
  variables belong where the body was written, so the callee's scope travels
  with the substituted text and the site's scope never re-binds it. Same file
  buys no exemption: today's tracked locals are read in the site's scope chain,
  so a local or parameter at the site that shadows a module name captures the
  body's free variable — a helper calling `process.exit()` reads `language`, and
  one calling an imported factory reads `local`, when the site declares
  `const process` or `const createThing` (checked against today's reader). Wrong
  answers rather than unknowns, which is the one failure mode this principle
  must not have. Widening opens the other direction too: a callee written in a
  nested scope loses bindings the site never had. Either the substitution
  carries the callee's scope, or the call is not inlined.

## Review board — internal consistency

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                  | Status  | Ruling / edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Layering preamble says outer layers have "progressively fewer structural constraints"; assembly and driver carry the narrowest rules                                                                                                                                                                                                                                                                                                                  | DONE    | Rewrite the preamble: more knowledge outward, and the two outermost kinds trade import breadth for the narrowest verb lists                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 2   | "Outer layers may contain inner-layer code" licenses model logic in assembly and driver, which forbid any definition                                                                                                                                                                                                                                                                                                                                  | DONE    | Scope the sentence to the hexagon's own layers; name assembly, driver, boot as the exception                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 3   | "Imported by nothing" false for sub-drivers; `stateless-modules` driver exception rests on it                                                                                                                                                                                                                                                                                                                                                         | DONE    | Boot layer; exception dropped; "imported by nothing outside the driver layer; the boot starts it" at lines 186-188, 248, 500                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 4   | Assembly rule never says the file exports one assembly function ("nothing at module root but imports")                                                                                                                                                                                                                                                                                                                                                | DONE    | No count rule: nothing calls an assembly under a one-callee constraint (the driver cap exists for the boot). "Nothing else is defined" → "nothing but assembly functions is defined, as many per file as the author wants"                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 5   | "Takes no injected dependencies" vs "instances built or received here"                                                                                                                                                                                                                                                                                                                                                                                | DONE    | Line 219 trimmed to "it is called, never built"; no new sentence — who may hand an assembly an instance is implied by the matrix (only assemblies and drivers import assemblies; only assembly builds composition units)                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 6   | `run(argv)` in the CLI example vs Ports "shaped to the inside's needs"                                                                                                                                                                                                                                                                                                                                                                                | DONE    | See "translation as a facade service" above; write the owned sentence, scope "inside"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 7   | Non-driver web components are suffixless, hence blob; drivers cannot import blob, so `+page.svelte` rendering a child is red                                                                                                                                                                                                                                                                                                                          | DONE    | Derivation, not a ruled conflict: canon fences web drivers as open (line 209) and the resolver has no `.svelte` extension, so such files are not in the graph. One sentence at the fence: a file of an unruled tech matching no driver glob is outside the graph, not blob. UI ideas to Future                                                                                                                                                                                                                                                                                                                                                             |
| 8   | Retrofit path: a suffixless entry file cannot import an assembly nor a composition unit, so no green state once the first service exists                                                                                                                                                                                                                                                                                                              | DONE    | Path stated after "not ready to be declared": blob entry stays green until one cut installs facade service + port + assembly (legacy as quarantined blob behind the port) + driver + boot; distillation from there; extracting a domain service before the cut is the one red route                                                                                                                                                                                                                                                                                                                                                                        |
| 9   | Test exemptions list only the call count and services-only; fixtures and test factories are definitions; test utility files are blob                                                                                                                                                                                                                                                                                                                  | DONE    | Test kind = spec files only (imports anything, blob included; defines anything; imported by nothing; `stateless-modules` kept). Shared test code is never test kind or blob: fakes = adapters, test factories = assembly, data builders = model, runner extensions (`expect.extend`, fixtures, shared hooks) = a driver the spec calls with the tech. Layer list, matrix row, rule anchor, driver-to-driver example, test factory section                                                                                                                                                                                                                  |
| 10  | Matrix preamble says intersection of layer and composition rules; the Drivers row forbids model, which comes from a driver rule                                                                                                                                                                                                                                                                                                                       | DONE    | Preamble names every rule family the matrix folds (layer, composition, outside kinds). Type imports free on the importing side for every kind (a driver may type-import model and ports: shapes, no calls); the restriction stays on the imported side (nothing type-imports assembly/driver/boot but their importers)                                                                                                                                                                                                                                                                                                                                     |
| 11  | `main(io)` implies a caller the CLI example does not place                                                                                                                                                                                                                                                                                                                                                                                            | DONE    | Boot; the example gains `cli.boot.ts`; `main()` takes no arguments                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 12  | "The only place in the program that touches the tech" vs a framework-side adapter implementing a routing port                                                                                                                                                                                                                                                                                                                                         | DONE    | Qualified at both sites (line 194, line 609): the driver is the only place that listens to the tech / receives its events; an adapter may call into the same tech outbound, behind a port; "nothing to abstract" scoped to the inbound side                                                                                                                                                                                                                                                                                                                                                                                                                |
| 13  | Wording that bites literally: "makes no decision" vs a branch on tech values; "never its functions for their results" vs the reader letting a model call through; "a context handle" as assembly parameter; "getters" undefined                                                                                                                                                                                                                       | DONE    | Four fixes: "makes no decision" → "decides nothing but which factory to call" (lines 274, 435); model imports: factories called for the instance they build, never a function for a computed value, the flavor tells them apart; context handle: passed through, never called; "getters" dropped — a driver calls use cases                                                                                                                                                                                                                                                                                                                                |
| 14  | Hexagonal "Drivers" section hosts deblob prescription under "the principles are Cockburn's"                                                                                                                                                                                                                                                                                                                                                           | DONE    | Paragraphs 3-4 moved to "Driver — the outermost layer" after its intro (first sentence merged into the intro's); the hexagonal section keeps a one-sentence pointer that build/fire and what a driver holds are ours                                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 15  | "Tech adapter" undefined in a standalone doc and collides with hexagonal "adapter"                                                                                                                                                                                                                                                                                                                                                                    | DONE    | Renamed: each tech comes with a **reading** (recognition, hook cutting, exemptions), defined once at first use; "adapter" kept only in a parenthesis about the checker (one adapter per tech, like the flavor). Step 03 SPEC follows                                                                                                                                                                                                                                                                                                                                                                                                                       |
| 32  | Layers read as the hexagon: composition unit equated with hexagon, adapters called hexagons, drivers called Cockburn's adapters, one concentric list model to boot                                                                                                                                                                                                                                                                                    | DONE    | Hexagon = model, ports, service; adapters, assembly, drivers, boot are the outside; layer list split inside/outside; "driver is an adapter" dropped (transitive chain ends in a contradiction); folder is a third axis                                                                                                                                                                                                                                                                                                                                                                                                                                     |
| 33  | Nested composition has two owners: "Fractal assembly" (l.159) has the adapter's own factory build its sub-adapters; the direction law (l.827) makes instantiation assembly's job wherever assembly lives, and `adapter-assembly-only` forbids the import. Reconcilable only through `public-unit` with the sub-adapters under the adapter's `private/`, which canon never states; a public nested sub-adapter is red for its parent adapter to import | DONE    | Ruled (rixo 2026-09-15 night): private was the intent. Self-wiring is forced, not chosen: `private-sealed` keeps an outside assembly out of the unit's `private/`, and row 51 keeps a nested package's own assembly from handing its adapter up. Division: assembly composes public units, a unit's factory composes its own `private/`, what it consumes is injected. Canon: "which live under its own `private/`" in Fractal assembly; direction law scoped to "public children". Known, not fixed: `service-purity` checks direct imports only, so a service self-wiring a `private/*.adapter.ts` that imports concrete code gets I/O in without a port |
| 34  | "In the service's own assembly" (l.940) vs the direction law: an assembly file inside `icons/` importing `icons/manifest/adapter.ts` is a parent file importing a child that points up; every file and import kind counts (l.918), so `no-service-cycle` fires by canon's own definition. Inferred from the text, not run against the checker                                                                                                         | RULED   | Non-issue (rixo 2026-09-15): the nested adapter is a standalone package, settled earlier in history; a parent-folder assembly importing it is the violation, not a gap. "The service's own assembly" builds only what does not point up; a nested adapter is built outside the tree. No canon edit                                                                                                                                                                                                                                                                                                                                                         |
| 35  | Progressive adoption (l.1524 ff.) and the intro's retrofit story (l.40) contradict the ruled retrofit path (#8): Stage 1 is a service factory with no assembly, driver or boot, and no stage adds them; under #8 the first `.service.ts` is red until the cut. "Full architecture" in the agents' note (l.1517) omits the three outside kinds                                                                                                         | DONE    | Applied 2026-09-15 night (unstaged): intro story gains the cut before "separate concerns into services"; stages renumbered 1 = the cut (green from here, pointer to the driver section), 2 = service boundaries pulled out one port at a time, 3 = model, 4 = ports & adapters with "Full architecture" dropped, 5 = nested hexagons; agents' note names the necessary boilerplates: assembly, driver and boot                                                                                                                                                                                                                                             |
| 36  | Kernel defined as "service-layer code, no composition units" (l.1339, l.1492); `.service.ts` is the composition unit by definition (Terminology, layer list)                                                                                                                                                                                                                                                                                          | DONE    | Ruled (rixo 2026-09-15 night): the formula buys nothing — no rule reads it, the checker has no kernel notion, `no-service-cycle` and the cracking signals apply to any shared service. Dropped at both canon sites (Sharing step 3, Patterns § Kernel incl. the "no longer a kernel" parenthetical) and in the two skill mirrors (knowledge/pattern-kernel.md, knowledge/sharing.md). Kernel = a service holding shared concepts, extracted to prevent cycles                                                                                                                                                                                              |
| 37  | Model callee read two ways: "the flavor is what tells a factory from a function" (l.460, #13) vs "the import cannot tell them apart, so a model call whose result feeds a factory is the one shape" (l.483); and that one shape excludes a shared model instance returned in the record (l.431)                                                                                                                                                       | DONE    | Decided at step 01 SPEC (§ Row 37, decided), landed 2026-09-17: result flow bounds model calls now — the reader reports `model` for every model callee with its result flow, 03's assembly detector lets one through iff its result is a factory argument; step 02's flavor names factories and widens the pass                                                                                                                                                                                                                                                                                                                                            |
| 38  | "never hears from it" (l.508) overshoots #12: an outbound adapter over an event source (file watcher, socket, subscription storage) implementing a callback port receives the tech's events and is not a driver, since it fires no use case                                                                                                                                                                                                           | DONE    | Ruled (rixo 2026-09-15 night): half a strawman. The fact is real (the viewer's ws channel adapter listens to the socket and delivers into a callback the service registered through its port), the contradiction is not: the operative claim is that only a driver fires use cases from the tech's events, and nothing there fires one. Fix: "but never hears from it" dropped; the sentence ends at "behind a port". No change to the driver definition or the recognition rule                                                                                                                                                                           |
| 39  | Sharing step 5 (l.1395): with every file counting for `no-service-cycle`, an adapter wrapping B's API filed under A keeps the A→B edge while B→A stays direct; the cycle survives unless the adapter lives in a third package. Pre-existing text                                                                                                                                                                                                      | DONE    | Ruled (rixo 2026-09-15 night): the step was the problem, not the adapter's address. A service imports model and ports only, so "A calls B directly" does not exist in canon; the legal shape (two injected instances, two type edges) is already red under `no-service-cycle`, and port + adapter relabels one edge without removing the mutual need. Step 5 rewritten as a slicing error with the two remedies canon already holds: merge (l.1368) or extract the shared use case upstream (step 3 with behavior). Skill mirror (knowledge/sharing.md step 5) waits for step 06                                                                           |
| 40  | Matrix: the Service row (l.893) omits `private/` of own service; the Adapters row (l.894) has it; `public-unit` grants both                                                                                                                                                                                                                                                                                                                           | DONE    | Applied 2026-09-15 night: Service row gains `private/` of own service, matching `public-unit` and the checker's own-private exemption (layers check, `isOwnPrivate`, layer-independent)                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 41  | Test kind's constraints stated three ways: "its one constraint is `stateless-modules`" (l.264); "the assembly half follows the assembly rules" (l.1202), which taken literally forbids the use-case calls a test body makes; `test-through-contract` applies too                                                                                                                                                                                      | DONE    | Applied 2026-09-15 night: the Summary rule `test-is-assembly-and-driver` is the one statement; the layer bullet cites it in place of "its one constraint is `stateless-modules`", the test isolation paragraph cites it and says "the setup half is assembly" instead of "follows the assembly rules"                                                                                                                                                                                                                                                                                                                                                      |
| 42  | l.908 "the model row's prohibition is about calls": the prohibition being softened is the Drivers row's "cannot import model"; the Model row is about what model may import                                                                                                                                                                                                                                                                           | DONE    | Applied 2026-09-15 night: "the driver row's prohibition"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 43  | Driver layer bullet (l.257) "imported only by drivers" vs `driver-not-imported` "nothing but a boot or another driver"                                                                                                                                                                                                                                                                                                                                | DONE    | Applied 2026-09-15 night: "imported only by a boot or drivers"                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 44  | Two names for one graph position: a test file is "a leaf of the graph" (l.1047, #26's word), a boot "a root of the import graph" (l.686); both are imported by nothing                                                                                                                                                                                                                                                                                | DONE    | Simplified (rixo 2026-09-15 night): the argument was not needed. The Summary rule no longer derives the rights from "a leaf of the graph"; it states them                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 45  | "Outside kinds" = assembly, driver, boot, test at l.885; the same term includes adapters at l.277                                                                                                                                                                                                                                                                                                                                                     | DONE    | Applied 2026-09-15 night: layering sentence reads "adapters and the outside kinds do not get this"; the term now names assembly, driver, boot, test everywhere                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 46  | l.460 blob, "the only layer that may" import it, but test files may too (`blob-quarantine`); l.694 "the exception `stateless-modules` needs", singular, where the rule names two exemptions                                                                                                                                                                                                                                                           | DROPPED | rixo 2026-09-15 night: test is a kind, not a layer; defensible as written                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                  |
| 47  | l.233 "the widest import rights carry the narrowest verb lists" is false of the test kind (widest imports, no verb list)                                                                                                                                                                                                                                                                                                                              | DROPPED | rixo 2026-09-15 night: same                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| 48  | l.149 an adapter "may be" a hexagon and a full service package vs l.815 "An adapter is a full service package"                                                                                                                                                                                                                                                                                                                                        | DONE    | Applied 2026-09-15 night: adapters section says "is a hexagon in its own right — and a full service package", aligned with row 34 and the rules section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                    |
| 49  | l.662 "four drivers on one hexagon, nothing inside knows which is running" vs the facade ruling (#6/#17): under `one-call-per-hook` each channel's hook fires a channel-shaped facade whose use cases take what that parser produced; the claim holds for the domain hexagon behind the facades                                                                                                                                                       | DROPPED | rixo 2026-09-15 night: nothing relies on the sentence                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 50  | l.654 the port test: "yes, a service concern behind a port; no, an adapter" reads inverted, since an adapter is what implements a port                                                                                                                                                                                                                                                                                                                | DROPPED | rixo 2026-09-15 night: leave the litmus alone at all three sites                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |

## Review board — authors

| #   | Item                                                                                           | Status | Ruling / edit                                                                                                                                                                                                                                                                                                |
| --- | ---------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| 16  | Seemann and Martin have the root obtain config values; `assembly-builds-only` forbids the call | DONE   | Ruled: the declared load (see rulings). Rule bullet, Summary anchor, CLI example (assembly awaits the load it declares) updated. Service example keeps `config: MyServiceConfig` — legal as tech values or as the declared load's result. Implementation guide's config pattern to align in step 06          |
| 17  | Parsing and rendering as use cases vs Cockburn's driving adapter and Martin's presenters       | DONE   | Taxonomic; one owned sentence; see rulings                                                                                                                                                                                                                                                                   |
| 18  | Humble Object credited to Feathers                                                             | DONE   | Meszaros, Feathers's humble dialog box as origin (unstaged)                                                                                                                                                                                                                                                  |
| 19  | Seemann's single composition root vs fractal group assemblies and instance duplication         | DONE   | Mapping added to the instance-duplication paragraph: one root per entry point is his rule (a multi-page site is several applications), a group assembly is his root split into functions, duplication is his lifestyle made visible as which assembly builds what. Agreed with rixo 2026-09-15: no departure |
| 20  | "Primary use case is a common alias"                                                           | DONE   | Our alias (unstaged)                                                                                                                                                                                                                                                                                         |
| 21  | Martin's Main is the entry point too, not assembly alone                                       | DONE   | Mapped to driver + assembly (unstaged); update again to boot + driver + assembly with #3                                                                                                                                                                                                                     |

## Review board — completeness and laundering venues

| #   | Item                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      | Status | Ruling / edit                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| --- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 22  | The facade service is where logic goes with every light green (full service rights, tech-shaped contract)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | DONE   | No annotation (rixo 2026-09-15: a service using its full rights is legal code; flagging it by size is a nanny precedent). One sentence at the facade paragraph: logic lands there by design, ruled code, no rule looks at its size. Future idea dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                               |
| 23  | Inside a hook, before and after the one call, nothing bounds arguments or result use (`opts.cwd ?? process.cwd()`, `if (result.ok) exit`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 | DONE   | Mirror rule in `one-call-per-hook` and its anchor: the call is unconditional; arguments are tech values, instances, literals, unchanged; the result is returned or handed whole to the tech (tech call, tech-held state). Defaults, branches on the result, transforms, error-to-exit mapping are the facade's use case. "Tech value" includes tech-held state (view model), so the ordinary web handler fits; ruled for plain-TS drivers, web readings decide the line. Checkable syntactically once hooks are cut                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                   |
| 24  | "Own tech" is undeclared; a pure library counts as model, which a driver may not import, so the door is shut only if tech is a declared list                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | DONE   | Ruled (rixo 2026-09-15): tech is declared by the reading — a reading that parses the driver can name its packages for free. A driver's external import claimed by no reading is red, resolution = the project's `tech` declaration (the escape hatch for a tech without a reading: recognized, nothing cut, imports bounded); pure libs are model, red regardless. Strict-mode card dropped; `tech` key added to step 03's proto                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 25  | Callbacks the tech's reading does not cut are unruled code in a ruled file (middleware, `beforeEach`, `$effect`)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | DONE   | Reversed by rixo 2026-09-15: lenient by default. A callback the reading does not cut is not a hook and is not judged; a half-known tech must not turn a codebase red for what the checker does not understand (same principle as the web fence). What a reading leaves uncut is that tech's open part, stated in the reading                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 26  | Spec files are the widest-rights kind, granted by glob; a script named `*.spec.ts` is unreviewable by rule                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                | DONE   | Owned inside the test rule: the test file is a leaf of the graph, so the tech grants it what no other kind gets; the test gate is the defense. Found on the way: `main.spec.ts` → `main.ts` and `index.spec.ts` → `index.ts` are spec-imports-blob, red under the old text, green now                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 27  | Shared model instances built in assembly are a cross-service channel with no port and no DAG edge                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         | DONE   | Non-issue (rixo 2026-09-15): a shared model instance is a dependency like a shared adapter — both services import its type (two edges on the map), assembly shows the fan-out. Data coupling through shared state is out of scope whatever the shared thing is. Sentence dropped from canon                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
| 28  | Lazy wiring in a hook needs a cache; module-root `let` forbidden                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          | DONE   | The cache lives in the wiring function's closure                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 29  | Undefined checkable terms: definition, literal, tech value, getter                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        | DONE   | Defined once before the assembly rules: tech value (what the tech hands or holds, plus a declared load's result), literal, definition. "Getter" gone with #13                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                         |
| 30  | Suffixless `private/` files are blob in code; the visibility example (line 569) shows one imported by its service, red today                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                              | DONE   | `private/` is visibility, not a layer (verified: the layers check cites `blob-quarantine` on a blob target whatever the path; own-private only relaxes the composition seals). Example suffixed (`private/scoring-heuristic.model.ts`); one sentence in the private/ section                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                          |
| 31  | Assembly's `assembly-builds-only` reformulation for root calls                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                            | DONE   | See `stateless-modules` ruling                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                        |
| 51  | Assembly may return adapters (l.431 "a record of services and shared instances"): the instance travels to a driver, which may courier it into a lazy assembly or pass it as a use-case argument (hook arguments may be instances) — "behind the port" is enforced on imports, not on the instance graph. Found while ruling 34 (rixo 2026-09-15)                                                                                                                                                                                                                                                                                          | DONE   | Ruled (rixo 2026-09-15, see rulings): no adapters returned except when a test is the caller; corollary, an adapter-returning assembly has only test callers. Canon: rule bullet, one short paragraph after the fractal one, Summary anchor, test factory sentence. The longer landing (three holders, test-side by reachability, reader clause, lazy chunk via service) reverted 2026-09-15 night. Lazy adapter as a Patterns entry: separate go (row 52)                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                             |
| 52  | Lazy init has no home in canon; on the way through 51 it was nearly given one in assembly (returned closures). It is the adapter's own business, and saying so once stops the next agent from inventing assembly-side machinery for it                                                                                                                                                                                                                                                                                                                                                                                                    | DONE   | Ruled (rixo 2026-09-15 night): no canon edit. Assembly returns a real service, built eagerly like any other; if something must happen late, the service's own logic decides when, in its use cases, under the service rules. Nothing to add to assembly, driver or adapter: existing constructs cover it without stretching. The Patterns entry proposed the same evening ("Lazy adapter") is dropped                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                 |
| 53  | Canon (Driver): a file of an unruled tech matching no driver glob is outside the graph, not blob. Code: `.svelte` and `.vue` are in `COVERAGE_EXTENSIONS`, the flavor classifies any unknown shape as blob, and the blob share counts them by size — a web codebase with no `drivers` glob reads as mostly blob. Found 2026-09-17 at step 01 checkpoint 2 (the reader never sees an unparsed node, so it changes nothing here). Dropping the two extensions from coverage would make canon true and a `drivers` glob unable to reach them; a kind for "outside the graph" is a name `Layer` does not have. Pre-existing, not the reader's | RULED  | rixo 2026-09-16, direction: **one tech per reader, composable** (rixo's word: "reader", not "tech adapter" — avoids colliding with the hexagonal adapter; today `reader.model.ts` names the tech-agnostic walk, so 03's SPEC renames one of the two) — config binds several readers, each to files by glob (`**/*.svelte` for a Svelte tech; a path prefix is allowed too, no reason to forbid it). A file a configured tech binds is read by that tech; a file of an unruled tech that nothing binds is outside the graph, not blob. One mechanism, not two: the stock readers (plain TS, test runner) are builtin defaults with their own globs, expressed the same way; config adds readers or overrides — a configured glob wins over a builtin's. Today's by-kind pick (`techs.find(kinds.includes(layer))`) goes away, replicated by the defaults. Shape of the key and how a tech brings its engine (a `.svelte` file needs its own parser) → step 03's SPEC; step 04 still reports the number: the blob share on a web codebase with and without the binding                  |
| 54  | Inlining read a tracked local's body in the **site's** scope: a local or a parameter at the site rebinding a name the body reads captured it. A helper calling `process.exit()` read `language`, one calling an imported factory read `local`, wherever the site declared `const process` or `const createThing` — wrong answers, not unknowns, which is the one failure mode the inlining ruling forbids. Found 2026-09-20 reviewing that ruling (rixo: same file buys no exemption — the body loses its own scope on one end and adopts a foreign one on the other)                                                                     | DONE   | Fixed in the reader: each tracked local carries the scope it was written in, and `inScopeOf(parent, …)` reads a moved body under that scope while the site's arguments stay evaluated in the site's. General on the site's side, at any depth: a rebinding in a block inside a callback inside a function, and tracked locals chained three deep, all still resolve where each body was written. Not yet general on the capture's side — the collection loop runs at top level over root statements, so it hands every candidate the root scope; widening the candidates to nested functions means capturing each one's own declaring scope there, which is the same bug class and is queued, not done. Cases in `tracked-local-scope.ts`: rebound by locals, by parameters, and by a block inside a callback inside a function; each verified red against the old line. Independently reviewed (no regression; the complementary direction — arguments, callback arguments, hook registration — verified still resolving at the site). The ruling bullet above is rewritten to match |

## Canon edits — batch 1 (applied 2026-09-15, unstaged, awaiting review)

1. Boot layer: layer list, matrix row, `inward-deps`, Summary rule
   `boot-one-call`, CLI example gains `cli.boot.ts`, SPA parallel (driver
   exports `main()` that mounts, boot calls it). Inspirations: Main = boot +
   driver + assembly.
2. `stateless-modules` restated (no mutable state, no side effect at evaluation;
   root calls only on declared-pure callees with immutable results; factory
   calls red; readonly opt-in; boot the one evaluation that calls; test
   registration exempt). Driver exception removed; "assembly needs no exception"
   generalized.
3. "Imported by nothing" at lines 186-188, 248, 500 → imported by nothing
   outside the driver layer; the boot starts it.
4. `driver-defines-hooks-only`: `main()`; tech and instances arrive only from a
   parent driver.
5. Facade sentence (#6/#17) and Ports "inside" scoping.

Dependencies to watch before applying open items: #9 and #26 hang on the test
tech's exemption list (touched by the registration ruling); #23 and #13
("getters") are one edit; #7 and #8 both concern files outside the graph; #16
may reopen the service example and the config pattern section.

## Step queue

- `00_canon` — this board's edits to `docs/architecture.md`, one commit per
  ruled batch on top of bb4bb3c. Done when every row above is DONE or RULED with
  a written home (canon, implementation guide, or a step below). Board closed
  and committed 8cf50cc (2026-09-15). Second consistency read done the same day
  (rows 33–52), ruled under one question per row — load-bearing, or a
  formulation? — and closed. The step is not done: the chapter grew the canon
  from 8983 to 13747 words while addressing a handful of consistency issues, so
  elaboration nobody relies on came along. Remaining work, same step, the mess
  is one: cut back to about 11k words. Priority order for what stays: negative
  rules first (the ones `deblob check` enforces or will), positive guidance
  second, elaboration last. Style: concise, to the point, readable — Bastiat,
  not a treatise; the review of the current text was a suffering. Cut done
  2026-09-16: 13747 → 10605 words, then five one-track review agents (negative
  rules, outside kinds, inside + packaging, guidance + skill stamps, cold read)
  hunted lost load-bearing content; ~55 distinct items, the dropped rule
  conditions, the sentences compression made false and the overselling hedges
  restored, rationale and examples left out → 11228 words, all 26 rule anchors
  kept. rixo did not re-read end to end (trust + branch). Step CLOSED. No
  further prose-against-prose read after that: the canon is the prerequisite of
  the tool and the tool of the files, so the next canon edits come from writing
  the reader (steps 01–03) and from its diagnostics on real code, not from
  another read.
- `01_tech-adapter` — SPEC: recognition (`.boot.ts`, `.assembly.ts`,
  `.driver.ts`, test globs, framework globs, config globs for boot and
  assembly), hook cutting, attribution, per-tech exemptions (test registration,
  call count, services-only, definitions), level labelling; the assembly reader
  (callee file kind + result flow); the hook reader (arguments + result flow,
  #23); the load declaration (config key: file + function, one or a list; any
  assembly may await any declared load; the reader treats results as tech values
  and flags any other non-factory call with the declaration as the resolution).
  Dynamic imports read as imports. SPEC ratified 2026-09-16 with three rulings
  (`configLoads`, `driverTech`, no intermediate representation — the reader
  walks ESTree) and the port named `Tech`; implemented 2026-09-16/17 in four
  checkpoints (kinds and keys, the reader, the graph pass, primary use cases),
  each with a "Landed" section in the SPEC; 03's proto amended in place. Landed
  as `5cdf4a3` (2026-09-17).
- `02_flavor-factories` — the flavor says what a factory is (`create*`
  convention, composition-unit exports); unlocks the model-callee case of the
  assembly reader, the root-factory-call check of `stateless-modules`, and the
  readonly check. SPEC in `02_flavor-factories/SPEC.md`: `isFactory` on the
  flavor port (name only), the two model rows and the `local` callee widened,
  `readonly` as a fact on root definitions with a `mutableModuleState` opt-out
  key (the opt-in reversed, see Rulings), and the graph-pass fix found
  dogfooding (test-file call sites do not bind parameters). Implemented
  2026-09-16 in three checkpoints (the graph pass, the flavor's word, readonly),
  each with a "Landed" section in the SPEC; 03's amendments listed in the SPEC,
  not applied to the proto. Landed as `e2e9592` (2026-09-16).
- `03_outside-rules` — opened as "`deblob check` enforces the assembly, driver,
  boot and test rules" (SPEC rewritten 2026-09-16 in `03_outside-rules/SPEC.md`;
  the proto of 2026-09-15 in git history at `e2e9592`); CUT 2026-09-17 after two
  of its six checkpoints, the rules carried to 04. What landed: row 53's readers
  in shape (`Reader` port, `files` bindings, the stock readers as builtin
  bindings, `readers` key in, `tests` out, recognition as one operation for
  extraction and the bare status), coverage without `.svelte`/`.vue` unless
  designated or bound, and the open part shrunk (SPEC § The open part, audited:
  callbacks to non-tech callees read inline, a called result classified by its
  value, `assignment`, one reading per world with `readings` on the node,
  tracked locals — rixo's Q3 reversal at the handback). Each checkpoint has a
  "Landed" section in the SPEC. Landed 2026-09-17.
- `04_outside-rules` — the rules, re-cut from 03 under the test method ruled at
  03's handback: `deblob check` enforces the assembly, driver, boot and test
  rules — nine slugs in `RULE_IDS` plus `stateless-modules`' first detector,
  four checks, the import halves as matrix cells — each proven by verdict cases
  (a tree of source strings through the real chain, red or green with why; no
  test pins a reading), which needs the fs port with a node and a memory adapter
  first (placement-debt's `03_fs-kernel`, pulled forward from 09; the run
  service stays there). SPEC 03's rule sections are the contract, amended in
  `04_outside-rules/SPEC.md`; the reading spec is cut against coverage once the
  cases are green. Drafted 2026-09-17, to ratify before the build. Order inside
  it re-decided risk-first 2026-09-24 (rixo handed it over): `05_known-failures`
  and `06_unknown-verdict` (siblings, both closed) made verdicts honest; next
  `04/02_rows-first` — rows, no detector, for `stable-root`'s call half and the
  ten outside rules; then call reading and the detectors against those rows;
  type names (`04/01`, checkpoints 2–3), `node_modules` types and the engine
  last, their rows already stamped `false unknown`. `04/02_rows-first` closed
  2026-09-25 in five checkpoints: every rule has its rows, every red its way
  out, and three canon edits came of writing them (a tech value may be read,
  "what the assembly builds", awaiting a call is the call). Next: call reading
  and the detectors. Then, before type-name depth, `04/04_sweep` (added
  2026-09-25: the detectors went fast, one commit a checkpoint for days): loose
  ends caught and bolts tightened before building on them. A review by another
  model, cold, of everything since `02_rows-first` closed — code, units, rows,
  READMEs, SPEC notes against what landed; the confessed known failures and
  every "to be measured" re-read; the two owed cleanups (`it` where the title is
  a behavior sentence, `test` elsewhere — never a blind rename; the typed
  builders replacing `render.model.spec.ts`'s `as …Violation` casts); and
  grouping's worth measured on the self-check (how many groups carry riders)
  before anything else is built on it. Findings as a table, rixo rules each,
  fixes one commit per batch.

  Then `04/05_test-rules` (added 2026-09-26, **not to slip**: the ruling it
  revisits was made provisional on purpose). What a test body may do is
  underspecified. Canon's `test-is-outside` says of a test file's hooks "the
  hook count and services-only do not apply" — by the letter, the rest of
  `hook-one-call` applies. The driver check (detectors checkpoint 6) exempts
  test bodies from `hook-one-call` whole instead: ruled A, provisionally, and
  uncertain. What this step starts from:

  - **The data.** Built to the letter first, the self-check gave 976
    `hook-one-call` reds, all in deblob's own spec files: 752 branches (`??`
    366, `.map` 190, `?:` 72, `for` 44, `if` 43, other 37 — most in
    `layers.model.spec.ts`, `main.spec.ts`, `surface.model.spec.ts`), 143 use
    case results read past handing them on (`expect(result.items)`), about 75
    computed arguments (`extractGraph({ ...input, files })`).
  - **The rule taken apart**, each clause by what it buys in a test. No branch
    or loop: real — a test cannot pass without asserting
    (`for (const n of notes) expect(…)` over `[]` asserts nothing and is green;
    `if (x) expect(…)` the same); ways out `test.each`, one test per path; cheap
    (about 87 `for` and `if` sites). No writes in a hook: real — no mutable
    setup shared across tests, no order dependence
    (`let fs; beforeEach(() => { fs = … })`, `calls += 1`); way out a setup
    factory called in each test. Arguments only literal, tech or instance: some
    — the reader sees what went in; cost, repeated literals or a test factory.
    The result handed whole to a matcher: weak — `toMatchObject` is partial
    anyway, it only changes how a peek is spelled.
  - **Why not the letter as is.** `hook-one-call` was shaped for drivers, where
    the one call is a use case: in a test it judges results of calls on an
    instance and leaves a model function's result free (`checkLayers(graph)`,
    most of deblob's units) — a line with no reason in a test. So "the letter"
    (B) pins an arbitrary split; its value lives in two clauses that deserve to
    be test rules of their own.
  - **rixo's angle.** "Habits are easy when the alternative is the whip — and
    deblob can provide the alternative": a rule that makes a test hard to write
    is fine if it makes it meaningful to read; deblob's squeeze is reading and
    making sense, not writing (canon: optimize for reading). The hunch to test:
    "one use case per hook" could force tests into something meaningful.
  - **The bet at ruling time** (agent's, 2026-09-26): C wins — unconditional
    plus no writes, as test rules of their own — about 60%; tests stay exempt
    (A) about 25%, if C's rows meet test patterns it cannot express (property
    tests, step-by-step async observation); `hook-one-call` whole (B) about 15%.

  Rows red first for each candidate clause, over realistic test bodies (unit,
  cases corpus, CLI golden); the canon sentence rewritten to state what applies
  to a test; the provisional exemption in `driver.model.ts` replaced.

- `05_alignment-review` — the checks are implemented; one pass over every rule
  canon states for the outside kinds against what `deblob check` enforces, with
  the tests as the proof: per canon statement (each Summary bullet and the
  matrix's rows and cells), the detector and the test that proves it, by name;
  per statement with no detector, the reason and the owner (a slug missing, a
  mechanism waiting on the flavor, a tech's open part). A claim with no test is
  not implemented; a test with no canon line is a rule canon does not state and
  goes back to this board as a question. Recorded as a table in the step's SPEC;
  mismatches fixed there or carded on this board before 06.
- `06_cli-restructure` — deblob's own CLI: `cli.boot.ts` (today's `bin.ts`),
  `cli.driver.ts` (cac, one hook per command), `cli.assembly.ts` (factory calls,
  returns the CLI service), `lib/cli/cli.service.ts` (parse, dispatch, render;
  io port). Today's `main.ts` is red under every driver rule.
- `07_slugs` — code, skills, README follow canon (`test-setup-assembly` →
  `test-is-outside`, the new assembly/driver/boot rules); breaking, accepted.
  Implementation guide's config pattern (lazy `getConfig()` in the root)
  rewritten as the declared load. Knowledge files realigned with this board's
  rulings in the same pass — Sharing step 5 in `knowledge/sharing.md` first; no
  piecemeal skill edits before then.
- `08_container-whitelist` — config key for a runtime container library, when
  someone needs it.
- `09_placement-debt-recut` — placement-debt steps 02, 04 and 05 re-cut under
  this chapter (03, the fs kernel, is 04's first checkpoint); step 01 unchanged.

Renumbered 2026-09-17 when 03 was cut: SPEC 03's text still says 04 for the
alignment review, 05 for the CLI restructure, 06 for the slugs.

## Future

### Ideas

- **A tech module passed on is an adapter skipped** (2026-09-25, found drafting
  `04/03_detectors`). The reading classes an import a tech claims as a tech
  value, so a driver can `import * as url from "node:url"`, hand the module to
  its assembly, and the assembly to a service: every row green, the service
  doing tech work with no port and no adapter — assembly laundering one layer
  out. Canon's tech values are data the tech hands the program (argv, env, a
  request), not capabilities. Needs a canon sentence (roughly: a tech module
  handed on is an adapter skipped) and a row (the driver passing the module →
  red; way out: a port naming the question, `dirnameOf(moduleUrl: string)`, an
  adapter the assembly builds). Related: the host-global half of
  `service-purity` below.
- **An entry point nothing imports** (rixo, 2026-09-21, reassess near the end of
  this chapter). The rule for an unruled tech is settled for imported files:
  what the codebase imports lands in the graph, and what nothing claims is blob
  until a reader is bound to it. Glob membership alone does not pull a file in.
  That leaves the shape a web codebase is made of — `+page.svelte` and its like,
  loaded by the framework and imported by nothing — invisible, since no edge
  reaches it. For a SvelteKit app that is most of the app, and it is the concern
  row 53 was circling. Most likely a reader or a config concern (`entryPoints`?)
  rather than a canon one: something has to declare "these files are roots of
  the graph even though nothing imports them", and the framework is what knows.
  Not solved today; canon states the imported half only.
- **The strict marker grammar** (ruled 2026-09-18, parked 2026-09-21 by rixo:
  the corpus is under review and the migration rewrites every marker in it).
  LANDED 2026-09-21 night, once the corpus was stamped whole. The migration
  changed no verdict: the same 17 rows fail with the same 46 entries. The one
  reading added in landing: "the next code line" skips blank and comment lines.
  The edge-level markers of `lib/cases/layers.spec.ts` and
  `lib/cases/dag.spec.ts` moved to the end of their files, their why naming the
  import; two row names lost "on the import line" / "closing lines" accordingly.
  `// red: <slug>[, <slug>]* [-- <why>]`, and the trigger form `// via:` the
  same. A line that looks like a marker (`//\s*red\b`, case-insensitive) and
  fails the grammar is a loud error naming file and line — today a malformed
  marker parses as nothing and the row passes green. Repeated markers on one
  line count, one violation each; no `(n)` count (dropped 2026-09-21: repetition
  counts and carries a why per violation, which `(n)` cannot). Alone on its
  line, a marker claims the next code line; alone at end of file, the file — the
  form for violations that carry no line (the edge-level ones, whose markers
  today match by slug alone and so are all ambiguous claims). A marker after a
  comment (`// note // red: x`) is a loud error. Strict both ways: a violation
  with a line on a file claim, or one without on a line claim, is both missing
  and unexpected. Why (rixo): not counting assertions is a safe haven for
  unintended changes; easier reviewing never buys a weaker test.
- **Effect-free tech calls, declared by the tech's reading** (rixo, 2026-09-21).
  Canon: "a call is presumed to have side effects until the tech's reading
  declares that call effect-free". Today no reading declares any, so
  `process.cwd()` at root is red even stored under `mutableModuleState`. The
  Node reading would list the calls that only read (`process.cwd`, `Date.now`,
  `os.platform`…); a listed call then falls back to the property-read case —
  green in a condition, captured state when stored. Start empty and add on real
  need; the same reading slot where the test tech declares its root
  registrations (the "exemptions belong to the readings" note). Bundlers'
  precedent: a call is impure unless annotated (`/*#__PURE__*/`,
  `"sideEffects": false`).
- **A strict mode for property reads** (rixo, 2026-09-21). Canon presumes a
  property read free of side effects; in JavaScript a getter or a Proxy can run
  code on read (a reactive store tracking a dependency, `document.cookie`). A
  config switch that treats a tech property read like a call — Rollup's
  `propertyReadSideEffects` is the precedent. Card only: no use case yet.
- **Purity over inside bodies — the host-global half of `service-purity`**
  (rixo, 2026-09-17, step 03 checkpoint 2's verdict game). `service-purity`
  reads imports only: a concrete package or builtin imported into model or
  service. A host global used in a model or service function body —
  `console.log`, `setTimeout`, `process.env`, `Date.now`, `Math.random` — goes
  unreported today. The reader classifies every free name as tech since
  checkpoint 2, but for inside kinds it reads root statements only and never
  walks function bodies. The detector needs the walk extended into inside-kind
  functions (the same extension the "one tech per adapter" card waits on for
  adapter bodies), then one rule: no tech callee, no tech value read, in a model
  or service body — canon § Model: "time, randomness, `globalThis` are inputs
  passed by the caller, not discoveries". Language globals (`Math.max`, `JSON`)
  stay legal; `Date.now` and `Math.random` are the language's by the lists and
  need a named exception — the ambient-access members of intrinsics. At root,
  checkpoint 3's root-call rule already catches a tech call. **Ruled in part
  2026-09-21:** the read half is its own rule, `ambient-access` (canon §
  Summary), not a half of `service-purity` — that one judges imports, and the
  fix differs. Its cases are in `lib/cases/layers.spec.ts`, red: a service and a
  model reading `process.env`, `Date.now`, `Math.random`, at root and in
  functions; `Math.min` / `Math.floor` green; an adapter green. Left open: the
  detector (the body walk above), and the tech _callees_ this card also names —
  `console.log`, `setTimeout` are I/O, not ambient reads, and no rule covers
  them in a model or service body yet.
- **The depth is ours; the reviewer judges verdicts** (rixo, 2026-09-17, from
  step 03 checkpoint 2's handback; a guiding principle to lift to the method
  docs when its home is ruled). The reader's depth is JavaScript's: a call hides
  in a callback, behind a computed member, on the result of a result, and
  curried factories (`f()()`) are common — agents write them freely. Three ways
  out: strict authoring rules (kills progressive deblob), dodging the shapes
  (the reviewer has to open the code to trust the map — the failure mode of
  "emerging clarity"), or absorbing the depth in the reader so it becomes a
  reliable detail the reviewer never opens. Ruled: the third. Consequences: the
  reader answers for every shape and the fixtures enumerate shapes on purpose;
  its two reviewable properties are that the open part is empty on real trees
  and that the violations make sense; reader decisions are presented to the
  reviewer as red/green verdicts on realistic code, the shape account kept in
  the SPEC's Landed; skipping the reviewer's understanding because the detail is
  fine is the danger, since the minute decisions build the whole. See SPEC 03 §
  The reviewer's level.
- **Public by importer count — a canon question for 04** (rixo, 2026-09-17, from
  the review of `recognition.model.ts`). Canon places the test surface at public
  names (§ Distillation: extracted to model, logic "grows a test surface of its
  own") and refuses tests at every seam (§ Architectural seams are not test
  instructions). Public is a placement fact, and placement is what an agent
  controls: the failure mode is over-slicing — a private helper cut into a
  public model file to claim a test surface and a unit on the map. The symmetric
  one is fattening a service to dodge the test tax, burying concepts.
  Distillation's guidance ("a consumer beyond the birth use case") has a
  measurable form the graph already holds: a public model export with one
  importer, inside its own service, is a slice; one with an importer outside its
  service is a unit. Recognition passes (extraction and the bare status). The
  fattening side has no count, only the distillation question. Also the
  Behavior-panel criterion: a unit of meaning is a public name with a root
  `describe` of its own, private logic rides under its parent's tests, so the
  test rule and the map rule are one. To dig in depth at 04's alignment review:
  whether the importer count becomes a rule, a diagnostic, or stays guidance;
  and how fixtures-by-shape (the reader's, the check fixture's) are canon's
  answer to test explosion at big units, so that slicing is never justified by
  combinatorics alone.
- **Readonly typing holes** (rixo, 2026-09-16, low priority; the readonly fact
  itself is step 02's). The reader's `readonly` is syntactic — oxc hands the
  annotation nodes, no alias resolution, no inference — so a `const t: Table`
  with `type Table = Readonly<…>` and a `const x = freeze(…)` returning
  `Readonly<T>` read `false` and get flagged: latent false reds on typed
  codebases, on the strict side. Iterate back: resolve what can be resolved
  without a type server — an alias in the same file first, then one followed
  across an import — never a full checker. Measured on deblob's own tree
  2026-09-16 (SPEC 02 § Config key): 9 root bindings to flag, 8 real (mutable
  `Set`s and arrays as constants, two records typed with a mutable alias), 1
  this hole — a `fileURLToPath` result, a `string` the reader cannot infer,
  closed by a `: string` annotation once primitive keywords count as readonly.
  The alias-that-is-readonly case has no instance in deblob's tree yet.
- UI iteration (#7): a pure component read as an extension of the driver, or a
  tech-specific view layer taking model's rules minus the ones that don't fit;
  neither written in canon until the web stress test.
- **One tech per adapter** (rixo, 2026-09-16; decide before this chapter closes:
  taken into step 03/04, or left here). Canon already says an adapter implements
  a port "for a specific technology", singular, and the driver has "its own
  tech" — a statement with no detector. The rule: an adapter's concrete contacts
  count to at most one tech. Counting unit = root binding origin, which the
  reader already yields: one package name, one Node builtin family (`node:fs` =
  `node:fs/promises`), one host global (`console`, `fetch`, `process`) each one
  tech; pure-declared packages out (model-grade already), type-only imports out
  (`runtime-import`). Zero contacts (an in-memory adapter) passes. Edge-level
  check like the rest of `layers`, no new reading. What it buys: the second tech
  in an adapter — in practice `node:fs` next to the adapter's real tech,
  "because it's an adapter" — has to be declared or ported; the fs port the
  baseline expects stops being free to skip (deblob's own tree: five of eight
  adapters red, all five through `node:fs`; the oxc adapter is also the
  two-package case). What it doesn't: nothing about what the one tech is used
  for. Hardships, with canon's answers: a lib split over packages
  (`oxc-parser` + `oxc-resolver`) → a declared group in config, same pattern as
  `pure` and `driverTech`; a stream or handle passed down → the nested-adapter
  clause: the adapter grows its own port and a nested adapter, or takes the
  function from assembly. The declaration is the escape, and it leaves a trace.
  **Revisit (rixo, 2026-09-21):** the corpus rows that let an adapter read
  `process.env` / call `process.cwd()` are accepted for now only because an
  adapter's tech is unknown today (`driverTech` exists, nothing for adapters). A
  Figma adapter binding to the Node runtime is probably not ok; a Node adapter
  doing it is. When adapters get a tech, those rows are re-judged: the condition
  row and the alias row in `lib/cases/modules.spec.ts`, the adapter row in
  `lib/cases/layers.spec.ts`, the `mutableModuleState` row.
