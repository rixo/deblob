/**
 * The project as every app reads it, composed from what exists: the load → scan
 * → measure sequence as port functions — the snapshot service's `ProjectSource`
 * and the CLI's `Project` alike — and the extraction composed for one config.
 * Shared by the three apps, owned by none of them. Wiring only (GUESS: the load
 * sequence is logic an assembly launders — it belongs in the config service,
 * behind a port the loader adapter implements).
 */

import { join, resolve } from "node:path"

import type { Project } from "./apps/cli/project.port.ts"

import type { DiscoveredConfig } from "./lib/config/adapters/loader.adapter.ts"
import {
  createConfigLoader,
  importConfigDefault,
} from "./lib/config/adapters/loader.adapter.ts"
import { createCoverageScan } from "./lib/config/adapters/scan.adapter.ts"
import type { ResolvedConfig } from "./lib/config/config.service.ts"
import {
  overlayLocalConfig,
  resolveConfig,
} from "./lib/config/config.service.ts"
import { createOxcEngine } from "./lib/extraction/adapters/oxc-extraction.adapter.ts"
import { createOxcResolver } from "./lib/extraction/adapters/oxc-resolver.adapter.ts"
import { createPackageMetaReader } from "./lib/extraction/adapters/package-meta.adapter.ts"
import { createDefaultReaders } from "./lib/extraction/readers.assembly.ts"
import {
  classifyStockEntry,
  STOCK_FLAVORS,
} from "./lib/extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "./lib/extraction/extraction.service.ts"
import type { ImportGraph } from "./lib/extraction/graph.model.ts"
import { createNodeFs } from "./lib/fs/adapters/node-fs.adapter.ts"
import { createFsReadmeTexts } from "./lib/snapshot/adapters/fs-readme-texts.adapter.ts"
import type { ProjectSource } from "./lib/snapshot/ports/project-source.port.ts"

export const createProjectSource = (): ProjectSource & Project => {
  const fs = createNodeFs()
  const loader = createConfigLoader({ fs })
  const scan = createCoverageScan({ fs })
  const readmes = createFsReadmeTexts({ fs })

  /** The config from what discovery found — or the defaults rooted at `dir`. */
  const configFrom = async (
    found: DiscoveredConfig | null,
    dir: string,
  ): Promise<ResolvedConfig> => {
    if (found === null) {
      return resolveConfig(
        {},
        {
          root: resolve(dir),
          configPath: null,
          localPath: null,
          flavors: STOCK_FLAVORS,
          readers: createDefaultReaders(),
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
            await importConfigDefault(localPath),
            localPath,
          )
    return resolveConfig(raw, {
      root,
      configPath,
      localPath,
      flavors: STOCK_FLAVORS,
      readers: createDefaultReaders(),
    })
  }

  return {
    loadConfig: async (dir) =>
      configFrom(await loader.discoverConfig(dir), dir),
    loadConfigAt: async (root) => configFrom(await loader.configAt(root), root),
    loadConfigNamed: async (cwd, path) =>
      configFrom(await loader.explicitConfigPath(cwd, path), cwd),
    readPackageSurface: (root) => loader.readPackageSurface(root),
    extractGraph: (config, files) => extractionFor(config)(files),
    classifyEntry: classifyStockEntry,
    scanCoverage: (config) => scan.scanCoverage(config),
    scanCoverageDirs: (config) => scan.scanCoverageDirs(config),
    sizesOf: (root, files) => scan.statSizes(root, files),
    manifestNameOf: (root) => loader.readPackageName(root),
    readmeTextsOf: readmes.readmeTextsOf,
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
      isBoot: config.isBoot,
      external: config.external,
      // the consumer patch wins over producer fields — reviewer of record
      externalLayerOf: async (specifier) =>
        config.externalLayers(specifier) ??
        (await packageMeta.layerOf(specifier)),
      pure: config.pure,
    })
  }
