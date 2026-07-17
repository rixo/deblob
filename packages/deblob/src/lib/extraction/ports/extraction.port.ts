/**
 * The engine contract — parsing/resolution engines are adapters behind this
 * port (the architecture's answer to the TS 7 rupture). Implementations must
 * not leak engine shapes (spans, napi types) through it.
 */

import type { EdgeForm } from "../graph.model.ts"

/** One import occurrence in a file, one entry per specifier reference. */
export type ImportRecord = {
  specifier: string
  /**
   * True when this occurrence binds types only (`import type`, inline `type`
   * specifier, `export type ... from`).
   */
  typeOnly: boolean
  form: EdgeForm
  /**
   * False when `specifier` is a non-literal dynamic-import expression —
   * unresolvable by construction; it must surface as a diagnostic, never reach
   * resolution (raw expression text can falsely resolve, e.g. a parameter named
   * `path` hitting the node builtin).
   */
  literal: boolean
}

export type FileExtraction = {
  imports: readonly ImportRecord[]
}

export type Resolution =
  | { kind: "file"; path: string }
  | { kind: "builtin"; specifier: string }
  | { kind: "unresolved"; reason: string }

export interface ExtractionEngine {
  /**
   * Read and parse one file, yielding its import occurrences. Returns `null`
   * when the engine has no extractor for this file kind (capability absent —
   * the file stays a graph node without outgoing edges). Parse failures on a
   * supported kind throw.
   */
  extract(absolutePath: string): FileExtraction | null

  /** Resolve a specifier as imported from the given file. */
  resolve(fromAbsolutePath: string, specifier: string): Resolution
}
