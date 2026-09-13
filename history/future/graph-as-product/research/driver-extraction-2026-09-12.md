---
captured: 2026-09-12
---

# Driver extraction — the brief, and what it teaches the product

rixo's brief of 2026-09-12 (typed twice, the second time with "this is
IMPORTANT"), banked whole. It reads as a spike item — how the map detects
triggers — but its weight is on the product: it says what the missing driver
layer is, what assembly is left with once the driver exists, and which
constraints both layers must carry for any view of them to mean something. The
map is a proxy of a meaningful organisation whose quality gates are easily
grepable; that organisation is the deliverable, the map is how we find out
whether we have it.

Standing marks: **ruled** (rixo said it as a decision), **inferred** (follows
from a ruling plus one observation), **hypothesis** (nothing tested). Terrain
here is deblob on itself and the partner CLI (second dogfood target, nothing
partner-identifying).

## The observation

deblob has no CLI framework — no cac, no commander. So the first trigger adapter
is a custom one for deblob's own driver (`drivers/cli/main.ts`). Stock adapters
for cac and the like will come later and matter only for the _form_ we give the
adapters: the contract below is written so that a framework adapter and the
custom one return the same shape. Several adapters can be active in one config
at once — one per driver kind a codebase has. (ruled)

Right now the driver's shape is declared directly in the config, so the
extraction can be produced today; whether drivers later get a `.driver` suffix
with assembly-like rules is a flavor topic, to be decided ("tbd, probably flavor
topic"). Assembly is already declarative by config; drivers probably follow.
(ruled for now, suffix open)

## The contract — what an adapter returns

- **Naming** for the UI: what its triggers are called in this codebase — "cli"
  and "commands" instead of "driver" and "triggers". The adapter both parses and
  formats: it knows it is a CLI with flags, and the map leverages that for
  navigation and representation.
- **Triggers**, each with a name, a file and a function. The function is what
  lets dependencies be traced at function level: the injected services and
  adapters the trigger reaches. Tracing is limited to what the flavor's
  extraction already provides — factory arguments in our stock flavor — never a
  second, parallel extraction.
  - **Variants** of a trigger, same shape one level down. For a CLI, the
    `--args`.
  - **Local deps** — a new concept: the function-level injections a trigger
    hands to what it calls. Shown behind an option, on by default. Module-level
    deps (what the map draws today, the import graph) stay the existing opt-in.
- **Covered files**: the files the adapter accounts for, so the map can stop
  drawing them as files once the triggers are on it (see the coverage guard
  below). (inferred from the screenshot problem, not in the spoken brief)

## What the extraction must reach

The gist, in order:

1. Extract the triggers.
2. Link each trigger to its deps down to function level. The service function a
   trigger calls is then identifiable as a **primary use case** of that service,
   and it falls under the usual quality gates — behavior justified by its unit
   tests, 100% coverage — the gates that logic parked in assembly was dutifully
   escaping.
3. Ideally, the origin of what is injected into the services and adapters as
   deps, so the map can say: "this port is served by this concrete adapter, in
   the CLI driver, for this trigger". An `if` branch choosing between two
   adapters puts both on the map; the nuance is not represented. We are big into
   links, not into runtime proper. (ruled)

## What assembly is left with

Once triggers are extracted and their calls land on services, assembly's role is
exactly this, and nothing else: (ruled)

- **initialize** services and adapters — loading config included;
- **wire** — which we intend to reflect on the map by linking services and use
  cases to the adapters they are really connected to;
- **trigger** — not by doing the thing, but by calling a service that does it.

Everything else in an assembly file is laundering (the placement-debt chapter's
finding, from the other side). The consequence for the map: a driver or assembly
file whose every import is accounted for by initialize, wire or a trigger's call
has nothing of its own to show and disappears behind its triggers. One that has
a residue stays drawn, carrying only the residue — the residue is the finding.

## What this teaches the product

The point rixo stressed. We learn quite a lot about the **missing driver layer**
(arch-pass F1: drivers are absent from the dependency matrix) and about the
constraints driver and assembly must carry to be viewable at all.

- **Driver and assembly overlap; the idea that they do holds** — how much is
  still unclear. Both are declarative by config today; both hold the same import
  privilege (composition units), in opposite directions (assembly builds, the
  driver uses). (ruled: holds; open: the extent)
- **The expected evolution of deblob itself** (inferred, to be ruled at
  graduation, in this order of confidence):
  1. A driver declaration in the config, next to `assembly`: which files, and
     which adapter reads them. The shape of that declaration is what the spike
     is coding now.
  2. A closed role list for assembly (initialize, wire, trigger-by-calling),
     stated in architecture.md § Assembly and the assembly cards in place of
     "recognize the two hats"; the review gate's "assembly touched?" question
     reads against that list.
  3. A trigger → primary-use-case relation the checker can see, so "a trigger
     with no owning use case" (placement-debt step 05's gate question) becomes
     computable rather than tabled by hand.
  4. Possibly a `.driver` suffix carrying assembly-like rules — a flavor
     decision, not a config one.
- **Strong single-purpose files, now with a reason that is not taste.** Between
  the lines of all of the above is a strong argument for the single-purpose
  files we already called for: the map works better when a service or adapter
  file holds exactly one factory, because then the file — including its _name_,
  meaningful user-provided data — stands for the one thing it contains, and the
  explorer's user navigates bricks and links by the names they chose. Files
  holding several factories force the map to invent labels. (ruled as direction;
  the rule itself not written)

## The map problem that surfaced it (2026-09-12, screenshot)

In the services view, the driver box shows its triggers and then `bin.ts` and
`main.ts` as assembly files, and the arrows between the driver and the service
boxes land on `main.ts`, not on the trigger that calls the use case. Cause: the
page always draws assembly and blob files as items, and edges are module-level
imports, so the importing file is the endpoint; triggers get edges only under
the off-by-default "arrows per trigger" option, which replaces the import arrows
rather than reconciling with them.

Fix, both halves, in the spike (`spike/graph-viz`, step 04 in its PLAN):

- **the adapter claims** the files it covers and the triggers with their
  function-level calls; triggers become the edge endpoints in the services view;
- **the dump verifies the claim** with the coverage guard above (every runtime
  import into a service box is an initialize, a wire, or a trigger's call); zero
  residue removes the file item, a residue keeps it with only its residual
  arrows.

## Decision material (rixo, 2026-09-12 night — nuances on Fable's consistency read)

Fable's read of the brief against the arch and the future notes (consistent in
intent; three sentences of architecture.md to move: "a driver is an adapter like
any other", the necessary-evil CLI example that files parsing and dispatch under
assembly, "recognize the two hats") is accepted with the nuances below. None of
this is ruled; each item is material for the focus session rixo wants before
driver and assembly are written into canon. Standing marked per item.

- **"Owner" / "reached" is unvalidated vocabulary that leaked into the spec.**
  Nothing on this front was ever validated; rixo: "it took me forever to NOT
  grasp the concept". It lives in the spike's step 02 spec, the dump's verdict
  words (owned / no owner / reached), the spike PLAN's "levels are read from the
  caller" ruling and dot 13. Better words are owed. The current tendency:
  **primary use case**, defined as a use case called by a trigger — maybe a bit
  more, still tbd. (ruled: the old words are out; open: the replacement)
- **Dots 6 and 7 were not luck.** The viewer is being modeled on purpose to
  surface, through itself, the surface the method already names essential to
  review: specs and tests. New observation behind it: even "100% tested through
  the public API" quickly becomes unintelligible to the pilot, who reads
  technicalities of things they never conceived, only read back from results.
  The bet, disclosed as a bet: higher-level services, with primary use cases at
  the top, _should_ carry a better shared language between agent and human,
  because they connect to the _app's_ API surface and not only to an internal
  service API. A reviewer who does not understand the CLI's commands and flags
  is where the problem starts, and that is said plainly. (hypothesis, rixo's
  bet)
- **Web is a big open question.** Nothing is solved in that direction;
  hypotheses and feelings are fine as long as they are disclosed as such.
  (ruled: no overclaim)
- **"Driver is an adapter" needs a stress test**, but the observation holds that
  drivers provide the triggers and are the best place for the assembly work.
  After three days on the maps, rixo's instinct: assembly is barely a function;
  the driver is the role that holds it in our arch. A vague assembly definition
  — and the arch specs have few vague things — led to laundering immediately. A
  strict driver definition, with limited assembly power and hard constraints
  enforced by parsing the AST somewhat deeper than imports, feels like the
  compelling way to close the loop. (instinct, to be stress tested)
- **Drivers are declarative in nature**, with stock driver adapters possible,
  because their forms are so diverse (CLI, web, …). Their deep nature is coming
  into focus — triggers, calling use cases, init and wiring — but how that maps
  onto a given tech has to be plugged by config: two CLI apps do not share an
  AST at all (cac, commander, a hacked cac, full custom). (inferred)
- **"Necessary evil" stands**, because behavior justification by tests still
  cannot be enforced on that code. Direction: an evil in shackles. (ruled)
- **Assembly versus driver needs a focus session**; for now the instinct is that
  no assembly layer needs to be accepted at all: the driver closes the loop on
  the layers an app needs to be complete, and accepting more than necessary only
  opens the door to blob laundering. The stance stands: code that cannot fit a
  layer with its constraints is blob; deblob provides no exclusion mechanism to
  hide it; some blob may be impossible to eliminate, hiding it is never ok.
  (instinct on the layer; ruled on the stance)
- **Fable's "one split" restated** (rixo asked). The brief listed "trigger, by
  calling a service" among assembly's roles; dot 1 files "call, one per trigger"
  under the driver; the two agree in a CLI because one file holds both and
  disagree in the web zone, where a context provider initializes and wires and
  the component makes the call. The proposed split was two role lists —
  assembly: initialize, wire; driver: parse, one call, present — that coincide
  in a shared file. Under rixo's instinct above (no assembly layer, the driver
  holds init and wiring) the split dissolves as a layer question and survives as
  a verb question: init, wire and call stay distinct acts the AST-level
  constraints would tell apart, all under one role. (Fable's reading, not ruled)
- **Per-trigger import attribution is the adapter's job and its risk.** It
  should be possible to parse which of a file's imports one trigger uses (a cac
  handler is identifiable). That boils down to trusting the adapter for that
  driver, and the reliability will vary — a focus session topic. For now: a
  driver parser for our own homemade CLI, triggers possibly hardcoded, and
  single-file drivers assumed workable. Later, a flavor or a flavor variant
  could go bold: one `.driver` file = one trigger = one use case, done. (ruled
  for the PoC; open beyond)
- **"1 trigger = 1 use case" is not decided.** An operation in a web app may
  legitimately need housekeeping that calls into another service. Neither overly
  restrictive nor permissive; the balance needs thinking, and the viz initiative
  is collecting the intel. "1 trigger = 1 use case per service" has been
  floated; its implications are to be tracked before calling it decided. (open,
  explicitly)
- **Single factory per file: the idea is blooming, and the map is crying for
  it.** These are mostly machine-generated layouts, though Java proved humans
  can inflict and respect such formalism by hand, and some virtue emerges from
  it. deblob was never meant as a generic tool but as a complete methodology,
  theory plus tooling, to reach a stated result even starting from a mess;
  universality is not the point, achieving the goal is. If that takes strict
  requirements purely so the tools give their best result, the deal is probably
  taken. (leaning; "probably" twice, rixo's)
- **Suffixes are already a flavor concern.** The arch will treat assembly and
  driver the same way: it tells the why, the stakes and the solutions; file
  naming was never owned by the theory. (ruled)

## Relations

- Spike: `history/20260911_graph-viz-spike/PLAN.md` (branch `spike/graph-viz`) §
  Direction "the trigger adapter's shape" now points here; step 04 carries the
  work.
- Product: `future/arch-pass/PLAN.md` F1 (the driver row);
  `history/20260910_placement-debt/` (laundering, the third hat, the trigger →
  use-case table at the spec gate).
- Kin: [dots-2026-09-11.md](./dots-2026-09-11.md) dot 1, the verb grammar — the
  same role list, tagged per line rather than per file.
