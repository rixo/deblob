/**
 * The host axis — what the runtime the file runs on adds to the language: its
 * builtin modules and its free names. A claim makes them tech, in any kind:
 * where no host reader is bound, `process` is unclaimed, and so is `node:fs`.
 * `HostKnowledge` holds the free names: `globals` are tech (`process`,
 * `Buffer`, the timers), `locations` the module's own (`__dirname`). Stock:
 * `node`, shipped, bound by the project (no default).
 */

import type { HostKnowledge } from "./knowledge.model.ts"
import type { ReaderBinding } from "./recognition.model.ts"

export interface HostReader extends ReaderBinding, HostKnowledge {
  readonly name: string
  /**
   * The host's builtin modules, declared, as a driver reader declares its tech:
   * module names (`"node:fs"`, `"fs"`), subpaths included.
   */
  readonly tech: readonly string[]
  /**
   * The builtins that are pure — string-only, deterministic (`node:path`).
   * Model to the reader, as a `pure` entry is.
   */
  readonly pure?: readonly string[]
}
