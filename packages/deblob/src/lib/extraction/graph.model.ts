/**
 * The classified import graph — the one value every detector consumes.
 *
 * Paths are POSIX-style, relative to the graph's `root`. External targets
 * (packages, builtins, files outside the coverage set) are leaves: never
 * parsed, never expanded.
 */

/**
 * The file kinds: the hexagon (model, ports, service), its adapters, the three
 * outside kinds that build and fire it (assembly, driver, boot), the test kind
 * — assembly and driver in one — and blob, the unqualified rest. A closed
 * union: every switch and record over it is total by the compiler.
 */
export type Layer =
  | "model"
  | "ports"
  | "service"
  | "adapters"
  | "assembly"
  | "driver"
  | "boot"
  | "test"
  | "blob"

/** The layer vocabulary as a value — config validation enumerates through it. */
export const LAYERS: readonly Layer[] = [
  "model",
  "ports",
  "service",
  "adapters",
  "assembly",
  "driver",
  "boot",
  "test",
  "blob",
]

/**
 * Extraction's failure vocabulary. One code today: the config designated one
 * file under two kinds — the user's to fix, so the driver presents it. A parse
 * failure is the next candidate and still throws bare.
 */
export type ExtractionErrorCode =
  "designation-conflict" | "load-file-not-covered"

export class ExtractionError extends Error {
  override name = "ExtractionError"
  readonly code: ExtractionErrorCode
  // no parameter property: the package runs on Node's type stripping, which
  // accepts erasable syntax only
  constructor(code: ExtractionErrorCode, message: string) {
    super(message)
    this.code = code
  }
}

/**
 * The discriminant, duck-typed on the name like `isConfigError`: `instanceof`
 * breaks across package boundaries and realms, a name travels. `code` tells the
 * failures apart once there are several.
 */
export const isExtractionError = (error: unknown): error is ExtractionError =>
  typeof error === "object" &&
  error !== null &&
  (error as { name?: unknown }).name === "ExtractionError"

/**
 * The presentable failure, or the bug kept flying — `asConfigError`'s twin for
 * a catch that expects extraction's own errors and nothing else.
 */
export const asExtractionError = (error: unknown): ExtractionError => {
  if (isExtractionError(error)) return error
  throw error
}

/**
 * Bare-specifier package name (`zod`, `@scope/name`, `node:path`); `null` for
 * relative/absolute specifiers.
 */
export const packageNameOf = (specifier: string): string | null => {
  if (/^[./]/.test(specifier)) return null
  const nameStart = specifier.startsWith("@") ? specifier.indexOf("/") + 1 : 0
  const slash = specifier.indexOf("/", nameStart)
  return slash === -1 ? specifier : specifier.slice(0, slash)
}

/**
 * Specifier pattern → anchored regex. Not picomatch: its `**` only crosses `/`
 * as a whole path segment, so `$theme:**` silently degrades to `$theme:*` and
 * misses `$theme:a/b.scss` (field-measured). A specifier is one string, not a
 * path — here `**` is any run of characters and `*` any run without `/`. The
 * one grammar for `external`, `externalLayers`, and the manifest's `blob`.
 */
export const specifierPattern = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split("**")
      .map((piece) =>
        piece
          .split("*")
          .map((literal) => literal.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"))
          .join("[^/]*"),
      )
      .join(".*")}$`,
  )

/** Any of the patterns matches — the compiled predicate. */
export const specifierMatcher = (
  patterns: readonly string[],
): ((specifier: string) => boolean) => {
  const compiled = patterns.map(specifierPattern)
  return (specifier) => compiled.some((regex) => regex.test(specifier))
}

/**
 * What a flavor can say about a file: any kind, from the path alone. The stock
 * flavor reads the outside kinds from their suffixes (`.assembly.ts`,
 * `.driver.ts`, `.boot.ts`); recognition lays a single-kind reader's binding
 * (the test runner's naming → `test`) and the caller's designation matchers
 * (`assembly`, `drivers`, `boot` config globs) on top, for a framework that
 * owns the file name.
 */
export type FlavorLayer = Layer

/**
 * One non-erasable top-level entry of a module — the fact `ports-types-only`
 * reads. `form` is the declaration keyword as written (`const`, `function`,
 * `enum`, …), `"default"` for `export default` expressions, `"statement"` for
 * any other non-erasable statement; `name` is `null` where the grammar gives
 * none.
 */
export type RuntimeEntry = {
  form: string
  name: string | null
  exported: boolean
}

export type ModuleNode = {
  path: string
  layer: Layer
  /**
   * Path of the owning service-root directory, `null` for files belonging to no
   * service (top-level blob).
   */
  serviceRoot: string | null
  /** Inside a `private/` subtree of its service. */
  isPrivate: boolean
  /**
   * `false` when the engine has no extractor for this file kind (`.svelte`, …):
   * the node is an edge target but contributes no outgoing edges.
   */
  parsed: boolean
  /**
   * Non-erasable top-level entries, statement order — empty for types-only
   * files and for `parsed: false` nodes (no claim). Import and re-export
   * statements are edge facts, never listed here.
   */
  runtimeContent: readonly RuntimeEntry[]
  /**
   * What the reader saw: root statements for every parsed file; functions and
   * hooks for the outside kinds, cut with the file's tech, every function bound
   * by its first world. `null` when the engine parsed nothing, or when the file
   * is of an outside kind no tech covers — recognized and open.
   */
  reading: FileReading | null
  /**
   * The file read once per world: an exported function has one world per
   * distinct argument vector its production call sites hand it, and each
   * world's reading binds that function from that site, the others from their
   * first. A rule judges the named function in every world as if that site were
   * the only caller, and carries the site. Empty for a file nothing calls
   * across files — its parameters unknown, its one reading `reading`.
   */
  readings: readonly WorldReading[]
}

/** One binding of an exported function: the site, and what it handed. */
export type World = {
  /** The function bound, by export name (`"default"` for the default export). */
  name: string
  /** The production call site whose arguments bind it — the inducing site. */
  site: { path: string; span: Span }
  args: readonly ArgValue[]
}

export type WorldReading = { world: World; reading: FileReading }

/** The driver rules a tech's shape exempts (`test-is-outside`). */
export type Exemption =
  "registration" | "call-count" | "services-only" | "definitions"

/** Byte offsets plus the 1-based line and column, so nothing reopens the file. */
export type Span = { start: number; end: number; line: number; column: number }

/**
 * What a value is, by what it is bound to: a literal (records and arrays of
 * allowed values included); the tech's (an import a tech claims, a host global,
 * a member or result of one, a hook's parameter); an instance (a factory
 * result, a member of one); a function; anything computed (an operator, a
 * language call, a `let` reassigned); or unknown (a parameter no call site
 * binds, a node the reader does not know).
 */
export type ValueKind =
  "literal" | "tech" | "instance" | "function" | "computed" | "unknown"

/**
 * Where an instance came from: the factory call that built it, by export, and
 * the factory file's kind — an origin in an assembly is a record the reader
 * cannot see through; an origin in a model file is a factory the flavor named
 * (a pure package's, `path` is the specifier).
 */
export type InstanceOrigin = {
  path: string
  name: string
  layer: FactoryLayer
}

/**
 * The kinds whose exports read as factories: by construction, or by the
 * flavor's word for `model`.
 */
export type FactoryLayer =
  "service" | "adapters" | "assembly" | "blob" | "model"

/** An argument as passed: its kind, and for an instance where it came from. */
export type ArgValue = {
  kind: ValueKind
  origin: InstanceOrigin | null
  /** Member path from the origin's result (`services.app` passed on). */
  path: readonly string[]
}

/**
 * What a callee is, by the binding at the root of its reference chain — the one
 * table every outside rule reads (step 01 SPEC § Callee and value kinds).
 */
export type CalleeKind =
  | { kind: "factory"; layer: FactoryLayer; path: string; name: string }
  | { kind: "wiring"; path: string; name: string }
  /** A model export the flavor did not name a factory: bound by result flow. */
  | { kind: "model"; path: string; name: string }
  | { kind: "forbidden-import"; layer: "ports" | "boot" | "test"; path: string }
  | { kind: "tech"; package: string | null }
  | { kind: "unclaimed"; package: string }
  | { kind: "language" }
  /**
   * A local function the reader does not see whole — exported, passed as a
   * value, or called from inside its own inlining; `factory` is the flavor's
   * word on its name. A tracked local (non-exported, only ever called directly)
   * is read at its sites and never a callee.
   */
  | { kind: "local"; name: string; factory: boolean }
  | { kind: "use-case"; member: string; origin: InstanceOrigin | null }
  | { kind: "unknown" }

/** One place a call's result reaches. */
export type ResultUse =
  | { kind: "argument"; to: CalleeKind }
  | { kind: "returned" }
  | { kind: "condition" }
  | { kind: "member" }
  | { kind: "entry" }
  | { kind: "reassigned" }
  | { kind: "computed" }
  | { kind: "discarded" }

export type ReadCall = {
  span: Span
  callee: CalleeKind
  args: readonly ArgValue[]
  /** Every context the result reaches — a bound result's uses, or its own. */
  result: readonly ResultUse[]
  /**
   * For a `use-case` callee: the declared config load it matches, if any — by
   * member name, and by file when the instance is traced to a factory that is
   * not an assembly's record. A matched load's result is a tech value.
   */
  load: { file: string; name: string } | null
  /**
   * A call into the runner the file's own reader claims, where that reader
   * exempts registration — a spec file's `describe`, `vi.mock`,
   * `expect.extend`: the calls `stable-root` exempts by kind.
   */
  registration: boolean
  /**
   * Every argument is the runner the file's own reader claims, handed on —
   * `registerMatchers(expect)`: a shared driver's wiring function called with
   * the runner, not with any tech.
   */
  handsRunner: boolean
  /**
   * For a call read inside a tracked local's body: the root call that ran the
   * body, the outermost when locals nest — where the call runs on import from.
   * `null` for a call written where it runs.
   */
  site: Span | null
  /**
   * The call whose result this call calls, when its callee is one — a decorator
   * factory's result applied to the class, `cac().command("x")`, the root of
   * the member chain. `null` for a callee that is not a call's result.
   */
  calleeCall: Span | null
}

/**
 * What the reader could not see, where it can prove a line neither right nor
 * wrong — a limit of the reader, never a verdict on the code. One member per
 * kind of limit, carrying what a message needs to name it.
 */
export type UnknownCondition =
  /** A named type the reader does not follow: `Table`, `shapes.Table`. */
  | { kind: "type-name"; name: string }
  /**
   * A type form the reader does not read: `typeof`, `keyof`, a mapped or
   * conditional type, an index or method signature, `unique symbol`, `any` — by
   * its ESTree type, or the operator's word. The message names it.
   */
  | { kind: "type-form"; form: string }
  /**
   * A call's result, or a `new`'s: what the callee returns is not seen;
   * `callee` as written, `null` when it is not a name.
   */
  | { kind: "call-result"; callee: string | null; construct: boolean }
  /**
   * A value the reader does not follow to what it holds: a name bound
   * elsewhere, a member read, an awaited value, a destructured part. `form` is
   * the ESTree node type, `name` the name when it is one.
   */
  | { kind: "value"; form: string; name: string | null }
  /** A root statement the reader does not recognise, by its ESTree type. */
  | { kind: "statement"; form: string }
  /**
   * A call whose callee the reader cannot place: an import that did not land,
   * `this`, a value of kind unknown.
   */
  | { kind: "callee" }

/**
 * Whether a root binding can be mutated, as the reader proves it: readonly to
 * its depth, mutable, or unknown with what the reader could not see. Combined
 * over parts (members, union arms, frozen entries), a proven mutable part makes
 * the whole mutable, then any unknown part makes it unknown.
 */
export type Immutability =
  | { proof: "readonly" }
  /**
   * The form that proves it, for the message: `let`/`var`, an ESTree type (a
   * record literal, a `new`, an array type, a member not readonly), with the
   * name when there is one (`Map`, the binding named).
   */
  | { proof: "mutable"; form: string; name: string | null }
  | { proof: "unknown"; condition: UnknownCondition }
  /**
   * The syntax is not something the reader can read at all — a readonly wrapper
   * without its type arguments, a freeze of nothing: deblob cannot do its job
   * on the line, whatever the rule. Wins over every other part.
   */
  | { proof: "broken"; reason: string }

/**
 * A body as a flat list of what happened in it, evaluation order: every call
 * (nested ones included, each once), every definition, every branch or loop
 * with its arms, every return. Not a syntax tree — what the rules read.
 */
export type ReadStatement =
  | { kind: "call"; call: ReadCall }
  | {
      kind: "definition"
      name: string | null
      form: string
      exported: boolean
      value: ValueKind
      /**
       * Immutability as the syntax shows it, to its depth. Readonly: code (a
       * function, class, enum), a `const` whose initializer is a
       * primitive-valued expression, a name bound to an immutable value, `as
       * const`, `Object.freeze` over a literal of immutable entries, or whose
       * annotation is a primitive keyword, a literal type, `Readonly<…>` over
       * proven members, or a `Readonly*` collection or `readonly` array over
       * proven types. Mutable: a `let` or `var`, a record or array literal, a
       * mutable collection, a type with a mutable member. Unknown: every other
       * form, with what the reader could not see — no alias resolution, no
       * inference. `stable-root` reads it unless config says
       * `mutableModuleState`.
       */
      immutability: Immutability
      /**
       * The initializer reads the machine: a tech value read, not called
       * (`process.env["X"] ?? "d"` included, where `value` says computed), the
       * clock, the entropy source — in its own text or in a callback it runs on
       * import. Captured machine state, which no type proves. A call's result
       * is not a read: the call is judged where it sits.
       */
      storesMachineRead: boolean
      /**
       * The call whose result the binding stores, when its initializer is one
       * (past `await` and the other wrappers); `null` otherwise. The binding's
       * violation derives from the call's: removing a red call removes both.
       */
      storedCall: Span | null
      /**
       * Defined in a body read inline — a callback's, a tracked local's — so a
       * local of each run, not a binding of the body it was read into.
       */
      inlined: boolean
      span: Span
    }
  | {
      kind: "control"
      test: ValueKind
      testOrigin: "parameter" | "load" | "instance" | "other"
      arms: readonly (readonly ReadStatement[])[]
      span: Span
    }
  | {
      kind: "return"
      value: ValueKind | null
      /**
       * A returned record literal, entry by entry — an assembly's returned
       * record is how a driver's use cases trace back to their service. `null`
       * when what is returned is not a record literal.
       */
      record: readonly { key: string; value: ArgValue }[] | null
      span: Span
    }
  /**
   * An assignment statement (`a.b = x`, `[a] = x`, `n -= 1`): the target root's
   * value kind — a hook may write tech-held state, nothing else may write at
   * all. Never a call.
   */
  | { kind: "assignment"; target: ValueKind; span: Span }
  /**
   * A `throw`, apart from the rest: at a module's root it is the author's crash
   * to write and changes nothing. Its argument's calls are read like any
   * other.
   */
  | { kind: "throw"; span: Span }
  /** A write with no target kind to carry: an increment, a `delete`. */
  | { kind: "other"; span: Span }
  /**
   * A statement the reader does not recognise (`export =`, `import x =
   * require(…)`, `debugger`): it cannot be cleared, nor proven to do anything.
   * Its calls are read like any other.
   */
  | { kind: "unread"; form: string; span: Span }

export type ReadHook = {
  span: Span
  /** The tech call this hook was handed to. */
  registeredBy: ReadCall
  body: readonly ReadStatement[]
  hooks: readonly ReadHook[]
}

export type ReadFunction = {
  name: string | null
  exported: boolean
  span: Span
  /** Kinds bound at the function's call sites; unknown where none binds. */
  params: readonly { name: string; kind: ValueKind }[]
  /** Outside its hooks. */
  body: readonly ReadStatement[]
  hooks: readonly ReadHook[]
}

/**
 * What the reader could not place, and only that: a callee of kind unknown (an
 * import the resolver could not land, `this`, a binding through itself, a value
 * of kind unknown), a parameter no production site binds. Genuine ignorance —
 * never a fence over a tree the reader has (step 03 § The open part, audited).
 */
export type OpenPart = {
  span: Span
  why: "unknown-callee" | "unbound-parameter"
}

export type FileReading = {
  /** The tech that read the file; `null` for a file of an inside kind. */
  tech: string | null
  exempts: readonly Exemption[]
  root: readonly ReadStatement[]
  /** Hooks registered from module root — a spec file's `test()` bodies. */
  hooks: readonly ReadHook[]
  /**
   * Top-level function definitions, the tracked locals excluded (read at their
   * sites); empty for the inside kinds.
   */
  functions: readonly ReadFunction[]
  /** What the reader could not place — never a fact a rule fires on. */
  open: readonly OpenPart[]
}

/**
 * The shipped builtin baseline: Node builtins are concrete by default; this
 * curated set is the pure exception — string-only, deterministic modules.
 */
export const PURE_BUILTINS: ReadonlySet<string> = new Set([
  "node:path",
  "node:querystring",
])

export type ExternalPurity = "pure" | "concrete" | "unclassified"

/**
 * The purity trichotomy of an external leaf: a resolved file outside coverage
 * is concrete; a declared external is what `pure` says, concrete otherwise; a
 * builtin is concrete unless curated or declared pure; a package is pure only
 * when declared, unclassified otherwise — purity is declared, not presumed.
 */
export const externalPurityOf = (
  target: Extract<EdgeTarget, { type: "external" }>,
  pure: ReadonlySet<string>,
): ExternalPurity => {
  const pkg = target.package
  if (pkg === null) return "concrete"
  if (target.declared) return pure.has(pkg) ? "pure" : "concrete"
  if (pkg.startsWith("node:"))
    return PURE_BUILTINS.has(pkg) || pure.has(pkg) ? "pure" : "concrete"
  return pure.has(pkg) ? "pure" : "unclassified"
}

export type EdgeKind = "runtime" | "type"
export type EdgeForm = "static" | "dynamic" | "require"

export type EdgeTarget =
  | { type: "module"; path: string }
  | {
      type: "external"
      specifier: string
      /**
       * The leaf's purity identity, what `pure` entries match: the
       * bare-specifier package name (`zod`, `node:path`), or for a declared
       * external the pattern that matched (`$theme:**`) — `null` when the leaf
       * is a file outside the coverage set.
       */
      package: string | null
      /**
       * True for a specifier matched by a declared `external` pattern: the
       * environment provides it, nothing on disk to resolve — a leaf known by
       * declaration, never by resolution. False for packages, builtins,
       * out-of-coverage files.
       */
      declared: boolean
      /**
       * The crossed layer identity — from the producer's `deblob` package.json
       * field or the consumer's `externalLayers` patch. `null` = no claim,
       * today's purity trichotomy everywhere. Claims cross, purity included:
       * trust is the dependency model, `externalLayers: blob` is the revoke.
       */
      layer: Layer | null
    }

/** One edge per (from, target); `runtime` wins over `type` when both occur. */
export type ImportEdge = {
  from: string
  to: EdgeTarget
  kind: EdgeKind
  form: EdgeForm
  /**
   * True iff any contributing occurrence is a re-export (`export ... from`) —
   * OR under the edge merge, independent of the runtime-wins kind merge.
   */
  reExport: boolean
}

/** A specifier that failed resolution — surfaced, never dropped. */
export type UnresolvedImport = {
  from: string
  specifier: string
  reason: string
  /**
   * True = literal specifier the resolver failed on — a provably missing edge;
   * the graph is incomplete and a check run must not certify (exit 2). False =
   * non-literal dynamic-import expression — unresolvable by construction,
   * informational only.
   */
  literal: boolean
}

/**
 * A place deblob cannot read: a file that does not parse (`line: null`), or a
 * line the reader cannot interpret. The run gives no verdict it can certify
 * (exit 2) — not a type check: tsc owns type errors.
 */
export type BrokenSite = {
  file: string
  line: number | null
  /** What could not be read, for the message. */
  reason: string
}

export type ImportGraph = {
  root: string
  modules: ReadonlyMap<string, ModuleNode>
  edges: readonly ImportEdge[]
  unresolved: readonly UnresolvedImport[]
  broken: readonly BrokenSite[]
}
