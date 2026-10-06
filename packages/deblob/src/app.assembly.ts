/**
 * What the apps share and none owns: the config unit, the judge and the
 * snapshot service, each built over the disk. One builder per instance, each
 * building and returning it — an app's assembly calls the ones it needs and
 * hands the instances on whole. Until the placement recut this file held the
 * load sequence and a per-config extraction closure, logic an assembly may not
 * hold; the config unit and the extraction service own them now.
 */

import { createConfigLoader } from "./lib/config/adapters/loader.adapter.ts"
import { createCoverageScan } from "./lib/config/adapters/scan.adapter.ts"
import { createJudge } from "./lib/check/check.service.ts"
import type { Judge } from "./lib/check/check.service.ts"
import { createConfigService } from "./lib/config/config.service.ts"
import type { ConfigService } from "./lib/config/config.service.ts"
import { createOxcEngine } from "./lib/extraction/adapters/oxc-extraction.adapter.ts"
import { createOxcResolvers } from "./lib/extraction/adapters/oxc-resolver.adapter.ts"
import { createPackageClaims } from "./lib/extraction/adapters/package-meta.adapter.ts"
import { createStockFlavors } from "./lib/extraction/ts-suffixes-factories-flavor.model.ts"
import { createExtraction } from "./lib/extraction/extraction.service.ts"
import { createDefaultReaders } from "./lib/extraction/readers.assembly.ts"
import type { Fs } from "./lib/fs/fs.port.ts"
import { createFsReadmeTexts } from "./lib/snapshot/adapters/fs-readme-texts.adapter.ts"
import { createSystemClock } from "./lib/snapshot/adapters/system-clock.adapter.ts"
import { createSnapshotService } from "./lib/snapshot/snapshot.service.ts"
import type { SnapshotService } from "./lib/snapshot/snapshot.service.ts"
import { createSpikeMapFeed } from "./spike/map-feed/map-feed.adapter.ts"

/** The config unit over the disk: its files, the stock flavors and readers. */
export const createConfigAssembly = (fs: Fs): ConfigService =>
  createConfigService({
    files: createConfigLoader({ fs }),
    flavors: createStockFlavors(),
    readers: createDefaultReaders(),
  })

/** The check chain over the disk: coverage, the manifest, the extraction. */
export const createJudgeAssembly = (fs: Fs): Judge =>
  createJudge({
    coverage: createCoverageScan({ fs }),
    manifest: createConfigLoader({ fs }),
    extraction: createExtraction({
      engine: createOxcEngine({ fs }),
      resolvers: createOxcResolvers({ fs }),
      packageClaims: createPackageClaims({ fs }),
    }),
  })

/**
 * The snapshot service over the disk, with the experimental map feed (spike
 * code, shipped: step 09 SPEC § Shipping).
 */
export const createSnapshotsAssembly = (fs: Fs): SnapshotService =>
  createSnapshotService({
    config: createConfigAssembly(fs),
    coverage: createCoverageScan({ fs }),
    manifest: createConfigLoader({ fs }),
    readmes: createFsReadmeTexts({ fs }),
    clock: createSystemClock(),
    judge: createJudgeAssembly(fs),
    feed: createSpikeMapFeed(),
  })
