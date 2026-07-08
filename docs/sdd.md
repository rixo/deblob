# Spec-Driven Development

**Status**: living draft, distilled from practice (two prior internal
iterations).

Our adaptation of spec-driven development: AI-accelerated work, small team,
brownfield codebase, real adoption constraints. We aren't inventing SDD —
tailoring it (see Grounding).

---

## 1. The core insight: ordering as a forcing function

Asking the right questions in the right order forces good architecture. Each
step **constrains** the next — skip it and the downstream step loses its
constraint.

| Step               | What it forces                                                                                                                                                                               |
| ------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Goals**          | Articulate success before touching anything. Prevents building the wrong thing.                                                                                                              |
| **API**            | Name the contracts you commit to — public surface _and_ internal seams. Prevents implementation-driven design and wrong-layer cuts.                                                          |
| **Testing**        | Answer _how do we prove this works as intended?_ before committing to an approach — the verification strategy, including completion criteria and gates. Can't test without IoC → decoupling. |
| **Implementation** | The code. Part plan, mostly post-hoc record of what the code actually does.                                                                                                                  |
| **Docs**           | Forces planning the documentation: what living docs need writing/updating, tracked as you go.                                                                                                |

Same mechanism as TDD — the constraint IS the value.

**Depth is discretionary; the answer is not.** Each section's minimum
requirement is the high-level answer to its question — Testing's is the
verification strategy, not necessarily a catalog of tests; Docs' is the doc
plan, not the drafted docs. More detail (enumerated tests, spec'd doc fragments,
implementation notes) is welcome whenever complexity warrants or the author
wants it. What the forcing function forces is that the question gets _answered_
before moving on — not a word count.

This is not process for its own sake. The constraints produce better
architecture as a side effect.

### The API step covers internal seams, not just the public surface

"API" reads as the consumer contract; stopping there leaves a whole bug class
unconstrained. A port improvised at code time gets cut at the wrong layer — and
a domain decision that slips to the far side of an injected boundary becomes
unreachable through the real composition: unit tests stub the port, the decision
disappears from every tested path, everything goes green while the actual wiring
is broken. The spec is the cheap place to prevent this, so the API step forces
naming, for every layer that has a contract:

- the **ports** — the boundaries to be injected;
- the **purity split** — what is a pure model function vs an effectful adapter;
- the **home of each domain decision** — which layer owns it. A domain decision
  must never hide inside an adapter.

Phrased once: **API = the contracts you commit to, at every layer that has
one.** Same forcing spirit as tests-first forcing decoupling — naming your ports
and purity boundaries forces correct layering before code.

**Guardrail — don't over-spec.** Piskala's warning applies internally too: this
is NOT "spec every internal signature" — that rots instantly and drowns the
signal. Force only the load-bearing contracts: ports, the pure/effectful
boundary, domain-decision placement — the decisions expensive to get wrong and
hard to move later. Leaf signatures stay free to evolve.

**Test corollary.** A stub at a port erases everything on its far side. If a
domain decision lives there — inside the adapter — no test through the public
contract can reach it. So domain decisions belong on the _inside_ of the
injected boundary (service or model), and the API spec naming the port-vs-domain
split is what guarantees that placement (see [architecture](./architecture.md),
Testing).

### The `5-docs` step is a forcing function — for the _living_ docs

Docs IS a forcing function: it forces you to **think about documentation
implications, plan them, and track what living docs will need updating** — so
docs don't get silently dropped (the corner every project cuts under time
pressure).

Crucially: **`5-docs` is the doc _plan_, not the docs.** It is the strategy for
the living documentation (READMEs, usage docs). The living docs are written
_from_ it — on the other axis (§2). Keeping these separate is the whole point:
the spec plans the docs; the README _is_ the doc.

**And it is upfront homework, not a trailing nicety.** The docs section is
answered at spec time — _how is this taught? which existing living docs are
affected, from the get-go?_ — and reviewed at the spec gate (§4), before
implementation runs. Being last in the quintet is reading order, not scheduling:
it is the step every project glosses over under pressure (observed compliance
without enforcement: zero), which is exactly why it is a hard requirement of the
spec, not a wish for later. Homework before play.

### On TDD and test ordering

"Testing" in the spec sequence is a _thinking_ step, not strict TDD. Strict TDD
with agents is workable — but only under tight supervision; its benefit is
preventing tests that test wind. Unsupervised, agents cheat grossly at it.

We hold no strong opinion on test-first vs implementation-first with agents —
fast agent iteration makes discovery during implementation common, and tests can
grind the flow. Genuinely unsettled.

Our _mechanical_ forcing function is elsewhere: **100% coverage through the
public API** (see [architecture](./architecture.md), Testing). Note this
requires a sufficiently mature — unblobby — codebase to pull off.

### Spec the operation over the domain, not the cases

A recurring generation failure — in agents, and in deadline-pressured humans:
enumerate the visible cases instead of stating the general operation. The
mechanism is incentive, not ignorance: locally-passing output is what gets
rewarded, and covering the cases you can see is the safe way to pass. Knowing
the principle doesn't prevent it — a model can recite "fold over the domain,
don't enumerate" and still enumerate while generating. Reciting a rule and
reaching for it are different acts. (This is the generation-time face of the
systems-thinking gap — §4.)

When a step's correctness depends on generality, the spec forces the general
form:

- **Name the domain and state the operation over the whole of it** — plainly, at
  the point of implementation, not only in the preamble. A fold over the domain,
  not a list of its known members.
- **Treat any measured count as evidence the set is open-ended** — never as a
  target to enumerate.
- **Have a test assert the openness** — an input carrying an unseen case still
  passes; a re-enumeration fails the gate by its shape.

---

## 2. Two axes: history vs living docs

The organizing principle. A project needs two different things, and each **rots
if you mix it with the other**:

| Axis                      | Indexed by | Lifecycle           | Answers                                                |
| ------------------------- | ---------- | ------------------- | ------------------------------------------------------ |
| **History** (`history/`)  | Time       | Append-only archive | _Why_ / _how did we get here_ — decisions, constraints |
| **Living docs** (READMEs) | Location   | Always-current      | _What is it right now_ — the API you use today         |

- History rots if you keep it current → it becomes lies about the past.
- READMEs rot if you make them historical → stale half-updates.

Refusing to mix them keeps both honest.

**Rule for agents:** history answers _why_, never _what-is_. Current state lives
in READMEs; a frozen chapter's constraints may be stale **by design**. Never
treat a history chapter as a description of the present.

**A plan only survives until contact with reality.** Corollary, spelled out
loud: **past plans in history are NOT canon.** Canon is the living docs plus the
_latest_ plans — the current outermost PLAN, the active chapter's spec. A frozen
SPEC is the record of what was decided and done at its date; its forward-looking
parts (projections, extension rules, staged next-steps) died the moment reality
answered. Reading an old chapter's roadmap as commitment is the same axis-mixing
error as reading history for what-is.

- **History is a chronological archive — it stays.** Someone reading it later is
  _favorably_ informed by the chronology: the spec appearing and evolving
  alongside the code it documents. You don't dissolve that into one giant doc —
  that mixes concerns and loses the timeline.
- **Consolidation lives on the OTHER axis** — the living docs. That is where
  "current state" is distilled and maintained. History never tries to be
  current; READMEs never try to be historical.
- Raw _scratch_ (a churning PLAN, WIP notes) gets cleaned up when the work is
  consolidated for review/merge — tidied into meaningful commits and clean dated
  steps. The knowledge isn't deleted; it migrates to where it belongs (steps +
  commit messages + living docs). See §4.

> README structure is open work — suggested sections (goal, API, dependencies,
> status) not yet locked. Spec structure (below) is settled.

---

## 3. The history axis: one shape, recursive

The spec shape — Goals → API → Testing → Implementation → Docs — is **the same
at every scale**: a commit, a file, a directory of files, a directory of steps.
Same building blocks, same natures, different sizes. This is meant literally —
the fractal _is_ the learning model: learn the shape once, read any unit of
history. And the claim only survives if it admits no exceptions: the first
exception adds a second thing to learn; a few more and the system reads as
noise. When a scale seems to demand its own shape, that's a modelling smell to
resolve — never a licence to deviate. (The fractal claim is about
_implementation_ units; research moves and support docs are free-form by nature
— see "Two kinds of moves" below.)

Only the **materialization** scales with the task. You pick the **form** by the
_nature_ of the work, not a rigid rule.

From level 1 up, **a move IS a directory — no exceptions.** The ladder describes
what's _inside_. Three reasons, each earned: chronological sort survives
dirs-first file viewers (files and directories never interleave in the listing);
a growing move upgrades **in place** — add section files or steps next to
`SPEC.md`, no file→dir conversion, no path breakage; and the fractal claim stays
exceptionless (see above).

Spelling this out matters, doubly so for agents: told "a spec is a directory,"
an agent will happily split 30 lines of spec across 5 files. The ladder is
explicit permission to keep small things small — level 1 is _one file_ in its
directory. **When unsure: level 1.**

| Level | Form                                                                       | For                                                        |
| ----- | -------------------------------------------------------------------------- | ---------------------------------------------------------- |
| **0** | The **commit message** — the quintet as compressed sections (§4)           | a _contained side-show discovered mid-mission_ — see below |
| **1** | A directory with a single **`SPEC.md`** (`1- 2- 3-…` sections embedded)    | most _planned_ work — one unit, not multi-step             |
| **2** | A directory with **split section files** (`1-goals.md`, …)                 | bigger planned work — sections earn their own files        |
| **3** | A directory of **steps** — each step _itself a spec_ (see recursion below) | big work, sliced into chronological steps                  |

`SPEC.md` joins the caps-name family (`GOAL.md`, `PLAN.md`, `META.md`): the file
is named by role, identity is carried by the directory. The cost — many files
sharing one name — is accepted with eyes open: nothing imports a spec, and the
directory name is always in view.

### The axis is _planned_ vs _contained-discovery_ (not just size)

- **Levels 1–3 = planned work.** The mission. It gets a history doc because it
  was deliberate, concerted, tracked. Among these, size picks 1 vs 2 vs 3.
- **Level 0 = a contained side-show**, discovered _while doing something else_ —
  a blocking CI bug, an adjacent test breaking, a quickfix. The papertrail lives
  _in the commit_: it wasn't planned and is self-contained.

> **"Contained" is load-bearing.** Discovering a need mid-task is NOT a license
> to skip planning. You do not bypass the task tracker, planning and
> concertation for a full refactor just because you stumbled on it. Level 0 is
> for genuinely small, contained detours. **Judgement always.**

### Level 3: recursion — a chapter is a spec of specs

At chapter scale the sections don't get bigger files — they **distribute into
child specs**. Each step (`00_`, `01_`, …) is a _full spec of its own slice_,
and picks its own form on the same ladder: a small step is a directory with one
`SPEC.md` (level 1), a bigger one splits section files (level 2), and a step
that grows a self-contained concern becomes a directory of steps itself (level 3
again). That is the recursion — there is no fifth form, only the same four at
the next depth. The all-dirs rule recurses too: steps mix files and directories
inside a chapter exactly like chapters do inside `history/`, and the sort breaks
the same way.

What stays at the chapter root is what binds the children:

- `GOAL.md` — the chapter's _goals section_, materialized as its own file
  because it outlives every step.
- `PLAN.md` — **not part of the shape.** The scratch buffer where the plan
  churns before crystallizing into steps; cleaned at consolidation (§2). The
  knowledge isn't lost — it migrates into steps and commit messages.

```
history/20260214_icons-revamp/
  GOAL.md               ← the chapter's goals section (stable)
  PLAN.md               ← scratch — refines into steps; cleaned at stint's end
  00_icons-service/     ← a step: itself a spec, section-files form (level 2)
  01_manifest-import/
    SPEC.md             ← a step: itself a spec, level-1 form
  02_sprite-explorer/
    SPEC.md             ← a step: itself a spec, level-1 form
```

**Nest where a concern begins, not where a count is reached.** A step forks into
its own directory when a self-contained concern starts — its internals belong to
_it_, not to the chapter's top-level sequence. Flat siblings express sequence;
nesting expresses ownership. A concern ballooning into `07 08 09…` siblings at
the parent level is the smell; `07_concern/` with its own `GOAL` and steps is
the fix.

Experience: our largest chapters lived exactly like this — `GOAL` + steps, each
step self-complete about its own concern. The chapter-scale quintet doesn't
vanish; goals hold the top, and the other sections live _inside the steps that
own them_. Steps self-complete about their concern beat one mixed-concern
mega-doc.

### Spec depth follows foundation stability

How far ahead to spec the steps? As deep as the ground under each is stable: the
active step fully; later steps as far as they are load-bearing and their
premises look settled; looser further out — then let each step's implementation
feed the next spec. Both extremes are known failure modes. Full detail up front
writes over theory the earlier steps haven't settled yet — one early spec
mistake trashes downstream work, the classic waterfall cost. Proceeding
step-by-step with no forward spec loses the constraint that makes the ordering
worth anything. The forcing function is a thinking discipline, not a licence to
waterfall.

### Two kinds of moves: implementation and research

Every step is one of two kinds of _move_ (the kinds identified so far):

- **Implementation** — most steps. Fully standardized: the spec quintet,
  fractal, recursive, no variants.
- **Research** — sometimes needed, before an implementation step. Free-form: it
  collects knowledge into its own file or directory and changes **nothing
  outside itself** — no code, no docs elsewhere. That containment is the
  definition, not a guideline.

A research step is a real numbered step in the chapter's sequence — the
exploration _happened there_ in the chronology. But it is **not directly
implementable**: no quality gates have constrained it. It turns open ground into
input for a later implementation step; it doesn't replace that step's spec. The
fractal claim (above) is about implementation units — that's where learn-once
pays; there is nothing to standardize about not-knowing-yet. And the looseness
is scoped: the implementation step a research step feeds runs under full gates,
always.

### Support docs

Free-form documents are allowed _alongside_ steps, at any scale. They are
support, not moves — they serve the work without advancing it:

- **Scratch** — `PLAN.md`, WIP notes. Churns during the work; cleaned at
  consolidation (§2).
- **META** — the methodology log (below).
- Whatever else a chapter genuinely needs — free-form, named for what it is.

Three recurring support _sections_ have earned names (each observed
independently reinvented across many chapters — standardize, don't rediscover):

- **`## Decisions`** — rulings made along the way, logged so they aren't
  re-debated (rejected options included).
- **`## Open questions` / `## Out of scope`** — deferred-work pointers: named,
  parked, not lost.
- **`## Commits`** — the hashes that implemented the spec, closing the loop down
  to level 0.

#### META: the methodology log

History records _what happened_; living docs record _what is_. Neither fits an
observation about the practice itself — the methodology insight surfaced _while
doing the work_. That's META: a history-axis, append-only log of such insights,
harvested later by grep (`history/**/META.md` plus commit `META:` labels) into
the living methodology docs. The filename IS the index; naming consistency is
the cornerstone.

- **Bar: salient methodology insight** — something that changes the _practice_.
  Task findings belong in steps and commits, doc corrections upstream in the
  docs; routine work produces nothing.
- **Entries dated and themed.** Append-only, like everything on this axis.
- **Placement follows the triggering work's form** — the same materialization
  ladder as the spec: commit-scale → a `META:` trailer in the commit message
  (§4); any move from level 1 up → `META.md` in its directory (the all-dirs rule
  guarantees the home; META is off-topic by nature — always its own file, never
  a spec section); chapter-root `META.md` when insights span the chapter;
  `history/META.md` when they span the project (see the outermost chapter,
  below).

### The outermost chapter: `history/` itself

The recursion has a top. The project is the outermost chapter, and `history/` is
its directory:

- **`history/GOAL.md`** — the program's stable why, the goal that outlives every
  chapter.
- **`history/PLAN.md`** — the roadmap scratch where the _next chapters_ stage.
  The same mortal object as a chapter PLAN; only the terminal event differs. The
  outermost chapter never consolidates, so the file persists — but **every item
  in it is mortal**: the moment an item's work begins, a chapter is born and the
  item dissolves into it (payload moves to the chapter's spec, the item
  disappears). Items stay **thin** — what, why staged, rough order. Spec-grade
  detail accumulating in an item is the smell that a chapter wants to be born.
  This mortality is load-bearing: a PLAN allowed to hold work indefinitely is a
  standing bypass of the entire system — everything lives in scratch, no
  chapters are born, no gates fire, history stays empty.
- **`history/META.md`** — project-spanning methodology insights, same bar as
  everywhere.

This wasn't designed; it surfaced by need — repeatedly re-deriving "where were
we, what's next?" in conversation is the tell that GOAL and PLAN were missing at
a scale the theory hadn't named. It also dissolved a misnamed doc: a
"ground-rulings inbox" (rulings and staged work awaiting their home) is not a
separate doc kind — it is the outermost PLAN.

### Terminology

- **Chapter** — a folder for one task/feature: `history/DATE_ISSUE_topic/`. The
  project itself is the outermost chapter, rooted at `history/`.
- **Step** — a child spec within a chapter, chronologically numbered (`00_`,
  `01_`, …); itself any level of the ladder.
- **Section** — a spec part (`1-goals`, `2-api`, …) — embedded in `SPEC.md`
  (level 1), split into files (level 2), or carried inside steps (level 3).

### Lifecycle & growth

- History is **append-only** and stays in the repo — durable project knowledge.
  (A common objection: such docs "could influence agents." Our position:
  influencing agents is the entire value proposition — governed by the agent
  rule in §2: history for _why_, never for _what-is_.)
- Scratch (PLAN, WIP) is cleaned when the work is consolidated for review/merge;
  the knowledge migrates to clean steps + commit messages.
- When a chapters directory gets unwieldy, move older ones to
  `history/archive/`. Filenames are the index — anything more structured is
  over-engineering until ~50 specs reveal real lookup patterns.

---

## 4. The review gates

The economics of agent-assisted development: production got cheap, review stayed
expensive — review is the bottleneck. The methodology's job is to concentrate
scarce human review attention where it pays. Two gates:

1. **Spec gate** — human reviews Goals + API _before_ implementation runs away.
   Catches building the wrong thing, implementation-driven design, surface bloat
   — at the cheapest possible moment. If you can't understand what the public
   API is supposed to do, that's a spec problem, not an implementation problem.
   The gate approves **direction**: far-future details in a spec are
   placeholders until their ground becomes active (§3, spec depth) — challenging
   every projection at the gate is paralysis by analysis, and plans aren't canon
   once frozen anyway (§2).
2. **Test gate** — human reads the tests as the behavioral spec, at
   consolidation time. Tests go through the public API (see
   [architecture](./architecture.md), Testing), so they read as behavior
   statements, reviewable without implementation knowledge. If you accept a test
   that says in plain language your API does something dumb, that's a review
   problem.

Implementation between the gates is reviewed opportunistically, not exhaustively
— the architecture's structural rules (mechanically enforced) and 100% contract
coverage carry the weight there.

### The System-2 surfaces

A repeated observation across models, frontier included: **agents fail at
systems thinking.** They solve the _case_, not the _class_ — procedural, not
functional; they patch the instance without stepping back to the generic
solution. The spec's forcing sections exist for exactly this, and two of them
are where the generic-vs-case judgement actually lives:

- **API** — including the public/internal boundary (§1);
- **Implementation** — the chosen approach, not the line-by-line diff.

These are the System-2 surfaces: the reviewer engages deliberate, active
attention there — precisely because the agent is weakest where passive
acceptance is most tempting. "Opportunistic" implementation review means
_selective_, never _passive_: when you do look, the question to ask is
case-vs-class. The stakes are asymmetric — a systems-thinking miss at the API is
a ticket to the wrong destination; no after-the-fact course correction fixes it,
and the cost lands later and compounds. The review gate is the only cheap place
to catch it. Tie the gate to this failure mode, or it decays into ritual.

### Commits as the lower level of the same system

**No-squash / meaningful commits.** The commit log IS documentation — WHY
matters as much as WHAT. Squashing destroys knowledge (the Linux kernel and
git.git have known this for decades). Micro-commits keep rebases light and
review granular. **A commit message is SDD at level 0** (§3): the quintet as
compressed sections, carrying the spec for a contained change:

```
Goal:            why this change exists
API:             contract changes — when any
Testing:         how it's proven — when non-obvious
Implementation:  what changed and how; the file-by-file record lives here
Docs:            living docs affected — when any
```

(A `Changes:`-style file list is not a sixth section — it is the Implementation
record.)

The subject line is a semantic commit — `type(scope): summary` (Conventional
Commits). In monorepos with many packages, the scope names the package
(`fix(icons): …`). A breaking change is an API-section fact, flagged `!` in the
subject per the convention — breakage does not itself earn `NOTABLE:` (attention
≠ breakage, though the two often coincide; run the litmus separately).

**The message scales with the surface of the change — judgment, not template.**
The quintet is a checklist to _answer_, not sections to fill. Sections with
nothing to say collapse into one short line naming them ("No API or doc surface;
testing: existing suite covers.") — the difference between _considered empty_
and _skipped_ is exactly one line, and the reviewer can't tell otherwise. At the
other end, a commit that ships its own spec (a step's `SPEC.md` landing with the
change) **defers to it**: Goal in a line, the spec carries the detail. The spec
is in the tree of that very commit — copying it into the message stores the same
record twice in one object, and the message copy freezes while later commits may
amend the spec: dead weight now, misleading later. The pointer has a standing
form — the `Spec:` trailer (below). And at the trivial end the body may drop
entirely, under a strict litmus: the subject fully states the why AND no quintet
section would carry content (`style(docs): prettier reflow` needs no more) —
"the subject says it all" without passing both halves is the rationalization,
not the rule.

**Two orthogonal labels ride along** — an attention flag and a knowledge log;
conflating them buries both:

- **`NOTABLE:` — the reviewer-attention flag.** Signals: of the many commits
  under triage, spend scarce review budget _here_ — dangerous, architectural,
  judgment-heavy. Salience is relative to the **reviewer's queue, not the
  agent's task**: within its own task, everything an agent just did feels
  notable, and that is exactly not the point. Litmus: _notable compared to the
  other commits under review, or merely central to my task?_ — only the first
  earns the label. Expected base rate: low, single-digit percent of commits.
- **`META:` — the methodology insight** (§3): an observation about the practice
  itself, orthogonal to the task, dropped where the harvest grep finds it —
  META's level-0 materialization, same ladder as the spec. We already push
  thousands of tokens per task; a few tokens of reflection are free. Threshold:
  it changes the _practice_ — routine work produces nothing.

**Labels and the spec pointer are git trailers** — one final block after the
quintet (`NOTABLE:`, `META:`, `Spec: history/<chapter>/<step>/`), never inline
in sections. Trailer position is what makes them mechanically harvestable
(`git log --format='%(trailers:key=META,valueonly)'`): the META harvest grep
becomes structured extraction for free, and `Spec:` closes the level-0 ↔ level-1
loop machine-followably.

---

## 5. Grounding & landscape (brief)

**We combine established traditions, we don't invent.** Direct ancestors: TDD
(Beck) — the canonical forcing function, lifted to spec level;
Design-by-Contract (Meyer); Readme-Driven Development (Preston-Werner) — our
docs step is this; Literate Programming (Knuth); ADRs; the Linux kernel /
git.git workflow — plain text, meaningful commits, discipline, not tooling (our
no-squash philosophy comes from here). Academic: Piskala (2026) names
spec-anchored as the sweet spot and warns against over-specification; Seshia et
al. (2024) on specs enabling verifiability.

**Why not an existing tool?** The SDD tooling space (Spec Kit, Kiro, Tessl,
OpenSpec, BMAD) is hot but immature — mostly too heavy (Fowler: "sledgehammer to
crack a nut"; Adzic: "the worst parts of Waterfall under a shinier name"). The
most successful spec-driven practice in history (Linux kernel) uses plain text
and discipline. Our constraints (brownfield, mixed team, varying AI maturity)
reinforce KISS: _if coworkers won't use it, it doesn't exist._ OpenSpec is
closest in spirit; worth watching.

What the tools don't cover for us: (1) _ordering_ as the explicit forcing
function — phases exist elsewhere, the cascade-constraint framing doesn't; (2)
lightweight & organic — Markdown in a folder, no CLI; (3) brownfield-native — we
model the _change_, not the codebase; (4) integration with git philosophy —
no-squash + SDD + META as one system.

**Ideas worth stealing:** OpenSpec's ADDED/MODIFIED/REMOVED delta markers for
brownfield review; Spec Kit's "constitution" (immutable principles that win
conflicts).

---

## 6. Enforcement

Lightest effective: file-structure constraint (numbered steps created in
order) + always-loaded agent instructions. Heavier mechanisms (protocols, MCP
tools) add complexity — escalate only when discipline fails.

Why so light, when the [architecture](./architecture.md) demands CI-enforced
tooling? Not the same material. Specs are prose and creative thinking; they
don't ship to production. The architecture is software — it IS the program's
behavior — and justifies mechanized consistency. Mechanizing deterministic
checks also unloads the scarce resource (review attention — and tokens: sending
agents to verify deterministic properties is the wrong tool for the job).

---

## Open / unsettled (honest gaps, not omissions)

- **Test vs implementation order** with agents (§1) — no conviction yet.
- **README/living-doc structure** (§2) — sections not locked; this is the next
  normalization target, and the weaker half of the two-axis model in practice
  (the history axis is far more worked out than the living-docs axis).
- **When does scratch (PLAN) get cleaned, by whom** — "at consolidation" in
  principle; the cleanup-into-steps motion hasn't been practiced enough to
  prescribe.
- **Research-step internal conventions** (§3) — the move kind is adopted; what a
  _good_ research step looks like inside (structure, exit criteria, how it hands
  off to the spec it feeds) is unpracticed.

---

## External references

- Piskala (2026),
  [Spec-Driven Development: From Code to Contract](https://arxiv.org/html/2602.00180v1)
- Seshia et al. (2024),
  [Specifications: The Missing Link](https://arxiv.org/html/2412.05299v2)
- Fowler (2025),
  [Understanding SDD — Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- Preston-Werner,
  [Readme-Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html)
- Linux kernel,
  [Submitting Patches](https://docs.kernel.org/process/submitting-patches.html)
