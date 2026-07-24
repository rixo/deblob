---
captured: 2026-07-24
---

# Guided deblobbing — the CLI walks an agent from 100% blob

Captured from a theory session (2026-07-24, rixo + Fable, parallel to the
release work). Question posed: starting from 100% blob, what would it mean for
the CLI to usefully guide an agent through deblobbing? Everything here is
direction leaned in discussion — contract only once a step SPEC absorbs it. This
card elaborates the parked **CLI↔agent hop** (chapter PLAN: CLI does
deterministic grunt work, surfaces collections, agent judges) into a concrete
program.

## The gap

The v0 surface serves the _end state_: labeled code, gate, error-as-worklist.
Dogfood proved that half (agent fixed 15 violations from checker output +
explain alone). At 100% blob, `check` is near-silent by design — blob is legal,
only rule-14 module cycles fire. Guidance = generating a worklist where the
checker generates none. Once the first service is labeled, the existing surface
already guides; the gap is step zero.

## Progression — path of least resistance (rixo)

Seam → service label → ports/adapters → model:

1. **Kill module cycles** — the one thing red at 100% blob, and cycles block any
   clean partition.
2. **Cut a service seam, label the unit `.service.ts`** — legal because canon
   blesses it: the Distillation section makes unextracted model inside the
   service layer the _expected_ intermediate state ("waiting is discipline").
3. **Ports/adapters — matrix-forced.** The moment the file claims `.service.ts`,
   rules 4/1 fire on every concrete import; each red line is one port+adapter
   cut. The checker enumerates the least-resistance worklist — no suggestion
   machinery, the matrix does the forcing.
4. **Model extraction follows** — judgment-timed per Distillation, not pushed.

Notes: this swaps Progressive-adoption stages 2↔3 (human gradient: model then
ports; deblob path: ports then model) — coherent, the human gradient builds
greenfield habits, this path follows what the ratchet forces. And the arch's
"NOT FOR AGENTS" caveat reconciles as: progressive _across_ services, full
architecture _within_ one — agent takes each seam straight through, rest stays
blob. Both readings deserve one line in the arch/guide at graduation.

## Metrics — three distinct roles

- **Blob % (size-weighted)** — global progress, already flagship. Monotone on
  right moves; stays THE number.
- **Cut size + cut acyclicity** — _local seam-choice only_. A good seam: few
  crossing edges AND no SCC across it (SCC machinery exists in `check dag`).
  Globally non-monotone — zero services means zero cross-service edges, the
  count _rises_ as labeling proceeds — so never a progress metric. Compare
  candidate partitions of the same scope, nothing more.
- **Coverage ↑ / mock-imports ↓** — health trend (files importing
  `vi.mock`/`jest.mock` is a grep-grade fact; declines as fixture adapters
  replace mocks). Informational, status-family, never gates.

## New primitives (all fact-shaped, no heuristics inside the tool)

- **Fact reports** over the existing graph: purity closure (transitive runtime
  deps hit nothing impure), IO touchpoints, fan-in on pure files,
  directory-granularity edge summaries (seam raw material). Facts, never
  recommendations — "0 impure edges in closure, fan-in 23", not "make this
  model". The Distillation warning makes this arch-required, not just
  no-overselling hygiene: a "model candidates" framing would push premature
  extraction from inside the tool.
- **What-if overlay** — the strongest single candidate. Detectors are pure over
  the classified graph, so a proposed path→label map (no renames on disk) gets a
  full detector run + seam score: cut size, SCC verdict, would-be violations.
  Turns the agent's rename→check→backtrack loop into propose→verify, near-free
  via the flavor port. Least-resistance path = greedy descent over that score.
- **Coverage reader** — ladder: (1) consume `coverage-final.json` (vitest
  `--coverage.reporter=json`, provider-independent) with verification — map
  paths missing from tree = hard staleness (deblobbing is rename-heavy, so stale
  artifacts scream here), offsets past EOF = drift, mtimes advisory; stale
  numbers reported as unverified, never folded silently. (2)
  `deblob-plugin-vitest` reporter stamping git sha + dirty flag at emission —
  freshness by provenance. Generalization worth its own note: third instance of
  the stamp-diffing pattern (docs staleness, version-pinned URLs) — _artifact
  claims about the tree must carry a stamp the tool can diff, else reported as
  unverified_.

## Audience detection (rixo, ruled in discussion)

Env markers are the mechanism — precision argument: no human sets
`CLAUDECODE=1`, so marker-present = agent, certain; marker-absent falls back to
the safe compact default, and the miss self-heals through the footer hint (the
dogfooded paste-the-footer reflex). TTY stays color-only, as already ruled.

- Layering: explicit flags > `DEBLOB_AGENT=1` (self-declaration, the durable
  vendor-neutral contract; allowlist is bootstrap convenience) > known vendor
  markers (survey real ones at spec time) > `CI=1` > nothing.
- Configurable end to end: additive marker key + full override
  `detectAudience({ env }): "agent" | "ci" | null` — null = unknown, assumed
  human. Flavor-port shape replayed: stock implementation, TS-config
  replacement. Must work configless (bare probe mode).
- Agent marker beats `CI=1` (agent in Actions: the reader is the agent).
- **Invariant: exit codes never vary by audience** — output only. This is what
  makes heuristic detection acceptable at all.

## Defaults per audience

| Audience     | `check`                                                      | bare                                |
| ------------ | ------------------------------------------------------------ | ----------------------------------- |
| Human (null) | compact + footer hints                                       | short status + discovery (as ruled) |
| Agent        | explain on + "spare it" opt-out line, coverage if configured | orientation screen                  |
| CI           | coverage if configured, **no explain**                       | —                                   |

- CI is its own case because the invocation is _authored_ — reviewed, committed
  yml; defaults need to be sensible, not protective; the author opts into
  `--explain` deliberately. Supersedes the walkthrough's "full output always in
  CI" lean.
- Agent-explain-default is an _amendment_ to the explain-opt-in ruling, not a
  reversal: the noise-tax rejection was about humans and stands for them.
- **Agent bare = orientation screen**: same three facts, config/flavor found or
  not, command map with when-to-use lines, vocabulary seed (blob, layer,
  service), suggested next action. Closes the bootstrapping hole — explain is
  the no-skill crash course, but a skill-less agent must learn explain exists;
  bare becomes the index into it. Scan-only + always exit 0 unchanged.

## Footer next-actions — the guidance synthesis

Suggested next action(s) printed as footer on bare/`check`, each backed by a
command yielding more input. **Stateless**: next action recomputed from tree
facts each run — the repo is the state machine's state; resumable, drift-proof,
parallel-agent-safe. Ladder sketch: no config → create it · cycles → `check dag`
first · zero services → seam facts command · violations open → close service X's
worksheet · green but blob% > 0 → next candidate.

Boundary defense (keeps the pitch honest): the tool suggests **process steps
from the published methodology**, triggered by strict facts (cycle count,
service count, config presence) — never **code placement**. Judgment stays
userland; the tool's move is always "to decide that, here are more facts: run
X". Loose-heuristic rungs print the fact behind them ("78% blob · 0 services →
likely seam work") so a wrong suggestion is self-diagnosing. Verbosity follows
the audience matrix (agent: full rung; human: one line; CI: none).

## Tooling connectors — demoted (rixo, same session)

tsc/prettier/linters: less relevant — where the codebase cares, CI already
enforces them strictly; deblob running them is task-runner scope creep
(lefthook/turbo territory), exit-code muddle (prettier failure reading as
architecture failure — the confusion exit 2 exists to prevent), pitch dilution.
Residual shape at most: **point, don't run** — config lists checkpoint commands,
agent footer prints them as a pre-completion checklist (forget-proofing agent
self-review without executing anything). Rule point-vs-nothing at graduation;
execute is off the table.

Coverage is the exception — not a connector, pillar tooling (next section).

## Coverage — pillar, decomposed (rixo + Fable, same session)

The 100%-through-public-API bar is a structuring pillar of the arch
(sales-speech pillar 1), unlike formatter/linter concerns — and it decomposes
into two halves, only one of which belongs to a runner:

- **The % half — runner-native, don't reimplement.** Vitest
  `coverage.thresholds` fails the run under the bar (exit code, CI-ready, no
  service); per-glob thresholds make the layer-scoped bar directly expressible
  with the stock flavor (`'**/*.model.ts': { 100: true }` — suffixes pay again;
  flavor-dependent). `thresholds.autoUpdate` = existing ratchet precedent for
  the parked deblob ratchet. Deblob's move at most: _generate or suggest_ the
  layer-aware threshold config (footer-shaped guidance).
- **The through-the-API half — rule 15, already deblob's turf.** Coverage tools
  measure execution, not import path — they cannot distinguish
  covered-via-contract from covered-via-private-reach. Rule 15 (tests import
  public surface only) is import-graph-shaped, mechanical, sitting in the
  rule-coverage table marked "later": it is the missing half of the pillar, not
  an orphan rule. Likely graduates with this program.
- **Deblob's unique read-side value: the per-layer coverage view** — join
  `coverage-final.json` with classification → "model 94% · service 71% · blob
  12%". Generic tools can't render it: _layer_ isn't in their vocabulary.
  Status-family fact; trend expectation: rises with distillation.
- **Exclusion-motivation check** (candidate): the guide rules every coverage
  exclude motivated by an adjacent comment (`coverage.exclude` globs, inline
  `/* v8 ignore */`) — fact-shaped, no judgment.

Final form: runner gates the %, rule 15 gates the path, deblob status renders
the layer view — tool never runs tests. Artifact staleness handling per the
coverage-reader primitive above.

## Boundaries

- No autofix, no judgment, no shaky heuristics inside the tool — every feature
  here is facts, forced moves, or published-method pointers.
- Coverage/connector signals are informational: the gate stays `check`'s
  deterministic core.

Sequenced: post-v0, status-family kin (ratchet lives there too). Likely first
graduations: what-if overlay (near-free, converts the existing detector fleet
into interactive guidance), audience detection + defaults (small,
self-contained), footer ladder (rides both).
