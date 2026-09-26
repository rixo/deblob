/**
 * The cross-detector violation shape: one structured value per finding,
 * carrying every fact rendering needs — no prose inside.
 */

import type {
  CalleeKind,
  EdgeTarget,
  InstanceOrigin,
  Layer,
  ResultUse,
  Span,
  UnknownCondition,
  ValueKind,
} from "../extraction/graph.model.ts"
import type { RuleId } from "./rule.model.ts"

/**
 * The rulebook the rule ids cite. `arch` = architecture.md § Summary, the only
 * member in v0 — the discriminant is baked now because the shape freezes once
 * JSON/SARIF output ships; output may omit it while it stays single-valued.
 */
export type Ruleset = "arch"

/** What a violating import target resolves to, matrix-side. */
export type TargetClass = Layer | "concrete"

export type LayersViolation = {
  check: "layers"
  ruleset: Ruleset
  /**
   * Cited rules within the ruleset — a finding may cite two (the seal plus
   * `runtime-import` when the hint is "only import type is allowed").
   */
  rules: readonly RuleId[]
  /** The offending importer. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  importerLayer: Layer
  /** The offending edge's target — in-set path or external specifier. */
  target: EdgeTarget
} & (
  | {
      /** A forbidden cell of the dependency matrix. */
      shape: "matrix-cell"
      targetClass: TargetClass
    }
  | {
      /**
       * A lib neither builtin-classified nor in `pure`, reached from a pure
       * layer — the default-concrete surfacing mechanism (escape hatch: declare
       * it in `pure`).
       */
      shape: "unclassified-lib"
    }
)

export type PrivateViolation = {
  check: "private"
  ruleset: Ruleset
  /**
   * Always `private-sealed` — packaging rule, no kind exemption, no hint
   * variant.
   */
  rules: readonly RuleId[]
  /** The offending importer. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** The offending edge's target. */
  target: EdgeTarget
  /** The crossed `private/` directory — the outermost violated boundary. */
  boundary: string
  /** The service root owning the boundary — rendering never re-derives it. */
  owner: string
}

export type BarrelsViolation = {
  check: "barrels"
  ruleset: Ruleset
  /** Always `layer-in-path` — kind- and form-blind, no hint variant. */
  rules: readonly RuleId[]
  /**
   * Attribution side: the index for `barrel-file`, the importer for
   * `index-import`.
   */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** The re-exported layered file / the index module. */
  target: EdgeTarget
  shape: "barrel-file" | "index-import"
}

export type PortsViolation = {
  check: "ports"
  ruleset: Ruleset
  /** Always `ports-types-only`, read whole; no hint variant. */
  rules: readonly RuleId[]
  /**
   * Attribution side: the port for `runtime-export` / `runtime-import-in-port`,
   * the importer for `runtime-import-of-port`.
   */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
} & (
  | {
      /** Runtime content in the port file itself — the message channel. */
      shape: "runtime-export"
      form: string
      name: string | null
      exported: boolean
    }
  | {
      /** A runtime edge out of the port — target-blind. */
      shape: "runtime-import-in-port"
      target: EdgeTarget
    }
  | {
      /** A runtime edge into the port — importer-blind. */
      shape: "runtime-import-of-port"
      target: EdgeTarget
    }
)

export type SurfaceViolation = {
  check: "surface"
  ruleset: Ruleset
  /**
   * `chain-purity` for a claim/actual mismatch, `layer-in-path` for an
   * unlabeled entry fronting one.
   */
  rules: readonly RuleId[]
  /** The covered source module the entry reaches — the fix site. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** The exports-map subpath making the claim (`.`, `./checkout.service`). */
  subpath: string
  /** The exports target as written — equals `file` unless reached via mirror. */
  exported: string
} & (
  | {
      /** The subpath's naming claims one layer, the target file is another. */
      shape: "claim-mismatch"
      claimed: Layer
      actual: Layer
    }
  | {
      /**
       * A subpath claiming nothing over a composition unit or adapter —
       * directly, or through a re-export chain (the laundering shape).
       */
      shape: "unlabeled-front"
      /** The fronted service/adapter file — equals `file` when direct. */
      fronts: string
      frontLayer: Layer
    }
)

/**
 * Where a cycle finding lands in the grouped output — cycles have no single
 * `file`/`serviceRoot` pair, so the bucket is carried explicitly.
 */
export type DagGroup =
  | { kind: "service"; root: string }
  | { kind: "cross-service" }
  | { kind: "blob" }

/** One witness hop of a service cycle, with its quoted carrying edge. */
export type ServiceHop = {
  from: string
  to: string
  /** The carrying module edge — lexicographically smallest inducing (from, to). */
  via: { from: string; to: string }
  /** Every inducing edge is type-only — no runtime import to hunt for. */
  typeOnly: boolean
  /** Every inducing edge originates in assembly — the fix is placement. */
  wiring: boolean
}

export type DagViolation = {
  check: "dag"
  ruleset: Ruleset
  /**
   * `no-service-cycle` for service cycles, `no-runtime-cycle` for module
   * cycles.
   */
  rules: readonly RuleId[]
  group: DagGroup
  /** The full SCC, sorted — the witness may be a shorter loop through it. */
  members: readonly string[]
} & (
  | {
      /** A cycle in the service DAG — every import kind counts. */
      shape: "service-cycle"
      /** Witness cycle in order, first = smallest member; hops close the loop. */
      services: readonly string[]
      hops: readonly ServiceHop[]
    }
  | {
      /** A runtime module cycle — type-only edges are not an ESM hazard. */
      shape: "module-cycle"
      /** Witness cycle in order, first = smallest; a self-import is one file. */
      files: readonly string[]
    }
)

/**
 * `stable-root`. The first violation to carry a line: the outside rules judge
 * statements, not edges, so the offending site is a place in a file and the
 * report says which.
 */
export type ModulesViolation = {
  check: "modules"
  ruleset: Ruleset
  /** Always `stable-root` — module discipline, one rule per shape. */
  rules: readonly RuleId[]
  /** The offending file. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** 1-indexed line of the offending statement. */
  line: number
  /**
   * The root statements that make this line run on import when it does not sit
   * at root itself — a helper's body is red at its own line, and each root call
   * reaching it is a trigger, in this file or another. Empty when the line is
   * its own trigger.
   */
  via: readonly { file: string; line: number }[]
  /**
   * `null`: the red is proven. Otherwise the reader could prove the line
   * neither right nor wrong, and this is what it could not see — an unknown,
   * which fails like a red.
   */
  unknown: UnknownCondition | null
  /** What the violation is about, in its file: what a `cause` names. */
  subject: Span
  /**
   * The red call this violation's subject is the result of — a binding storing
   * it, a call of what it returned — when there is one: removing the call
   * removes this violation too, so it is the same fix. `null` otherwise.
   */
  cause: Span | null
} & (
  | {
      /**
       * A root statement that is neither a call nor a definition and still does
       * something when the module is evaluated — or one the reader does not
       * recognise, an unknown.
       */
      shape: "root-statement"
    }
  | {
      /**
       * A call at root that reaches the tech, runs a use case, or goes into a
       * function of a file whose layer may touch the tech — presumed to have
       * side effects; or a call the reader cannot place, `reaches` then `null`
       * and `unknown` set. `name` is what it is called when the call names it.
       */
      shape: "root-call"
      reaches: "tech" | "use-case" | "function" | "wiring" | "unclaimed" | null
      name: string | null
    }
  | {
      /**
       * A root binding that holds state: `state` when its value can be mutated
       * (or, with `unknown` set, when the reader cannot tell), `machine` when
       * it stores a read of the machine — a tech value, the clock, randomness —
       * which no type proves. Lifted by `mutableModuleState`.
       */
      shape: "root-binding"
      holds: "state" | "machine"
      /**
       * The form that proves the state mutable (`let`, a record literal, a `new
       * Map`), for the message; `null` for a machine read, and when `unknown`
       * says the reader could not tell.
       */
      by: { form: string; name: string | null } | null
    }
)

/**
 * `assembly-builds-only`: an assembly doing something with what it may import
 * beyond building. One shape per clause; every one names a line, and groups by
 * fix like `stable-root`'s.
 */
export type AssemblyViolation = {
  check: "assembly"
  ruleset: Ruleset
  /** Always `assembly-builds-only`. */
  rules: readonly RuleId[]
  /** The offending assembly file. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** 1-indexed line of the offending statement. */
  line: number
  /**
   * `null`: the red is proven. Otherwise what the reader could not see — an
   * unknown, which fails like a red.
   */
  unknown: UnknownCondition | null
  /** What the violation is about, in its file: what a `cause` names. */
  subject: Span
  /**
   * For an argument: the red or unknown call it came out of, or was handed to,
   * written in the same expression — that call's fix clears this violation too.
   * `null` otherwise, and on every other shape but a root binding storing a
   * root call's result.
   */
  cause: Span | null
} & (
  | {
      /**
       * A call that builds nothing: the tech's, the language's, a local
       * function's, a use case but a declared load, a wiring function, a
       * package nothing claims; or one the reader cannot place, an unknown.
       */
      shape: "call"
      callee: CalleeKind
    }
  | {
      /**
       * An argument that is not a literal, a tech value received, or an
       * instance: computed, a function, or unknown. `key` names a record
       * argument's entry, `null` for the argument whole.
       */
      shape: "argument"
      callee: CalleeKind
      key: string | null
      value: ValueKind
    }
  | {
      /** What the assembly built, used past passing it on or returning it. */
      shape: "result-use"
      use: "member" | "computed" | "reassigned" | "assigned"
      /** What built it. */
      callee: CalleeKind
    }
  | {
      /** A branch or loop on an instance, or on a computed value. */
      shape: "branch"
      testOrigin: "instance" | "other"
    }
  | {
      /**
       * A definition that is not an assembly function: at the file's root, or a
       * function that builds nothing.
       */
      shape: "definition"
      name: string | null
      at: "root" | "function"
    }
  | {
      /** A statement at the file's root other than an import or a definition. */
      shape: "root-statement"
    }
  | {
      /** An adapter in the returned record of a function a non-test file calls. */
      shape: "adapter-returned"
      key: string
      origin: InstanceOrigin
    }
)

/**
 * The driver rules: `wiring-outside-hooks`, `hook-one-call`,
 * `driver-calls-services`, `driver-hooks-only`, `sub-driver-wiring`. One shape
 * per clause; every one names a line. Two facts are two violations, never
 * grouped across rules.
 */
export type DriverViolation = {
  check: "driver"
  ruleset: Ruleset
  /** The one rule the clause belongs to. */
  rules: readonly RuleId[]
  /** The offending driver or test file. */
  file: string
  /** Grouping key; `null` = the `blob` bucket. */
  serviceRoot: string | null
  /** 1-indexed line of the offending statement. */
  line: number
  /** `null`: the red is proven; else what the reader could not see. */
  unknown: UnknownCondition | null
  /** What the violation is about, in its file. */
  subject: Span
  /** Always `null`: no driver violation rides another. */
  cause: Span | null
} & (
  | {
      /**
       * A call the rule forbids where it sits: a use case in the wiring, a
       * callee a driver may not call, a sub-driver's wiring in a hook, a tech
       * call in a hook that neither wires nor takes the result.
       */
      shape: "call"
      callee: CalleeKind
      where: "wiring" | "hook"
    }
  | {
      /**
       * An argument that is not a tech value, an instance or a literal — in the
       * wiring, or to a hook's use case; to a sub-driver's wiring, a use case's
       * result.
       */
      shape: "argument"
      callee: CalleeKind
      value: ValueKind
      where: "wiring" | "hook"
    }
  | {
      /** A hook's use-case calls, when not exactly one. */
      shape: "call-count"
      count: number
    }
  | {
      /**
       * A branch or loop: in the wiring, any; in a hook, any — what its arms
       * hold is its own, and `conditional` says the use case is among it.
       */
      shape: "branch"
      where: "wiring" | "hook"
      conditional: boolean
    }
  | {
      /** A hook's use-case result used past returning or handing it whole. */
      shape: "result"
      use: ResultUse["kind"]
    }
  | {
      /** An assignment or another write, in the wiring or a hook. */
      shape: "statement"
      where: "wiring" | "hook"
    }
  | {
      /**
       * A definition beside the hooks and the one wiring function: at root, a
       * function that is not the wiring function, a local of the wiring
       * function holding functions.
       */
      shape: "definition"
      name: string | null
      at: "root" | "function" | "local"
    }
  | {
      /** A root driver's wiring function taking a parameter. */
      shape: "parameter"
      name: string | null
    }
)

/** The union grows one member per detector step. */
export type Violation =
  | LayersViolation
  | PrivateViolation
  | BarrelsViolation
  | PortsViolation
  | DagViolation
  | SurfaceViolation
  | ModulesViolation
  | AssemblyViolation
  | DriverViolation
