/**
 * The cross-detector violation shape: one structured value per finding,
 * carrying every fact rendering needs — no prose inside.
 */

import type { EdgeTarget, Layer } from "../extraction/graph.model.ts"

/**
 * The rulebook the rule numbers cite. `arch` = architecture.md § Summary, the
 * only member in v0 — the discriminant is baked now because the shape freezes
 * once JSON/SARIF output ships; output may omit it while it stays
 * single-valued.
 */
export type Ruleset = "arch"

/** What a violating import target resolves to, matrix-side. */
export type TargetClass = Layer | "concrete"

export type LayersViolation = {
  check: "layers"
  ruleset: Ruleset
  /**
   * Cited rule numbers within the ruleset — a finding may cite two (6+8 when
   * the hint is "import type is fine").
   */
  rules: readonly number[]
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
       * A lib neither builtin-classified nor in `pureLibs`, reached from a pure
       * layer — the default-concrete surfacing mechanism (escape hatch: declare
       * it in `pureLibs`).
       */
      shape: "unclassified-lib"
    }
)

export type PrivateViolation = {
  check: "private"
  ruleset: Ruleset
  /** Always cites 12 — packaging rule, no kind exemption, no hint variant. */
  rules: readonly number[]
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
  /** Always cites 2 — kind- and form-blind, no hint variant. */
  rules: readonly number[]
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
  /** Always cites 10 — rule 10 read whole; no hint variant. */
  rules: readonly number[]
  /**
   * Attribution side: the port for `runtime-export` / `runtime-import`, the
   * importer for `runtime-import-of-port`.
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
      shape: "runtime-import"
      target: EdgeTarget
    }
  | {
      /** A runtime edge into the port — importer-blind. */
      shape: "runtime-import-of-port"
      target: EdgeTarget
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
  /** 13 for service cycles, 14 for module cycles. */
  rules: readonly number[]
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

/** The union grows one member per detector step. */
export type Violation =
  | LayersViolation
  | PrivateViolation
  | BarrelsViolation
  | PortsViolation
  | DagViolation
