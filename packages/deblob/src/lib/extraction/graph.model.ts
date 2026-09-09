/**
 * The classified import graph — the one value every detector consumes.
 *
 * Paths are POSIX-style, relative to the graph's `root`. External targets
 * (packages, builtins, files outside the coverage set) are leaves: never
 * parsed, never expanded.
 */

export type Layer =
  "model" | "ports" | "service" | "adapters" | "assembly" | "blob"

/** The layer vocabulary as a value — config validation enumerates through it. */
export const LAYERS: readonly Layer[] = [
  "model",
  "ports",
  "service",
  "adapters",
  "assembly",
  "blob",
]

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
 * What a flavor can say about a file. Source naming never yields `assembly` —
 * that is granted by the caller's designation matcher — but test naming does
 * (`test-setup-assembly`, and opinions live in the flavor); the designation
 * matcher still ORs on top for exotic naming.
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

export type ImportGraph = {
  root: string
  modules: ReadonlyMap<string, ModuleNode>
  edges: readonly ImportEdge[]
  unresolved: readonly UnresolvedImport[]
}
