# Config options — the full surface, annotated (design fiction)

Research material (README-driven), fourth of the set: the whole
`deblob.config.ts` written as if it shipped, every key annotated with status.
Ratified: the config file itself (TS, project-level, day 1 — root or per
package, prettier/eslint precedent; amended 2026-07-17),
`flavor: 'ts-suffixes-factories'` (one name, preset dropped; stock flavor
renamed from provisional `prime` 2026-07-17), `pureLibs` + default-concrete
polarity, `include`/`exclude` + the full-scan coverage model, `typeOnlyExempt`
(top-level key, 2026-07-17). Still proposal until a step SPEC absorbs it:
`assembly` (incl. the rename), `--filter`/`--from`, `defineConfig` itself.

## The superset example

```ts
import { defineConfig } from "deblob"

export default defineConfig({
  // RATIFIED (key + stock value; stock flavor named 2026-07-17 —
  // suffix naming + factory injection, ts- because flavor vocabulary
  // is program-wide, plurals kill the adjective misreading). Takes a
  // flavor name or a custom FlavorResolver implementation.
  flavor: "ts-suffixes-factories",

  // PROPOSAL — including the name: `assembly` (renamed from `entry`,
  // which invited a graph-discovery reading; see the model below).
  // Designates which files wear the assembly hat — their row in the
  // matrix, nothing else. Globs; many roots is the normal case.
  assembly: ["src/main.ts"],

  // RATIFIED (keys + full-scan coverage model; 2026-07-17, rixo).
  // Extraction coverage. Defaults aim for zero-config on common
  // layouts: include ~ source roots, exclude always contains
  // node_modules, dist, build, coverage, .svelte-kit, .next, .nuxt —
  // generated trees must never enter the graph. Exact default lists
  // still open (below).
  include: ["src/**"],
  exclude: [],

  // RATIFIED (key + polarity). Rule-4 classification allowlist.
  // Accepts package names AND builtin specifiers — one list, no
  // separate builtins knob: the stock-flavor baseline pre-seeds the obvious
  // (node:path, node:querystring); add or override here.
  pureLibs: ["zod", "date-fns"],

  // RATIFIED (key + name; 2026-07-17, rixo). Flavor-axis opt-out:
  // false = strict flavor, type-only imports lose their rule-8
  // exemption. Default comes from the flavor; this key overrides.
  typeOnlyExempt: true,
})
```

Deliberately absent, with reasons:

- **No `rules`/severity map** — eslint-style per-rule toggling would let a repo
  silently disable the guarantees while claiming the label. The rules are the
  architecture; the tolerance mechanism is blob (unlabel the code), not config.
- **No config inheritance/cascading** — configs never merge, no `extends`: one
  config governs its subtree. Placement is free (repo root or per package —
  amended 2026-07-17, rixo); the ban is on _machinery_, not location.
- **No baseline/suppression file** — the blob rule is the ratchet, ruled.

## The model: designation, not discovery (2026-07-17, after rixo probing)

The key formerly sketched as `entry` misled — it is **not** a graph-discovery
root. Two separate mechanisms:

- **Coverage = `include`/`exclude`, full-tree scan.** Every file enters the
  graph, orphans included: an unimported file still has outgoing imports to
  judge, dead-ish code with violations is still violations, and the blob % needs
  the full inventory. Entry-crawled discovery (knip/vite model) is wrong for a
  rule checker — hence the rename.

  Mechanically, graph build has no roots at all: (1) glob scan → the coverage
  set (yes, literally `src/**/*.ts` and friends); (2) parse every file in the
  set — each is a node, its imports are edges; (3) an edge resolving _outside_
  the set (node_modules, out-of-include paths) becomes an external leaf node —
  classified via pureLibs/baseline, never parsed, never expanded. Nothing
  "starts" the graph; nothing is discovered by following imports.

- **`assembly` = layer designation.** Matched files get the assembly row of the
  matrix. Nothing else changes.

**Privilege is per-edge, never transitive** (confirmed against rixo's reading):
edge legality = f(importer's layer, importee's layer, import kind). An assembly
file importing blob is legal _on that edge_; the blob file it pulls in is judged
as an importer by its own layer — its import of a `.service.ts` fires rule 6 no
matter who reached it. Assembly designation grants a file privileges as
importer; it grants its imports nothing.

## `assembly` and framework apps (the SvelteKit question)

A single `main.ts` is the CLI-tool case. Framework apps have framework-managed
composition roots — SvelteKit: every `+page.svelte`, `+layout.svelte`,
`+page.ts`, `+server.ts`, plus `hooks.server.ts` and `service-worker.ts`. Globs
make this a non-event:

```ts
assembly: [
  "src/routes/**/+*",        // pages, layouts, load fns, endpoints
  "src/hooks.{server,client}.ts",
  "src/service-worker.ts",
],
```

Notes, honest ones:

- **This is why the key must take globs, not exact paths** — the walkthrough's
  open question, answered by the first real framework contact.
- The earlier read that v0 half-covers SvelteKit mechanically (`.svelte` =
  assembly-privileged _by naming_, carried note 2026-07-11) is **superseded**
  (2026-07-21, rixo, at the 03 spec): the flavor classifies `.svelte` blob in v0
  — framework-file classification is preset/fast-follow territory. Config
  designation still ORs on top: the globs above match the `.svelte` route files
  too (`+*` is extensionless), and matched files classify assembly regardless of
  extension. Blob is the fate of _undesignated_ `.svelte` only — ordinary
  components — whose blob-% inflation on component-heavy repos is the accepted
  honest v0 read. Remaining v0 caveat either way: no `.svelte` extractor yet
  (`parsed: false`) — a designated route file is a correct assembly _node_, but
  its own wiring edges stay unseen until the per-filetype extractors land
  (fast-follow, carried note).
- **The formal story is thinner than the mechanical one**: pages doing their own
  wiring is _distributed assembly_ — the F3 arch hole tracked in
  `future/arch-pass/`. The config can say "routes are assembly" today; what
  assembly-nested-mid-tree _means_ for the matrix is the arch-pass's job. The
  CLI doesn't wait for it (designation works mechanically), but the clarified
  formalism may refine what `assembly` grants.
- Later, not v0 — and NOT the flavor's job (ruled 2026-07-17, rixo): framework
  defaults come from **presets**, see below.

## Presets (future — name reserved, ruled 2026-07-17)

The name freed by the preset→flavor collapse gets its real job. Two orthogonal
concepts:

- **`flavor`** — architecture style (naming scheme, type-only stance). One,
  exclusive.
- **`presets`** — framework convention bundles: `sveltekit`, `astro`, … Each
  contributes framework defaults — assembly globs, generated-tree excludes
  (`.svelte-kit/`), later the per-filetype script extractors. **Combinable** (a
  repo is often several frameworks/runtimes at once); user config always wins
  over preset contributions.

```ts
// future shape, not v0
flavor: "ts-suffixes-factories",
presets: ["sveltekit"],
```

Not v0: the SvelteKit section above shows the manual globs — presets are sugar
over exactly that, added when the manual story has proven the defaults worth
bundling. Resolves the former open question: FlavorResolver grows no
`assembly()` hook — framework knowledge lives in presets, arch style in flavor.

## `pureLibs` granularity (proposal, 2026-07-21, rixo)

Second thoughts on binary on/off purity, banked at the 03 review: per-package
declaration is v0's shipped form, but the complete form is already well defined
— entries widen to:

```ts
// future shape, not v0 — string entries = whole package, unchanged
pureLibs: [
  "zod",
  { import: ["merge", "cloneDeep"], from: "lodash" },
  { import: "default", from: "classnames" },
]
```

The object form mirrors the import statement it blesses
(`import { merge } from "lodash"`) — the config teaches by shape, same logic as
the `flavor` key.

What it buys — mixed-purity packages, two distinct flavors:

- **Subpath mixing** (`pkg/pure` vs `pkg/node`): the sharper hole, and silent
  today — extraction's `packageNameOf` collapses `lodash/fp` → `lodash`, so
  `"lodash"` blesses every subpath sight-unseen. Matching `from` against the
  full specifier (not the collapsed package name) closes it.
- **Named-export mixing** (one package, pure and impure exports): rarer but
  real.

Costs, honest ones:

- Graph edges carry no imported binding names today — per-export purity needs
  extraction to record bindings per edge (oxc yields them natively), and the
  violation must cite the offending binding.
- Semantics to rule: `import * as ns` touches everything ⇒ whole package must be
  pure; side-effect imports; `from` matching (full specifier vs package name);
  re-export chains.
- The teaching channel thickens: "declare it in `pureLibs`" stops being one
  line.

Deferral is free, which is why this stays proposal: string entries remain valid
forever (`string | { import, from }` union), binding data is additive to the
graph model, and a `bindings` field on the violation is additive while
JSON/SARIF output is unshipped. Graduate on the first dogfood hit of a real
mixed lib — subpath matching plausibly graduates first, since its hole is
already open.

## `check` filters (reporting scope)

The need is real: an agent fixing one service wants that service's worksheet; a
monorepo dev wants their package. But the help-screens ruling ("no path
arguments as coverage scoping — the governed subtree is a commitment") stands.
Reconciliation = the same split just ruled for the vite driver: **scope vs
source**.

- **Coverage is always the whole governed subtree.** Extraction + detection run
  on the project's full graph, non-negotiable — `dag`, `private`, rule 5 are
  only correct globally, and detectors are cheap once the graph exists.
- **`--filter` narrows reporting only** (proposal):

```
deblob check --filter src/invoice
deblob check layers --filter src/invoice --filter src/billing
```

- Flag, not positional — positionals are taken by check names.
- Targets: paths/globs (a dir = a service, typically; a file works).
- A finding is reported if any of its endpoints matches the filter
  (cross-service cycle with one foot in the filtered service: reported).
- **Exit code reflects the reported (filtered) set** — the invoker asked "is my
  scope clean"; CI runs unfiltered and keeps the global contract.
- Duplication guard, stated: a filter never changes what is _checked_, only what
  is _shown_ — a repo cannot filter its way to green; CI sees everything.

**Reachability variant — `--from <root-glob>`** (proposal, 2026-07-17, rixo
probing): report findings within the reachable closure of the given roots —
"what my app actually pulls in", the natural scope when working an app slice
(e.g. `--from src/routes/invoice/**`). Still reporting-only: a
reachability-scoped _check_ would miss inbound violations (a foreign `private/`
import into the slice from outside, cycles half-outside the closure).

**Speed, honestly**: filters buy relevance, not speed — and at CLI scale speed
needs no buying (extraction 261ms/10k files, detectors cheap). Where speed
genuinely matters — very large monorepos, hot dev loops — the answer is
incremental extraction (staged refinement) and the vite driver, never narrower
coverage.

## Open (for the config/step specs)

- Exact default include/exclude lists; interplay with tsconfig `include`/`files`
  (mirror it? independent?).
- The `entry`→`assembly` rename — ratify or find better (the key designates the
  layer; a name that _is_ the layer name is the honest option on the table).
- Monorepo — largely resolved by the project-level amendment (per-package
  configs, each package its own deblob project). Residuals: workspace-root
  ergonomics (one invocation discovering and running N projects?), and
  cross-package workspace imports — package A importing workspace dep B is an
  external leaf in A's run; classified via `pureLibs` like any package, or does
  a sibling deblob project earn a distinct treatment?
- `--filter` in `--json` output (staged): filter applied before or after
  serialization?
- `pureLibs` granular form (see section above): ratify the `{ import, from }`
  entry shape at the config step; decide whether subpath matching
  (full-specifier `from`) graduates ahead of named-export granularity.
