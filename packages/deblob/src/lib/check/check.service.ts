/**
 * Judging a project — the chain every run is: the package's claim read, the
 * covered files scanned, the graph extracted, the checks named run over it. One
 * use case for every caller (the CLI's `check`, the corpus runner, the
 * snapshot); it lived three times in assemblies until the placement recut, and
 * the copies drifted (the CLI dropped `configLoads`).
 *
 * The config arrives resolved: loading it is the config unit's use case, and
 * each caller loads its own way (discovery, `-c`, a row's value).
 */

import type { ResolvedConfig } from "../config/config.service.ts"
import type { Coverage } from "../config/ports/coverage.port.ts"
import type { PackageSurface } from "../config/config.model.ts"
import type { Manifest } from "../config/ports/manifest.port.ts"
import type { ExtractionConfig } from "../extraction/extraction.service.ts"
import type { ImportGraph } from "../extraction/graph.model.ts"
import { classifyStockEntry } from "../extraction/stock-flavor.model.ts"
import type { CheckName } from "./checks.model.ts"
import { KNOWN_CHECKS, runGraphCheck } from "./checks.model.ts"
import type { SurfaceReport } from "./surface.model.ts"
import { checkSurface, surfaceOptionsFor } from "./surface.model.ts"
import type { Violation } from "./violation.model.ts"

/** What a judged run found. */
export type Judgement = {
  /** The covered files, root-relative, sorted. */
  files: readonly string[]
  graph: ImportGraph
  /**
   * The package's claim; `null` when it makes none, or when `surface` was not
   * among the checks (the manifest is then not read).
   */
  surface: PackageSurface | null
  /** `surface`'s own report: violations, and the claims it cannot certify. */
  surfaceReport: SurfaceReport
  /** Every check's violations, in the order the checks were named. */
  violations: Violation[]
}

const NO_SURFACE: SurfaceReport = {
  violations: [],
  unverified: [],
  checked: 0,
  disclosed: 0,
}

export const createJudge = ({
  coverage,
  manifest,
  extraction,
}: {
  coverage: Pick<Coverage, "scanCoverage">
  manifest: Pick<Manifest, "readPackageSurface">
  extraction: {
    extractGraph(input: {
      config: ExtractionConfig
      files: readonly string[]
    }): Promise<ImportGraph>
  }
}) => ({
  /**
   * The project under `config`, judged by the checks named (every check by
   * default). A config the manifest or the tsconfig contradicts throws its
   * `ConfigError`, an extraction failure its `ExtractionError`: the caller's to
   * present.
   */
  judge: async (
    config: ResolvedConfig,
    checks: readonly CheckName[] = KNOWN_CHECKS,
  ): Promise<Judgement> => {
    const surfaceRuns = checks.includes("surface")
    const surface = surfaceRuns
      ? await manifest.readPackageSurface(config.root)
      : null
    const files = await coverage.scanCoverage(config)
    const graph = await extraction.extractGraph({ config, files })
    const surfaceReport = surfaceRuns
      ? checkSurface(graph, surface, {
          classifyEntry: classifyStockEntry,
          ...surfaceOptionsFor(config, surface),
        })
      : NO_SURFACE
    const violations = checks.flatMap((check) =>
      check === "surface"
        ? surfaceReport.violations
        : runGraphCheck(check, graph, config),
    )
    return { files, graph, surface, surfaceReport, violations }
  },
})

export type Judge = ReturnType<typeof createJudge>
