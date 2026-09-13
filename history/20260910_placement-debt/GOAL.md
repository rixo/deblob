# Placement debt — the package stops being a counterexample to its own doc

Opened 2026-09-10 from a service-cutting audit of `packages/deblob` (rixo asked:
the rules pass, but do the cuts make sense?). Every check is green, 0% blob, and
two placement defects hide under the green — the class the checker cannot see by
construction, since a check reads import edges and both defects are about where
knowledge lives, not what imports what.

## The two problems

**1. Shared knowledge is filed under its first consumer, not its owner.**

- The package manifest claim (the exports map plus the `deblob` field) has no
  home. Node's key resolution sits in `extraction`, which builds import graphs
  and has no stake in manifests beyond one adapter. The claim's type and its
  reach half (`resolveSurface`, `tallySurface`) sit in `check/surface.model.ts`,
  so the bare status imports a detector to count a claim it never judges. The
  field is parsed twice: strict in `config/adapters/loader.adapter.ts`, lenient
  in `extraction/adapters/package-meta.adapter.ts`. The visible symptom is the
  edge `config → check`: the loader imports the claim's type from the detector
  that consumes it. Producer imports consumer; the DAG stays acyclic only
  because `check` never needs `config` back.
- The check registry has no home. Which checks exist (`KNOWN_CHECKS`), which
  rules each cites (`CHECK_RULES`), and which function runs each (`DETECTORS`)
  are three tables in `cli` and `main`, one of them pinned to the detectors by a
  spec because nothing else keeps them aligned. `check` owns none of it.

**2. The run has no service.** Load config → scan → read the surface → extract →
run detectors → compute stats → pick an exit lane lives in
`drivers/cli/main.ts`: 435 lines, 8% of the package's runtime source by size,
eleven module-level definitions of which half compute or decide (`colorsFor`,
`serviceCountOf`, `pathPrefixOf`, the inventory derivation done twice, once per
command). Everything else follows from that one fact:

- No service wanted disk, so no filesystem port ever came under pressure. Five
  files read disk directly (loader, scan, content, package-meta, the oxc
  engine's source read).
- With no port, three of the five `.adapter.ts` files implement nothing: they
  are I/O functions that only assembly calls, and the driver spec can exercise
  the run only through fourteen fixture repos on disk.
- The engine port was written sync because nothing asked otherwise, and sync
  spread through the extraction loop, the package-meta reads, and the surface
  reader by contagion. No caller in the package is unable to await.
- A second driver (the Vite plugin on the board) would copy the sequence or
  import `main`.

Both problems were never ruled — they were never asked. The 09 step ruled
"assembly owns the load → resolve sequence" when that was three calls; the
sequence grew through steps 10–14 into a use case and nobody re-asked. See
[PLAN § The laundering pattern](./PLAN.md#the-laundering-pattern) for why the
instructions that exist did not catch it.

A terrain note received 2026-09-11 found the same shape in the partner CLI after
nine green steps — verbs sequenced in the driver, stage services whose tests
read as plumbing — and named the class: **a trigger with no owning use case.**
Problem 2 is an instance. Nothing in the method asks the question that exposes
it (per trigger, which one use case?), at either gate.

## Goal

- One home per concept: the manifest claim is read once (one reader, two
  tolerances), typed once, reached once; the check registry is one ordered list
  in `check` that every other surface derives from. The `config → check` edge is
  gone.
- The run is a service: `createRun({ … })` takes ports, returns the use cases
  the driver calls (`status`, `check`, `explain`); `main` wires, writes streams,
  maps results to exit codes, nothing else. The driver spec keeps its goldens;
  the run's decisions get unit tests over in-memory ports.
- A filesystem kernel, async from the start: one narrow port, one Node adapter,
  one in-memory adapter with exposed state. No sync port — the reference rule is
  "sync only where a caller cannot await", and none can't here. The engine port
  and the extraction service flip async with it.
- The `adapter-implements-port` rule (CLI chapter board, Ideas) can be born
  after this chapter with a green dogfood under it: every `.adapter.ts` in the
  package implements a `.port.ts`.
- The public surface (`defineConfig`, `DeblobConfig`, the flavor port types) is
  untouched: the flavor port stays sync and pure, the engine port is internal.
- The gates ask for the owner: a spec that touches a user-facing trigger carries
  the trigger → use-case table, blank cells allowed as recorded deferrals; at
  consolidation a blank cell is a finding, and the review pass names every
  assembly definition and opens the owning suites per trigger. Asked first in
  step 04's own spec, written into `deblob-sdd` and `deblob-review` in step 05.

Out of scope by choice: a sync fs port "for later" (no caller needs it; a port
nobody consumes is a restated dialect waiting to drift); porting the config
`import()` (the platform module loader is the whole-framework case the placement
card says not to abstract); porting `oxc-resolver`'s own disk reads (the
resolver is one subsystem behind the engine port; its reads are its own).

## What it buys, what it does not

Buys: the run testable without a disk; a second driver that composes instead of
copying; adapters that mean what the doc says they mean; the dogfood ready for
the next rule; the next driver-shaped step, ours or a partner's, asked the owner
question at spec time instead of at audit time. Does not buy: any new check, any
new user-facing behavior, or a verdict on laundering — the table is a question a
reviewer reads, not a rule the checker runs. Output and exit codes are
golden-pinned and must not move — this chapter is a refactor with a spec because
the ordering forces the placement questions the last chapter skipped.
