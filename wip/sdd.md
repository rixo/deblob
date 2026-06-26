# Spec-Driven Development

_Author: rixo_

**Status**: living draft, distilled from practice (two prior internal iterations).

Our adaptation of spec-driven development: AI-accelerated work, small team, brownfield codebase, real adoption constraints. We aren't inventing SDD — tailoring it (see Grounding).

---

## 1. The core insight: ordering as a forcing function

Asking the right questions in the right order forces good architecture. Each step **constrains** the next — skip it and the downstream step loses its constraint.

| Step               | What it forces                                                                                        |
| ------------------ | ----------------------------------------------------------------------------------------------------- |
| **Goals**          | Articulate success before touching anything. Prevents building the wrong thing.                       |
| **API**            | Think about consumers, contracts, surface. Prevents implementation-driven design.                     |
| **Tests**          | Think *how do we verify this* before committing to an approach. Can't test without IoC → decoupling.  |
| **Implementation** | The code. Part plan, mostly post-hoc record of what the code actually does.                           |
| **Docs**           | Forces planning the documentation: what living docs need writing/updating, tracked as you go.         |

Same mechanism as TDD — the constraint IS the value.

This is not process for its own sake. The constraints produce better architecture as a side effect.

### The `5-docs` step is a forcing function — for the *living* docs

Docs IS a forcing function: it forces you to **think about documentation implications, plan them, and track what living docs will need updating** — so docs don't get silently dropped (the corner every project cuts under time pressure).

Crucially: **`5-docs` is the doc *plan*, not the docs.** It is the strategy for the living documentation (READMEs, usage docs). The living docs are written *from* it — on the other axis (§2). Keeping these separate is the whole point: the spec plans the docs; the README *is* the doc.

### On TDD and test ordering

"Tests" in the spec sequence is a *thinking* step, not strict TDD. Strict TDD with agents is workable — but only under tight supervision; its benefit is preventing tests that test wind. Unsupervised, agents cheat grossly at it.

We hold no strong opinion on test-first vs implementation-first with agents — fast agent iteration makes discovery during implementation common, and tests can grind the flow. Genuinely unsettled.

Our *mechanical* forcing function is elsewhere: **100% coverage through the public API** (see [architecture](./architecture.md), Testing). Note this requires a sufficiently mature — unblobby — codebase to pull off.

---

## 2. Two axes: history vs living docs

The organizing principle. A project needs two different things, and each **rots if you mix it with the other**:

| Axis                       | Indexed by | Lifecycle             | Answers                                                |
| -------------------------- | ---------- | --------------------- | ------------------------------------------------------ |
| **History** (`history/`)   | Time       | Append-only archive   | *Why* / *how did we get here* — decisions, constraints |
| **Living docs** (READMEs)  | Location   | Always-current        | *What is it right now* — the API you use today        |

- History rots if you keep it current → it becomes lies about the past.
- READMEs rot if you make them historical → stale half-updates.

Refusing to mix them keeps both honest.

**Rule for agents:** history answers *why*, never *what-is*. Current state lives in READMEs; a frozen chapter's constraints may be stale **by design**. Never treat a history chapter as a description of the present.

- **History is a chronological archive — it stays.** Someone reading it later is *favorably* informed by the chronology: the spec appearing and evolving alongside the code it documents. You don't dissolve that into one giant doc — that mixes concerns and loses the timeline.
- **Consolidation lives on the OTHER axis** — the living docs. That is where "current state" is distilled and maintained. History never tries to be current; READMEs never try to be historical.
- Raw *scratch* (a churning PLAN, WIP notes) gets cleaned up when the work is consolidated for review/merge — tidied into meaningful commits and clean dated steps. The knowledge isn't deleted; it migrates to where it belongs (steps + commit messages + living docs). See §4.

> README structure is open work — suggested sections (goal, API, dependencies, status) not yet locked. Spec structure (below) is settled.

---

## 3. The history axis: one shape, four fidelities

The spec shape — Goal → API → Tests → Implementation → Docs — is **the same at every scale**. Only the materialization scales with the task. You pick the **form** by the *nature* of the work, not a rigid rule.

Spelling this out matters, doubly so for agents: told "a spec is a directory," an agent will happily split 30 lines of spec across 5 files. The ladder is explicit permission to keep small things small. **When unsure: level 1.**

| Level | Form                                                       | For                                                          |
| ----- | ---------------------------------------------------------- | ------------------------------------------------------------ |
| **0** | The **commit message** (Goal / API / Changes / …)          | a *contained side-show discovered mid-mission* — see below   |
| **1** | A **single file** with `1- 2- 3-…` sections embedded       | most *planned* work — one unit, not multi-step               |
| **2** | A **directory** with split section files (`1-goals.md`, …) | bigger planned work — sections earn their own files          |
| **3** | A directory of **steps**: `GOAL.md` + `PLAN.md` → `00_…`   | big work, sliced into chronological steps                    |

### The axis is *planned* vs *contained-discovery* (not just size)

- **Levels 1–3 = planned work.** The mission. It gets a history doc because it was deliberate, concerted, tracked. Among these, size picks 1 vs 2 vs 3.
- **Level 0 = a contained side-show**, discovered *while doing something else* — a blocking CI bug, an adjacent test breaking, a quickfix. The papertrail lives *in the commit*: it wasn't planned and is self-contained.

> **"Contained" is load-bearing.** Discovering a need mid-task is NOT a license to skip planning. You do not bypass the task tracker, planning and concertation for a full refactor just because you stumbled on it. Level 0 is for genuinely small, contained detours. **Judgement always.**

### Level 3: how a big chapter actually lives

A chapter big enough to slice into steps is, at its core, mostly a **GOAL** + an **initial PLAN**. The PLAN then gets refined and re-refined *into* the steps (`00_`, `01_`, …) — and the steps hold the real detail (each is a mini `1-…` spec for its slice).

```
history/20260427_ISSUE-772_skill-rewrite/
  GOAL.md             ← the overarching goal (stable)
  PLAN.md             ← refines into steps; the scratch — clean at stint's end
  00_spec-service/    ← a step (here itself a sub-concern, kept whole)
  01_skill-rewrite.md ← a step
  02_tracker.md       ← a step
```

Consequence: the full `1- … 5-` quintet *as separate files per chapter* loses its juice at this scale — the steps already mirror it AND carry the detail. So **PLAN is the doc that calls for cleanup at the end** (it's the churn); GOAL and the steps stay as the chronological archive. Experience: our largest chapters lived as numbered steps + a few global docs, never a `1-5` quintet, and that was *fine*. Steps that are self-complete about their own concern beat one mixed-concern mega-doc.

### Terminology

- **Chapter** — a folder for one task/feature: `history/DATE_ISSUE_topic/`.
- **Step** — a chronological working note within a chapter: `00_`, `01_`, ….
- **Section** — a spec part (`1-goals`, `2-api`, …) — embedded (level 1), split into files (level 2), or carried inside steps (level 3).

### Lifecycle & growth

- History is **append-only** and stays in the repo — durable project knowledge. (A common objection: such docs "could influence agents." Our position: influencing agents is the entire value proposition — governed by the agent rule in §2: history for *why*, never for *what-is*.)
- Scratch (PLAN, WIP) is cleaned when the work is consolidated for review/merge; the knowledge migrates to clean steps + commit messages.
- When a chapters directory gets unwieldy, move older ones to `history/archive/`. Filenames are the index — anything more structured is over-engineering until ~50 specs reveal real lookup patterns.

---

## 4. The review gates

The economics of agent-assisted development: production got cheap, review stayed expensive — review is the bottleneck. The methodology's job is to concentrate scarce human review attention where it pays. Two gates:

1. **Spec gate** — human reviews Goals + API *before* implementation runs away. Catches building the wrong thing, implementation-driven design, surface bloat — at the cheapest possible moment. If you can't understand what the public API is supposed to do, that's a spec problem, not an implementation problem.
2. **Test gate** — human reads the tests as the behavioral spec, at consolidation time. Tests go through the public API (see [architecture](./architecture.md), Testing), so they read as behavior statements, reviewable without implementation knowledge. If you accept a test that says in plain language your API does something dumb, that's a review problem.

Implementation between the gates is reviewed opportunistically, not exhaustively — the architecture's structural rules (mechanically enforced) and 100% contract coverage carry the weight there.

### Commits as the lower level of the same system

**No-squash / meaningful commits.** The commit log IS documentation — WHY matters as much as WHAT. Squashing destroys knowledge (the Linux kernel and git.git have known this for decades). Micro-commits keep rebases light and review granular. **A commit message is SDD at level 0** (§3): Goal / API / Changes carry the spec for a contained change.

**Agent retex in commits.** We already push thousands of tokens per task; a few tokens of reflection are free. Agents drop structured observations — things noticed about the system *orthogonal* to the task — that accumulate and get grepped for improvement material. Not a report; a low-friction channel. Threshold: "really notable" — routine work produces nothing.

---

## 5. Grounding & landscape (brief)

**We combine established traditions, we don't invent.** Direct ancestors: TDD (Beck) — the canonical forcing function, lifted to spec level; Design-by-Contract (Meyer); Readme-Driven Development (Preston-Werner) — our docs step is this; Literate Programming (Knuth); ADRs; the Linux kernel / git.git workflow — plain text, meaningful commits, discipline, not tooling (our no-squash philosophy comes from here). Academic: Piskala (2026) names spec-anchored as the sweet spot and warns against over-specification; Seshia et al. (2024) on specs enabling verifiability.

**Why not an existing tool?** The SDD tooling space (Spec Kit, Kiro, Tessl, OpenSpec, BMAD) is hot but immature — mostly too heavy (Fowler: "sledgehammer to crack a nut"; Adzic: "the worst parts of Waterfall under a shinier name"). The most successful spec-driven practice in history (Linux kernel) uses plain text and discipline. Our constraints (brownfield, mixed team, varying AI maturity) reinforce KISS: *if coworkers won't use it, it doesn't exist.* OpenSpec is closest in spirit; worth watching.

What the tools don't cover for us: (1) *ordering* as the explicit forcing function — phases exist elsewhere, the cascade-constraint framing doesn't; (2) lightweight & organic — Markdown in a folder, no CLI; (3) brownfield-native — we model the *change*, not the codebase; (4) integration with git philosophy — no-squash + SDD + retex as one system.

**Ideas worth stealing:** OpenSpec's ADDED/MODIFIED/REMOVED delta markers for brownfield review; Spec Kit's "constitution" (immutable principles that win conflicts).

---

## 6. Enforcement

Lightest effective: file-structure constraint (numbered steps created in order) + always-loaded agent instructions. Heavier mechanisms (protocols, MCP tools) add complexity — escalate only when discipline fails.

Why so light, when the [architecture](./architecture.md) demands CI-enforced tooling? Not the same material. Specs are prose and creative thinking; they don't ship to production. The architecture is software — it IS the program's behavior — and justifies mechanized consistency. Mechanizing deterministic checks also unloads the scarce resource (review attention — and tokens: sending agents to verify deterministic properties is the wrong tool for the job).

---

## Open / unsettled (honest gaps, not omissions)

- **Test vs implementation order** with agents (§1) — no conviction yet.
- **README/living-doc structure** (§2) — sections not locked; this is the next normalization target, and the weaker half of the two-axis model in practice (the history axis is far more worked out than the living-docs axis).
- **When does scratch (PLAN) get cleaned, by whom** — "at consolidation" in principle; the cleanup-into-steps motion hasn't been practiced enough to prescribe.

---

## External references

- Piskala (2026), [Spec-Driven Development: From Code to Contract](https://arxiv.org/html/2602.00180v1)
- Seshia et al. (2024), [Specifications: The Missing Link](https://arxiv.org/html/2412.05299v2)
- Fowler (2025), [Understanding SDD — Kiro, spec-kit, and Tessl](https://martinfowler.com/articles/exploring-gen-ai/sdd-3-tools.html)
- Preston-Werner, [Readme-Driven Development](https://tom.preston-werner.com/2010/08/23/readme-driven-development.html)
- Linux kernel, [Submitting Patches](https://docs.kernel.org/process/submitting-patches.html)
