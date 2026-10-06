/**
 * The assembly front of the corpus: a case's tree of strings becomes the memory
 * adapters, and the runner gets the product's own chain over them — the config
 * unit and the judge `deblob check` runs. Nothing here runs a case: a test
 * builds its instance and calls `judge`. Until the placement recut this
 * assembly wired its own copy of the chain; the copies drifted (it passed
 * `configLoads`, the CLI did not).
 */

import { createJudge } from "../../check/check.service.ts"
import { createConfigLoader } from "../../config/adapters/loader.adapter.ts"
import { createCoverageScan } from "../../config/adapters/scan.adapter.ts"
import { createConfigService } from "../../config/config.service.ts"
import { createFsResolvers } from "../../extraction/adapters/fs-resolver.adapter.ts"
import { createGoodEnoughTestsReader } from "../../extraction/good-enough-tests-reader.model.ts"
import { createHostDriverReader } from "../../extraction/host-driver-reader.model.ts"
import { createJsReader } from "../../extraction/js-reader.model.ts"
import { createNodeReader } from "../../extraction/node-reader.model.ts"
import { createOxcEngine } from "../../extraction/adapters/oxc-extraction.adapter.ts"
import { createPackageClaims } from "../../extraction/adapters/package-meta.adapter.ts"
import { createTsReader } from "../../extraction/ts-reader.model.ts"
import { createStockFlavors } from "../../extraction/ts-suffixes-factories-flavor.model.ts"
import { createExtraction } from "../../extraction/extraction.service.ts"
import { createMemoryFs } from "../../fs/adapters/memory-fs.adapter.ts"
import type { Case } from "./markers.model.ts"
import { CASE_ROOT } from "./markers.model.ts"
import { createRunner } from "./runner.service.ts"

/**
 * The runner over the product's chain, wired over the memory adapters for this
 * tree.
 */
export const assembleCase = (files: Case["files"]) => {
  const fs = createMemoryFs(files, { root: CASE_ROOT })
  return createRunner({
    root: CASE_ROOT,
    config: createConfigService({
      files: createConfigLoader({ fs }),
      flavors: createStockFlavors(),
      // the product's defaults (`readers.assembly.ts`), plus `node` and
      // `hostDriver`. NOT THE PATTERN — do not copy. The rows are married to
      // the node host today, so the corpus fills `host` where a row writes
      // none; a row writing its own replaces it like any config (04/07 ruling
      // 13). A second entry without `node` comes with the gate's sweep. The
      // `driver` fill is longshot's own transition (GUESS: T4): a row's driver
      // is read as a host-only driver unless the row binds its own.
      readers: {
        language: [createJsReader(), createTsReader()],
        host: [createNodeReader()],
        test: [createGoodEnoughTestsReader()],
        driver: [createHostDriverReader()],
      },
    }),
    judge: createJudge({
      coverage: createCoverageScan({ fs }),
      manifest: createConfigLoader({ fs }),
      extraction: createExtraction({
        engine: createOxcEngine({ fs }),
        resolvers: createFsResolvers({ fs }),
        packageClaims: createPackageClaims({ fs }),
      }),
    }),
  })
}
