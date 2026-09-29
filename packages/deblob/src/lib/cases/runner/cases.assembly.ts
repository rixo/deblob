/**
 * The assembly front of the corpus: a case's tree of strings becomes the memory
 * adapters, the real chain is wired over them, and the runner gets its check
 * port. The chain's own wiring — config resolution, scan, extraction, the
 * detectors — is the same as the CLI's check run; it sits here, in assembly,
 * until the run service of the placement-debt recut is the port's proper
 * adapter (SPEC 04, decision 5). Nothing here runs a case: a test builds its
 * instance and calls `judge`.
 */

import { join } from "node:path"

import { runGraphCheck } from "../../check/checks.model.ts"
import type { PackageSurface } from "../../check/surface.model.ts"
import { checkSurface } from "../../check/surface.model.ts"
import type { Violation } from "../../check/violation.model.ts"
import type { CheckName } from "../../cli/cli.model.ts"
import { KNOWN_CHECKS } from "../../cli/cli.model.ts"
import { createConfigLoader } from "../../config/adapters/loader.adapter.ts"
import { createCoverageScan } from "../../config/adapters/scan.adapter.ts"
import type { ResolvedConfig } from "../../config/config.service.ts"
import { resolveConfig } from "../../config/config.service.ts"
import { createFsResolver } from "../../extraction/adapters/fs-resolver.adapter.ts"
import { createOxcEngine } from "../../extraction/adapters/oxc-extraction.adapter.ts"
import { createPackageMetaReader } from "../../extraction/adapters/package-meta.adapter.ts"
import { createHostDriverReader } from "../../extraction/adapters/host-driver-reader.adapter.ts"
import { createNodeReader } from "../../extraction/adapters/node-reader.adapter.ts"
import { createDefaultReaders } from "../../extraction/readers.assembly.ts"
import {
  STOCK_FLAVORS,
  classifyStockEntry,
} from "../../extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "../../extraction/extraction.service.ts"
import type { ImportGraph } from "../../extraction/graph.model.ts"
import { specifierMatcher } from "../../extraction/graph.model.ts"
import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import type { Case } from "./markers.model.ts"
import type { Check } from "./ports/check.port.ts"
import { createRunner } from "./runner.service.ts"

/** Where a case's tree sits — an absolute root the memory adapter answers for. */
export const CASE_ROOT = "/case"

const runSurface = (
  graph: ImportGraph,
  config: ResolvedConfig,
  surface: PackageSurface | null,
): Violation[] =>
  checkSurface(graph, surface, {
    classifyEntry: classifyStockEntry,
    mirror: config.mirror,
    disclosed: specifierMatcher([
      ...(surface?.blob ?? []),
      ...(surface?.assembly ?? []),
    ]),
  }).violations

/** The runner over the real chain, wired over the memory adapters for this tree. */
export const assembleCase = (files: Case["files"]) => {
  const fs = createMemoryFs(
    Object.fromEntries(
      Object.entries(files).map(([path, source]) => [
        join(CASE_ROOT, path),
        source,
      ]),
    ),
  )
  const loader = createConfigLoader({ fs })
  const scan = createCoverageScan({ fs })
  const resolver = createFsResolver({ fs })
  const engine = createOxcEngine({ fs })
  const packageMeta = createPackageMetaReader({
    fs,
    resolve: resolver.resolve,
    anchor: join(CASE_ROOT, "package.json"),
    classifyEntry: classifyStockEntry,
  })

  const check: Check = {
    run: async ({ config, checks = KNOWN_CHECKS }) => {
      const resolved = resolveConfig(config, {
        root: CASE_ROOT,
        configPath: null,
        localPath: null,
        flavors: STOCK_FLAVORS,
        // NOT THE PATTERN — do not copy. The rows are married to the node
        // host today, so the corpus fills `host` where a row writes none; a
        // row writing its own replaces it like any config (04/07 ruling 13).
        // A second entry without `node` comes with the gate's sweep. The
        // `driver` fill is endgame's own transition (GUESS: T4): a row's
        // driver is read as a host-only driver unless the row binds its own.
        readers: {
          ...createDefaultReaders(),
          host: [createNodeReader()],
          driver: [createHostDriverReader()],
        },
      })
      const { extractGraph } = createExtraction({
        engine,
        resolver,
        flavor: resolved.flavor,
        readers: resolved.readers,
      })
      const surface = await loader.readPackageSurface(CASE_ROOT)
      const covered = await scan.scanCoverage(resolved)
      const graph = await extractGraph({
        root: CASE_ROOT,
        files: covered,
        isAssembly: resolved.isAssembly,
        isBoot: resolved.isBoot,
        external: resolved.external,
        externalLayerOf: async (specifier) =>
          resolved.externalLayers(specifier) ??
          (await packageMeta.layerOf(specifier)),
        pure: resolved.pure,
        configLoads: resolved.configLoads,
      })
      const unresolved = graph.unresolved.filter((entry) => entry.literal)
      if (unresolved.length > 0) {
        throw new Error(
          `the case does not resolve: ${unresolved
            .map(
              (entry) => `${entry.from} → ${entry.specifier} (${entry.reason})`,
            )
            .join("; ")}`,
        )
      }
      return {
        violations: checks.flatMap((name) =>
          name === "surface"
            ? runSurface(graph, resolved, surface)
            : runGraphCheck(name, graph, resolved),
        ),
        broken: graph.broken,
      }
    },
  }

  return { ...createRunner({ check }), check }
}
