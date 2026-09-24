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

import { checkBarrels } from "../../check/barrels.model.ts"
import { checkDag } from "../../check/dag.model.ts"
import { checkLayers } from "../../check/layers.model.ts"
import { checkModules } from "../../check/modules.model.ts"
import { checkPorts } from "../../check/ports.model.ts"
import { checkPrivate } from "../../check/private.model.ts"
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
import { createPlainTsReader } from "../../extraction/adapters/plain-ts-reader.adapter.ts"
import { createTestRunnerReader } from "../../extraction/adapters/test-runner-reader.adapter.ts"
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

const STOCK_READERS = {
  "test-runner": createTestRunnerReader,
  "plain-ts": createPlainTsReader,
}

const DETECTORS: Record<
  Exclude<CheckName, "surface">,
  (graph: ImportGraph, config: ResolvedConfig) => Violation[]
> = {
  dag: (graph) => checkDag(graph),
  layers: (graph, config) =>
    checkLayers(graph, {
      pure: config.pure,
      typeOnlyExempt: config.typeOnlyExempt,
    }),
  private: (graph) => checkPrivate(graph),
  barrels: (graph) => checkBarrels(graph),
  ports: (graph) => checkPorts(graph),
  modules: (graph, config) =>
    checkModules(graph, { mutableModuleState: config.mutableModuleState }),
}

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
        flavors: STOCK_FLAVORS,
        readers: STOCK_READERS,
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
        isDriver: resolved.isDriver,
        isBoot: resolved.isBoot,
        external: resolved.external,
        externalLayerOf: async (specifier) =>
          resolved.externalLayers(specifier) ??
          (await packageMeta.layerOf(specifier)),
        pure: resolved.pure,
        driverTech: resolved.driverTech,
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
            : DETECTORS[name](graph, resolved),
        ),
        broken: graph.broken,
      }
    },
  }

  return { ...createRunner({ check }), check }
}
