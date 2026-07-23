# Chapter SPEC — model bar: abstractness, not purity

One-commit chapter: this SPEC lands with the change it records. Ruled in session
(2026-07-24, rixo; surfaced by an external Sonnet review calling the model layer
"functional-core, not a rich domain model"). Canon + guide + knowledge cards
amended in one pass, ripples swept, adversarial tribunal held pre-commit — all
below. Genuine future residue extracted to the arch-pass board
(`history/future/arch-pass/PLAN.md`): the `check state` detector idea and the
`.pure.ts` strict-flavor sublayer idea.

## The ruling

The model layer's bar is **abstractness** — model code knows nothing about the
environment it will run in — not statelessness:

- **No ports, no rogue imports** — depends on nothing outside the model layer (+
  declared pure libs). Already rules 1/4; unchanged.
- **No ambient environment access** — time, randomness, `globalThis` are inputs
  passed by the caller, not discoveries. Needs explicit words: the old "pure"
  implied it, the new bar doesn't.
- **Modules stay stateless** — no module-level mutable state, exported or not
  (top-level `let`, unfrozen collections, anything a closure could capture at
  module scope — module-private state is a hidden singleton all the same);
  instances are created by callers, never exported. Mechanically enforceable
  (rixo).
- **Factories with closure state become model code when they depend on nothing**
  — domain machines, entities, dependency-free reactive stores. A factory that
  takes a port or a service is a composition unit → service layer.

The service/model line becomes mechanical: **injection or not**. What needs
composition needs assembly (rule 6 keeps its meaning); what doesn't is domain
knowledge, importable by anyone.

Why: the stateless bar exiled dependency-free stateful domain objects (counters,
parsers with position, state machines, entities) to `.service.ts`, paying
assembly ceremony for nothing — the pressure that drifts the model layer anemic.
With the amendment the model layer is non-anemic by construction, and canon
aligns with what the tool actually checks (statelessness was never mechanically
enforced; the import bar is `check layers` + rule 10 verbatim).

Store worm, killed at ruling: a dependency-free reactive store **is** model —
classification follows dependencies, not reactivity.

## Landed wording (reviewed in-session)

architecture.md:

- **Layer list, model line**: "domain knowledge. Abstract: no dependencies
  beyond model, no ambient environment access, stateless modules. The most
  constrained, the most valuable."
- **Layer list, service line**: "decisions. Orchestration, use cases, injected
  dependencies." ("closure state" dropped — no longer the distinguisher.)
- **§Model**: lead gains "self-contained factories"; bullets restated as the
  four clauses above. The bar line anchors the word (challenged at review —
  "abstract" collides with Martin's abstraction-as-interface; ruled kept, rixo:
  the philosophical sense is the house axis, and rule 4's "concrete" was always
  world-touching, never Martin's any-implementation): "the opposite of rule 4's
  'concrete', not of 'implemented'. Model code lives in the domain of ideas:
  values, types, knowledge. Contact with the world outside the computation —
  I/O, time, randomness, platform — is what makes code concrete."
- **§Model, coverage line**: "pure functions and self-contained factories with
  no dependencies — testable in isolation with plain values, no mocks, no setup.
  100% unit coverage is the expectation for this layer" (the "AI era /
  essentially free" flourish died at review — boring wins).
- **§Distillation**: "In the service layer, a function can use orchestration
  context and injected dependencies. In model, it becomes context-free:
  everything it needs arrives through its arguments or lives in state it owns."
- **Rule 17** (anchor and number unchanged; category header "Service discipline"
  → "Module discipline"): "**Modules are stateless** — state lives in factory
  closures only; instances are created by callers, never imported. Assembly,
  whose job is instantiation, is the exception."
- **§Store**: "A unit whose state is reactive… Classification follows
  dependencies, not reactivity: a store wired to ports or services is a service;
  a dependency-free reactive store is model."
- **Test factory note**: settled after three review passes on the scope
  criterion — construction weight, not layer and not dependency-exclusivity:
  "applies wherever construction is worth centralizing: factories with
  dependencies foremost, but a factory taking many plain arguments benefits the
  same way — defaults, per-test overrides. A plain function is tested directly."
  Dead drafts: "model never needs one" (overclaimed), helper-vs-factory naming
  distinction (over-legislation), "nothing to assemble → directly" (overshot the
  other way — a fat model factory legitimately wants the pattern for
  DRY/legibility, rixo).
- **Influences**: DDD entry gains "Strategic patterns only: the tactical catalog
  is not used as such — entities appear as self-contained factories in the model
  layer, invariants as types and pure functions, repositories as ports." New
  entry: "**Functional domain modeling** (Wlaschin; Bernhardt's functional core
  / imperative shell) — domain behavior as functions over domain types, I/O at
  the edges. The model layer relaxes strict purity to admit self-contained
  state: the bar is abstractness — no injection, no environment — not
  referential transparency." (Two glosses tightened at review: "effects at the
  edges" → "I/O" — closure mutation is an effect and it lives in the middle now;
  "no dependencies" → "no injection" — model does depend on model + pureLibs,
  injection is the actual bar.)

implementation-guide.md:

- Suffix table, model row: "abstract — no outer-layer imports, no ambient
  access, stateless modules".

## Ripples (swept at landing, 2026-07-24)

- **Knowledge cards** — layer-model rewritten to the four clauses (chain
  property reworded "abstractness"), file-naming table row, testing-isolation
  factory note. layer-service untouched (its rule-17 line stays true);
  dependency-matrix untouched (import bar unchanged). Rule 17 explain mapping
  stays `layer-service`; no golden pinned the old text (suite green).
- **Guide prose beyond the table** — "pure domain" comments in examples kept
  (accurate descriptions of those files); pure-libs section untouched.
- **Violation-catalog / detector remedy texts** — grep-confirmed untouched (no
  detector checks statelessness, no message says "model is pure").
- **Rule 17 tier** — stays "later" in the coverage table, but the mechanical
  story improves: module-level state and ambient access are both AST-detectable.
  Deliberately not this touch — extracted as the `check state` detector idea on
  the arch-pass board (`history/future/arch-pass/PLAN.md`), alongside the
  `.pure.ts` strict-flavor idea from the tribunal.

## Post-landing tribunal (2026-07-24, adversarial pass held before the commit)

Five challenges raised against the ruling; outcomes:

- **The cited masters prescribe the old bar** (Bernhardt: state to the shell,
  core strictly pure; Wlaschin: state machines as pure transitions,
  `advance(state, event) → newState`, caller holds state — what we legalized,
  they'd file as regression). Grounds for departure, weighed against their
  arguments: (1) mock-free testability — their main ground — is fully kept: a
  dependency-free factory tests with plain values, no doubles possible; (2)
  local reasoning is partially sacrificed — the RT-shortcut cost, already named
  — but their pricing assumes a thin untestable shell as the alternative home
  for state, while ours is contract-tested services: both sides of their trade
  priced differently here; (3) decisive: their prescriptions inherit F#/FP
  language economics — immutable copy-update is free there, costly and
  unidiomatic in JS, where closure state is the ecosystem norm; (4) closure
  state beats caller-held state on invariants — exposed state records are
  forgeable, closures are not. And the amendment removed nothing: pure
  transitions over immutable values remain legal, often preferable, model code —
  the closure option was added, not substituted.

- **Referential-transparency shortcut lost** ("it's model, therefore same input
  → same output" no longer holds file-wide — a model export may be a machine).
  Accepted as a named cost. Not deblob's material to repair (effect-system
  territory); note: a strict flavor could legally add a `.pure.ts` sublayer with
  a tighter matrix row — flavor knobs only tighten canon. Idea banked, not
  pursued.
- **Callback as port-in-disguise** (`createRetrier({ onRetry })` — composition
  through parameters, invisible to the import graph). **Refuted** (rixo; the
  reasoning sharpened at a second pass): deblob's guarantee is static — the
  file, in isolation, imports nothing concrete and tests without mocks — and
  runtime dataflow was never its jurisdiction. Passing behavior-bearing values
  to model code was always legal (any higher-order model function); a
  callback-taking factory adds zero new power, and anything concrete in a
  callback still flows through a service that was itself assembled. Policing
  higher-order parameters would be policing functional programming. No canon
  sentence needed.
- **Compiler-magic reactivity** (`.svelte.ts` runes: environment coupling with
  no import to see). Already quarantined mechanically — rune files match no
  layer suffix, classify blob today. Stance (rixo, tribunal proper deferred to
  preset territory): reactivity in model arrives as an explicit observable
  dependency through the pureLibs gate (svelte/store, nanostores, …), never as
  compiler magic; rune files are a dirty corner by nature.
- **Rule 17 rescope binds adapters** (module-level caches/pools now illegal —
  widened without inventory). **Ratified wide** (rixo, 2026-07-24): mutable
  singletons are the trap regardless of layer, and canon already declared
  adapters full service packages — "service modules" always reached them; the
  rescope closes a wording gap more than it widens the rule. Own-repo sweep:
  zero offending lines in layered files. Detector note for the future
  `check state` card: `Object.freeze` is a no-op on Map/Set internals — the
  mechanical read is `const` + `ReadonlyMap`/`Readonly` annotation, or
  write-detection on module-root bindings; both AST-decidable.

## Open

- None on substance. Wording rode rixo's diff gate at landing, per house rule.
