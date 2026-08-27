# Step 11 — resolution integrity: tsconfig paths wired, unresolved surfaced

Field-found (2026-08-27, first external dogfood): tsconfig `paths` aliases
(`$lib/…`, `$src/…`) produced **no edge at all** — the import invisible to every
detector, check green, exit 0. Two independent defects compound:

1. **`tsconfig: "auto"` resolves no paths.** Probed against oxc-resolver 11.24.2
   directly: a clean `tsconfig.json` with `paths`, sitting directly above the
   importing directory, still yields `Cannot find module` in auto mode; the same
   file passed as explicit `configFile` resolves. Production wires
   `createOxcEngine()` with no `tsconfigPath` → auto → aliases never resolve.
   The adapter's `tsconfigPath` param works (step-01 fixtures prove paths
   resolution with it) — it is wired from nowhere. The 08 ruling ("tsconfig
   still feeds resolution — its only role") was ratified, never plumbed.
2. **`graph.unresolved` is write-only.** Extraction collects every unresolvable
   import (the extraction port demands it: "must surface as a diagnostic") — and
   no detector, renderer, or exit path reads it. The resolution failure was then
   swallowed, which is what made defect 1 invisible.

## Goal

The operation, over every literal import in covered code: **it either lands in
the graph as an edge, or the run refuses to certify** — a green `deblob check`
implies the graph was complete. Concretely:

- tsconfig `paths` resolution works in production with zero configuration on the
  common shape (a `tsconfig.json` at the config root), and is
  declarable/disablable when the shape is uncommon.
- A resolver-failed literal import fails the run loudly: diagnostic block naming
  each `from → specifier (reason)` plus the remedies, **exit 2** — the
  config-error class, not the violation class. An unresolvable import proves the
  graph incomplete; a gate over an incomplete graph must not certify, and it
  cannot honestly claim "code quality problem" either (the fault may be the
  run's world: unwired tsconfig, missing install, bundler-only alias).
- Non-literal dynamic imports (`import(expr)`) stay out of the fatal class —
  inherent language dynamism, never resolvable; informational note at most. The
  split rides a `literal` flag on `UnresolvedImport` (the reason stays free text
  — mechanics never hang off message wording).
- Escape hatch teaches, never suppresses: bundler-only aliases get an `alias`
  config key that completes the resolver's world (pureLibs stance: declared,
  trusted, reviewed) — no suppression list, no baseline file (ruled out at 08).

Out of scope: resolving through bundler configs (vite/webpack) — declaration via
`alias` is the deblob-side answer; a vite-plugin driver stays a parked future
idea.

## API

- `DeblobConfig.tsconfig?: string | false` — path to the tsconfig feeding
  resolution, relative to the config file's directory. Default: `tsconfig.json`
  at the config root **when present**, else none. `false` disables discovery. A
  declared-but-missing file is a loud `ConfigError` (exit 2) — declared means
  load-bearing.
- `DeblobConfig.alias?: Record<string, string | readonly string[]>` — resolver
  alias map, values resolved against the config root when path-like; feeds
  oxc-resolver's `alias` option verbatim after normalization to arrays.
- `createOxcEngine({ tsconfigPath?, alias? })` — `"auto"` dies (empirically
  nonfunctional for paths; a knob that silently does nothing is worse than
  none): no `tsconfigPath` means no tsconfig in the resolver.
- Exit contract (check): fatal unresolved present → **2**, taking precedence
  over 1; listing and summary still render (stdout), the unresolved block goes
  to stderr with the teaching remedies. `0`/`1` semantics untouched otherwise.
  Bare `deblob` untouched: it builds no graph (glob-speed contract), so
  unresolved is check-only knowledge.

## Testing

- Resolver regression pinning defect 1: fixture repo with `paths` alias and a
  root `tsconfig.json`, **no explicit engine option** — the alias edge must
  appear via the production wiring path (this is the case that silently passed
  as 0-edge before).
- Unresolved surfacing: fixture with an unresolvable literal import → check
  exits 2, block on stderr names from/specifier/reason; with only a non-literal
  dynamic import → exit unaffected, note only.
- Config: `tsconfig` default-discovery, explicit path, explicit-missing
  (ConfigError), `false`; `alias` normalization + path-value resolution.
- Exit precedence: violations AND fatal unresolved → exit 2, both render.
- Goldens updated; coverage bar unchanged (100% / four axes).

## Implementation

Config resolution discovers/validates the tsconfig path and normalizes `alias`
(model + existing loader adapter — discovery is `existsSync` at root, no walk);
main.ts passes both to `createOxcEngine` — same wiring seam as flavor. Render
gains the unresolved block (stderr, check only). The fatal/non-literal split
rides the `literal` flag `UnresolvedImport` gains at implementation — mechanics
never hang off message wording; no port change beyond the engine factory
options.

## Docs

- `packages/deblob/README.md`: config table gains `tsconfig` + `alias`; Commands
  section documents the exit-2 unresolved case.
- `skills/deblob/references/setup.md`: one line under Configuration (aliases
  resolved via tsconfig at root or the `tsconfig`/`alias` keys) + the monorepo
  deep-import bullet gains "deblob exits 2 on unresolvable imports" once true.
- History untouched (frozen); the chapter PLAN queue gains this step's entry.
