/**
 * The snapshot service's world, composed from what exists: the CLI's own load →
 * scan → measure sequence as the project-source port's functions, and the
 * extraction composed for one config. Shared by the server driver and the
 * snapshot script driver; the CLI driver keeps its own sequence (SPEC 03).
 * Wiring only.
 */

import { join, resolve } from "node:path"

import {
  createConfigLoader,
  importConfigDefault,
} from "../lib/config/adapters/loader.adapter.ts"
import { createCoverageScan } from "../lib/config/adapters/scan.adapter.ts"
import type {
  ReaderRegistry,
  ResolvedConfig,
} from "../lib/config/config.service.ts"
import {
  overlayLocalConfig,
  resolveConfig,
} from "../lib/config/config.service.ts"
import { createOxcEngine } from "../lib/extraction/adapters/oxc-extraction.adapter.ts"
import { createOxcResolver } from "../lib/extraction/adapters/oxc-resolver.adapter.ts"
import { createPackageMetaReader } from "../lib/extraction/adapters/package-meta.adapter.ts"
import { createPlainTsReader } from "../lib/extraction/adapters/plain-ts-reader.adapter.ts"
import { createGoodEnoughTestsReader } from "../lib/extraction/adapters/good-enough-tests-reader.adapter.ts"
import {
  classifyStockEntry,
  STOCK_FLAVORS,
} from "../lib/extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "../lib/extraction/extraction.service.ts"
import type { ImportGraph } from "../lib/extraction/graph.model.ts"
import { createNodeFs } from "../lib/fs/adapters/node-fs.adapter.ts"
import type { ProjectSource } from "../lib/snapshot/ports/project-source.port.ts"

/** The stock readers, in the CLI's order: the test runner before plain TS. */
const STOCK_READERS: ReaderRegistry = {
  "good-enough-tests": createGoodEnoughTestsReader,
  "plain-ts": createPlainTsReader,
}

export const createProjectSource = (): ProjectSource => {
  const fs = createNodeFs()
  const loader = createConfigLoader({ fs })
  const scan = createCoverageScan({ fs })

  /** Config discovery from a directory: its own files, or the defaults. */
  const loadConfig = async (dir: string): Promise<ResolvedConfig> => {
    const found = await loader.discoverConfig(dir)
    if (found === null) {
      return resolveConfig(
        {},
        {
          root: resolve(dir),
          configPath: null,
          localPath: null,
          flavors: STOCK_FLAVORS,
          readers: STOCK_READERS,
        },
      )
    }
    const { root, configPath, localPath } = found
    const base =
      configPath === null ? {} : await importConfigDefault(configPath)
    const raw =
      localPath === null
        ? base
        : overlayLocalConfig(
            base,
            await loader.readLocalConfig(localPath),
            localPath,
          )
    return resolveConfig(raw, {
      root,
      configPath,
      localPath,
      flavors: STOCK_FLAVORS,
      readers: STOCK_READERS,
    })
  }

  return {
    loadConfig,
    scanCoverage: (config) => scan.scanCoverage(config),
    sizesOf: (root, files) => scan.statSizes(root, files),
    manifestNameOf: (root) => loader.readPackageName(root),
    now: () => new Date().toISOString(),
  }
}

/**
 * The extraction for one config: engine, resolver, flavor, and the layer
 * claims, over an fs of its own — the node adapter holds no state to share.
 */
export const extractionFor =
  (config: ResolvedConfig) =>
  async (files: readonly string[]): Promise<ImportGraph> => {
    const fs = createNodeFs()
    const tsconfigPath = await createConfigLoader({ fs }).tsconfigPathOf(config)
    const engine = createOxcEngine({ fs })
    const resolver = createOxcResolver({
      ...(tsconfigPath === null ? {} : { tsconfigPath }),
      alias: config.alias,
    })
    const { extractGraph } = createExtraction({
      engine,
      resolver,
      flavor: config.flavor,
      readers: config.readers,
    })
    const packageMeta = createPackageMetaReader({
      fs,
      resolve: resolver.resolve,
      anchor: join(config.root, "package.json"),
      classifyEntry: classifyStockEntry,
    })
    return extractGraph({
      root: config.root,
      files,
      isAssembly: config.isAssembly,
      isDriver: config.isDriver,
      isBoot: config.isBoot,
      external: config.external,
      // the consumer patch wins over producer fields — reviewer of record
      externalLayerOf: async (specifier) =>
        config.externalLayers(specifier) ??
        (await packageMeta.layerOf(specifier)),
      pure: config.pure,
      driverTech: config.driverTech,
    })
  }
