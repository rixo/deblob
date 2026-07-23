---
captured: 2026-07-23
---

# Graph-as-product — the certified skeleton as leverage, not just defense

Banked from a live discussion (rixo + Fable, 2026-07-22/23 night, cli step 10
era — same session as the rule-13 raison-d'être work in
`../arch-pass/research/nesting-packaging.md` §15–16). Idea card: not committed,
not scoped; earns its place through the command-inventory rule (anything beyond
the ruled v0 surface goes through a future card first — this is that card).

## The reframe

Up to now the architecture was framed defensively — a set of rules to fight off
the mess, grounded in the adopted (not invented) conception that good
architecture's goal is to defer decisions until the best time to commit to them,
which in practice is generally as long as possible. That framing is what the
docs represent. The attentional blindness: the positive benefits emerging from
the organization built to fight the mess — and, following, the potential of the
tool being built to enforce it. No-mess is fine for itself. But it's also a
leverage.

What deblobbing produces, tautologically — acquiring this semantic IS the act of
deblobbing; the methodology and tooling exist to help you achieve it:

- **model** = knowledge
- **service** = use cases + dependency declarations (abstract)
- **adapter** = concrete connections
- **assembly** = wiring concrete → deps

Generic semantic, but semantic nonetheless: semantical roles with guaranteed
properties. Model is fully independent of vendors and side effects — hence
portable — and that's _guaranteed_ (rules + CI). That it makes sense, does the
right thing, or does it well is more semantical still — and not what we sell.
Not guaranteed by us.

The product framing (rixo, at closing): deblob was in the business of selling
armor and shields — and the cli chapter is nearing a workable version of that.
This card opens a sword shop beside the protection business: the offensive line
is crutches for amnesia and prosthesis for shortsightedness (the two pillars,
below).

**The metaphor**: we guarantee bones, and — rule 13 ftw — we even guarantee a
skeleton. We don't guarantee as much as functioning organs, but not as few as
mere molecules either. And the tool knows the bones, the skeleton, and the names
(user-provided) attached to them — and can extract and filter them to your
liking in a blip, no intelligence needed, but for the query.

## Why the potential is plausibly large (support, Fable)

**The type-system precedent.** Types began defensive — catch errors. Then
tooling built on their machine-readable semantics became the actual adoption
driver: the whole LSP/IDE-intelligence economy is the positive exhaust of a
defensive discipline; TypeScript won on autocomplete more than on error
prevention. Layer suffixes are types at architecture scale. Act 1 is the checker
(shipping now). Act 2 is a language server for architecture. Same two-act story,
and act 2 was the bigger act last time.

**The map cannot drift.** Architecture-recovery tools infer structure
heuristically and their output drifts from reality immediately; dependency
graphs (madge, dependency-cruiser) draw untyped arrows with no guarantees
attached. Here the labels carry CI-enforced properties — the map is checked
against the territory on every commit. A trustworthy map is a different product
category from a diagram. (Bounds in the honest ledger below: structure
guaranteed, names not.)

**Ports are reified deferred decisions.** The decision-deferral conception of
architecture becomes _queryable_: a port is an open decision point, an adapter
is one candidate commitment, assembly is the commitment site. "List this
system's open and committed decisions" is a mechanical query. So is vendor blast
radius — "what would migrating off X touch" — and rule 4 certifies the answer
complete (concrete only ever lives in adapters).

**Certified compression for agents.** The skeleton is a summary of the codebase
that is safe to trust — normally summaries hallucinate or drift; this one is
enforced. Feed an agent the skeleton (tiny) instead of the code (huge):
bounded-context selection, topological work order, impact analysis without
reading files, "what is this program" onboarding from structure alone. The
existing violation-ordering ruling (group by service, agents fix a service end
to end) is this idea in miniature, applied to fixing only.

## Why now — the need is old, the balances moved (rixo)

Not "agents need maps more than humans did": proto-forms of this arch,
increasingly precise, appear in rixo's projects as far as 5–6 years back — the
need is the same in nature, and precise arch + navigation tooling would have
been loved pre-AI. What changed is the economics, two pillars:

1. **Review attention economics** — the founding obsession. A problem you have
   when code is raining, not when distilling each byte with a physical keyboard.
   Production cost collapsed; reviewer attention is the scarce resource, and the
   arch + sdd exist to spend it well.
2. **The agent locality problem** — newly named in deblob context: agents have a
   hard time seeing the big picture and compensate by redrawing it from scratch,
   per session — duplication, reinvention, globally costly. The certified
   skeleton is the direct countermeasure, via two properties:
   - Fractality makes the big picture **derivable, not memorized** — same roles
     at every zoom level, so structure compresses to grammar (in weights, via
     cards) + names + blob map. Nothing to redraw.
   - DAG + import-invisibility make "zoom level k" **well-defined and
     sufficient**: to work on service X, load X plus the surfaces (model, ports)
     of its downward closure — rules 6/7 certify implementations invisible to
     consumers, rule 15 certifies contract = behavior spec. Small picture,
     guaranteed not to lie; the guarantee is the whole game — a small picture
     that might lie forces the redraw anyway.

Possibly related, unresolved (observation, rixo): agents are also lacunary in
system thinking — instant gratification, solve the case, rarely go after the
rule that solves all the cases. Analysis sketch (Fable): locality in three
dimensions — spatial (the population of cases isn't in the window; the
generalization target is invisible), temporal (the rule's payoff lands outside
the episode; reward is per-episode), verificational (the case verifies
in-episode, the rule's value doesn't; case-chasing is rational under
episode-scoped verification) — plus probably some training gradient. Note: the
program already fights this on the methodology front without naming the enemy —
sdd's "spec the operation, not the cases" + tripwire tests make the rule the
deliverable and the unseen case verifiable now; the arch is the structural front
of the same war.

## First surface candidate: `deblob graph` (rixo, at closing — ruled at graduation, not here)

The redraw-killer query as a command — where the difference is made for cheap,
building on the existing defensive material:

```
deblob graph               # whole skeleton, service granularity (root zoom)
deblob graph X             # subgraph anchored at service X (fractal: any depth)
deblob graph X --layer=model,ports --dir=out
                           # "what to read to work on X": downward closure,
                           # surfaces only — the locality countermeasure
deblob graph X --dir=in    # falls out free: impact analysis — who depends on
                           # X, certified complete by the same graph
deblob graph --depth=2     # nesting as the zoom axis — see below
```

**`--depth` — where the containment instinct finally meets its dulcinée** (rixo,
at closing). The containment semantics were ruled out of rule 13 (see
`../arch-pass/research/nesting-packaging.md` §8–9): nesting is filing, not
architecture, and the checker must ignore it. But filing is still _information_
— someone put a service inside a service when it changes nothing in practice;
someone had something to express (purpose, lifecycle, association). The
mechanical tool is beyond _understanding_ it — but not beyond _regurgitating_ it
to someone equipped to make sense of it, saving them the grunt work. So nesting
becomes the collapse/expand hierarchy of the map: at `--depth=k`, services
deeper than k collapse into their visible ancestor, and edges into a collapsed
child render as edges to that ancestor — which is precisely the contraction
operation the containment proposal wanted, unsound as a rule (it erases real
findings), perfectly sound as a view (views don't enforce). Resolution of the
whole §1–9 argument: the instinct was never wrong as information, only as
enforcement semantics — each axis goes to the tool that can honor it: structure
(the claim) feeds the checker, position (the filing) feeds the viewer. Same
division of labor as the CLI↔agent hop: mechanics regurgitate, judgment
interprets.

**The zooming feature, named** (rixo): zoom = fractality × locality. It (1)
falls out of the no-concession obsession with fractality — same roles at every
level, so every zoom stop reads with the same key — and (2) is the tool you need
when you have a locality problem. Supply and demand meeting in one feature. The
exploration session it enables, as fiction seed (usage-walkthrough genre, per
the README-driven method — this becomes the demo script):

> — wow, where am I? tool: what are the big boxes? — hmm. how do they relate? —
> ok. box A and D, what's in them? — oh? inside A, how do they interact? in D,
> who's reaching for C? — ah? what adapters exist to service this need of D's
> child that reaches C?

A small finite grammar, and suddenly you're not listing files and grepping
keywords — you're navigating actual named bricks with defined roles, with
zooming. Note the composition: each answer scopes the next question; the last
one is a ports×adapters commitment query arrived at naturally, four zooms deep.
The map is a dialogue partner, not a poster.

Cheap is literal: the classified graph, service edges, roles, and layers are all
in memory at every `check` run today — `graph` is a renderer plus a reachability
walk over data already computed. No engine work, no new extraction fact.
Human-readable output first (v0 output spirit); `--json` when the staged JSON
refinement lands. Command name, flag shapes, and defaults are graduation
decisions. Product-name candidate for the navigator as a whole: **archonaute**
(rixo, 2026-07-23, at the sales-speech capture — `../sales-speech/idea.md`).

Further query sketches (illustrative only):

- Portable-knowledge inventory: all model exports — guaranteed pure,
  vendor-free.
- Commitment map: ports × adapters × assembly sites.
- Vendor blast radius: adapters touching dependency X (complete per rule 4).
- Use-case catalog: service files with their declared needs.
- Work partitioning: topo order, bounded contexts, SCC-free guarantees.
- Skeleton view for onboarding — human or agent.

Prioritization principle (from the locality theory): redraw-killers first —
skeleton view, downward-closure surfaces, impact direction; nice-to-haves
(vendor blast radius, catalogs) later.

## Honest ledger (no overselling)

- Guaranteed: role properties (purity, type-onlyness, import-invisibility,
  closure state, DAG) and structure. Not guaranteed: that names tell the truth,
  that code is correct, that the design is good — organs are the user's.
  "Semantic" in shipped wording must always mean "role-typed with enforced
  properties", never "understands meaning".
- Value gated by adoption: a brownfield map is mostly grey blob mass. Flywheel,
  not flaw — the map makes unlabeled mass visible, labeling grows the
  trustworthy region, blob % already sells the motion. But day-1 brownfield
  discovery value is thin; don't pitch it as magic on first contact.
- ~60% of the substrate is already on the board: staged JSON/SARIF output,
  `deblob status` (rich inventory), the parked CLI↔agent hop (deterministic
  grunt work + structured storage in the tool, classification in the agent —
  which is exactly "no intelligence needed, but for the query"). The new part is
  the reframe: the enforcement tool's exhaust is a certified architecture
  database, and the linter may end up the lesser half of the product.

## Relations

- Blocked: mechanical base first (v0 check surface just completed; JSON
  refinement and `deblob status` are the natural substrate steps).
- Feeds/absorbs: `deblob status` future hop; possibly a `deblob map`/query
  family — ruled at graduation, not here.
- Kin: `../arch-pass/research/nesting-packaging.md` §15 (rule 13's raison d'être
  — the skeleton guarantee this idea leverages).
