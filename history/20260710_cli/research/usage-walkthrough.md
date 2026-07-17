# Intended usage — brownfield adoption walkthrough (design fiction)

Research material (README-driven), companion to
[help-screens.md](./help-screens.md): the adoption story written as the future
README's "getting started", to test whether the ratified decisions compose into
a usable whole. Same status: grounded in chapter decisions, proposals flagged,
contract only once a step SPEC absorbs it.

The scenario is deliberately brownfield — the architecture's own claim is that
blob is legal and adoption is incremental; the CLI must make that story true on
day one, not punish it.

## 1. Install & configure

```
npm install -D deblob
```

`deblob.config.ts` at the project root — repo root or per package, prettier/
eslint precedent (TS strongly preferred — agents author and typecheck it; the
schema ships with the package, ratified):

```ts
import { defineConfig } from "deblob"

export default defineConfig({
  // Stock flavor: suffix naming (.service.ts, .adapter.ts, …), factory
  // injection, type-only exemption on. Also takes a custom FlavorResolver.
  flavor: "ts-suffixes-factories",

  // Assembly designation — matched files get the assembly row of the
  // matrix (composition legal, rule 5's importer). Designates, never
  // discovers: coverage is the full include/exclude scan.
  assembly: ["src/main.ts"],

  // Rule 4 escape hatch: pure, deterministic third-party libs count as
  // model-layer code. Node builtins and known-IO packages are classified
  // out of the box; the rest defaults to concrete — declare exceptions.
  pureLibs: ["zod", "date-fns"],
})
```

Proposals in this sketch, beyond the ratified "config day 1, flavor-first, stock
flavor": `defineConfig` as the authoring surface, `assembly` as the
assembly-designation mechanism (the PLAN's open question, taken to its likely
answer; see config-options.md for the designation-not-discovery model),
`pureLibs` as the concrete-classification escape hatch with default-concrete
polarity. No `deblob init` scaffolder in v0 — the config is four lines and the
schema is typed; a generator would be ceremony.

## 2. First run — the honest baseline

```
$ npx deblob check
blob
  dag  src/lib/utils ⇄ src/lib/api
       utils → api (src/lib/utils/fetchers.ts → api/client.ts)
       api → utils (src/lib/api/client.ts → utils/retry.ts)
       runtime module cycle (rule 14) — works in dev, silently fails
       minified

1 violation (1 dag) · 1,872 files · 4,309 edges
why: deblob explain rule-14 · or rerun with --explain
```

The point this walkthrough must land: **a brownfield first run is not a wall of
red.** Unsuffixed code is blob — legal, unchecked except for cycles. The only
day-one findings are real landmines (runtime cycles). "Clean" on an unlabeled
repo is achievable in an afternoon, and the checker tightens exactly as fast as
code gets labeled — the blob rule is the ratchet; no baseline file, no
suppression comments.

## 3. Label the first service — the ratchet engages

Extract a service per the implementation guide (`src/invoice/`: model files,
`ports/`, `pdf-render.service.ts`, adapters, `private/`). Re-run:

```
$ npx deblob check
src/invoice
  pdf-render.service.ts
    layers  imports node:fs — service layer cannot depend on concrete
            (rule 4)

1 violation (1 layers) · 1,872 files · 4,311 edges
why: deblob explain rule-4 · or rerun with --explain
```

(Output grouped by service, then file — one service's worksheet in one place;
ownerless findings, like the cycle above, bucket separately.)

The suffix is the opt-in: the moment a file claims a layer, the matrix applies
to it. deblob reports the violation and stops there — moving the `node:fs` call
behind a port is judgment, and judgment is userland (human or agent;
`deblob explain rule-4` is the agent's crash course, shipped in the package — no
skill install assumed). No autofix, ever.

## 4. CI

```yaml
# .github/workflows/arch.yml
- run: npx deblob check
```

Exit 1 fails the build with the violations in the log; exit 2 means the tool
itself is misconfigured (distinct, so CI dashboards don't read a broken config
as a broken architecture). That is the entire integration — no server, no cache
to manage in v0 (**proposal**: incremental extraction is a staged refinement
alongside `--json`/`--sarif`, not day one).

## 5. What deblob will not do (the pitch's honest half)

- **Move or edit code** — detection only, the value-prop boundary.
- **Judge merge-vs-split, port unification, domain shape** — rules 11, 16 and
  friends stay with humans and the skills.
- **Chase framework magic** — template-level auto-imports (Nuxt et al.) are a
  documented blind spot, not heuristically guessed at (carried note,
  2026-07-11). `.svelte`/`.vue` files: DAG nodes from day one,
  assembly-privileged for layer rules until the script-extractor fast-follow.

## Open (surfaced by writing this, for the step specs)

- `entry` globs or exact paths; multiple composition roots (workers, CLIs) —
  answered in [config-options.md](./config-options.md): globs, many roots normal
  (SvelteKit routes settle it).
- Does `check` need a `--quiet`/summary mode for the CI log, or is full output
  always right? (Lean: full output always — the log IS the teaching channel.)
- Monorepo story — resolved 2026-07-17 (rixo): per-package configs fine,
  project-level placement, no merge machinery; residuals in config-options.md
  (workspace-root run ergonomics, sibling-project classification).

Resolved 2026-07-17 (rixo, recorded in chapter PLAN Decisions): rule-4 polarity
= default-concrete + `pureLibs` allowlist, as sketched above — safe by default;
arch-prose clarification touch rides with the layers detector step. Proposals in
§1 (defineConfig, entry, no init) remain proposals.
