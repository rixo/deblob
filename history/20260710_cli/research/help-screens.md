# Intended `--help` output — design fiction

Research material (README-driven): the CLI's surface written as if it shipped,
to force UX decisions before implementation specs freeze them. Grounded in the
chapter's ratified decisions (command surface, no autofix, config day 1, v0
output); anything beyond them is a **proposal**, flagged inline. Nothing here is
a contract until a step SPEC absorbs it.

**Absorbed by [09_cli-runner/SPEC.md](../09_cli-runner/SPEC.md) (landed
2026-07-22)** — the screens below became golden files
(`packages/deblob/src/drivers/cli/__fixtures__/goldens/`), which are the truth
now; this file stays as the design record. Deltas ratified at 09: exit codes
0/1/2, the stats trailer, and the no-autofix footer (all three proposals below);
`dag` lines absent from the shipped screens until the dag step lands; `--config`
default text reads "nearest deblob.config.ts" (discovery walk, 08); `--no-color`
listed in Options (color/TTY ruling made visible); explain topics also accept a
bare rule number (`deblob explain 4` — the check footer cites bare numbers); the
bare headline carries the total covered size (`38 files · 215kb · 0% blob`,
ruled at review 2026-07-22) so blob % visibly reads as computed out of file
size, not file count.

## `deblob --help`

```
deblob — machine-checkable hexagonal architecture for TypeScript/ESM

Usage
  deblob                    project status + discovery
  deblob check [what...]    run architecture checks (default: all)
  deblob explain <topic>    explain a rule or check (rule-4, layers, ...)

Checks
  dag        service dependencies form a DAG; no module-level runtime
             cycles (rules 13, 14)
  layers     dependency matrix by layer suffix; type-only imports exempt
             by default (rules 1, 4-9)
  private    private/ is sealed outside its service (rule 12)
  barrels    the layer is visible in the import path — no index.ts
             indirection (rule 2)
  ports      port files are types only, no runtime exports (rule 10)

Options
  -c, --config <path>    config file (default: ./deblob.config.ts)
  -h, --help             show this help
  -v, --version          print version

Exit codes
  0  clean    1  violations found    2  usage or config error

deblob detects; it never moves code. Why each rule exists:
https://github.com/rixo/deblob/blob/main/docs/architecture.md
```

Notes:

- Check list doubles as the rule map — a user reads the whole value prop in one
  screen. Rule numbers cited so the help itself is a teaching channel, same
  stance as the violation output.
- **Proposal**: exit code `2` for usage/config errors (distinct from violations,
  standard CLI practice — CI must distinguish "arch broken" from "tool
  misconfigured").
- **Proposal**: the no-autofix stance stated in the help footer — the value
  boundary is part of the pitch, not fine print.
- Deliberately absent from v0 help: `--json`/`--sarif` (staged refinement per
  the output decision), `deblob docs` and `deblob status` (separate families,
  later hops), path arguments as _coverage_ scoping (the governed subtree is a
  commitment, per the config decision). A _reporting_ filter
  (`check --filter <glob>`) is proposed separately — coverage stays whole-repo,
  only the shown set narrows; see [config-options.md](./config-options.md).

## `deblob` (bare) — status + discovery

```
$ deblob
deblob 0.1.0 · deblob.config.ts (flavor: ts-suffixes-factories)

  1,872 files · 78% blob
  3 services

Commands
  deblob check [what...]   run architecture checks
                           (dag · layers · private · barrels · ports)
  deblob explain <topic>   explain a rule or check
  deblob --help            full help
```

Notes (ruled 2026-07-17, rixo — resolves the former bare-command open question):

- Not help, not an implicit `check`: a project inventory + where to go next.
- **Scan only — no parsing, no detectors** (refined twice same day, rixo).
  Detectors: a violation summary would make bare a stealth `check` — no
  principled line short of duplication; diagnosis belongs to `check` alone.
  Parsing: edges cost a full parse and add nothing to an inventory — path
  classification via the Flavor port yields files, blob %, service roots. Bare
  runs at glob speed and prints what the tree _is_, never whether it's healthy.
- **`N files · X% blob` is the headline** — the flagship metric on a one-word
  command; the adoption ratchet made visible. Seed of the fuller `deblob status`
  inventory (CI↔agent future hop).
- Service count = distinct service-root directories (Flavor-port discovery; a
  service is a dir — never a count of `.service.ts` files, and adapters are
  files inside a service). Exact root-mapping corner cases ride the existing
  path→service residual (Closed questions).
- **Always exit 0** — informational by contract, so the CI gate stays
  `deblob check` and a stray bare invocation can never fail a build.

## `deblob check --help`

```
Usage
  deblob check              run all checks
  deblob check dag layers   run only the named checks

Options
  --explain        append explanations of every rule that fired
  --explain-only   print only those explanations, skip the violations

All checks run over one shared import graph — naming several costs one
extraction. A violation prints the file, the offending import, and the
broken rule:

  layers  src/invoice/pdf-render.service.ts
    imports node:fs — the service layer cannot depend on concrete
    implementations (rule 4)

Type-only imports (import type / { type X }) are exempt from composition
rules by default (rule 8) — a flavor axis: strict flavors opt out in
deblob.config.ts. Unsuffixed files are blob: legal, unchecked except for
cycles — labeling is adoption, not a prerequisite (rule 5 guards the
boundary: only assembly may import blob).
```

## `deblob explain` — the teaching channel, resolvable

Ruled 2026-07-17 (rixo), rustc precedent (`rustc --explain E0308`).
Repo-relative doc paths don't exist in consumer repos and skill pointers assume
a runtime-specific install; instead the teaching content ships in the npm
package and the CLI serves it — version-matched, offline, agent-agnostic:

```
$ deblob explain rule-4
rule 4 — service cannot depend on concrete implementations

node:fs, an HTTP client, a database driver belong in adapters. A service
depending on concrete bypasses its ports and becomes untestable. Pure,
deterministic third-party libraries are not "concrete" in this sense —
they qualify as model-layer code; declare yours in pureLibs.

card: dependency-matrix — who may import what (shipped knowledge card
follows — the verbatim skills/deblob/knowledge/ file covering rules 1-5)
…

full text:
https://github.com/rixo/deblob/blob/main/docs/architecture.md#rule-4
```

- Topics: `rule-N` and check names (`deblob explain layers` = the rules that
  check enforces).
- Output = doc excerpt + the relevant knowledge card + canonical URL — the
  no-skill CI agent gets the card-grade crash course by running one command; the
  human in a CI log gets the URL.
- Batch access rides on check (refined 2026-07-17, rixo):
  `deblob check --explain` appends the explanation of every rule that fired
  after the results — a fixing agent gets violations + all needed crash courses
  in one run, zero round-trips (and CI logs become self-teaching);
  `deblob check --explain-only` prints only those explanations, no violation
  listing — the pre-brief before diving in.

## Sample violation run (v0 output decision, made concrete)

Grouped by service, then file (ruled 2026-07-17, rixo): one service's problems
land in one place — an agent fixing a service gets its whole worksheet
contiguously. The check name tags each violation line. Findings owned by no
single service (cross-service cycles, blob-file cycles) get their own bucket:

```
$ deblob check
src/invoice
  pdf-render.service.ts
    layers   imports node:fs — service layer cannot depend on concrete
             (rule 4)

src/billing
  stripe.adapter.ts
    private  imports src/invoice/private/totals.ts — private/ is sealed
             outside its service (rule 12)

cross-service
  dag      src/orders ⇄ src/billing
           orders → billing (src/orders/checkout.service.ts → billing/ports)
           billing → orders (src/billing/refund.service.ts → orders/model)
           services must form a DAG (rule 13); see the sharing progression

3 violations (1 layers, 1 private, 1 dag) · 214 files · 380 edges
why: deblob explain <rule> (4, 12, 13) · or rerun with --explain
```

Notes:

- Every violation = location, offending edge, rule number; the why is one footer
  hint away (`deblob explain <rule>` / `--explain`) — per-line pointers were
  repetitive noise (ratified; anchor→explain 2026-07-17, footer refinement same
  day). The error output stays the teaching channel; `check --explain` makes a
  CI log self-teaching in one run.
- **Proposal**: cycle violations print the full edge pair (both directions, with
  the files carrying each edge) — a cycle named without its edges is
  undebuggable.
- **Proposal**: trailing stats line (files/edges) — cheap trust signal that the
  graph actually covered the repo. Timing figure omitted until measured.
- Ownerless-finding buckets, ruled 2026-07-17 (rixo): `blob` for findings on
  unlabeled files (flagship term, taught by the output itself), `cross-service`
  for labeled-service cycles.

## Open (surfaced by writing this, for the step specs)

- Doc anchors: stable rule-level anchors (`#rule-4`, used by `explain`'s
  canonical URLs) need to exist in architecture.md — planned:
  `rule-number-resolution` step in the chapter PLAN (with the explain machinery
  and the skills-INDEX rule-range column).

Resolved 2026-07-17 (rixo, recorded in chapter PLAN Decisions): bare `deblob` =
status + discovery, exit 0 always; violation ordering = service, then file,
ownerless findings bucketed; color/TTY = standard practice, vitest as reference.
