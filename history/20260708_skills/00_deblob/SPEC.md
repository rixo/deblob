# Step 00 — the `deblob` skill (flagship)

## 1. Goals

An agent working in a deblob-style codebase makes the architecture's ground
decisions correctly at generation time — the central one being **placement**:
which layer and service owns each piece of code. Import/composition legality
follows from correct placement (and is mechanically checkable besides); the
skill carries the judgment, not the linting. Level-3 bar (architecture doc's own
definition): all correct decisions on the ground, without requiring the full
vision or the rationale.

Targets the documented failure classes (RED material): wrong-layer placement,
matrix/import violations, defensive catch, export-for-test, coverage-exclusion
instinct, `__tests__` instinct, barrel instinct.

## 2. API

The skill is a **complete operational distillation** of the architecture: hard
rules and guidance, stated bare — no rationale inline. Two exceptions, both
deliberate: a one-clause consequence anchor on rules agents demonstrably
rationalize around (the RED list — compliance-why, a loophole-closer, not
education), and the rationalization table (compact whys, one line each).
Teaching-why lives in docs, pointed at, read on demand.

**The disclosure ladder** — an agent never learns "the architecture"; it learns
the one decision it faces, with an exit to the why:

- **L0 — fire**: the evidence-phrased `description` (see Triggers).
- **L1 — `skills/deblob/SKILL.md`** (~1 screen, in context on invoke):
  - minimal ontology — the five layers, one line each (the cards below presume
    this vocabulary);
  - the placement question: "what is this code? knowledge → model; decisions →
    service; translation → adapter; contract → port; wiring → assembly";
  - **the workflow loop** — the operating procedure: implement per the cards →
    **run** the guardrails (tsc, coverage, `deblob check` when present — run,
    never simulate or skip) → iterate until green → self-review pass (route to
    `deblob-review`) → only then hand off. The skill names **which gates must
    pass**; how to invoke them is the project's own knowledge (CLAUDE.md,
    run-skills) — never hardcoded here;
  - the non-negotiables (one screen: suffix always, no barrels, `private/`,
    composition = assembly-only, no defensive catch, tests through contract);
  - the rationalization table;
  - the router: "doing X → read card Y".
- **L2 — `skills/deblob/references/`, one card per agent situation.** Card
  anatomy: hard how/what rules first; then a **"when judgment is needed" block**
  — 3–5 lines of curated contextual why for that situation's non-clear-cut calls
  (not education: the minimum to motivate a sound call); then a terminal
  **`## Deeper`** section holding all optional links (why-cards,
  section-anchored doc pointers). **Link modality by position and verb, never
  per-link advisories**: imperative inline links ("read X before Y") are
  procedure; anything under `Deeper` is per-judgment — the advisory is the
  section's fixed one-liner, links inherit it. The grammar is declared once in
  SKILL.md. The cards:
  - `placement.md` — the full placement corpus, one card (creating a service and
    extending one differ only in entry point, stated as two openings): what each
    layer holds and forbids, suffix + naming grammar, service anatomy, factory +
    IoC (no-defaults), config as port, driver/assembly split, `private/`
    packaging, composition constraints as placement consequences, purity chain,
    distillation timing, decomposition signals, nesting (no privilege;
    nested-adapter edges point UP via the port, so a parent stays import-blind
    to its own adapters — general direction law staged for arch clarification,
    see PLAN);
  - `crossing-services.md` — needing something from another service: direct
    model import vs port+adapter vs kernel extraction; DAG rules and the sharing
    progression live HERE, in the situation where they bite; anti-corruption
    when a kernel cracks;
  - `handling-failure.md` — the error discipline (exceptions, `err.code` guards,
    catch = recovery or enrichment only, loud failure, `cause` chains, degraded
    results are domain decisions);
  - `writing-tests.md` — written-for-the-reviewer rules (given/when/then
    legibility, unit visible, fixture→assert natural), through-the-contract,
    test factories, fixture/util placement, coverage rules (100% coverable,
    motivated exclusions, transitive utils, no export-for-test).
- **L2b — the why-layer**: each card's "when judgment is needed" block grows
  into (or links) small **why-cards** where 3–5 lines don't suffice —
  self-contained, wiki-cross-linked, each stamped with provenance ("distilled
  from architecture.md §X — the source of truth") and flagged _optional for pure
  implementation, read per judgment_. Docs stay the human narrative and the
  source; cards are **derived views**, not duplicates — manual sync now,
  staleness checkable by tooling later. Rationale: lost-in-the-middle retrieval
  degradation and attention-budget preservation beat whole-doc reads; SSOT is
  preserved by direction (derivation), not abstinence.
- **L3 — `docs/`**: the full narrative, deepest dives, human-first.

One shared annex: `references/rules.md` — the dependency matrix +
composition/visibility tables, linked from every card (lookup, not reading).

**Prose register (all skill files).** Strongly prompt-optimized: imperative,
situation-keyed, front-loaded, respectful of the reader-agent's context budget —
the style itself is an instrument for compliance. **Mandatory second pass**:
review every optimized statement against its source for meaning/intention loss —
compression that drops the constraint is worse than verbosity. Authoring is
two-pass by contract (see Testing).

**Reuse affordance**: cards double as crash courses for focused subagent
reviewers (a reviewer gets one card + the diff — tunnel vision by construction;
the main agent arbitrates). Card granularity serves this.

## 2b. Triggers & discovery

How the skill actually gets loaded, by reliability:

1. **Adopting repo's CLAUDE.md (deterministic, primary).** The skill ships an
   installation prescription — one line for the consuming repo's always-loaded
   instructions: "This codebase follows the deblob architecture — load the
   `deblob` skill before writing code." Goes in SKILL.md's install note and the
   README.
2. **Evidence-phrased description (probabilistic fallback).** The user prompt
   carries no architectural signal — the codebase does, and the agent sees it
   mid-session. The `description` matches what the agent observes
   (layer-suffixed files, `private/` dirs), not user-prompt vocabulary.
3. **Plugin hook (staged, not built).** A path-grepping hook injecting "deblob
   rules apply" on suffix hits would close path 2's recall gap
   deterministically. Escalate only if spot-runs show recall failing (sdd §6).
   Parked in PLAN.
4. **CLI error output (deferred to CLI chapter).** `deblob check` failures point
   at the skill — mechanical layer redirects to judgment layer at the moment of
   violation.
5. **Ambient**: README architecture line in adopting repos; sibling skills
   cross-route here.

## 3. Testing

- Skill loads from the local plugin.
- Trigger path 2: in a fixture codebase with suffixed files, a vanilla task
  prompt ("add a feature to this icons service") leads the agent to invoke the
  skill after observing the file shapes — without a CLAUDE.md hint.
- Trigger path 1: with the prescribed CLAUDE.md line present, the skill is
  loaded before the first code edit, every run.
- Manual spot-runs, 3 scenarios (from the staged RED list): wrong-layer
  placement under time pressure; defensive catch under sunk cost;
  export-for-test under authority. Pass = with-skill compliance where the
  no-skill baseline demonstrably fails. Scenario docs ride in this step;
  automation stays parked (PLAN).
- **Meaning-preservation pass** (the second pass of two-pass authoring): every
  rule in the optimized prose traced back to its doc source; fails if any
  constraint or intention was lost in compression. Reviewed at the consolidation
  gate alongside the content itself.

## 4. Implementation

`skills/deblob/SKILL.md` +
`references/{placement,crossing-services,handling-failure,writing-tests,rules}.md`;
drop `skills/.gitkeep`. Prerequisite doc updates land first (level 1:
architecture "Tests are written for the reviewer"; level 2: guide §8
write-for-the-reviewer rules) — the skill distills, never invents.

## 5. Docs

- README Contents: skills row flips from _planned_ to linking `skills/`.
- `docs/contributing/conventions.md` gains the **derived-views principle**
  (methodological point for this repo): `docs/` is the human narrative and the
  single source of truth; skill cards and why-cards are derived views —
  provenance-stamped, synced from source, never diverging on their own. SSOT by
  derivation, not abstinence.
- Plugin manifest untouched (version bumps when the four-skill set completes).
