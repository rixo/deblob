/**
 * The engine contract — parsing engines are adapters behind this port (the
 * architecture's answer to the TS 7 rupture); resolution is its own port,
 * `resolver.port.ts`. Implementations must not leak engine shapes (spans, napi
 * types) through it. The syntax tree itself is not an engine shape: ESTree is
 * the standard every parser targets, and the reader walks it.
 */

import type { Program } from "@oxc-project/types"

import type { EdgeForm, RuntimeEntry } from "../graph.model.ts"

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
   * True when this occurrence re-exports (`export ... from`, any form) — the
   * fact `layer-in-path` reads; plain imports never set it.
   */
  reExport: boolean
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
  /**
   * Non-erasable top-level entries, statement order — the fact
   * `ports-types-only` reads. Erasable forms (`import type` / `export type`,
   * interfaces, type aliases, ambient `declare`) and import/re-export
   * statements are never listed.
   */
  runtimeContent: readonly RuntimeEntry[]
  /**
   * The module's syntax tree: ESTree with TypeScript extensions, `start`/`end`
   * byte offsets on every node. The reader's input, never kept past the file.
   */
  program: Program
  /** The text the tree was parsed from — spans resolve to lines through it. */
  source: string
}

export interface ExtractionEngine {
  /**
   * Read and parse one file, yielding its import occurrences. Returns `null`
   * when the engine has no extractor for this file kind (capability absent —
   * the file stays a graph node without outgoing edges). Parse failures on a
   * supported kind throw.
   */
  extract(absolutePath: string): Promise<FileExtraction | null>
}
