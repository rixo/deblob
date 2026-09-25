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
  /** What the design's map draws (step 09 SPEC § API). */
  readonly map: MapData
}

/**
 * The map's data: the design's sequence snapshot, in three parts. Typed on the
 * read side — the fields their `gen-graph.js`, `call-stack.js`,
 * `sequence-data.js` and Behavior Panel read, and no more. `modules` and
 * `edges` repeat the snapshot's own, the symbol level added: the outline reads
 * one, the map the other.
 */
export type MapData = {
  readonly modules: readonly MapModuleRef[]
  readonly edges: readonly MapEdgeRef[]
  /** `null` when the call tracer cannot read the tree. */
  readonly sequence: MapSequence | null
  /** Why `sequence` is `null`, the tracer's own message; `null` otherwise. */
  readonly sequenceMissing: string | null
  /** Each directory's README, as blocks, keyed by its path (`.` = the root). */
  readonly readmes: Readonly<Record<string, readonly ReadmeBlock[]>>
}

/** One covered file, its exported declarations added. */
export type MapModuleRef = ModuleRef & {
  /** Empty for a file extraction cannot parse. */
  readonly symbols: readonly SymbolRef[]
  /** How many top-level declarations the file keeps to itself. */
  readonly internalDeclarations: number
}

/** An exported declaration. */
export type SymbolRef = {
  readonly name: string
  /** `function`, `class`, `interface`, `type`, `enum`, or the binding's kind. */
  readonly form: string
  readonly typeOnly: boolean
  /** Interface, object type, class and enum members; `null` for the rest. */
  readonly members: readonly string[] | null
  /** The first line of its doc comment. */
  readonly doc: string | null
}

/** An import edge, the names it imports added. */
export type MapEdgeRef = EdgeRef & {
  /**
   * As the target exports them: `default`, `*` for a namespace or a star
   * re-export. Empty for a side-effect import, `import()`, `require()`.
   */
  readonly symbols: readonly { readonly name: string }[]
}

/** The call stacks: every function reached, and the drivers that reach them. */
export type MapSequence = {
  /** Keyed `module#symbol` or `module#factory.member`. */
  readonly callables: Readonly<Record<string, Callable>>
  readonly participants: readonly Participant[]
  readonly drivers: readonly DriverRef[]
}

export type Callable = {
  readonly module: string
  readonly symbol: string
  readonly member: string | null
  readonly frames: readonly Frame[]
}

/** One call site, as the tracer read it. */
export type Frame = {
  /** This call site, `path@offset`. */
  readonly id: string
  readonly kind:
    | "call"
    | "local"
    | "instantiate"
    | "port"
    | "external"
    | "unbound"
    | "recursion"
  /** The participant called. */
  readonly to: string
  /** The row it lands on; `null` when unbound. */
  readonly target:
    | {
        readonly module: string
        readonly symbol: string
        readonly member: string | null
      }
    | { readonly specifier: string; readonly name: string }
    | null
  /** What the call site says. */
  readonly callee: string
  /** `path:line`. */
  readonly at: string
  readonly guards: readonly Guard[]
  /** The arguments as written. */
  readonly args: readonly string[]
  /** The type of the call's value; `null` when not typed. */
  readonly returns: string | null
  /** The call is the argument of a `throw`. */
  readonly throws: boolean
  /** The callee's key in `callables`, when its body was found. */
  readonly ref: string | null
}

/** A branch, loop or callback a call sits under. */
export type Guard = {
  readonly kind:
    | "if"
    | "switch"
    | "?:"
    | "&&"
    | "||"
    | "??"
    | "catch"
    | "loop"
    | "callback"
    | "dispatch"
  /** One id per construct, shared by its arms. */
  readonly id: string
  /** `path:line`. */
  readonly at: string
  /**
   * The condition, `else`, `case "x"`, the loop header, the callee handed a
   * callback.
   */
  readonly arm: string
  /** The arm's position in its construct, in source order. */
  readonly armIndex: number
  /** Callback only: the frame that registers it. */
  readonly registeredBy?: string
}

export type Participant = {
  readonly id: string
  readonly label: string
  readonly kind: string
  /** The service root it sits in. */
  readonly box: string | null
}

export type DriverRef = {
  readonly name: string
  readonly module: string
  /** The driver's own calls before it dispatches. */
  readonly entry: readonly Frame[]
  readonly hooks: readonly {
    readonly name: string
    readonly usage: string
    readonly trace: readonly Frame[]
  }[]
}

/**
 * A README's content, as the Behavior Panel draws it: headings, paragraphs,
 * lists, code, tables. Inline text keeps `code` and `[text](url)`.
 */
export type ReadmeBlock =
  | { readonly h: string; readonly level: number }
  | { readonly p: string }
  | { readonly ul: readonly ReadmeItem[] }
  | { readonly ol: readonly ReadmeItem[] }
  | { readonly code: string; readonly lang?: string }
  | {
      readonly table: {
        readonly head?: readonly string[]
        readonly rows: readonly (readonly string[])[]
      }
    }

export type ReadmeItem =
  | string
  | {
      readonly t: string
      readonly ul?: readonly ReadmeItem[]
      readonly ol?: readonly ReadmeItem[]
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
