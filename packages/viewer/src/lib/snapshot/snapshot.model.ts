/**
 * What the viewer displays, and the protocol it speaks — the viewer's input
 * contract. `deblob` conforms to it (type-only import); the viewer never
 * imports `deblob`. JSON throughout: no maps, no classes, no dates.
 *
 * The layer vocabulary is restated here on purpose: two packages, one
 * vocabulary, this copy is the contract (step 03 SPEC § API).
 */

/** The layers, in the order the viewer lists them. */
export const LAYERS = [
  "model",
  "ports",
  "service",
  "adapters",
  "assembly",
  "driver",
  "boot",
  "test",
  "blob",
] as const

export type Layer = (typeof LAYERS)[number]

/** A project the server can snapshot: its root directory, its manifest name. */
export type ProjectRef = {
  readonly root: string
  readonly name: string | null
}

/** One covered file, as extraction classified it. */
export type ModuleRef = {
  /** POSIX path relative to the project root. */
  readonly path: string
  readonly layer: Layer
  /** The owning service root, `null` for top-level blob. */
  readonly serviceRoot: string | null
  readonly isPrivate: boolean
  /** `false` when extraction has no parser for the file kind (`.svelte`, …). */
  readonly parsed: boolean
}

export type EdgeTargetRef =
  | { readonly type: "module"; readonly path: string }
  | {
      readonly type: "external"
      readonly specifier: string
      readonly package: string | null
      readonly declared: boolean
      readonly layer: Layer | null
    }

export type EdgeRef = {
  readonly from: string
  readonly to: EdgeTargetRef
  readonly kind: "runtime" | "type"
  readonly form: "static" | "dynamic" | "require"
  readonly reExport: boolean
}

export type UnresolvedRef = {
  readonly from: string
  readonly specifier: string
  readonly reason: string
  readonly literal: boolean
}

/** The bare status numbers, as the CLI prints them. */
export type SnapshotStats = {
  readonly files: number
  readonly bytes: number
  readonly blobPercent: number
  readonly services: number
}

export type Snapshot = {
  /** ISO timestamp of the extraction that produced the snapshot. */
  readonly generatedAt: string
  readonly project: ProjectRef & {
    /** What the bare status prints: config file(s) and flavor, or defaults. */
    readonly provenance: string
  }
  readonly stats: SnapshotStats
  readonly modules: readonly ModuleRef[]
  readonly edges: readonly EdgeRef[]
  readonly unresolved: readonly UnresolvedRef[]
}

/**
 * The protocol over the socket. On connect the server sends `projects`, then
 * the first project's `snapshot`; `select` asks for another; a project whose
 * extraction fails yields `error` and the connection lives on.
 */
export type ServerMessage =
  | { readonly type: "projects"; readonly projects: readonly ProjectRef[] }
  | { readonly type: "snapshot"; readonly snapshot: Snapshot }
  | {
      readonly type: "error"
      readonly project: string
      readonly message: string
    }

export type ClientMessage = {
  readonly type: "select"
  /** The project's root, as listed in `projects`. */
  readonly project: string
}
