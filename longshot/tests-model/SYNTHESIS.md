# Atom hunt — synthesis of the three scored reports

Run `wf_d102f244-049`, 2026-10-01: 24 Sonnets decomposed longshot's canon on
their own (8 rules-first, 8 whys-first, 8 kinds-first), then three Opus scored
the quorum separately. All 27 agents returned. The reports are
[atoms-report-1.md](atoms-report-1.md), [atoms-report-2.md](atoms-report-2.md),
[atoms-report-3.md](atoms-report-3.md); the raw decompositions are in
[atoms-decompositions.json](atoms-decompositions.json). Line numbers below are
canon's (`docs/architecture.md`). This page is the agent's reading of the three
reports, written for rixo. Nothing in it is ruled.

## How much to trust it

All three scorers say the same thing about the counts. The 24 runs share one
model, one prompt and one canon, so they are not 24 independent confirmations.
The effective sample is somewhere between 3 and 4. When every run finds an atom,
that means canon states it clearly enough for this model to read it every time.
It does not mean the cut is right. The useful signal is where the runs split,
and what a scorer found that no run, or only a few runs, saw.

Three answers were primed by the prompt (it carried our words: "except",
"laundering venue", "no can't be the answer"). These are: all 24 say the
no-branch rule reaches helpers, all 24 give the test a no-branch rule, and all
24 describe the test as a selection of atoms instead of exceptions. Treat these
as our own position read back, not as evidence.

## What all three reports agree on

**The import half of canon is already atomic.** The rules about who may import
what (inward imports, no concrete import, blob quarantine, private seal, the
cycles, layer in path, ports) come out as one atom each, in every run.

**The molecules are the rules of the outside kinds.** `assembly-builds-only`
holds 6 to 12 atoms, `hook-one-call` 3 to 9, `stable-root` 3 or 4,
`boot-one-call` 3 to 5. Canon itself proves `stable-root` is a molecule: the
config switch `mutableModuleState` lifts one of its parts and nothing else
(1107-1110).

**Four slugs have no atom of their own.** `chain-purity` is the edge atoms
applied along the import chain. `runtime-import` and `public-unit` are scope
settings of the composition atom. `driver-calls-services` is the union of other
atoms (16 of 24). And `service-assembly-only` and `adapter-assembly-only` are
one atom.

**About 38 atoms are stable** (found in two thirds of the runs or more), most of
them in all 24. The list is in each report's section 1; the three lists match
closely.

## The death seeds — parts that sit in two bundles and block

All three reports find the same ones. In order of how clearly they block:

1. **`hook-one-call` applied to test bodies.** A test needs one part of this
   rule, "unconditional", and must break the others: an assertion reads the
   value, and the test builds its inputs. Canon exempts tests in two different
   wordings: "the test tech exempts the count" (1057) and "the hook count and
   services-only do not apply" (1016-1017). Read one way, an asserting test is
   red. Read the other way, the no-branch part is lost too. The text supports
   both readings, and that is the defect.

2. **"Assembly and driver in one" gives a test six parts twice, with opposite
   settings.** Report 2 lays it out as a table: what a file may define, what it
   may call, whether it may read a field of an argument, what it may do with a
   result, branches, root calls. Assembly and driver set each of these
   differently, so a file that is both gets each part twice and incompatibly.
   Canon's exemption list is the trace of dropping each part for tests. What a
   test needs is a third setting on most rows. Canon has its own law against
   this kind of file: "the widest import rights carry the narrowest verb lists"
   (234-236), and a combination the rules forbid "splits into units instead"
   (232-234). The test kind takes the widest import rights and no verb list at
   all.

3. **What a file may define (`closed-definitions`) is the keystone.** It is
   bundled into three rules (assembly, driver, boot), and the test gets "defines
   anything". That is exactly where a loop hides in a helper. A no-branch rule
   scoped to a test body is only as strong as the test kind's list of what it
   may define. So the helper question becomes: does the test kind carry a closed
   definition list? Report 2 adds a wording problem it checked in the code:
   canon counts local variables as definitions (443-446), and the shipped CLI
   binds locals inside `main()` (`cli.driver.ts:13-14`) and inside an assembly
   function (`cli.assembly.ts:26`). Read literally, the CLI is red. The atom
   needs a stated depth.

4. **The test's assembly half has no legal place to sit.** Building a unit at
   the file's root is red (a root binding that is not provably immutable), and
   it contradicts "each test assembles its own instance" (1196-1198). Building
   it inside a test is an assembly call inside a hook, which is wiring in a
   hook. Reports 1 and 3 both reach this. They add that `describe` and
   `beforeEach` callbacks are hooks too under the stock cut (558-560), so a spec
   file has no setup region outside its hooks.

5. **The importer lists leave out the test.** Only drivers and assemblies may
   import an assembly (482-485), but a shared test factory is an assembly
   function whose only caller is a test (1214-1217). Only a boot or a driver may
   import a driver (640-641), but a spec calls a shared
   `registerMatchers(expect)` (634, 1020-1021). By the text, both specs are red.
   The fix is to name the test as a member of those lists, not to exempt it.

6. **`stable-root`'s exemptions live in three or four places:** the closed list
   in the rule (1125-1128), the reader declaring a call effect-free (1114-1116),
   the reader's "exemption with its reason" (559-562), and the parenthesis in
   `test-is-outside` (1014-1015). For the boot, most runs (18) replace the
   exemption with the boot's own atom ("its root is one call to its driver").
   For the test, the runs split evenly: its own registration atom (11) or a
   reader declaration (9 or 10). Report 1 argues for the test's own atom:
   registration changes the runner's state, so calling it "effect-free" bends
   the rule's why.

7. **Whether type imports count is stated with opposite values in different
   places.** "A driver or an assembly may type-import from any layer" (881-883)
   is contradicted by blob quarantine "type-only imports included" (959-961) and
   by "nothing imports a boot, type included". Concrete case:
   `import type { Legacy } from './legacy'` in a driver is green by one line and
   red by the other.

8. **The same shape outside tests: a unit's factory composing its private
   parts.** Canon says a service or adapter factory "doubles as the composition
   root for its internal hexagons" (159-167), and composition inside `private/`
   is unrestricted (978-981). That is assembly work in a file no assembly atom
   reaches: a file that is two kinds, with one kind's rights and neither kind's
   verb list. 11 or 12 runs found it on their own.

Two overlaps duplicate without blocking: ambient access and the root machine
read report `export const PORT = process.env.PORT` in a model twice (the two
must stay separate atoms, because adapters carry only the root half), and the
same argument list appears in six places with different read rights.

## The common root (reports 1 and 2, independently)

Report 1: the verb atoms (build, link, register, start) are attached to file
kinds, but those roles happen in files of other kinds. When a role lands in a
foreign kind, canon either writes an exception (test, boot, test factory) or
writes nothing (the unit factory composing its private graph). Seven runs
already scope their atoms by role and treat a kind as a set of roles. The
proposal that follows: atoms have roles as their subjects (root, hook, wiring
function, assembly function, test body), and a kind is a set of roles.

Report 2: every contradiction the runs found sits on a positive clause ("lateral
OK", "imports anything", "defines anything", "defaults right here", "adapters
when the caller is a test", "private composition unrestricted", "type imports
free"), although canon says its hard rules are negative and don't conflict
(850-853). A test for every line of canon: a positive clause is either the scope
setting of one atom, or the trace of a bundle.

These two are the same finding seen from two sides, and it is the finding rixo
named last night.

## The test kind, as the runs select it

Carried: a reader bound to it, nothing imports it, root bindings provably
immutable, no stored machine read at root (21 or 22 of 24), no branch in a test
body (all 24, but primed and only implied by canon), the private seal (18 to
21), the cycles. Not carried: every hook atom, the concrete-import ban, the
inward order, no default dependencies.

This matches what was held last night, with one difference to put to rixo: most
runs keep "no stored machine read at root" on tests. Last night's option b freed
load-time reads in a test file (fixture paths, `package.json` read once), on the
ground that this rule's why is about importers and nothing imports a test. Two
runs said exactly that and left it open. The rest carried it without arguing.

## The helper question

Everyone says the rule must reach helpers (primed). The useful split is how: 12
runs judge every function the test file defines, 9 judge what is reachable from
a test body. The scorers favour "every function defined", because a call-graph
walk misses callbacks, aliases and functions passed as values, and an inline
fake never called from a body would go unjudged. A local loop no test reaches is
dead code, so the stricter scope costs nothing.

The strongest structure in the sample, as all three scorers assemble it:

1. The test kind gets its own closed list of what it may define: tests and
   hooks, straight-line local functions, provably immutable data, and maybe a
   local test factory that carries the assembly atoms.
2. No branch or loop in any function the test file defines. Loops written as
   calls count as loops: `.map`, `.forEach`, `.reduce` with callbacks,
   recursion. Loops or `test.each` tables around registrations need a ruling of
   their own.
3. The way out is always placement, never an exemption: a helper that needs a
   loop leaves the file and becomes what it is — a fake becomes an adapter, a
   builder a model, a factory an assembly function, a matcher a driver. This
   extends canon's "shared test code is placed by what it is" (1017-1021) to
   local code.
4. Close the door left open: a blob file imported only by tests should be red
   (canon already says no shared test code is blob, 1218-1219, but nothing
   checks it).
5. Stays judgment, to be confessed: a loop inside a legitimate model data
   builder, and a shared "step" that fires a unit and returns its value, which
   fits no kind today.

A general statement of the problem, from one run (rules-5): when an atom is
scoped to a position inside a kind, and the kind lets code be defined outside
that position and called from it, then either the atom follows the call or the
kind's definition space is closed. Drivers are safe because their definitions
are closed. Tests are not. Unit factories are not either (seed 8).

## Found in the code, not in canon

Report 2 checked: the shipped root driver imports and calls a model factory,
`createRouter` from `router.model.ts` (`cli.driver.ts:3,14`). Every run's
reading of canon makes that red (a driver calls no model, and a model cannot be
claimed as tech). This touches the C1 ruling (a local router claimed as tech):
either the router file is not a model, or the ruling needs canon to say how a
claimed model reads. Report 2 also notes that canon's CLI example (664-666) lags
the code.

**2026-10-02:** the reports read red because canon's wording was wrong (a line
saying a model cannot be claimed as tech), not because the design was. The first
answer given here (a claim changes no edge, a service facade goes in front) was
tried and REFUTED the same day: a driver may import no project kind at all.
Closed 2026-10-05: the shipped shape (the driver builds the router from a file
its reader lists as tech) is green as built. `README.md` § The router thread.

## What this hands back to rixo, to weigh slowly

1. **The atom criterion.** Split by check, by why, or both? This one choice
   settles about eight contested cuts (for example: is "no branch" one atom with
   two whys, translation for hooks and legibility for tests, or two atoms?).
2. **Atoms by role, kinds as sets of roles?** This is the common root above. It
   reaches tests, the boot, test factories and the unit factory's private
   composition.
3. **The test's registration at root:** its own atom (as the boot has), or the
   reader declaring it.
4. **The test's closed definition list**, and the helper scope (every function
   defined, or what tests reach). Plus a ruling on loops and tables around
   registrations.
5. **The test as a named importer** of assemblies (test factories) and drivers
   (shared matchers).
6. **Type-import scope:** one stated value per atom, and a fix for 881-883.
7. **Does a test carry "no stored machine read at root"?** (Last night's option
   b said no.)
8. Smaller: e2e as its own kind outside the graph (18 or 19 runs flag the
   contradiction between 263 and 1022-1023); how deep "definition" reaches
   (local bindings); whether `driver-calls-services` is retired as a union; the
   double report of ambient access and root machine read; `stable-root` and the
   legacy blob entry canon calls green (654-658, flagged by 21 runs); the
   router-as-model question above.
