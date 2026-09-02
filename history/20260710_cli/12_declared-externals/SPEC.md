# Step 12 — declared externals: specifier patterns the environment provides

Field-found (2026-08-27, second external dogfood, right after step 11 landed):
vite-plugin virtual specifiers — `$theme/config`, colon-form `$theme:…tail`,
hybrid `$theme/assets:icon-sprites.hmr` — have **no file target**. `alias`
cannot map them (there is nothing to map to), `pureLibs` does not bypass
resolution (correctly — purity is a rule-4 fact, not a resolver fact), so
step-11's exit 2 walls the whole repo: `check` cannot certify, and nothing the
user can declare makes it certify.

**Reframed at implementation (2026-08-28, rixo).** The first draft named the key
`virtual` — the tree, not the forest. The general problem is the one step 11
created on purpose: strict resolution turns every specifier the resolver cannot
see into a refusal to certify, and the resolver's world is narrower than the
runtime's. What lies outside it is one category — **specifiers the environment
provides with nothing on disk**: bundler virtual modules (`$theme:**`,
`virtual:pwa-register`, `$app/*`), runtime-provided modules
(`cloudflare:workers`, `bun:*`), URL and `npm:` specifiers. Bundlers already
have the word for "don't resolve, the environment provides it": rollup/esbuild
`external`, webpack `externals`. Virtual modules are one instance. Naming the
key after the instance would have been rediscovered as a misnaming at the next
exotic import; the key is `external`, and the mechanism is unchanged.

Why strictness is right, restated so the lane's price reads as a price and not a
regression: resolution matters for one thing deblob cares about — edges that
land **in-set**. Relative paths and aliases look like leaves or bare names but
hit repo files; that was the step-11 defect. For everything else the outcome is
a leaf either way. But `$theme/config` and an unwired `$lib/x` alias into
`src/lib` are indistinguishable from the specifier alone, so
unresolved-bare-specifier → leaf-by-default would reopen the defect, and a CI
warning is a green check nobody reads. Unknown → refuse to certify; the escape
is a declaration that **names** the thing, reviewed in config like `pureLibs`.
No literal-less-pattern guard (`**`): rejected at ruling — a tool does what it
is told; a config line saying "everything is external" is the author's call and
sits in the author's review, like `rm -rf`.

## Goal

The operation, over every literal import in covered code, amended from step 11:
**it lands in the graph as an edge — to a module, to a resolved external leaf,
or to a declared external leaf — or the run refuses to certify.** Concretely:

- A config key `external` declares specifier **patterns**. The set is open by
  construction (a theme plugin serves arbitrary `$theme:*.scss` tails; the next
  runtime invents another prefix) — so the key holds patterns, never a census of
  today's names.
- A literal import whose specifier matches a declared pattern never reaches the
  resolver: it becomes an external leaf edge (`type: "external"`,
  `declared: true`) — one edge per (from, specifier) like any external — and is
  absent from `graph.unresolved`.
- **Purity: a declared external counts concrete by default.** A generated theme
  config is runtime content the bundler builds; nothing about "the environment
  provides it" says pure. Rule 4 fires from pure layers (model, ports, service)
  exactly as for an undeclared package — the matrix cell, `concrete` target.
  `pureLibs` stays the one purity opt-in.
- `pureLibs` learns nothing new: the leaf's `package` identity is **the declared
  pattern that matched**, verbatim. `pureLibs: ["$theme:**"]` ratifies every
  `$theme:…` import pure the way `"zod"` ratifies `zod` — exact membership, no
  pattern semantics added to `pureLibs`.
- Type-only imports of a declared external are rule-8 exempt like a package's
  (`externalExempt` — the module's declared types are its contract; vite virtual
  modules ship `declare module` typings). Strict mode untouched.
- Declares what the thing is, never mutes the failure: `external` is not a
  suppression list. An unmatched specifier still fails resolution and still
  exits 2 — step-11's teach-don't-suppress line holds; the unresolved remedies
  read as four world-faults, one key each: `tsconfig` / install / `alias` /
  `external`.

Out of scope: reading vite/webpack configs to discover namespaces (the
vite-plugin driver stays parked in `future/`); anything about the declared
module's content (it has none deblob can see — a leaf, never parsed, never
expanded, like every external); resolver-teachable failures such as `exports`
maps under a bundler condition (`browser`, `svelte`) — that wants a `conditions`
key in the `tsconfig`/`alias` family, banked as an Idea, and until it exists
`external` is the workaround, said out loud in the README.

## API

- `DeblobConfig.external?: readonly string[]` — specifier patterns matched
  against the **raw specifier as written** (`$theme/config`), never a path.
  Default `[]`. Validation as the other string-array keys (`ConfigError`
  otherwise). Two wildcards, glued anywhere: `**` = any characters, `/`
  included; `*` = any characters but `/`; everything else literal. **Not
  picomatch** — amended at implementation (2026-08-28) on field feedback: the
  first draft used picomatch, whose `**` only crosses `/` as a whole path
  segment, so `$theme:**` — what anyone writes first — silently degraded to
  `$theme:*` and left `$theme:components/foo.scss` unresolved with no hint the
  pattern was wrong (measured: `$theme:**` → 1 unresolved, `$theme:*/**` → 0). A
  specifier is one string, not a path; path-segment semantics were the wrong
  model. Own matcher, two wildcards, no braces.
- `ResolvedConfig.external: (specifier: string) => string | null` — returns the
  matching declared pattern (first in declaration order), `null` for none. Same
  shape idea as `isAssembly`: config compiles the matcher; extraction consumes
  it.
- `extractGraph({ …, external? })` — the matcher, optional (absent = nothing is
  declared). Consulted per literal import **before** `engine.resolve`; a hit
  short-circuits into the leaf. Non-literal imports stay non-literal (never
  matched — there is no specifier to match).
- `EdgeTarget` external gains `declared: boolean` — `true` for these leaves,
  `false` for packages, builtins and out-of-coverage files (a boolean named
  `external` inside `type: "external"` would say nothing; what the flag says is
  "known by declaration, not by resolution"). For a declared leaf, `package` is
  the matched pattern string (the purity identity), `specifier` stays as
  written. No `Resolution` change: the engine port never sees a declared
  specifier.
- `check layers`: `classifyExternal` reads `declared` — a declared leaf is
  `pureLibs.has(package) ? "pure" : "concrete"`, never `"unclassified"` (the
  user already said what it is; the only open question is purity, and concrete
  is the ruled default). The matrix cell is the existing `concrete`-target cell,
  rules `[1, 4]` from model/ports, `[4]` from service, `8` appended where the
  type variant is exempt.
- Rendering: the target label for a declared leaf shows the specifier plus a
  `(declared)` mark, so a fired cell reads as declared, not as a resolver
  accident. The unresolved block's remedies sentence gains: "…or declare
  environment-provided modules (bundler virtual modules, runtime-provided
  modules — nothing on disk) via config key "external"."

## Testing

- Extraction (service spec, fake engine): a declared pattern → external leaf
  with `declared: true`, `package` = the pattern, **`engine.resolve` never
  called** for it, `unresolved` empty; same specifier undeclared → unresolved as
  today. One edge under the merge for two occurrences (type + runtime → runtime
  wins, as every external).
- **Tripwire for the open set:** declare `$theme:*` only; import a tail absent
  from every fixture and every list in this step (`$theme:zz-unseen-tail.scss`)
  — must land as a declared leaf. Code stating the operation (pattern match)
  passes for free; code built on a name list fails.
- Config: `external` accepts a string array; non-array / non-string entries →
  `ConfigError`; default `[]`; the compiled matcher returns the first matching
  pattern in declaration order, `null` otherwise; wildcard pin (`$theme:**`
  crosses `/`, `$theme:*` does not, regex characters literal, `$c/**` does not
  match bare `$c` — the namespace root is its own entry).
- Layers: declared leaf from `model` → `[1, 4]` concrete cell; from `service` →
  `[4]`; from `adapters`/`blob`/`assembly` → nothing; pattern in `pureLibs` →
  nothing; type-only from a pure layer → nothing under the default stance, fires
  under `typeOnlyExempt: false`; never `unclassified-lib`.
- CLI: fixture repo with two declared namespaces, one ratified pure → no
  unresolved block, stderr empty, the concrete one fires with the `(declared)`
  mark, exit 1; the unresolvable fixture's stderr carries the amended remedies
  line.
- Coverage bar unchanged (100% / four axes).

## Implementation

Config service: `external` joins `KNOWN_KEYS` and `stringArrayKey`; the matcher
compiles each pattern to an anchored regex (declaration order) and returns the
pattern string — `ResolvedConfig.external`. Extraction service: the matcher is
an `extractGraph` option beside `isAssembly`; resolution pulled into a local
`targetOf()` that consults it before `engine.resolve` and builds the leaf. Graph
model: the `declared` field on the external target (every constructor site sets
it — the compiler owns the set). Layers detector: one branch in
`classifyExternal`, which now takes the target. Render: `targetLabel` marks
declared leaves; the remedies string grows one clause. main.ts threads
`config.external` into `extractGraph` — the same wiring seam as `isAssembly`. No
port change: the engine never learns about declared specifiers.

## Docs

- `packages/deblob/README.md`: config table gains `external` (nine keys); the
  `pureLibs` row says "package names, builtin specifiers, and declared
  `external` patterns"; the exit-2 paragraph names environment-provided modules
  as the fourth world-fault; one paragraph states the category, the wildcard
  rule, the purity default, and the `conditions` gap.
- `skills/deblob/references/setup.md`: the Configuration resolution line gains
  the `external` key with the wildcard rule in one clause.
- History untouched (frozen); the chapter PLAN queue gains this step's entry,
  the 2026-08-27 Idea dissolves into it, and a `conditions` Idea is banked.
