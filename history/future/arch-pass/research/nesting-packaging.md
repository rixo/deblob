---
banked: 2026-07-22
---

# Nesting and packaging — patterns, sinks, and why containment doesn't merge

Research note, pre-written docs material — deliberately over-complete; the
sorting-out is the future docs job. Executes the roadmap idea "the packaging
dimension of nesting" (outermost PLAN, Ideas). Source: live design discussion
(rixo + Fable, 2026-07-22, during cli step 10_check-dag). Feeds
`docs/architecture.md` §Nesting and a future patterns document. The negative
proofs (§9) are the part that exists nowhere else — the argument was expensive
to run and the next person will need it, because the intuition it refutes is one
everybody has.

## 1. The intuition this note exists to answer

> "But that's not cross-service — it's in the same directory!"

The whole discussion was an honest, sustained attempt to make that instinct into
a rule — "inside = belongs; if independence is desired, it should be _outside_"
— pushed through several increasingly precise formulations until each collapsed.
The instinct is good. It fails for graph reasons, not taste. Docs should present
the refutation, not just the rule, or every reader re-runs the argument.

Two positions were named early and recur throughout:

- **A. Nested = fully independent**, as if a sibling service, filed inside for
  association. (Current canon.)
- **B. Nested = part of the containing service.** (The instinct.)

Plus a hybrid explored in depth: asymmetric by point of view — child→parent =
inside→outside from the child's pov; parent→child = inside→inside from the
parent's pov. Translated to graph terms this means: erase downward
(ancestor→descendant) service edges, keep upward ones. §8–9 kill it.

## 2. What a directory states, what layer files state

Two independent statements, two mechanisms:

- **Position is the address** — filing. `billing/stripe/` says "stripe exists
  for billing; delete billing, delete stripe." Purpose and lifecycle. It is
  _not_ an access grant in either direction, and not a merger.
- **Layer files are the claim** — packaging. The moment a directory carries
  layer-suffixed files of its own, `markedRootOf` marks it a service root: an
  extraction-independence claim. Nearest-ancestor ownership then splits its
  files from the parent's (parent's own files = subtree minus nested-service
  subtrees), and every edge across that line is a cross-service edge — however
  the directories nest.

Today filing and claiming are **orthogonal axes**: position says nothing,
structure speaks. The containment proposal collapses them into one axis
(position = claim); §8 prices that.

Mechanics pins (stock flavor, `ts-suffixes-factories-flavor.adapter.ts`):

- Grouping dirs (`model`, `ports`, `service`, `adapters`, `private`) collapse
  when directly above the file — they never root. `parent/adapters/x.adapter.ts`
  roots at `parent`.
- A non-grouping dir with layer files roots itself at any depth:
  `parent/adapters/manifest/manifest.adapter.ts` roots at
  `parent/adapters/manifest` — a nested service under `adapters/` is _already_
  its own node today.
- A service-shaped dir under `parent/private/` also still roots itself
  (`private` collapses only as immediate grouping dir). All its files are
  `isPrivate`, but it is a distinct DAG node. See §11 for the open question.
- A dir with **no** layer files anywhere in its own right (e.g. `user/` holding
  only child service dirs) is never a root — plain namespace folder. A loose
  blob file dropped directly in it attributes to nothing (unowned).

## 3. Division of labor between the rules

Protection scales with the claim made. Three rules partition the territory:

- **Rule 8 (layer matrix)** guards the _behavior seam_, everywhere,
  boundary-blind. `service → adapters` at runtime is forbidden even
  intra-service (`layers.model.ts` matrix; the cell cites rule 1). Type imports
  into `service`/`adapters` targets are exempt (`TYPE_EXEMPT_TARGETS` — an
  adapter's exported type is a contract shape). `service → service` is rule 6
  everywhere — including across services; only assembly imports service modules.
  Runtime into ports is rule 10 everywhere — ports are types.
- **Rule 13 (service DAG)** guards the _package boundary_ — where one was
  declared. Counts **every import kind** (type edges included: `import type`
  from B means A cannot build without B's sources — extraction independence
  holds for types). One finding per SCC, witness cycle carried.
- **Rule 14 (runtime module cycles)** is a separate guarantee (ESM hazard,
  runtime edges only), untouched by everything in this note.

### The flat-adapter protection inventory (what rule 8 does and doesn't cover)

For `billing/adapters/stripe.adapter.ts` (flat file, billing-owned):

- `billing.service → stripe.adapter` **runtime**: rule 8 fires. Protected.
- Same, **type-only**: legal — deliberate exemption.
- Wire shapes grown into a sibling `billing/adapters/stripe-wire.model.ts`:
  suffix makes it layer _model_, `adapters/` collapses → it is simply a billing
  model file. `billing.service →` it at runtime: green. Full reach-in, nothing
  fires.
- Hide the shapes under `billing/private/`: rule 9 grants _service_ access to
  own private too. Still green.

So intra-service, swappability protection = exactly one seam: runtime import of
the `.adapter.ts` file itself. "An adapter's own model" does not exist as a
concept inside a service — a model file is service-wide vocabulary wherever it
sits.

**Why that's proportionate, not a hole:** the flat adapter made no package
claim. Billing knowing its own shapes is self-knowledge; the leak's blast radius
is one dir, one commit, when stripe→paypal day comes. The dir adapter
`billing/stripe/` made the claim — own root — so the tool defends the whole
boundary, model included, because the blast radius would be cross-package.
Nesting an adapter into its own dir when its internals grow is _how you buy_ the
extra protection. Rule 8 guards the behavior seam everywhere; rule 13 guards the
package boundary where one was declared. The two-rule split tracks blast radius.

## 4. The canonical trap, and the chain form

Nested-adapter form (canon §Nesting's trap paragraph): adapter type-imports
parent's port (up, as designed); parent `.service.ts` runtime-imports the
adapter's model. Matrix-legal on both edges; rule-13 cycle.

Chain form — worth docs space because there is **no file cycle anywhere**:

```
user/user.service.ts  →  user/id/id.model.ts     (service→model: legal)
user/id/id.model.ts   →  user/user.model.ts      (model→model: legal)
```

It's a chain (`user.model` imports nothing of `id`), rule 14 silent, every edge
rule-8 green. Contraction: `user → id` and `id → user` — 2-node service cycle,
rule 13 fires. And should: extract `id` alone — needs `user.model`; extract
`user` without `id` — `user.service` needs it. The "shared vocabulary" is one
vocabulary smeared across two dirs that each claim independence. Two dirs, one
knot.

The repair options for exactly this shape (pick a direction):

- **Down**: `user.model → id.model`; whatever `id` needed from `user.model`
  moves _into_ `id` (or a kernel). Aggregate-down (§5, pattern 4).
- **Up**: `id.model → user.model` stays; then `user.service` may not touch
  `id/**` — parent = pure vocabulary, composition external.
- **Kernel**: both point at `user/kernel/`; `user.service` points down freely.

## 5. Legal patterns, progressively

(`→` runtime, `⇢` type-only. All green under all rules. Each step adds exactly
one decision: adapter direction (2), namespace vs node (3), facade direction
(4), vocabulary home (5), family boundary (6).)

### Pattern 1 — flat service (baseline)

```
src/billing/
  billing.model.ts               Invoice, computeTotal()
  ports/clock.port.ts            Clock interface
  billing.service.ts             use cases
  adapters/system-clock.adapter.ts
  billing.service.spec.ts        assembly
```

`service → model`, `service ⇢ ports`, `adapter → model`, `adapter ⇢ ports`,
`spec → service, adapter` (assembly wires, same service). One node; the matrix
does all the work.

### Pattern 2 — nested dir adapter (child points up)

```
src/billing/
  billing.model.ts   ports/payment.port.ts   billing.service.ts
  stripe/
    stripe.model.ts            wire shapes + mapping logic
    stripe.adapter.ts
```

`stripe.adapter ⇢ billing/ports/payment.port`; `stripe.adapter → billing.model`
(maps wire → vocab); `stripe.adapter → stripe.model`. `billing/** → stripe/**`:
**nothing**. One service edge, stripe→billing. Wiring: `main.ts` (unowned) or
specs via test-purpose fixture adapters (rule 16) — never billing's own files
importing stripe.

### Pattern 3 — namespace folder (no parent node)

```
src/user/                        ← zero layer files: plain folder
  identity/  identity.model.ts (owns UserId), identity.service.ts, ports/
  account/   account.model.ts → identity.model
  auth/      auth.model.ts → identity.model
```

Three sibling services filed together; only sibling rules apply. `identity` is
the natural vocabulary owner; edges one-way at it. No facade; consumers import
each child directly. Cheapest option; promote `user/` to a service only when it
earns own files — that moment forces the direction choice, loudly.

### Pattern 4 — facade parent, aggregate-down (no shared sibling vocab)

```
src/user/
  user.model.ts                  User aggregate + composed pure logic
  ports/directory.port.ts        user's needs
  user.service.ts                effectful use cases
  identity/ account/ auth/       full services, import NOTHING from user
```

`user.model → identity.model, account.model` — runtime, composing types _and_
pure functions (model is not anemic):

```ts
import { identityVerified } from "./identity/identity.model.ts"
import { isLocked } from "./account/account.model.ts"

export const canLogin = (u: User) =>
  identityVerified(u.identity) && !isLocked(u.account)
```

`user/ports/*.port ⇢` children's models (a port may speak child vocab —
ports→model is boundary-blind legal). `user.service → user.model`,
`⇢ user/ports`. `main.ts` wires children's use cases into user's port slots. All
edges down; children never point up; children stay extractable.

Composition, not re-export — thin `export { x } from` barreling is what the
barrels check kills; a composed function earns its place.

### Pattern 5 — facade + kernel (siblings share vocab)

```
src/user/
  kernel/kernel.model.ts         UserId brand + parse/equality logic
  identity/  → kernel
  account/   → kernel
  auth/      → kernel, → identity.model
  user.model.ts   → children + kernel
  ports/  user.service.ts
```

Strict layering: `kernel ← children ← facade`. Kernel exists because `UserId`
cannot live in `user.model` (children pointing up + facade pointing down =
cycle). Kernels are not type-alias bags — the logic of the shared types lives
there (parse, validate, equality).

### Pattern 6 — full slice (cross-family consumption + wiring + hiding)

```
src/
  main.ts                        unowned composition root
  orders/
    orders.model.ts → user/user.model.ts         (Customer facet from User vocab)
    ports/customer.port.ts ⇢ user/user.model.ts
    orders.service.ts
    stripe/ …                    orders' own nested adapter (pattern 2)
  user/                          (pattern 5)
```

Cross-family vocab: one direction, no back edge. Cross-family _behavior_:
`main.ts` builds user's use cases (injecting its children), then passes
`getUser` (or an inline wrap) into orders' `customer.port` slot. No adapter may
import a service (rule 6), so service-to-service plumbing is assembly's job —
main's, not an adapter's.

Hiding variant: move `identity/ account/ auth/ kernel/` under `user/private/` —
same internal edges, private check blocks outside reach-in, rule 9 grants
`user.service` access. Only `user.model` surface remains public. Usual
`private/` discipline cost.

## 6. Facades split by effect

Rule 6 makes every service module import-invisible: `service→service`,
`adapters→service`, `blob→service` all forbidden; only assembly imports
services. Consequences:

- **Effectful facade is free.** The rest of the app never sees children's
  services _by construction_: use cases travel by injection, wired at the
  composition root. Operational hiding needs zero structure.
- **The pure surface is the model** — vocabulary _and_ pure domain logic. The
  seals (6, 10, 7/8) make model the entire importable runtime surface of a
  service family. "What the rest of the app sees" = model layer, full stop.
- Public-by-default means outsiders may also import a child's model directly
  (pattern 3/4) — that's not a leak unless you've chosen `private/` hiding.

## 7. The sink invariant

All sound vocabulary-sharing shapes are one shape:

> Shared vocabulary lives in a node that is a dependency **sink** relative to
> every sharer, reached by real, counted edges.

Three spellings — kernel is a _role_, not necessarily a dir:

1. **Dedicated kernel child** — `user/kernel/`, everybody points at it. The
   general case, the fallback name.
2. **Natural owner child** — `identity` owns `UserId`; siblings and parent point
   at it. Same geometry, no extra dir, when one child is the obvious home.
3. **Parent as pure vocabulary** — children point up at `user.model`, legal
   _iff_ the parent never points down: no facade role, composition external. The
   kernel promoted into the parent slot.

A model-less root (namespace folder) is the same fact from the other side: the
root isn't a node, sharers are siblings, the sink must be one of them.

Exactly one forbidden shape: **the same node as facade (points down) and
vocabulary (pointed at)**. One node cannot be both sink and source over the same
family. Rule 13 is the enforcement of that sentence.

A sink may depend outward-below (another family's model, pure libs, declared
builtins) — it must be a sink relative to its _sharers_, not globally
dependency-free. In practice kernels stay near-leaf anyway; that's hygiene, not
law.

## 8. The containment proposal, priced

The precise rule considered: in rule 13's service graph, erase edge A→B iff B's
root is a strict descendant of A's root; keep the reverse. Well-defined at any
depth (path-prefix predicate). Framed eventually as a _flavor_ decision: what is
the packaging unit — the containing unit, or any layered dir. The trade-off as
stated: model sharing maps to visible physical location (primitives: sibling /
contains) vs extraction-independence enforced by the arch. The frequency
economics (sharing vocabulary is daily; splitting a package is rare) genuinely
favor contains as a default.

**What it buys:**

- Kernel ceremony gone _within families_: parent model becomes the natural
  family kernel — up edges can never cycle with ancestors, so `UserId` in
  `user.model`, children up, facade down, all green.
- Containment intuition matches the tool; nesting gains real semantics.
- A still-coherent uniform claim survives: "a service is independent of
  everything except its ancestor chain" — at top level, no ancestors, full
  independence. One sentence, depth-parameterized.
- Precedent legitimacy: npm/cargo/go workspaces are flat package lists with
  association by name — the "exile to state independence" world exists and
  works.

**What it costs (before the fatal proofs):**

1. **The trap is legalized** — and the trap's graph shape is _identical_ to the
   legitimate vocab case (down edge to child model + up edge from child): the
   graph cannot tell "shared vocabulary" from "parent gutting its adapter"
   without role knowledge. Re-forbidding needs a bespoke role-aware axiom — the
   direction law demoted from theorem to hand-written rule. (Refined in
   discussion: it wouldn't make dir adapters worse than flat — it collapses them
   _to_ flat-level protection, runtime-into-adapter-file only. Uniform,
   arguably. But then the stronger claim becomes unmakeable — see cost 4.)
2. **Misplaced-wiring catch gone**: parent spec → real nested adapter is a down
   edge, erased, green. Rule 16's fixture discipline loses enforcement.
3. **Per-node certification weakens**: green no longer means _this dir_ lifts
   out; only subtree-with-ancestors lifts. A reader can't tell whether `user/id`
   is independent without reading imports.
4. **Nesting-as-filing dies** (the deep cost): one axis, two candidate meanings
   — today position = filing and structure = claim, orthogonal
   (`icons/manifest/` is independent AND filed by association). The proposal
   spends position on claiming; independence then requires physical exile, trees
   flatten, association is recovered by naming conventions. §Nesting's "filing,
   not architecture" line — current canon's load-bearing sentence — dies.
5. **Silent merge footgun**: today, entangling with a nested child fires loudly.
   Under the rule: silence. Nesting an adapter by discoverability instinct —
   current canon's own habit — loses swappability protection with no signal at
   the moment it happens.
6. Slope pressure (killed by an explicit firewall in discussion): belonging
   grants DAG freedom, **not** privacy penetration — `user → user/id/private`
   stays illegal; rule 9/private key on attribution, untouched by 13's edge
   construction. The public/private axis is orthogonal to the packaging axis.

Unaffected either way: rule 14; rule 9/private; both real dogfood catches
(`cli⇄explain`, `config⇄extraction` — sibling cycles).

### The fork inside "contains"

"Package = contains" underdetermines siblings inside a family:

- **Contains-flat**: nested roots dissolve entirely into the outermost
  containing root. Sibling entanglement inside a family free. Pure attribution
  change, flavor-only, current interfaces.
- **Contains-structured**: family internally sibling-DAG'd; only ancestor-chain
  edges free. Needs the descendant predicate inside `checkDag` + a semantics
  selector traveling through the flavor contract — engine surface growth.

Both die. §9.

## 9. Why "inside = belongs" cannot be made sound — the proofs

### 9a. Contains-flat dies by fractality (super-root collapse)

Flat's dissolve rule is "a root inside another root is absorbed by it." Applied
fractally, absorption cascades to the _outermost_ root. Today `src/` carries no
layer file, so top-level services are maximal roots and flat looks stable — but
one stray `src/app.model.ts` marks `src` itself a root, every service becomes
its descendant, everything dissolves into one package, and rule 13 goes silent
**repo-wide**. One file, no finding, entire check disabled. Enforcement
conditional on an absence; the rule's meaning depends on absolute position (top
vs nested) — precisely what "learn once, applies at every level" forbids.
Anti-fractal by construction.

### 9b. Contains-structured dies by ancestor-hub laundering

The free ancestor edges are a transit channel that launders sibling cycles:

```
auth/x.service  →  id/id.model        direct sibling edge — counted
id/id.model     →  user/user.model    up, ancestor — free
user/user.model →  auth/auth.model    down, descendant — free
```

Real service-level knot `auth → id → user → auth` — a true 3-cycle, none of the
three can be carved out. Current dir-semantics: fires (3-node SCC, exactly what
step 10 builds). Contains-structured: two legs erased, only `auth → id` remains
— **silent**. Any parent-owned file bridges siblings invisibly. The
stray-`src`-root scenario is the same hole at repo scale: root-owned files roam
free both directions, everything launders through them.

Worse, the hole sits on the **hottest path by design**: the entire buy of
contains was "vocabulary in the parent, everyone points at it" — parent model
files become the universal transit hub, exactly where sibling cycles will hide.
Compare the ruled rule-13 non-goal (cycles through _unowned_ transit invisible):
that hole is narrow and self-healing — each newly-carved service turns transit
into real edges. This one is central and **anti-healing** — adoption of the
pattern grows it.

Read honestly, direct-edges contains-structured is also _empty_: each child may
depend on ancestor files which depend on other children, so nothing inside the
family is independently extractable anyway — its internal sibling DAG certifies
nothing. It degenerates to contains-flat plus a lint, and contains-flat is
already dead.

### 9c. Transit-aware repair re-derives the kernel

Make ancestor files transparent conduits (sibling edge id→auth iff reachable
through ancestor-owned files): sound again — but now truthful about the pattern
it was meant to enable. If `user.model` aggregates children (`→ id.model`,
`→ auth.model`) and children point up at it, every child **really does** depend
on every sibling — type-checking `id` requires `auth`'s sources through the
aggregate. Complete graph, cycles everywhere, correctly reported. Avoiding it
requires splitting the parent's own files: a vocabulary file that imports no
children (`user/model/ids.model.ts`) for the children to point at, separate from
the aggregating `user.model.ts`.

That file is a sink. **The kernel re-emerged at file granularity the moment the
check became honest. The kernel was never ceremony — it is the geometry.**
Dependency structure is file-level; directory rules can only make the sink
visible or hide it.

### Conclusion

- Contains-flat: dead by super-root collapse.
- Contains-structured, direct edges: dead by hub laundering (unsound — or, read
  honestly, empty).
- Contains-structured, transit-aware: sound, but converges back to
  sinks-made-explicit ≈ current semantics with extra machinery.

**Dir-semantics (any layered dir = full package) plus explicit sinks is the
unique sound point in this design space.** The stock flavor keeps it; step 10
stands as specced, trap red and all. Had it right all along — what the argument
bought is the proof that the alternatives fail, not a change.

## 10. What the authorities say — and where we extend them

Rule 13's lineage is Martin's **ADP** ("allow no cycles in the component
dependency graph"), from the component principles (_Agile Software Development_
/ _Clean Architecture_; arch doc cites Martin for the inward rule). Honest
accounting: his bundled definitions lean _toward_ containment economics —

- **REP**: "the granule of reuse is the granule of release." A component is a
  releasable unit; a never-released nested dir makes no reuse claim → not a
  component → no ADP edge.
- **CCP**: things that change together belong together — the daily vocab-sharing
  case is change-together by definition.
- His components **don't nest** (jars, gems, DLLs — flat), and component
  structure "evolves, splitting under reuse pressure" — default merge, promote
  on demand: the frequency argument nearly verbatim.
- Swappability he'd assign to **DIP** at the interface — rules 8/10 territory,
  not packaging.

**Lakos** (_Large-Scale C++_, levelization) is the physical-design canon and
settles the internal-structure question: a containment hierarchy (package groups
⊃ packages ⊃ components) with acyclicity enforced **among siblings at every
tier** — contains-structured, morally.

The reconciliation with §9: in both worlds, **a package has no files of its
own** — a Lakos package _is_ its members; Martin's component is a flat release
unit. The ancestor-freedom problem cannot arise there. Deblob's
parent-with-own-layers is our extension, and it is exactly the feature that
makes containment semantics unsound as a checkable rule. The economics point to
contains; the graph, once parents own files, forbids it. The graph wins because
the checker must be sound.

## 11. The honest escape hatch (and one open flavor question)

Wanting true merger — "this child is part of me, free intra-links, no claim" —
remains expressible today by **taking the claim away**: fold the child's files
into the parent's own layers (`user/model/id.model.ts` — grouping dirs attribute
to the parent). One service, one claim, rule 8 governs inside; nothing to
launder because there is no structure left to launder past.

Open (unruled) flavor question, worth an arch-pass look: should a service-shaped
dir under `parent/private/` attribute to the parent — opt-in merger via the
privacy marker — instead of rooting itself as today? That would make containment
**opt-in per child** (B where you mean B, A by default) with zero change to rule
13 itself; merged, the layer matrix still governs inside (the trap edge becomes
intra-service `service→model` — legal, and honestly so: no independence claim
was ever made). Costs to weigh when picked up: rule 9's current mechanics,
whether the merged child's `private/` still means anything, and the silent-merge
footgun in opt-in form.

## 12. Docs wording nits caught along the way

- §Nesting "the parent stays import-blind to its children" reads more absolute
  than the rule: blindness is only _forced_ where the child points up (i.e.
  adapters — scoped there by the direction law's own framing). A component child
  with no back edge may be freely imported by the parent; rule 13 fires on
  cycles, not on direction per se. One word of scoping when the touch lands.
- "Expected direction child→parent" is adapter-scoped, derived from the port
  relation. Generic nesting has no single expected direction — the child's
  _role_ picks: adapter child → edges up, parent blind; component child → edges
  down, child blind. Rule 13 enforces only the invariant common to both: one
  direction per pair.
- The trap deserves both forms in docs: nested-adapter form (canon's paragraph)
  _and_ the chain form (§4 — no file cycle at all), because the chain form is
  the one that defeats the "but there's no cycle!" objection.

## 13. Disposition

- `docs/architecture.md` §Nesting: the sink invariant, three spellings, the
  forbidden shape, the role-picks-direction scoping (§12), and a distilled form
  of the §9 proofs — the containment intuition deserves a stated refutation, not
  a bare rule.
- Future patterns doc (how-to genre, per the pending Diátaxis-audit idea): §5's
  progressive examples, §6's facade split, §4's repair options.
- `history/future/arch-pass/PLAN.md`: private/-merger question (§11) listed.
- Step 10_check-dag stands as specced — trap red, dir-semantics confirmed; this
  note is the _why_ behind its settled proposals, not a change to them.
- Addendum below (same-day continuation): §14's third-fork proof folds into the
  §9 family when docs distill; §15's raison d'être is the missing opening thesis
  of the eventual §Nesting/§acyclic material; §16 became the hard
  rationale-audit item in the arch-pass PLAN.

## 14. Addendum — third fork: forbid parent-owned files (same-day continuation)

Continuation of the same discussion, second session (2026-07-22). §10 observed
that Martin's and Lakos's worlds avoid the ancestor-freedom problem because
their packages own no files. The un-run branch: import that constraint — a dir
either owns layer files (leaf service) or contains services (namespace), never
both. Dies on three counts:

- **"Parent" is not a fixed class.** Any service becomes a parent the moment a
  child nests. The prohibition applies everywhere, dynamically — a rule about
  every dir, triggered by its neighbors.
- **Pattern 2 becomes illegal.** `billing/` owns model + ports + service AND
  contains `stripe/`. Nesting an adapter into its own dir when its internals
  grow — canon's own recommended move — is exactly the forbidden shape.
- **Action at distance, universal ceremony.** The rule fires on the _parent_
  when the _child_ appears: nesting stripe forces exiling billing's own files
  into a pseudo-child (`billing/core/`). Legality of existing files changes
  because a sibling subtree changed — 9a's position-dependence failure again.
  And the exiled core is a dir everyone points at: the kernel re-derived, third
  time in this design space (after §9c), now taxed on _every_ nesting event
  instead of only when vocabulary is shared. Strictly worse than the ceremony it
  was meant to remove.

Sharpens the §10 reconciliation: the authorities' units work because they cannot
nest files-beside-children _at all_ — importing that ban into a fractal
filesystem architecture outlaws canon's own patterns. Not an unexplored branch;
a dead one. Dir-semantics + explicit sinks stays the unique sound point.

## 15. Why rule 13 at all — raison d'être (same-day continuation)

The challenge, run honestly: Martin's ADP governs _release units_ — separate
artifact, version, package manager. The boundary is enforced by physics; the
check rides an enforcement system that already exists. Our services have no
physical wall. So why inflict the rule?

**Because the checker is the missing wall.** Layer files are a claim mechanism
cheaper than a package manager — and cheap claims need a checker or they are
free lies. The rule is opt-in where ADP is not: blob is legal, cycles through
blob are legal; adding layer files makes the claim, rule 13 holds you to the
claim you made. Claim checking, not imposed discipline — the config decision's
own words: tolerant of non-compliant code, intolerant of pretending.

**Value level — refactorability IS evolvability.** First formulation here was
"extraction is rare, so the option's real product is placement discipline" —
wrong picture (rixo, correcting): npm-style lift-out is rare, but _moving code
around a codebase is nothing but rare_. Refactor is TDD's number-one selling
point — red, green, refactor — and the more you can move for cheap, the more
change you can absorb. Rule 13 is what keeps movement cheap at package scale: in
a DAG-clean codebase every move has bounded blast radius; a knot makes every
move inside it touch the whole knot. Canon already states the principle — "the
architecture's whole point — that internals are free to move" (§ internal-seam
testing) and the §Sharing kernel example's closing line "each can be moved
independently" — it just never connects that sentence to rule 13. The
misplacement reading rides on top: both dogfood catches (`ExplainEntry` in the
renderer, `STOCK_FLAVOR_NAME` in config's model) were facts in the wrong home,
cycle as symptom, repair = move the fact to its owner — cheap precisely because
the graph was otherwise clean.

So the formulation (rixo, this discussion): **rule 13 is a forcing function
against misplacement of concerns, observed through dependencies.** "Concern" is
judgment, machine-invisible; edges are the only observable the tool has — the
rule is the projection of "each fact has one home" onto the mechanical plane
(consistent with the no-shaky-heuristics ruling: the tool never guesses
concerns, it checks their dependency shadow).

Bounded claim, per the no-overselling rule: 13 catches only misplacement that
manifests as _mutuality_ — a fact on the wrong side of a drawn line, creating
two-way knowledge. Over-centralization passes green (a god-kernel everyone
points at satisfies the sink invariant); one-way misplacement stays judgment
territory, never mechanical. The unit-dissolving class of misplacement, not
misplacement in general.

Three altitudes, one rule — teaching wants them in this order: **value** (free
movement / misplacement forcing function — names the daily payoff), **contract**
(claim checking — names what the tool enforces), **test** (extractability —
names the observable). Canon currently states only the third — while stating the
value level elsewhere, unconnected (see §16).

## 16. The canon gap — rationale audit (full read, 2026-07-22/23)

What canon invokes for rule 13 (§acyclic): "neither can be extracted, moved, or
reasoned about independently" — the extraction altitude; §15's value level
absent _at the rule_. Martin appears only in the lineage footer, not as
authority — the argument is self-contained, but the framing is inherited whole
from the release-unit world. The missing level only became visible through
dogfood (findings resolving as misplacement repairs) — evidence canon couldn't
have had at writing time. Stopped one "why" short, not skipped.

Full-read sweep (a first one-pass version got two calls wrong — corrected here):

- **The connection gift**: canon already states the value level, elsewhere —
  "the architecture's whole point — that internals are free to move — gets
  neutralised by tests that pin them in place" (§ internal-seam testing), and
  §Sharing's kernel example closes "each can be moved independently." The
  rule-13 touch is therefore a _connection_, not an addition: say at §acyclic
  that this is the whole-point sentence operating at package scale. Zero new
  claims.
- **Rules 2 (barrels) and 12 (private/)**: full argued sections, alternatives
  priced. Proportionate — counter-intuitive house choices need the defense.
  Their length is NOT a bar for the rest; one-line whys are the right size for
  rules whose rationale is uncontroversial (3, 4, 5, 8, 14, 15 fine as they
  stand).
- **Rules 10, 11**: fine, already symptom-framed ("runtime in a port file is a
  sign the adapter hasn't been extracted yet") — §15's style in miniature.
- **Rules 6/7 (composition)**: the one real page defect — circular: services
  "can only be imported by assembly" because they are "composition units — must
  be composed by assembly." The rationale is substantial one section away (§IoC:
  central control, "no single place to see what's wired to what", code
  splitting, testability; rule 4's untestability line) but never attached to the
  rule. Fix = a cross-ref sentence, zero new argument. (On challenge the why
  came instantly — coupling is how blob forms, hardwired bricks untestable,
  entangled defects compound — a transcription gap: the author had it, the page
  skipped attaching it.)
- **Rule 17 (stateless)**: first-pass "thin" call was WRONG — §Test isolation
  carries the why ("isolation is structural — the factory closure guarantees
  it"; independent instances, no shared state). No touch needed.

The two gaps differ in kind: 6/7 = transcription (why internalized, page skipped
the attachment). 13 = derivation (value level short even in discussion until
dogfood supplied evidence) — though even there, canon held the whole-point
sentence and just never wired it to the rule. Disposition: two scoped
connection-touches listed in the arch-pass PLAN — deliberately NOT a doc-wide
"every rule gets a rationale section" mandate; proportion is part of the house
voice, and most rules are already the right size.
