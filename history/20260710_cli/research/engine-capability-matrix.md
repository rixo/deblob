# CLI v0 research move — import-graph engine capability matrix

Research material for the engine ruling (R1). Two independent sources, run
2026-07-10: (1) an inline bench in the session scratchpad (synthetic layered
repo, 2k/10k files, all import forms), (2) a five-agent web-research +
verification sweep with its own fixture and 3,000-file bench. They corroborate
each other; deltas are noted where they exist.

Status: draft, unreviewed. Chapter dir name provisional.

## Headline findings

1. **TypeScript 7.0 went GA 2026-07-08 (two days before this research) and ships
   no programmatic compiler API.** `ts.createSourceFile`,
   `ts.resolveModuleName`, `ts.forEachChild` are absent (verified: all
   `undefined` on `typescript@7.0.2`); a stable API is targeted for TS 7.1 and
   will be IPC-shaped. Anything built on the classic compiler API — raw API,
   ts-morph, dependency-cruiser's tsc parser — means pinning `typescript@5||6`,
   a legacy track, while user codebases move to 7.
   ([TS 7.0 announcement](https://devblogs.microsoft.com/typescript/announcing-typescript-7-0/))
2. **knip v6 (March 2026) migrated to exactly oxc-parser + oxc-resolver**,
   dropping TypeScript as a dependency, for the same reasons
   ([knip v6 blog](https://knip.dev/blog/knip-v6)). Production precedent for the
   stack at scale.
3. **No surveyed rule-enforcement tool covers our four rule shapes** (layer
   matrix keyed on file naming, service-boundary DAG, type-only exemption,
   parent-scoped `private/` visibility). The gap deblob fills is real. Details
   in the prior-art section.

## Bench summary (both benches agree on ordering)

| Engine                                              | 10k files (inline bench)      | 3k files (agent bench)                                | Type-only fidelity                                                                                                                                                                                                 | Resolution (paths / exports maps / .js→.ts)                                                                                                                    | Install                                          | Dealbreaker                                                                                                                                    |
| --------------------------------------------------- | ----------------------------- | ----------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------ | -------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| oxc-parser + oxc-resolver                           | 261 ms                        | ~220 ms                                               | per-specifier `isType`, all three syntax forms, incl. mixed statements                                                                                                                                             | 100%                                                                                                                                                           | ~6 MB (napi, 20-platform matrix + wasm fallback) | none — see risks                                                                                                                               |
| typescript@5 API (parse-only + `resolveModuleName`) | 329 ms                        | ~180 ms                                               | full (AST flags)                                                                                                                                                                                                   | 100%                                                                                                                                                           | 23 MB                                            | API dead in TS 7; permanent 5.x pin                                                                                                            |
| ts-morph                                            | ~2.5 s (extrapolated)         | 463 ms + 412 MB RSS                                   | full (wraps TS)                                                                                                                                                                                                    | 100%                                                                                                                                                           | ~15 MB + bundles TS                              | same dead API; 10× cost for zero added capability; author doubts tsgo-era survival ([#1621](https://github.com/dsherret/ts-morph/issues/1621)) |
| dependency-cruiser (`cruise()` as engine)           | ~4 s (extrapolated, defaults) | **40.6 s** (tsc parser, `tsPreCompilationDeps: true`) | `type-only` tag works with typescript 5/6 installed; **silently absent with typescript@7 present** ([#1054](https://github.com/sverweij/dependency-cruiser/issues/1054)) — trap confirmed live in the inline bench | exports maps OFF by default ([#338](https://github.com/sverweij/dependency-cruiser/issues/338)); paths resolution refused two API attempts in the inline bench | ~2 MB + enhanced-resolve + typescript            | speed at scale + silent degradation                                                                                                            |
| swc + resolver                                      | —                             | ~250 ms (w/ oxc-resolver)                             | full                                                                                                                                                                                                               | 100% (enhanced-resolve ≥5.19 or oxc-resolver)                                                                                                                  | 31.7 MB binding                                  | strictly dominated by oxc; span-offset footgun ([#5562](https://github.com/swc-project/swc/issues/5562))                                       |
| es-module-lexer family                              | —                             | —                                                     | **none — type-blind by design**                                                                                                                                                                                    | n/a                                                                                                                                                            | 204 KB                                           | fidelity unachievable                                                                                                                          |
| skott / dpdm / madge                                | —                             | —                                                     | drop/skip only, **no per-edge tag**                                                                                                                                                                                | varies                                                                                                                                                         | —                                                | can't drive type-only exemption; madge unmaintained (last release Aug 2024)                                                                    |

Correctness cross-check (inline bench): oxc and ts5 produced identical edge sets
on the probe service except `require()` edges (oxc module record is ESM-only;
CJS
["will not be planned"](https://github.com/oxc-project/oxc/discussions/2608)).
All hard forms verified in both: `import type` statement, inline
`{ mk, type Thing }` mixed statement (runtime edge, specifier-level kinds
available), `export type {} from`, `export * from`, dynamic `import()`, tsconfig
`paths` alias to real file, `private/` paths, package `exports` subpaths,
`.js`→`.ts`.

## The oxc stack in detail

- Module record (`staticImports` / `staticExports` / `dynamicImports`) exposes
  `isType` per entry, normalizes statement-level `import type` onto entries,
  handles mixed statements per-entry
  ([napi types](https://github.com/oxc-project/oxc/blob/main/napi/parser/src-js/index.d.ts)).
  Exactly the data model the composition rules need (rule 8 native).
- Full TS-ESTree AST available from the same `parseSync` as fallback and for a
  `require()` walk (built-in `Visitor`).
- oxc-resolver = Rust port of enhanced-resolve + tsconfig-paths + tsconfck:
  tsconfig `extends`, `paths`, project `references: 'auto'`, per-file tsconfig
  discovery, exports/imports maps, `extensionAlias`, pnp, symlinks
  ([README](https://github.com/oxc-project/oxc-resolver)). Stable 13 months on
  v11. Used by Rolldown / Vite 8.
- Governance: VoidZero acquired by Cloudflare June 2026; projects stay MIT.

### Risks & mitigations

- **oxc-parser is pre-1.0, ~monthly BREAKING entries** → pin exact versions,
  keep `@oxc-project/types` in lockstep; extraction lives behind a port so the
  engine is swappable (dogfooding the arch).
- **CJS `require()` not in module record, ever** → regex prefilter (`require(`)
  then AST-walk only matching files; avoids paying full-AST deserialization
  (3–20× parse cost) on every file. `experimentalRawTransfer` exists but
  reserves ~6 GiB address space → Windows OOMs
  ([knip #1813](https://github.com/webpro-nl/knip/issues/1813)).
- **JS-oriented defaults** — forgetting `conditionNames` / `extensionAlias`
  silently misresolves → our config layer always sets them.
- **`dynamicImports.moduleRequest` is a span, not a string** → slice source
  (trivial, done in bench).
- **Alpine/musl: supported natively** — the napi platform matrix ships
  `linux-*-musl` bindings. The recurring downstream install failures
  ([nuxt #32525](https://github.com/nuxt/nuxt/issues/32525)) are package-manager
  artifacts (glibc-generated lockfile installed on musl, optional deps skipped,
  node_modules copied across images), not missing support; the wasm32-wasi
  fallback loads when no native binding does (correct results, ~2–3× slower).
  Mitigation for step 01: guarantee the wasm fallback is reachable + an Alpine
  container smoke test in CI.
- Resolver open bug: unresolvable tsconfig `extends` kills auto-discovery.

## Prior art — rule enforcement on import graphs (positioning)

- **eslint-plugin-boundaries**: file-naming layers expressible (`mode: "file"` +
  micromatch), per-rule `importKind: "type"` covers the type-only exemption,
  `no-private` is the closest thing to `private/` — but keyed on element
  nesting, not directory convention. **No cycle rule of any kind**; DAG only as
  a hand-maintained pairwise allow-list.
- **dependency-cruiser rule DSL**: `dependencyTypesNot: ["type-only"]`, `$1`
  group matching from→to ("don't leave your own service" in one rule),
  `circular` with folder scope — the only surveyed tool with
  directory-granularity cycles. Gaps: no layer-matrix primitive (k layers = k
  drifting regexes); capture groups flow only from→to, so parent-scoped
  `private/` can't be written once.
- **Sheriff**: cleanest tag→tag matrix DSL, but tags derive from directories
  only (file-naming invisible), **no cycle detection**, no type-only exemption.
  Pre-1.0, Angular-centric.
- **Nx module boundaries**: real tag matrix + inter-project cycle ban, but unit
  = Nx project, requires Nx workspace, and type-only exemption rejected on
  principle ([#6421](https://github.com/nrwl/nx/issues/6421)).
- Others: Turborepo Boundaries (experimental, package granularity),
  eslint-plugin-import `no-cycle` (notoriously slow), good-fences (abandoned),
  ts-arch (test-assertion style).

**Gap summary:** layer matrices exist only as tag maps at directory/project
granularity, never keyed off file naming; nobody has parent-scoped `private/`
visibility; only dependency-cruiser combines type-only awareness with
directory-granularity cycles — at 180× the pipeline cost and with the silent TS7
degradation trap.

## Flagged unverified

- oxc's "28× faster than enhanced-resolve" claim (agent measured ~18× on its
  workload).
- swc's encoding of `export type * from`.
- skott / madge full exports-map behavior.
- dependency-cruiser workspace-alias documentation.

## Bench provenance

Inline bench scripts (synthetic repo generator + one extractor per engine) ran
in the session scratchpad; not preserved in-repo. Agent bench: five parallel
research agents + fixture verification, Linux x64, Node 24.8, warm FS. Synthetic
repos (uniform small files, no node_modules edges, no JSX) — treat timings as
relative ordering, not absolutes.
