# Step 12 — virtual modules: declared specifier patterns, known leaves

Field-found (2026-08-27, second external dogfood, right after step 11 landed):
vite-plugin virtual specifiers — `$theme/config`, colon-form `$theme:…tail`,
hybrid `$theme/assets:icon-sprites.hmr` — have **no file target**. `alias`
cannot map them (there is nothing to map to), `pureLibs` does not bypass
resolution (correctly — purity is a rule-4 fact, not a resolver fact), so
step-11's exit 2 walls the whole repo: `check` cannot certify, and nothing the
user can declare makes it certify.

The missing piece is the declaration itself: a way to say "this specifier shape
is a module the bundler materializes — it exists, it has no file." Declared, the
import is a **known edge to an external leaf**, not a resolution failure.

## Goal

The operation, over every literal import in covered code, amended from step 11:
**it lands in the graph as an edge — to a module, to an external leaf, or to a
declared virtual leaf — or the run refuses to certify.** Concretely:

- A config key `virtual` declares specifier **patterns**. The tail set is open
  by construction (a theme plugin serves arbitrary `$theme:*.scss` tails; the
  next plugin invents another prefix) — so the key holds patterns, never a
  census of today's names.
- A literal import whose specifier matches a declared pattern never reaches the
  resolver: it becomes an external leaf edge (`type: "external"`,
  `virtual: true`) — one edge per (from, specifier) like any external — and is
  absent from `graph.unresolved`.
- **Purity: virtual counts concrete by default.** A generated theme config is
  runtime content the bundler builds; nothing about "virtual" says pure. Rule 4
  fires from pure layers (model, ports, service) exactly as for an undeclared
  package — the matrix cell, `concrete` target. `pureLibs` stays the one purity
  opt-in.
- `pureLibs` learns nothing new: the leaf's `package` identity is **the declared
  pattern that matched**, verbatim. `pureLibs: ["$theme:*"]` ratifies every
  `$theme:…` import pure the way `"zod"` ratifies `zod` — exact membership, no
  glob semantics added to `pureLibs`.
- Type-only imports of a virtual leaf are rule-8 exempt like a package's
  (`externalExempt` — the module's declared types are its contract; vite virtual
  modules ship `declare module` typings). Strict mode untouched.
- Declares what the thing is, never mutes the failure: `virtual` is not a
  suppression list. An unmatched specifier still fails resolution and still
  exits 2 — step-11's teach-don't-suppress line holds; the unresolved remedies
  gain the `virtual` sentence.

Out of scope: reading vite/webpack configs to discover virtual namespaces (the
vite-plugin driver stays parked in `future/`); anything about the virtual
module's content (it has none deblob can see — a leaf, never parsed, never
expanded, like every external).

## API

- `DeblobConfig.virtual?: readonly string[]` — specifier patterns, picomatch
  globs matched against the **raw specifier as written** (`$theme/config`),
  never a path. Default `[]`. Validation as the other string-array keys
  (`ConfigError` otherwise). Patterns keep picomatch's segment rule: `*` stops
  at `/`, and `**` only means "anything" when it is a whole segment —
  `$theme/**` covers every slashed tail; `$theme:*` covers slash-free tails; a
  colon namespace with slashed tails is `$theme:{*,*/**}`. Documented, not
  hidden.
- `ResolvedConfig.virtual: (specifier: string) => string | null` — returns the
  matching declared pattern (first in declaration order), `null` for none. Same
  shape idea as `isAssembly`: config compiles the matcher; extraction consumes
  it.
- `extractGraph({ …, virtual? })` — the matcher, optional (absent = nothing is
  virtual). Consulted per literal import **before** `engine.resolve`; a hit
  short-circuits into the leaf. Non-literal imports stay non-literal (never
  matched — there is no specifier to match).
- `EdgeTarget` external gains `virtual: boolean` — `true` for these leaves,
  `false` for packages, builtins and out-of-coverage files. For a virtual leaf,
  `package` is the matched pattern string (the purity identity), `specifier`
  stays as written. No `Resolution` change: the engine port never sees a virtual
  specifier.
- `check layers`: `classifyExternal` reads `virtual` — a virtual leaf is
  `pureLibs.has(package) ? "pure" : "concrete"`, never `"unclassified"` (the
  user already classified it as a module; the only open question is purity, and
  concrete is the ruled default). The matrix cell is the existing
  `concrete`-target cell, rules `[1, 4]` from model/ports, `[4]` from service,
  `8` appended where the type variant is exempt.
- Rendering: the target label for a virtual leaf shows the specifier plus a
  `(virtual)` mark, so a fired cell reads as declared, not as a resolver
  accident. The unresolved block's remedies sentence gains: "…or declare
  bundler-served virtual modules via config key "virtual"."

## Testing

- Extraction (service spec, fake engine): a declared pattern → external leaf
  with `virtual: true`, `package` = the pattern, **`engine.resolve` never
  called** for it, `unresolved` empty; same specifier undeclared → unresolved as
  today. One edge under the merge for two occurrences (type + runtime → runtime
  wins, as every external).
- **Tripwire for the open set:** declare `$theme:*` only; import a tail absent
  from every fixture and every list in this step (`$theme:zz-unseen-tail.scss`)
  — must land as a virtual leaf. Code stating the operation (pattern match)
  passes for free; code built on a name list fails.
- Config: `virtual` accepts a string array; non-array / non-string entries →
  `ConfigError`; default `[]`; the compiled matcher returns the first matching
  pattern in declaration order, `null` otherwise; segment-rule pin (`$theme:*`
  does not match `$theme:a/b`, `$theme:{*,*/**}` does).
- Layers: virtual leaf from `model` → `[1, 4]` concrete cell; from `service` →
  `[4]`; from `adapters`/`blob`/`assembly` → nothing; pattern in `pureLibs` →
  nothing; type-only from a pure layer → nothing under the default stance, fires
  under `typeOnlyExempt: false`; never `unclassified-lib`.
- CLI: fixture repo with a virtual import and a `virtual` declaration → no
  unresolved block, exit by violations alone; the same fixture without the
  declaration → exit 2 with the amended remedies line (golden).
- Coverage bar unchanged (100% / four axes).

## Implementation

Config service: `virtual` joins `KNOWN_KEYS` and `stringArrayKey`; the matcher
compiles one picomatch per pattern (declaration order) and returns the pattern
string — `ResolvedConfig.virtual`. Extraction service: the matcher is an
`extractGraph` option beside `isAssembly`; the literal branch consults it before
`engine.resolve` and builds the leaf. Graph model: the `virtual` field on the
external target (every constructor site sets it — the compiler owns the set).
Layers detector: one branch in `classifyExternal`. Render: `targetLabel` marks
virtual leaves; the remedies string grows one clause. main.ts threads
`config.virtual` into `extractGraph` — the same wiring seam as `isAssembly`. No
port change: the engine never learns about virtual specifiers.

## Docs

- `packages/deblob/README.md`: config table gains `virtual`; the `pureLibs` row
  says "package names, builtin specifiers, and declared virtual patterns"; the
  exit-2 paragraph names virtual modules as the fourth world-fault (unwired
  tsconfig, missing install, bundler-only alias, bundler-served virtual module).
- `skills/deblob/references/setup.md`: the Configuration resolution line gains
  the `virtual` key with the segment-rule caveat in one clause.
- History untouched (frozen); the chapter PLAN queue gains this step's entry and
  the 2026-08-27 Idea dissolves into it.
