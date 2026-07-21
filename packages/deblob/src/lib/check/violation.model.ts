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

/** The union grows one member per detector step. */
export type Violation = LayersViolation | PrivateViolation | BarrelsViolation
