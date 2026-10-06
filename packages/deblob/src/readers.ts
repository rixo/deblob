/**
 * The reader factories, for the config to import (`deblob/readers` — GUESS: R1,
 * the entry chosen). Each takes `include`/`exclude` over its default binding.
 * Language: `js`, `ts` (default both). Host: `node` (no default). Test:
 * `goodEnoughTests` (default), `playwright`. Driver: `hostDriver` (a driver
 * whose tech is the host alone), `cac`, `vite`, `astro` (claims only, the stock
 * cut), `blobDriver` (binds nothing unless told).
 */

export { createJsReader as js } from "./lib/extraction/js-reader.model.ts"
export { createTsReader as ts } from "./lib/extraction/ts-reader.model.ts"
export { createNodeReader as node } from "./lib/extraction/node-reader.model.ts"
export { createGoodEnoughTestsReader as goodEnoughTests } from "./lib/extraction/good-enough-tests-reader.model.ts"
export { createPlaywrightReader as playwright } from "./lib/extraction/playwright-reader.model.ts"
export { createCacReader as cac } from "./lib/extraction/cac-reader.model.ts"
export {
  createAstroReader as astro,
  createViteReader as vite,
} from "./lib/extraction/framework-readers.model.ts"
export { createHostDriverReader as hostDriver } from "./lib/extraction/host-driver-reader.model.ts"
export { createBlobDriverReader as blobDriver } from "./lib/extraction/blob-driver-reader.model.ts"
export type { LanguageReader } from "./lib/extraction/language-reader.model.ts"
export type { HostReader } from "./lib/extraction/host-reader.model.ts"
export type { DriverReader } from "./lib/extraction/driver-reader.model.ts"
export type { TestReader } from "./lib/extraction/test-reader.model.ts"
export type { ReaderBinding } from "./lib/extraction/recognition.model.ts"
export type {
  Cut,
  CutContext,
  HookPointer,
  RelayedCall,
} from "./lib/extraction/cut.model.ts"
export type { Role } from "./lib/extraction/graph.model.ts"
