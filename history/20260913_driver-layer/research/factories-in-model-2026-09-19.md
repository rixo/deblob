# Factories in model — audit of a misconception (2026-09-19)

Written mid-step-04, checkpoint 3, before any fix. The red corpus
(`lib/cases/modules.spec.ts`) was under rixo's review when the question came up;
nothing in the tree was touched for this note.

## The question that broke it

```ts
import { createRange, makeRange } from "./another.model.ts"

const r0: Readonly<number[]> = createRange(0, 10)
const r1: Readonly<number[]> = makeRange(0, 10)
```

Same result, same annotation, opposite verdicts — `r0` red as a root factory
call, `r1` green. No argument survives that pair: the verdict comes from a
naming convention no compiler checks, about a property (does this return state?)
the tool cannot see.

The agent defended the rule from canon, which does say all of it. rixo answered
with intent: the rule exists so a module can be imported without anything
happening — no state, no side effect, so the module is testable in its own
respect. Factories are functions; they do nothing unprompted. Root calls are the
lane both problems use to get around the rule, not the crime.

## Where the drift entered

The chapter PLAN's own ruling (2026-09-15, "`stateless-modules` restated") says
it correctly, first sentence:

> The intent is no mutable module state; the second target is no side effect at
> evaluation; root calls are the lane both use to get around the rule, not the
> crime.

The same ruling then lists enforcement in tiers, and the first tier is "a root
call to a factory is red once the flavor identifies factories (step 02)". That
tier is a means. By the time it reached canon it was written as the crime — "a
factory call is what it forbids" — and by the time it reached the reader it had
become a value classifier. Each step was faithful to the one before it, and the
why was left behind at the first.

## What ships today (the blast radius)

`KNOWN_CHECKS` is `dag, layers, private, barrels, ports, surface`. There is no
`modules` check, and none of the assembly, driver or boot checks exist yet. **No
released version enforces factory-ness anywhere.** What did ship:

- the rule text, through canon and `deblob explain stateless-modules` (the slug
  is in `RULE_IDS` with a card mapping, rendering canon's Summary entry);
- the flavor's public name, `ts-suffixes-factories`, which is a config value
  users write.

So this is a docs-and-unlanded-code correction, not a migration. Nothing to
deprecate, no behavior to change under anyone's feet.

## The audit

Verdicts: **predictive** — a verdict drawn from an unenforced name;
**consequence** — restates a rule already stated elsewhere; **overclaim** —
asserts what the tool cannot see; **loose** — the code accepts what canon
refuses; **sound** — traces to a stated benefit.

| Site                                               | What it claims                                                                                                                                                                                | Verdict                                                                                                                                                                                                                 |
| -------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `architecture.md:959-970` — `stateless-modules`    | "legal only when its callee is declared pure and its result immutable"; "a factory call is what it forbids, and the flavor's factory recognition makes that red"                              | overclaim + predictive — the load-bearing rewrite                                                                                                                                                                       |
| `architecture.md:961-962`                          | "a module exports factories, never instances; an instance … reaches its users by argument, never by import"                                                                                   | consequence — an exported instance is root state, already forbidden                                                                                                                                                     |
| `architecture.md:442-447`                          | "A callee from a service, adapter, assembly or blob file is a factory by construction; a call result may only be passed on or returned, never branched on, computed with, or member-accessed" | **sound — and it is the whole assembly rule.** The next sentence ("a model file holds both … so a model call whose result feeds a factory is the one shape the reader lets through") is the epicycle built on top of it |
| `architecture.md:386-395` — `assembly-builds-only` | "every call in an assembly is a factory call: … a model factory's when a dependency-free instance must be shared"                                                                             | predictive (the model clause only); the rest is layer-based and sound                                                                                                                                                   |
| `architecture.md:418-419`                          | "its factories for shared instances … never a function for a computed value (the flavor is what tells a factory from a function)"                                                             | predictive — the parenthesis is the seed of the whole thing                                                                                                                                                             |
| `architecture.md:278-281` — model bullet           | "state lives inside factories, and a module exports factories, never instances"                                                                                                               | consequence, harmless as guidance, cited as a rule                                                                                                                                                                      |
| `architecture.md:282-285`, `:324-325`              | closure-state factories are model when they depend on nothing; deps injected through factory arguments                                                                                        | sound — placement guidance, no verdict rests on it                                                                                                                                                                      |
| PLAN, ruling 2026-09-15                            | intent stated correctly, then "a root call to a factory is red once the flavor identifies factories"                                                                                          | the fork in the road; the ruling's own first sentence is the fix                                                                                                                                                        |
| SPEC 01 § detectors — row 37                       | a model call is legal iff its result feeds a factory argument                                                                                                                                 | the epicycle's first form; collapses into the result-flow rule                                                                                                                                                          |
| SPEC 02 (whole step)                               | "the flavor names factories", the model callee, the instance result                                                                                                                           | the premise itself; frozen, corrected forward                                                                                                                                                                           |
| SPEC 03 § Detectors — `checkModules`               | root call red for "every factory (any layer …), `local` with `factory: true`"                                                                                                                 | predictive; tech / use-case / impure-layer locals in the same list are sound (side effects)                                                                                                                             |
| `flavor.port.ts:43-48`                             | `isFactory?`, "consulted where the file kind does not already decide"                                                                                                                         | predictive — the port method exists only for model and locals                                                                                                                                                           |
| `ts-suffixes-factories-flavor.adapter.ts:115`      | `/^create[A-Z]/`                                                                                                                                                                              | the mechanism; also the flavor's public name                                                                                                                                                                            |
| `reading.model.ts:680-683`, `:972`, `:717-727`     | model import → factory by name; local → `factory: isFactory(name)`; factory result → `instance`, else `computed`                                                                              | predictive — the two consultation sites and what they produce                                                                                                                                                           |
| `graph.model.ts:199-224`                           | `ValueKind.instance` = "a factory result"; `FactoryLayer` includes `model`                                                                                                                    | predictive, in the type system — `instance` is sound where it means "a result the reader must not see through" (assembly, service), contaminated where the flavor's word puts model in the set                          |
| `config.service.ts:113`                            | `mutableModuleState` docstring naming "a root factory call" as another half of the rule                                                                                                       | follows the rewrite                                                                                                                                                                                                     |
| `reading.model.ts:239-244` — `READONLY_TYPE_NAMES` | `Readonly`, `ReadonlyArray`, `ReadonlyMap`, `ReadonlySet` accepted by name at the type's top                                                                                                  | **loose** — `const s: Readonly<Store> = createStore()` passes the readonly half today; a store was never in question                                                                                                    |
| `reading.model.ts:316-323` — freeze                | `Object.freeze(<anything>)` counts as immutable                                                                                                                                               | **loose** — canon says "`Object.freeze` on a literal", and freeze is shallow, so the guarantee only holds over primitives                                                                                               |
| PLAN item "Readonly typing holes" (2026-09-16)     | false reds from unresolved aliases                                                                                                                                                            | sound, and it only looked at the strict side; the loose side above went unnoticed                                                                                                                                       |
| `skills/…/implem/naming.md:12`                     | "Factories: `create<Name><Kind>` — one factory per composition unit"                                                                                                                          | **sound, and it scopes the convention to composition units.** The flavor applied a composition-unit convention to the model layer                                                                                       |
| `skills/…/layer-model.md:23-27`                    | mirrors canon's model bullets                                                                                                                                                                 | follows canon's rewrite; no verdict rests on it                                                                                                                                                                         |
| `lib/cases/modules.spec.ts` (untracked)            | row names: "a factory by name, local or not", "a factory called at root is red"                                                                                                               | the misconception written as teaching prose; re-verdict, names included                                                                                                                                                 |

Two things the audit did **not** find, worth recording as negatives: no other
rule in the new set draws a verdict from a name (driver, boot and assembly rules
are structural or layer-based), and the knowledge cards for the new slugs are
unwritten, so no shipped card teaches it.

## What the correction has to cover

1. **Canon, `stateless-modules`**: state and side effect, with the why said out
   loud (a module can be imported, and tested, without anything happening). Drop
   "declared pure". Factories appear as what is fine, not as what is forbidden.
   The instance sentence becomes a consequence, not a rule.
2. **Canon, assembly**: keep `:442-447`'s first half as the rule — a result is
   passed on or returned, never branched on, computed with, or member-accessed.
   Drop the model-factory clause and row 37's epicycle with it.
3. **Rules**: the root-call half keeps the side-effect callees (tech, use case,
   locals in impure layers) and loses `factory` / `local factory: true`.
   `isFactory` loses its last consumer; `FactoryLayer` loses `model`.
4. **The readonly half takes over the state claim**, and must be worth it:
   accept only syntax that proves no mutable structure (primitives and unions of
   them, `readonly T[]` and `Readonly<{…}>` over proven members; a named type
   reference is unresolvable, therefore unproven), and freeze only over a
   literal. Re-measure deblob's own self-check count after.
5. **Corpus**: re-verdict the 13 rows and rewrite the row names.
6. **`ts-suffixes-factories`** is a published config value whose second half is
   going away — keep, alias or rename, rixo's call.

## Open, for the reassessment

- SDD shape: a corrective step, an amendment to 04, or a revert of 02. Step 02
  also landed things that are right (readonly as a fact, test sites not binding,
  the reading's structure), so a revert costs more than it returns.
- Is rejecting `Readonly<NamedType>` too harsh in practice, with `Object.freeze`
  as the uniform escape? It turns some of deblob's own bindings red again.
- Row 4 of the corpus (the tracked local, `modules.spec.ts:68`) may flip to
  green: it depends on whether an inlined local's binding emits a root
  definition. Unchecked — the file is under review.
