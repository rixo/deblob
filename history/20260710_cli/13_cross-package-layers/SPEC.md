# Step 13 — cross-package layers: identity crosses the boundary, the seal holds

Dogfood-found (2026-09-02, guinea-pig monorepo): an agent made a package entry
point `export * from` a model, a service, and an adapter, designated the entry
`assembly` in that package's config, and sailed through its own gate — assembly
row imports anything, entry designation exempts the rule-2 barrel. Consumers see
`@repo/pkg` as an unlabeled external: the grab-bag classifies by the purity
trichotomy (pure/concrete/unclassified) and every finer question dies at the
boundary.

The diagnosis, ratified in session (rixo): the "no cross-package graph" stance
conflated two things. The **seal** — sibling internals are private, the exports
map is `private/` one level up, never parse through the boundary — is principle,
and it holds. Losing **layer identity at the boundary** was v0 scoping wearing
the principle's clothes. In-set, the suffix is the sole classification carrier
(rule 5); across packages the specifier carries nothing, so identity degrades to
declared purity. Each package's gate covers its interior; coverage composes iff
identity crosses. This step ships the carrier.

Ruled framings, from session:

- **Flavors classify locally; layers travel.** A flavor's job is files → the
  layer vocabulary; the vocabulary itself is flavor-independent. The consumer
  never learns the producer's flavor machinery — it learns results. Flavor as
  config (exists) governs internal checks; a `deblob` field in the producer's
  package.json governs how that package's entries classify from outside.
- ~~**Structure crosses freely, purity never does**~~ — the first cut's trust
  argument: a producer's self-declaration could only make consumers _stricter_
  (a service/adapters/assembly classification seals imports to assembly), never
  looser; purity stayed consumer-ratified via `pureLibs`; a malicious or drifted
  field could not silence a rule, which made reading an unverified field from
  node_modules "safe by construction, no trust list needed". **Superseded at
  review (2026-09-04, rixo)** — see the trust ruling below.
- **The story simplifies**: "deblob checks layers" — the boundary blindness was
  the exception, and removing an exception is simplification even though the
  mechanism grows. Guarded by: everything here is additive; an unlabeled
  external behaves exactly as today; nothing is demanded from anyone who does
  not opt in.

Ruled at review (2026-09-03, rixo) — **the dist gap**. The first cut verified
source-exported surfaces and fell back to the target's basename for built ones,
so a root entry pointing at `dist/index.js` got no verdict: the laundering shape
was invisible in exactly the published layout. Closing it by guessing which
source a built file came from (stem matching, tsconfig `outDir` inference,
source maps) was refused: a wrong guess produces a rule citation naming a
phantom file. What closes it without guessing is a **declared mirror** —
`build: "dist"`, default, one-to-one `dist/` ↔ `src/` minus extensions, stamps
survive exact matching only — plus an honest lane for what the mirror cannot
reach. Two placements were ruled:

- The surface check is **producer hygiene, not consumer safety**. Consumers
  trust the claim the way they trust the code (below); the check is a service
  the producer buys for itself, and the producer is the only reader of its
  output. An entry the graph cannot reach is therefore not a rule violation
  (none was broken — inconclusive, not proof of wrongdoing) but an **unverified
  claim**: the run cannot certify, same lane as resolution failure, exit 2, no
  green until mapped or disclosed. Strict by default; no non-strict knob until
  someone asks.
- Disclosure is **public**: `"deblob": { "blob": [patterns] }` in the manifest
  lists the subpaths the field does not cover. The field's claim becomes a
  precise sentence — _every subpath I did not list is verified at my own gate by
  the stock rule_ — and a laundered root is never silent, only declared. The
  mirror stays config (how the claim is checked); the field carries claims only.

Bundled outputs (one file for the whole surface, the micro-perf stance) break
path identity, not the unit of layer: the split is a source-time requirement for
the checker and the reviewer, and the stamp a verified entry earns survives the
bundling. Carrying that stamp abroad is a generated manifest the producer's gate
emits — captured idea, not this step.

Ruled at review (2026-09-04, rixo) — **trust is the dependency model; claims
cross, purity included**. The "purity never crosses" framing had a wrong
premise: it treated a crossing `model` claim as a supply-chain lever, but deblob
is not a security boundary. A consumer already executes the provider's code and
trusts its versioning; a provider lying about purity harms the consumer's
architecture exactly as a lazy `pureLibs` line does today, nothing new is
exposed. Requiring the consumer to re-ratify in `pureLibs` what the provider's
gate already verified — self-blessing, in a monorepo — was a ceremony carrying
no information: the line the consumer would write is the claim the producer
made. So a crossed `model`/`ports` classification is pure for the importer, per
subpath — finer than `pureLibs` can say (the sibling's model subpath pure, its
service subpath sealed, from one field). `pureLibs` stays for packages that
declare nothing, nearly all of them. The override for a rogue or drifted
provider is the consumer's `externalLayers`, which already wins over the field,
with `blob` as the revoke word — the same word the producer uses to retract its
own claim. What crosses is the provider's _verdict_ about its own surface, never
its reasoning: the consumer never sees the provider's config, a provider's
internal ratifications stay behind the seal, and a consumer model importing the
same library directly still needs its own `pureLibs` line. What keeps a crossed
claim honest is the producer's gate; drift in a stale published package is the
same risk as a stale semver, said in one README sentence rather than sold as
safety by construction.

Ruled at the 0.0.4 trial (2026-09-07, rixo; feedback from the guinea-pig
monorepo's agent running the built HEAD against four packages) — **a subpath is
one claim**. Zero-config parity held byte for byte, and the two rule-2 findings
were the tool working as designed (an adapter exported under an unsuffixed
subpath; a re-export barrel fronting a service, `assembly` not silencing it).
What did not hold was the unverified lane on a hybrid build: tsc declarations
mirror `src/` while the runtime entry is a rollup bundle under no honest root,
so the types condition reached source and was judged, and the bundled twin still
landed in the block, exit 2 — the producer's only exit was disclosing a subpath
the run had just verified. The first cut verified every condition target on its
own; a subpath is one claim in several build forms, so it is verified through
any module target the graph reaches and unverified only when none does. The
block groups by subpath (it listed one entry per condition, doubling every
count). Same trial, captured rather than built: a word for generated output with
no source behind it, and the odd feel of disclosing markdown assets under `blob`
— a PLAN card and a setup sentence.

## Goal

A cross-package import edge carries the target's layer when the target declares
one — from the producer's package.json for deblob-aware packages, from consumer
config for strangers — and the layer matrix applies to it as it would in-set.
Concretely:

- **Producer carrier**: a `deblob` field in package.json — presence is the
  claim; `{}` is the whole configuration for a fully covered surface. The
  consumer classifies that package's subpath specifiers
  (`@repo/billing/checkout.service`) by the stock naming rule applied to the
  specifier tail — extensionless suffix matching — **for subpaths on the exports
  surface only**: the tail must route to an exports key by Node's own resolution
  (a literal key, or a pattern key binding it); a specifier that reaches the
  package around its map (a tsconfig alias into sibling source, a deep path Node
  would refuse) is off the surface, and the field says nothing about it —
  unlabeled, today's trichotomy (review catch 2026-09-04: without this, an alias
  into source bypassed both the producer's verification and its `blob`
  disclosure). One key carves the claim: `blob`, subpath patterns the field does
  not cover — a listed subpath classifies abroad as if the package had no field
  (null, suffixed tail or not) and is exempt from the producer's own
  verification. Future keys (a `flavor` naming a publishable resolver — captured
  idea) arrive additively. The bare root entry (`@repo/billing`) carries no
  suffix, classifies to no layer, and behaves exactly as today: the fat root
  barrel stays what it is, an unlabeled surface.
- **Consumer patch** for non-aware packages: a config key mapping specifier
  patterns (the `external`-key two-wildcard patterns) to layers. Consumer-
  declared, reviewed, same trust class as `pureLibs`; wins over the producer
  field on overlap (the consumer is the reviewer of record for their own run).
- **Matrix crossing**: a layer-carrying external target enters the existing
  matrix as a target of that layer, cited per the exact in-set cell. `service`
  and `adapters` targets are assembly-only — rules 6/7 from the seal rows
  (service, adapters, blob), rule 1 from the inward-pointing ones (model, ports)
  — including adapter importing a sibling's adapter; a raw unlabeled SDK stays
  importable from adapters as today, the carrier is exactly what distinguishes
  the two. `assembly` targets bind every importer except blob (the in-set cell
  again: blob binds under the composition seals only). `model`/`ports` targets
  are **pure** for the importer — rule 4 satisfied by the crossed claim, no
  `pureLibs` line needed (trust ruling above) — pure, not lawless: the in-set
  cell still applies, so a model importing a crossed `ports` entry fires rule 1
  exactly as it would in-set (review catch 2026-09-04: the first cut skipped the
  matrix for model/ports). `blob` and absent classifications claim nothing:
  today's trichotomy, untouched — and `blob` from the consumer's
  `externalLayers` is the revoke: the target is back to unlabeled, the
  trichotomy decides.
- **Type-only** imports follow the in-set per-cell rule: exempt where the target
  layer owns a contract shape (service/adapters), binding for assembly targets,
  strict mode untouched.
- **Producer verification** — the field is a checked claim, not marketing: the
  producer's own gate verifies its exports surface. Every module target of every
  exports-map subpath (non-module targets — `package.json`, stylesheets — are
  not surface entries) is resolved to the graph's word: a source target by its
  own path; a built target through the **build mirror** — the declared output
  root swapped for its source root, every extension stripped, exactly one
  covered module at that path. No basename fallback: a name in `dist` is not a
  fact about a layer. For a subpath whose tail classifies to a layer, the
  reached module's layer must match. A subpath whose tail claims nothing but
  whose target is a composition unit or adapter — directly, or through a
  re-export chain inside the package (what an `assembly`-designated barrel would
  otherwise hide) — is surfaced (the laundering shape: an unlabeled entry
  fronting a service/adapter). The exports map _is_ the surface the field
  claims: a package declaring the field with no exports map is a provider error
  — `ConfigError`, exit 2 at home; abroad the field is ignored, no claim (ruled
  2026-09-04, rixo; the first cut let `main` stand in for the root). A **pattern
  entry** (`"./*": "./dist/*.js"`, Node's subpath patterns) is expanded the way
  Node resolves it, over the source side of the mirror. The target pattern is
  mirrored (`dist/*.js` → `src/*`); every covered stem matching it binds the
  star — one string, substituted in key and target alike, non-empty, slashes
  included — and yields one concrete subpath (`./checkout.service`), judged as
  if listed. A concrete subpath is kept only when Node would route it to this
  key: an exact literal key wins, else the pattern with the longest base, then
  the longest key — so a file reachable through two keys is judged once per
  subpath, under the key Node picks. The edges: a pattern matching no covered
  stem is unverified as itself; a key disclosed whole in `blob` (`./legacy/*`
  under `./legacy/**`) is retracted before expansion and never unverified; a key
  with two stars never matches in Node and is not an entry; a star-less target
  under a pattern key is one literal entry with the pattern as its claim; a
  target ending in the star (`"./*": "./dist/*"`, the consumer supplies the
  extension) is a module target — the star binds the stem and the concrete entry
  is judged extensionless, the verdict being the same whichever extension the
  consumer writes. The mirror is the producer's **promise** that the build is
  one-to-one — not a measurement — and expansion holds it to that promise: a
  bundled package has no honest mirror and declares `build: false`, at which
  point every built entry is unverified until listed with source targets or
  disclosed (verifying the promise against a build on disk is a captured idea,
  `--verify-build`). A subpath is **one claim** whatever its conditions: it is
  verified through any module target the graph reaches (the tsc declarations of
  a hybrid build verify a subpath whose runtime entry is a bundle under no root
  — ruled at the 0.0.4 trial), judged once per reached module, wearing the first
  target that reached it. A subpath not disclosed in `blob` that the graph
  reaches through none of its targets — under no mirror root, mapped to nothing
  covered, source left out of `include` — is **unverified**: not a violation, an
  uncertifiable run; reported in the resolution-failure lane (stderr block, one
  entry per subpath listing every target that missed, remedies naming `build`
  and `deblob.blob`, exit 2) after the real violations. This mechanically kills
  the laundering game — a package cannot claim a clean surface while exporting a
  mislabeled grab-bag, and cannot skip the verification by exporting its build —
  and catches honest drift after refactors, a moved source file whose built path
  the exports map still names included.
- `serviceRoot`, `private/`, rule 9/12 semantics do not cross: the seal holds;
  nothing is ever parsed through the boundary.

Out of scope: flavor selection in the field (the claim is always "the stock
naming rule holds on my surface, minus `blob`", which even a custom-flavor
producer may declare truthfully — `surface` verifies stock-read tails against
actual layers whatever the internal flavor; a producer whose naming diverges
gets fired at, at home, and discloses, drops the field, or fixes the surface. A
custom flavor is a nameless inline resolver today; naming one in the field —
publishable flavors — is a captured idea, deferred until a field case demands
it); an explicit per-subpath entries map beside the mirror (`build.entries`,
subpath → source file — the designed escape for renamed or bundled entries;
until then such entries are disclosed in `blob`); a non-strict knob turning
unverified entries into notes; the stamp-travels manifest (captured idea); any
whole-monorepo single-run mode; the `assembly` entry designation itself (it
remains valid config — a tool does what it is told; the producer verification
above is a check on _facts_, not a nanny on config).

## API

- Producer: `package.json` gains an optional `"deblob"` field —
  `{ blob?: string[] }`, subpath patterns (the two-wildcard grammar of
  `external`, over the exports subpath as written: `"."`, `"./legacy/**"`).
  Abroad, a matching subpath classifies null before the tail is consulted; the
  consumer's `externalLayers` still wins over both (reviewer of record). At
  home, a matching entry is exempt from `surface`. Consumers ignore keys they do
  not understand, and treat a malformed `blob` as absent (a stranger's
  package.json must never break a consumer's run, and a newer producer must stay
  readable by an older consumer — an older consumer stock-reads a disclosed
  suffixed tail, the harmless, stricter direction); the producer's own gate
  rejects keys it cannot honor and malformed `blob` patterns loudly (exit 2) —
  the claim is load-bearing at home, and a key expecting behavior this version
  lacks (a `flavor`, today) must not fail silent there.
- `DeblobConfig.build?: string | false | { mirror: Readonly<Record<string, string>> }`
  — the build mirror: output root → source root, root-relative directories.
  `"dist"` is the shortcut for `{ mirror: { dist: "src" } }` and the default;
  `false` declares no mirror (built targets are then unverified unless
  disclosed). Several roots are one record
  (`{ "dist/esm": "src", "dist/cjs": "src" }`); the longest root prefixing a
  target wins. Validation: non-empty root-relative directory paths, loud
  `ConfigError`. Producer-side config, never in the field: consumers never look
  at the resolved file, and the field carries claims, not how they are checked.
- `checkSurface(graph, surface, { classifyEntry, mirror, disclosed })` returns
  `{ violations, unverified }` — one `unverified` entry per subpath the graph
  reached through none of its module targets, carrying the subpath and its
  `targets`, each with the target as written, the extensionless path the lookup
  tried (`mapped`), the mirror that produced it
  (`mirror: { root, source } | null` — null when the target sat under no root
  and was looked up as itself), and the covered modules found at `mapped`
  (`candidates` — empty when none, two or more when the stem is ambiguous). A
  pattern key expanding through none of its targets is one entry as itself; a
  pattern key expanding through any target contributes its concrete subpaths and
  nothing for the targets that did not. A declaration file at a stem describes
  its sibling module and is not a second source: `src/x.d.ts` beside `src/x.js`
  reaches the `.js` (the `.d.ts` stays its own covered node for the other
  checks); alone, the declaration is the module (a types-only entry). Two
  non-declaration files at one stem (`src/x.ts` beside `src/x.js`) are the
  ambiguity the mirror never settles: the block names them and the remedy is
  `exclude` on the twin — an explicit entries map is the captured escape.
  Non-module targets (extension not in the module set nor its built counterparts
  — `.js`/`.mjs`/`.cjs`/`.jsx`, `.ts`/`.mts`/`.cts`/`.tsx`, `.d.ts` and its
  variants) are skipped before any of this. A violation reached through the
  mirror cites the **source** file (`file` = the reached node — the fix site,
  clickable), and its message names the built target it is exported as. A
  violation reached through a pattern carries the concrete subpath and concrete
  target (`subpath: "./api"`, `exported: "dist/api.js"`) — the pattern itself
  never appears in a violation, only in an unverified entry when it matched
  nothing.
- `FlavorResolver` gains optional
  `classifyEntry(subpath: string): FlavorLayer | null` — the naming rule over an
  extensionless exports subpath tail. Stock flavor implements suffix matching
  (`checkout.service` → service); `null` = no claim. In v1 both sides consult
  the _stock_ resolver's `classifyEntry` (the field claims the stock rule,
  independent of either side's configured flavor); the port method exists so a
  named flavor can carry its own rule later.
- `DeblobConfig.externalLayers?: Readonly<Record<string, Layer>>` — specifier
  pattern → layer, two-wildcard patterns as `external`; first declaration-order
  match wins; wins over producer fields — `blob` is the revoke (the target
  classifies null, the trichotomy decides, `pureLibs` back in charge).
  Validation: unknown layer names are loud `ConfigError`s.
- `EdgeTarget` external gains `layer: Layer | null` — the crossed identity,
  `null` = no claim (today's behavior everywhere).
- `extractGraph({ …, externalLayerOf? })` —
  `(specifier: string) => Layer | null`, compiled by assembly from the consumer
  patch + producer-field lookup; consulted for external leaves (declared
  externals included — an `external` pattern hit can still carry a patched
  layer). Extraction stays pure; all IO (reading package.json of resolved
  packages) lives adapter-side.
- `extraction/exports-map.model` — Node's exports map as pure knowledge, the one
  reading shared by the loader (`exportsSubpathsOf`, the map flattened to
  subpath → targets), the surface check and the meta reader (`exportsKeyFor`,
  Node's key resolution: literal wins, longest base, longest key, `null` off the
  surface). Abroad the meta reader's claim carries the map's keys and answers
  only for a tail that routes to one.
- `check layers`: a `layer`-carrying external target routes through the existing
  matrix-cell path with that target layer; a crossed `model`/`ports` target is
  pure for a pure-layer importer, no trichotomy consulted; `null` (absent,
  `blob`, revoked) keeps today's `pureLibs` trichotomy.
- New check `surface` (producer-side): reads the package's own exports map +
  graph, emits violations for claim/actual layer mismatches and for unlabeled
  entries fronting composition units or adapters, and reports unverified
  entries. Runs with the default check set only when the package declares the
  `deblob` field (no field, no claim, no check — additive).
- Exit path: violations print to stdout as today; unverified entries print to
  stderr after them, the twin of the resolution-failure block, exit 2, the
  resolution-failure class.
- Messages — the words, pinned here so the goldens have an authority. Existing
  surface violations keep their sentences
  (`is exported as "." — the entry claims service, the file is adapters; a declared surface must match the facts`
  /
  `an unlabeled entry fronting service (src/x.service.ts); the layer must be visible in the surface`);
  through the mirror the file line is the source and the sentence gains
  `(as dist/index.js)` after the subpath. The unverified block:

  ```
  surface unverified — 5 entries could not be reached; the claim cannot be certified
    dist/index.js
      exported as "." — mirrors dist → src, no covered module at src/index
    build/legacy/index.js
      exported as "./legacy" — under no build mirror root, not a covered module
    dist/x.js
      exported as "./x" — mirrors dist → src, 2 covered modules at src/x (src/x.ts, src/x.js), the mirror cannot pick one
    dist/themes.d.ts, dist/themes.js
      exported as "./themes" — mirrors dist → src, no covered module at src/themes
    dist/lib/thing.js, dist/types/thing.d.ts
      exported as "./thing" — dist/lib/thing.js: under no build mirror root, not a covered module; dist/types/thing.d.ts: mirrors dist/types → src, no covered module at src/thing

  remedies: name the output root your exports map points at via config key "build" (default "dist", mirroring src/ one-to-one; a record maps several roots), widen config key "include" if the source is there but uncovered (or "exclude" a twin when two covered modules share a path — src/x.ts beside src/x.js), or disclose the entry in package.json — "deblob": { "blob": ["./legacy"] } — which retracts the claim for that subpath: consumers see it unlabeled.
  ```

  Config errors, `ConfigError`, exit 2:
  `config key "build" must be an output directory ("dist"), false, or { mirror: { "<output dir>": "<source dir>" } } — got <json>`;
  `config key "build": mirror roots are root-relative directories — "<value>" is not`;
  `package.json "deblob".blob must be an array of subpath patterns ("." or "./…", wildcards * and **) — "<value>" is not`;
  `package.json declares "deblob" but no "exports" map — the exports map is the surface the field claims; declare one`;
  the unhonorable-key message amended to
  `this deblob version honors "blob" only`. Abroad, none of these fire: a
  malformed field is read as `{}`, a malformed `blob` as absent, a field with no
  exports map as no claim.

## Testing

- Matrix crossing: external target with layer service/adapters → fires from
  every non-assembly importer, cited per the in-set cell (adapter importing
  sibling adapter included), green from assembly; assembly-layer target binds
  all but blob; model/ports target from a pure layer is green with no `pureLibs`
  line — **the trust pin**: the crossed claim satisfies rule 4; and **the revoke
  pin**: the consumer's `externalLayers` mapping that subpath to `blob` brings
  unclassified-lib back (the override lane works, the reviewer of record wins).
- Type-only: exempt on service/adapters crossed targets, binding on assembly,
  `typeOnlyExempt: false` binds all.
- `classifyEntry`: stock flavor over extensionless tails — suffixed tails per
  layer, unsuffixed → null, tripwire tail never named in any list.
- Config: `externalLayers` validation (pattern rules as `external`, layer name
  whitelist), precedence over producer field, declaration order.
- Field reading: aware package in a fixture workspace → subpaths classify;
  missing field → unlabeled, run unaffected; field with keys the consumer does
  not understand → presence still honored, keys ignored, run unaffected;
  producer gate with a key it cannot honor (`flavor`, today) → exit 2; a subpath
  resolving to no file seen first (a declared-external stylesheet) teaches
  nothing and the next subpath still reads the claim — the order pin: the reader
  caches per package only once a manifest was reached.
- `surface`: the laundering shape as fixture — entry claiming nothing/model
  while target is an adapter → fires at the producer's own gate; matching
  surface → green.
- Build mirror: a built target reaches its source node (the default `dist` →
  `src`, a custom root, a two-root record with the longest prefix winning);
  every extension form strips (`.js`, `.mjs`, `.cjs`, `.d.ts`, `.d.mts`); the
  reached node feeds both shapes — a mismatch fires 3 through the mirror, a
  laundering root fires 2 through the mirror (the gap's own pin); no basename
  fallback: `dist/stripe.adapter.js` with no source behind it is unverified,
  never classified. `build: false` leaves built targets unverified. Non-module
  targets are neither verified nor unverified.
- Pattern entries: `"./*": "./dist/*.js"` over covered source binds the star per
  stem, across slashes, and judges each concrete subpath (an unlabeled `./api`
  fronting a service fires 2 wearing `dist/api.js`; a suffixed
  `./deep/thing.model` over an adapter fires 3); a literal key wins for the
  subpath it names and a different subpath to the same file is a different claim
  (`.` and `./index`); the most specific pattern wins — longest base, then
  longest key — regardless of declaration order; a pattern matching nothing is
  unverified as itself, under a root or not — unless disclosed whole, then
  retracted and silent; a star-less target is one literal entry claimed by the
  pattern; a target ending in the star binds the stem and judges extensionless
  (`./*` over `dist/*` is green over suffixed sources; `./*.model` over `dist/*`
  fires 3 per non-model source — the key's trailer is part of every claim); a
  two-star key is not an entry; disclosure trims the expansion on the concrete
  subpath; the bound string is substituted verbatim (a `$` in a name is a name).
  CLI: `patterned/` — one pattern key exporting everything, the unlabeled
  concrete subpath fires.
- Matrix crossing, the pure cells: a crossed `model`/`ports` is green from every
  row the in-set matrix allows, and a model importing a crossed `ports` entry
  fires rule 1 — `pureLibs` cannot silence it (the crossed cell never reaches
  the trichotomy).
- One claim per subpath (0.0.4 trial pins): two conditions reaching one module
  yield one finding wearing the first target; the hybrid build — declarations
  under a mirror beside a bundled entry under none — is verified through the
  declarations, no unverified entry, the finding names the `.d.ts`; a pattern
  key with one expanding target and one not is verified through the expanding
  one; every target missing is the unverified case, and the entry lists them
  all. Rendering: one block per subpath, targets on one line, one reason when
  they all missed the same way, target-prefixed reasons otherwise.
- Unverified: a target under no mirror root, a mapped path no module covers, a
  source target outside `include` — each reported with its reason; violations
  still print; exit 2; both blocks print when resolution also failed. The golden
  pins the block's wording and remedies.
- Surface gating abroad: a specifier whose tail routes to no exports key — an
  alias into sibling source, `@repo/billing/src/totals.model` against a map
  listing `./totals.model` — classifies null even when the tail is suffixed and
  even when the same file is disclosed under its listed subpath; a pattern key
  (`./legacy/*`) keeps everything it binds on the surface. `exportsKeyFor`
  pinned on its own: literal wins, longest base, longest key, non-empty star
  across slashes, two-star key dead (tripwire), off-surface null.
- `blob`: a disclosed pattern exempts at home (the laundering root, disclosed,
  goes green — the confession pin) and classifies null abroad even for a
  suffixed tail (the retraction pin); `externalLayers` still wins over a
  disclosure; a malformed `blob` abroad is ignored, at home exit 2; a producer
  gate honors `blob` (no unhonorable-key exit); pattern grammar shared with
  `external` (one matcher, tested once).
- CLI fixtures: consumer + aware sibling in one fixture tree, both directions
  proven (the seal fires from a non-assembly importer, the sibling's model is
  pure with no `pureLibs` line, `externalLayers: blob` revokes it); a package
  exporting its build under the default mirror, green with no config; the same
  shape under an undeclared root — the unverified block, exit 2; a disclosing
  package: laundering root listed in `blob` green at home, its disclosed
  suffixed subpath unlabeled from the consumer.
- Coverage bar unchanged (100% / four axes).

## Implementation

Extraction: `layer` on the external leaf, populated via the injected
`externalLayerOf` at every external construction site uniformly (declared,
builtin, out-of-coverage); no engine/port change beyond the optional flavor
method. `packageNameOf` and a runtime `LAYERS` vocabulary moved to `graph.model`
(knowledge → model; config validation and the meta reader both need them).
Adapter-side: `package-meta.adapter` — resolve the specifier via the injected
engine resolver from a root anchor, walk up to the nearest _named_ manifest
(nameless `{"type":"module"}` markers stepped over), read the `deblob` field,
cache per package name; a stranger's broken manifest degrades to unlabeled by
design. The stock naming rule ships as the named export `classifyStockEntry`
(also attached to the resolver as `classifyEntry`), so assembly wires the
boundary lookup without holding a resolver instance. Layers detector: the
crossed-layer branch ahead of the pure-layers gate, reusing `moduleCellRules` —
in-set citation exactness for free. `surface`: pure detector over the loader
adapter's `readPackageSurface` (exports flattened subpath → targets; a field
with no exports map, unhonorable field keys, and malformed `blob` patterns are a
`ConfigError`, exit 2; the parsed `blob` rides on the surface) + graph. Target
resolution is one pure operation in the model: skip non-module targets; pick the
longest mirror root prefixing the target and swap it for its source root (a
target under no root keeps its path); strip every module extension form; look
the extensionless path up in an index of covered modules built once per run —
one hit is the node, otherwise the entry is unverified with its reason. A
pattern entry goes through the same mirror step on its target pattern, then
matches the mirrored pattern against the sorted stem index (prefix, suffix,
non-empty middle), binds the star, substitutes it back into key and target
(function replacer — a `$` in a name is literal), keeps the concrete entry when
Node's key comparison routes it here, and feeds each one to the same resolution
and verdict as a literal entry. Disclosed subpaths are filtered on the concrete
subpath, before resolution. The fronting closure follows in-coverage re-export
edges from the reached node, smallest hit for determinism. Violations cite
existing rules — 3 for claim-mismatch, 2 for unlabeled-front — no rulebook
growth; unverified entries cite nothing (no rule was broken). Config: `build`
validated and normalized to the mirror record in the config service. Abroad:
`package-meta.adapter` reads `blob` next to presence, compiles it with the
`external` grammar, and `externalLayerOf` consults consumer patch → on the
producer's exports surface at all → producer `blob` → tail. That grammar
(`specifierPattern`, `specifierMatcher`) moved from the config service to
`graph.model` — knowledge → model, as `packageNameOf` and `LAYERS` before it:
config, the surface check's assembly, and the meta reader all need it, and the
first cut's extraction → config import was a rule-13 cycle our own dogfood
caught. Render: new check name in listings/help; `renderUnverified`, the twin of
`renderUnresolved`; the unclassified-lib message no longer mentions a crossed
claim (a crossed model/ports never reaches it). Layers detector: one crossed
branch for every carried layer but `blob` — the in-set cell for the target
layer, a violation where the cell forbids, and `continue` either way: a legal
cell is pure for the importer and never reaches the pure-layers gate. Assembly
prints both stderr blocks when both apply and returns 2. CLI fixtures: `aware/`
(consumer + vendor sibling resolved through a committed workspace-style
node_modules symlink, both directions — the zero-config monorepo story:
pnpm/npm/yarn all materialize siblings as symlinks the resolver follows
natively, so no alias and no config key are needed; yarn PnP has no node_modules
and stays out of scope), `declaring/` (the field-found laundering shape at the
producer gate), `field-newer/` (unhonorable key, exit 2).

## Docs

- `packages/deblob/README.md`: checks list gains `surface`; config table gains
  `externalLayers` and `build`; the `deblob` field documented with `blob` and
  the precise claim it makes (every subpath not listed is verified at the
  producer's gate); the unverified outcome stated plainly — no green until
  mapped or disclosed, and what disclosure costs abroad; the Monorepos-relevant
  paragraphs state the ruling: flavors classify locally, layers travel; claims
  cross, trust is the dependency model, `externalLayers: blob` revokes; one
  sentence on drift (a stale published field is a stale semver, no worse); two
  on pattern entries and the mirror as a promise (`build: false` for bundles).
- `skills/deblob/references/setup.md`: monorepo section rewritten — sibling
  identity via the `deblob` field / suffixed subpaths; published packages: the
  default mirror covers a one-to-one build, `build` names another root, `blob`
  discloses what cannot be reached; plus the teaching line: an entry point is a
  contract surface; `assembly` designation is for composition roots, not for
  silencing rule 2, and assembly globs deserve `pureLibs`-grade review.
- `docs/architecture.md`: settled at implementation — pure tooling. The crossing
  reuses the existing matrix cells and cites existing rules (2, 3 for
  `surface`); architecture.md is untouched.
- History untouched; chapter PLAN queue gains this entry; Ideas gains the
  stamp-travels manifest card and the `--verify-build` card (hold the mirror to
  its promise against a build on disk, flag not config key, CI default); two
  older cards' trust phrasing updated to the ruling.
