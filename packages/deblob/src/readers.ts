/**
 * The reader factories, for the config to import (`deblob/readers` — GUESS: R1,
 * the entry chosen). Each takes `include`/`exclude` over its default binding.
 * Language: `js`, `ts` (default both). Host: `node` (no default). Test:
 * `goodEnoughTests` (default), `playwright`. Driver: `hostDriver` (a driver
 * whose tech is the host alone), `cac`, `vite`, `astro` (claims only, the stock
 * cut), `blobDriver` (binds nothing unless told).
 */

export { createJsReader as js } from "./lib/extraction/adapters/js-reader.adapter.ts"
export { createTsReader as ts } from "./lib/extraction/adapters/ts-reader.adapter.ts"
export { createNodeReader as node } from "./lib/extraction/adapters/node-reader.adapter.ts"
export { createGoodEnoughTestsReader as goodEnoughTests } from "./lib/extraction/adapters/good-enough-tests-reader.adapter.ts"
export { createPlaywrightReader as playwright } from "./lib/extraction/adapters/playwright-reader.adapter.ts"
export { createCacReader as cac } from "./lib/extraction/adapters/cac-reader.adapter.ts"
export {
  createAstroReader as astro,
  createViteReader as vite,
} from "./lib/extraction/adapters/framework-readers.adapter.ts"
export { createHostDriverReader as hostDriver } from "./lib/extraction/adapters/host-driver-reader.adapter.ts"
export { createBlobDriverReader as blobDriver } from "./lib/extraction/adapters/blob-driver-reader.adapter.ts"
export type { LanguageReader } from "./lib/extraction/ports/language-reader.port.ts"
export type { HostReader } from "./lib/extraction/ports/host-reader.port.ts"
export type { DriverReader } from "./lib/extraction/ports/driver-reader.port.ts"
export type { TestReader } from "./lib/extraction/ports/test-reader.port.ts"
export type { ReaderBinding } from "./lib/extraction/recognition.model.ts"
