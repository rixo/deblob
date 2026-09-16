# Step 02 — the flavor names factories

Opened 2026-09-16 from step 01's landing (`5cdf4a3`). Step 01 gave the checker a
reading of every file: calls classified by callee, results followed, hooks cut.
One classification it could not make: a model export is either a factory or a
function, and the import cannot tell them apart. Canon says who can — "the
flavor is what tells a factory from a function" — and three things wait on that
word: the model-callee case of the assembly reader (row 37), the root-factory
call of `stateless-modules`, and the readonly check that canon states next to
it. This step delivers the word and what it changes in the reading. It judges
nothing: the detectors are 03's.

Canon is the contract:
[Assembly](../../../docs/architecture.md#assembly--the-composition-root) ("what
an assembly imports"), the `stateless-modules` rule, and the chapter PLAN's
rulings (`stateless-modules` restated; "flavors identify factories — a step of
this chapter"). Step 01's "Landed" sections are the truth of what exists; its
row 37 decision is what this step widens. Written against 03's proto; the
amendments 03 takes are listed at the end.

Also in this step, because it was found dogfooding the reader between the two
steps and is a one-predicate fix: call sites in test files no longer veto the
parameter bindings of production files (see § The graph pass).

## Goal

After this step:

- **A factory is named.** The flavor answers, from an export name alone, whether
  it is a factory. The stock flavor's rule is the implementation guide's
  convention: `create` followed by a capital — `createIconsService`,
  `createNodeFs`; not `create`, not `createdAt`. A flavor without the rule names
  nothing, and the reading is what it was after step 01.
- **The reading uses it.** A model callee the flavor names is a `factory` of
  layer `model`: its result is an instance, whatever the flow. A model callee
  the flavor does not name stays `model`, bound by result flow as row 37 ruled.
  A local function the flavor names is a factory too — the rule is over names,
  and a `createStore()` at a model root is the same call whether `createStore`
  was imported or defined three lines up.
- **A root factory call is a fact.** The reading already lists root calls with
  their callee; now the callee kind says `factory` for every factory canon
  means, so 03's `stateless-modules` detector reads one thing: a root `call`
  statement whose callee is a factory, in any file — the boot's one call is a
  `wiring` callee and a spec file's registration is a `tech` callee, so neither
  needs an exemption from this half.
- **Readonly is a fact, checked by default.** Every root definition carries
  whether its immutability is visible in the syntax; 03's detector flags the
  ones where it is not, and a codebase without the types turns the check off
  with one config key. Ruled 2026-09-16 (rixo), reversing the "opt-in" of the
  first ruling: a rule the tool states and does not enforce is not a rule, the
  escape costs one line, and a default is easier to loosen later than to
  tighten.
- **Test sites do not bind.** A parameter of an assembly function or a wiring
  function is bound at its production call sites; a spec file handing a fake
  does not turn the binding to unknown.

Out of scope: the detectors, violations and explain cards (03: the root-call
half of `stateless-modules`, the readonly detector, the assembly's model-factory
case); the CLI shows nothing of this step; the alignment table (04); slugs (06);
board row 53 (ruled toward 03's readers, not touched here). Canon: one sentence,
the readonly default (§ Docs).

## API

### The flavor's word

The naming convention is the flavor's axis, and factory naming is a naming
convention — the stock flavor is called `ts-suffixes-factories` for a reason. So
the word lands on the flavor port, next to the two naming rules it already
carries (paths, and export subpaths across packages), not on a port of its own:

```ts
// extraction/ports/flavor.port.ts
interface FlavorResolver {
  // …classify, classifyEntry, typeOnlyExempt as today
  /**
   * The naming rule over an export name — whether the flavor reads it as a
   * factory. Consulted where the file kind does not already decide (a model
   * export, a pure package's export, a local function). Optional: a flavor
   * without it names no factory, and a model call stays bound by its result
   * flow. Name only, no file content: the reader hands the name it resolved.
   */
  isFactory?(name: string): boolean
}
```

Stock rule, in `ts-suffixes-factories-flavor.adapter.ts`: `/^create[A-Z]/`.
`init<Name>` is the guide's name for an assembly entrypoint, and an assembly's
exports are factories by file kind already; the rule does not list it. A flavor
whose convention needs the file's path adds the parameter with the case that
needs it, as the tech port does for a cut of its own.

The extraction service hands the reader the flavor's answer as plain data, the
way it hands `importTargetOf` today: `readModule({ …, isFactory })`, a function
over a name, defaulting to "no" when the flavor has none. The reader keeps
taking no port.

### The kinds table, widened

Step 01's table, two rows changed and one added. The operation is the same:
callee by the root binding, and where the binding's target is a kind that does
not decide by construction, the flavor's word decides.

| Root resolves to                                       | Callee kind, after this step                                                                 |
| ------------------------------------------------------ | -------------------------------------------------------------------------------------------- |
| import → module of layer `model`                       | `factory` with `layer: "model"` when the flavor names the export; else `model` as today      |
| import → external: pure (config `pure`, pure builtins) | same rule: `factory` with `layer: "model"` and `path` the specifier when named; else `model` |
| a local `function` binding                             | `local` as today, now carrying `factory: boolean` — the flavor's word on the name            |

Types (`graph.model.ts`): `CalleeKind`'s `factory` member and `InstanceOrigin`
gain `"model"` in their `layer` union; the `local` member gains `factory`. The
result of a factory call is an instance with its origin, as for the other
layers. The result of a local factory call is an instance with `origin: null` —
an instance no factory file traces, the same `null` a `use-case` already carries
when the reader cannot see the factory. A local function the flavor does not
name keeps a `computed` result.

What follows for the consumers, stated so 03 reads it here and not in the code:

- **Assembly, row 37 widened.** A model factory call in an assembly is a factory
  call, legal under `assembly-builds-only` whatever its result reaches; a shared
  model instance in the returned record is legal by that route. A model function
  call stays bound by flow: legal iff its result feeds a factory argument.
- **A member called on a model instance is a `use-case`** by the existing rule
  (a binding of kind `instance`, member chain). In an assembly that is a call
  that is not a factory call — red in 03, as canon wants: an assembly decides
  nothing on an instance. In a driver hook it is a use case whose origin is a
  model file; `useCaseLevels` skips it, as it skips an adapter's — only a
  service factory ends a trace, and an origin in neither a service nor an
  assembly is the driver rules' business, not a level. Whether a driver may call
  a model instance is `driver-calls-services-only`'s question, 03's.
- **Root calls.** A root `call` statement with a `factory` callee (any layer) or
  a `local` callee with `factory: true` is the shape 03's `stateless-modules`
  detector fires on, in every kind. A root call with a `model` or `language`
  callee is not that shape: canon lets a pure call with an immutable result
  through, and immutability is the readonly fact below.

Nothing else in the table moves. Service, adapter, assembly and blob exports
stay factories by file kind; the flavor is not asked about them. A `model`
callee's `name` was already on the payload, so the flavor's word costs the
reader one lookup at the two rows.

### Readonly, the fact

Canon: "a call at module root is legal only when its callee is declared pure and
its result immutable"; "readonly-typed root bindings are an opt-in check for
typed codebases" — the opt-in reversed by this step's ruling, canon's sentence
edited with it (§ Docs). Purity is the callee's layer, above. Immutability is
what a type checker would know and this reader does not run one, so the fact is
syntactic: **a root binding is readonly-typed when its own declaration says so
in a form the reader can see.** The `definition` statement gains
`readonly: boolean`, in every file kind, for every root definition.

`true` when the definition is:

- a `function`, `class` or `enum` declaration — code, not state;
- a `const` whose initializer's value is a primitive by its form: a literal
  (regex included — a value, not state), a template (holes or not, it is a
  string), a unary or binary operator's result, `undefined`, a logical or
  conditional expression whose arms both qualify;
- a `const` whose initializer is a function or class expression, an `as const` /
  `<const>` assertion, or an assertion to a readonly type (the reader unwraps TS
  expressions today; this reads the wrapper before unwrapping — `satisfies`, `!`
  and parentheses are looked through);
- a `const` whose initializer is `Object.freeze(…)` — canon's own example;
- a `const` whose type annotation is a readonly type at its top: `Readonly<…>`,
  `ReadonlyArray<…>`, `ReadonlyMap<…>`, `ReadonlySet<…>`, `readonly T[]`, or a
  union or intersection of those; a primitive keyword (`string`, `number`,
  `boolean`, `bigint`, `symbol`, `null`, `undefined`) or a literal type
  (`"a" | "b"`, `42`) — a primitive is immutable by nature, so a call result
  annotated `: string` is readonly without inference.

`false` otherwise: a `let` or `var`; a `const` bound to a call result, a record
or array literal without `as const`, `new Map()`, a member read, another binding
(`const x = y` — the reader does not follow it), an awaited value; a `const`
whose annotation is a type alias — the reader cannot see through
`type Table = Readonly<…>`, and the check asks for the readonly to be visible at
the binding. The declarator is readonly when its annotation says so **or** its
initializer does: `const u: string | Thing = "u"` is readonly by the literal. A
destructured `const` reads the whole declarator:
`const { a, b } = Object.freeze(…)` is readonly, `const { a } = FROZEN` is not —
the reader follows no binding. A default export of an expression is `readonly`
by the same initializer rule.

This is a heuristic, and it says so: oxc hands the syntax with its type
annotation nodes and nothing more — no alias resolution, no inference — so the
fact is "readonly is written at the binding", not "readonly-typed" in the
checker's sense. The holes are typing holes, and they are on the strict side: an
alias that is readonly underneath, a helper that returns `Readonly<T>`, both
read `false` and get flagged; the one lenient hole,
`Readonly<{ items: string[] }>` mutable inside, is TypeScript's own shallowness.
Accepted for this step (rixo, 2026-09-16); resolving what can be resolved
without a type server — an alias in the same file, then across an import — is
carded on the chapter board as a later iteration, low priority. What the fact
does not buy besides: that the value is not mutated through another binding;
anything about a binding the flavor's layer already forbids (an adapter instance
at a model root is red by import first).

### Config key

`mutableModuleState?: boolean` — default `false`. The key names what it permits,
in canon's own words for what `stateless-modules` forbids, like `pure` names
what it declares ("roots" rejected 2026-09-16: the word already means service
root, project root and import-graph root here): `true` says module-level
bindings may be mutable-typed, and 03's `stateless-modules` detector stops
flagging root definitions with `readonly: false`. The other two halves of the
rule — a root factory call, a root call into tech — stay red whatever the key
says. Absent or `false` is the check on. The escape for a codebase without the
types, one line, and it leaves a trace in config like `pure` and `driverTech`
do. `KNOWN_KEYS`, `ResolvedConfig.mutableModuleState`, one `ConfigError` for a
non-boolean, like `typeOnlyExempt` — the precedent for a boolean that loosens a
check, and the reason the key is the loose mode and not the strict one: a switch
reads as "what I allowed", never "what I forgot to turn on". Not a flavor
property: the flavor names things, and a type annotation is the language's, not
a naming choice.

Measured on deblob's own tree before the ruling (2026-09-16), by grep, the
reader not yet reading the fact: 33 root bindings with a record, array, `new` or
call initializer, 24 visibly readonly, 9 to flag. Eight are the rule working —
mutable `Set`s and arrays used as constants, two records typed with a mutable
alias (`NO_COLORS: Colors`, `Colors` has no `readonly`) — each a one-line fix.
One is the heuristic: a `fileURLToPath(…)` result, a `string` the reader cannot
infer; `: string` on the binding closes it under the primitive-keyword form
above.

### The graph pass

`paramBindingsOf` joins a parameter's kind over every call site of an assembly
function or a sub-driver's wiring function from another outside-kind file. Test
files are outside kinds, so a spec calling `main(fakeIo)` joined `tech` with
`unknown` and every call on `io` inside `main` went open (found on the viewer
tree: `snapshot/main.ts`, `cli/main.ts`). The rule: **a site in a `test`-kind
file does not bind.** A test hands fakes; canon already says a test hook never
labels a primary use case, and a test's argument is no evidence of what
production hands. One predicate on the site's module kind, before the join. What
it costs: a sub-driver only tests call stays `unbound-parameter`, open —
correct, nothing in production calls it.

### Amendments to 03's proto

- `stateless-modules` detector: root call to a factory = a root `call` statement
  whose callee is `factory` (any layer, `model` included) or `local` with
  `factory: true`; test registration needs no exemption from this half (its
  callee is `tech`); the boot's one call is `wiring`. The readonly half reads
  `definition.readonly` unless `mutableModuleState`.
- `assembly-builds-only`: a `model` callee is legal iff its result flows to a
  factory argument; a `factory` callee of layer `model` is legal outright; a
  `use-case` callee whose origin is a model file is not a factory call.
- `AssemblyViolation` gains no shape: `non-factory-call` covers the model
  function whose result is not a factory argument, with the callee named.
- Config: `mutableModuleState` joins the keys 03 lists.

## Testing

Contract tests through the public functions, fixture files with invented names,
`test()` not `it()`.

- **Flavor** (`ts-suffixes-factories-flavor.adapter.spec.ts`): the rule over
  names — `createSomeMadeUpService` yes; `create`, `createdAt`, `creates`,
  `initSomething`, `default` no.
- **Reader** (`reader.model.spec.ts`, the `isFactory` argument as a test-side
  predicate):
  - a model import the predicate names: callee `factory` with layer `model`,
    result `instance` with an origin of layer `model`; bound and member-called,
    the member is a `use-case` with that origin;
  - a model import it does not name: `model`, result `computed`, as before;
  - a pure external's export named: `factory` layer `model`, `path` the
    specifier;
  - a local function named: `local` with `factory: true`, result `instance`,
    origin `null`; a local not named: `factory: false`, result `computed`;
  - no predicate given: every model callee reads `model` — the flavor without
    the rule is step 01's reading;
  - root calls: a root `const x = createSomeMadeUpThing()` from a model import
    is a root `call` with a `factory` callee and a `definition` of value
    `instance`;
  - **readonly, one fixture, one root definition per form**: each `true` form
    and each `false` form listed above, the destructured case, the default
    export case, a `let`; the annotation forms parsed from real TS syntax (the
    oxc adapter's program), not hand-built nodes.
- **Reading on the graph** (`extraction.service.spec.ts`, the `reading/` fixture
  project): the stock flavor's word reaches the reader — a model factory called
  from `cli.assembly.ts` reads `factory` on the graph; the test-site rule — a
  spec file in the fixture calling `sub.driver.ts`'s wiring function with a bare
  `unknown` while the production site hands a tech value: the parameter binds
  `tech` (today it would read `unknown` and the hook's calls would be open).
- **Levels** (`levels.model.spec.ts`): a use case on a model instance from a
  driver hook is neither primary nor unresolved — skipped like an adapter's.
- **Config**: `mutableModuleState` `true`/`false`/absent resolve; a non-boolean
  is a `ConfigError` naming the key.
- **Self-read**: unchanged from 01 — runs, throws nothing. deblob's own tree has
  `createExtraction`, `createTsSuffixesFactoriesFlavor` and the rest; the
  classified counts stay unpinned (04's table pins what matters).
- **Gate**: `pnpm typecheck` green (the widened unions are total by the
  compiler); coverage as today; self-check zero violations; prettier clean; the
  suite red only on the two `rule-content` slug assertions (06).

## Implementation

Contained checkpoints, each handed back, building toward one commit.

1. **The graph pass.** The test-site predicate in `paramBindingsOf`; the fixture
   spec file; the test. Smallest, and it changes numbers on real trees
   independently of the rest.
2. **The flavor's word.** Port method; stock rule; `readModule` takes
   `isFactory`; the service passes the flavor's, defaulting to `() => false`;
   the two table rows and the `local` payload; `CalleeKind` / `InstanceOrigin`
   layer unions; `levels.model.ts` treats a model origin as it treats an
   adapter's (the `switch` is total, the compiler says where); reader, service
   and levels tests.
3. **Readonly.** `readonly` on the `definition` statement, read off the
   declarator's annotation and the initializer before unwrapping; the config
   key; the forms fixture; config tests.

Not in this step: any detector. 03 opens on this step's landing plus 01's, its
proto amended in place with the section above.

### Landed — checkpoint 1, 2026-09-16

- `paramBindingsOf` skips `test`-kind modules; fixture
  `reading/src/sub.driver.spec.ts` hands the sub-driver two unknowns and the
  production site's bindings hold.

### Landed — checkpoint 2, 2026-09-16

What the code settled against the sketch above:

- `FlavorResolver.isFactory?(name)`; the stock rule is `isStockFactoryName`
  (`/^create[A-Z]/`), exported by name next to `classifyStockEntry` and riding
  the resolver instance.
- `graph.model.ts` names the union once: `FactoryLayer` = service, adapters,
  assembly, blob, model — `CalleeKind.factory.layer` and `InstanceOrigin.layer`
  both read it. `local` carries `factory: boolean`.
- The reader takes `isFactory` as plain data, defaulting to "no"; one helper
  (`modelCallee`) serves the covered model file and the pure external, so the
  two rows cannot drift. A local factory's result is an instance with
  `origin: null`; a plain local's stays `computed`.
- The service passes `flavor.isFactory?.(name) ?? false` — a flavor without the
  rule reads as step 01 did, proven through the service with a flavor stub
  carrying `classify` only.
- `levels.model.ts` unchanged: an origin that is neither a service nor an
  assembly is already "not a service" — skipped, not listed unresolved. The
  sketch above said "unresolved" for the model origin; the code's existing
  treatment of an adapter's origin is the right one (the driver rules'
  business), and the sketch is corrected in place.
- Fixtures: `__fixtures__/reader/factories.ts` (the six name cases and a root
  factory call); `reading/src/other.driver.ts` gained one hook line on the model
  instance. `cli.assembly.ts`'s `createRegistry` now reads `factory` of layer
  `model` on the graph with the stock flavor.

### Landed — checkpoint 3, 2026-09-16

- `definition.readonly` on every root definition, in every kind. Three pure
  helpers before `readModule`: `isReadonlyType` (the annotation's top:
  `Readonly*` names, the `readonly` operator, primitive keywords and literal
  types, unions / intersections / parentheses of those),
  `isImmutableInitializer` (the initializer's form: literal, template, unary,
  binary, `undefined`, logical and conditional by both arms, function and class
  expressions, `as const` / `<const>` / an assertion to a readonly type,
  `Object.freeze`, seen through `satisfies`, `!` and parentheses),
  `isReadonlyDeclarator` (a `const` whose annotation or initializer qualifies; a
  destructuring pattern reads the whole declarator). A declaration of code —
  function, class, enum — is `true`; a default-exported expression by its form;
  `let` and `var` never.
- The census widened while writing the fixture, and the section above was
  corrected to match: a regex literal is a value; a template is a string with or
  without holes; operators yield primitives; a binding as initializer is not
  followed (`const { a } = FROZEN` reads `false`).
- Config: `mutableModuleState?: boolean`, default `false`, `ConfigError` on a
  non-boolean, `ResolvedConfig.mutableModuleState`. No consumer yet — 03's
  detector reads it. Not wired into `main.ts` (nothing to hand it to).
- Fixture `__fixtures__/reader/readonly-forms.ts`: 47 root definitions, one per
  form on both sides, read as a model file so `const` functions stay root
  definitions; the test pins the count so a form added to the fixture without an
  expectation fails.

## Docs

- `lib/extraction/README.md`: the flavor's third naming rule (`isFactory`), the
  two widened table rows and the `local` payload, the `readonly` fact and its
  forms in one line, the test-site rule of the graph pass.
- `lib/config/README.md`: `mutableModuleState`.
- `03_outside-rules/SPEC.md`: the amendments above, dated.
- Chapter PLAN: step 01's landing sha written; step 02 entry closed with its
  sha; the Ideas card "Readonly-typed root bindings as a strict-flavor check"
  dissolved into this step (it is a config key, not a flavor) and replaced by
  the typing-holes card; the readonly ruling recorded under Rulings.
- `docs/architecture.md`: one sentence in `stateless-modules` — "an opt-in check
  for typed codebases" becomes checked by default, with the config key as the
  way out for a codebase without the types. Nothing else; the convention this
  step reads was already written in the implementation guide.
