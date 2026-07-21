/**
 * The classified import graph — the one value every detector consumes.
 *
 * Paths are POSIX-style, relative to the graph's `root`. External targets
 * (packages, builtins, files outside the coverage set) are leaves: never
 * parsed, never expanded.
 */

export type Layer =
  "model" | "ports" | "service" | "adapters" | "assembly" | "blob"

/**
 * What a flavor can say about a file. Source naming never yields `assembly` —
 * that is granted by the caller's designation matcher — but test naming does
 * (rule 16: test setup is assembly, and opinions live in the flavor); the
 * designation matcher still ORs on top for exotic naming.
 */
export type FlavorLayer = Layer

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
}

export type EdgeKind = "runtime" | "type"
export type EdgeForm = "static" | "dynamic" | "require"

export type EdgeTarget =
  | { type: "module"; path: string }
  | {
      type: "external"
      specifier: string
      /**
       * Bare-specifier package name (`zod`, `node:path`) — `null` when the leaf
       * is a file outside the coverage set.
       */
      package: string | null
    }

/** One edge per (from, target); `runtime` wins over `type` when both occur. */
export type ImportEdge = {
  from: string
  to: EdgeTarget
  kind: EdgeKind
  form: EdgeForm
}

/** A specifier that failed resolution — surfaced, never dropped. */
export type UnresolvedImport = {
  from: string
  specifier: string
  reason: string
}

export type ImportGraph = {
  root: string
  modules: ReadonlyMap<string, ModuleNode>
  edges: readonly ImportEdge[]
  unresolved: readonly UnresolvedImport[]
}
