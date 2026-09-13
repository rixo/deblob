# Terrain — the lib got layered, the use cases did not

Digest of a field note received 2026-09-11 from the partner monorepo's CLI, the
second external dogfood target, nine deblob steps in, every rule green.
Identifying detail stripped, the shape of the evidence kept; the original is not
in the repo. This is the note's reading, banked as received — the chapter's own
take is in [PLAN § The laundering pattern](../PLAN.md#the-laundering-pattern).

## The finding in one sentence

The placement rules were satisfied by naming each **pipeline stage** a hexagon;
the **use cases** — the things a user actually triggers — were never given a
service, so they live in the driver, the one file the rules do not grade.

## Evidence

A dozen user-facing verbs, held against the service use case that owns each:

- Three verb families converged: verb names match use-case names one to one. One
  of them leaked a `listChildren` onto its API so the driver could compute hints
  — a use case poking through.
- The biggest verb has no home: the driver composes five services to fulfil it.
  The nearest service function is named after its output format
  (`getMarkdownSpec`) — a stage, not a request.
- Two verbs are driver-only loops over services.
- One verb carries two domain rules and its file reads in the driver, untested.
- One is half a use case: the service lists, the driver writes.

Driver by line span (~1700 lines): about a third is decision or computation a
service could own and a test could pin; two thirds is registration, option
tables, printing, help text. The laundered part is not spread evenly: almost
every laundered span is **a use case with no service**.

**The tell is in the test titles.** The one converged service has tests that
read as behavior a reviewer can judge:

> cache behind the file → throws stale-source, nothing written

The stage services have tests that can only be phrased in terms of neighbouring
stages:

> no deps → no resolver reaches the port
>
> format X dispatches to the X facade
>
> X options forward to the X channel

Every title is honest. The unit under test is plumbing, so the contract is
plumbing. The test-gate reading ("do the tests read as behavior?") fires here —
but only if the reader already suspects the cut, since each test in isolation is
legible and green.

**The doc drifted the same way.** The service README documents five use cases on
one service; the code ships two. The README described use cases, the
implementation shipped stages, the spec gate reviewed the README.

## Why the method let it through

1. **The positive rule exists but no gate asks it.** architecture.md § Service
   layer says it plainly: "each function on the returned API is a use case … if
   you can't name the use cases, you don't have a service, you have a utility
   bag." The lint grades imports and suffixes; the spec gate reviews Goals + API
   per service. Nothing asks, per user-facing trigger, _which single use case do
   you call?_
2. **The driver's two hats are the cover story.** The guide says driver glue and
   assembly "share the file in simple programs — two hats, same place, fine
   until it grows". Parsing and presenting are legitimate; wiring is legitimate.
   A third hat — _sequencing services to fulfil a verb_ — is sanctioned nowhere,
   but it looks like either of the other two from one line away: a loop over
   services reads as wiring, a branch on a result reads as presentation.
   Assembly's "necessary evil" label gives the agent a place where dirt is
   expected, so dirt accumulates there without a check.
3. **Agents optimize for the bar.** Once "predictable structure and layers"
   becomes the graded thing, the grade is the goal. The _why_ (a service exists
   because its use cases exist) has no rule number, so it has no weight. This is
   the case-vs-class miss the SDD names: each stage was placed correctly (case);
   the class — "a verb needs one owner" — was never asked.

## What would have caught it, cheaply

Two questions, one per gate. Both are answerable from a table, no reading of
implementation.

- **Spec gate — trigger → use-case table.** Every spec that adds or changes a
  user-facing trigger (a CLI verb, a plugin hook, an HTTP route) carries a
  two-column table: _trigger → the one service use case it calls_. A trigger
  that lists two use cases, or a driver function, has found a missing service.
  The table is the API section's index, not a new section.
- **Test gate — verb-shaped titles.** For each trigger in that table, the owning
  use case's test titles must be readable by someone who knows the domain and
  not the code. "dispatches to the facade" fails the reading; "same source,
  record missing → throws not-found, nothing written" passes. This is already
  `testing-reviewer`; the addition is to _anchor it to the trigger table_ so the
  reviewer knows which suite to open.

One structural corollary worth a line in the guide: **the driver may sequence
nothing.** A verb handler is `parse → one use-case call → present`. Two service
calls in one handler is the smell, however small each call is.

## Self-review prompts for a spec draft

- List the triggers. For each, name the use case. Any blank cell?
- For each `.service.ts` in the API section: read the exported function names
  aloud as verbs a user would say. `getMarkdownSpec`, `render`, `check` are
  outputs and stages, not things a user asks for.
- Open the driver diff. Is there a loop or a branch over a service result that
  is not about printing or exit codes?
- Does any service export something only the driver consumes to _finish_ a use
  case? That export is the missing use case poking through.

## Scope note

Nothing here contradicts the negative rules; they held. It is the positive half
— services map to tangible reality for the problem domain — that has no
enforcement and decayed under an agent that was, correctly, satisfying the
enforced half.
