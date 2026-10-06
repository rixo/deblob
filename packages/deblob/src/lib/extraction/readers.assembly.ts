import { createGoodEnoughTestsReader } from "./adapters/good-enough-tests-reader.adapter.ts"
import { createJsReader } from "./adapters/js-reader.adapter.ts"
import { createTsReader } from "./adapters/ts-reader.adapter.ts"
import type { ReaderGroups } from "./readers.model.ts"

/**
 * The default readers, one place for every run that reads a project (the CLI,
 * the viewer's server, the corpus): the language (`js`, `ts`) and the
 * good-enough test reader (GUESS: R4). No host, no driver reader: premises the
 * project states.
 */
export const createDefaultReaders = (): ReaderGroups => ({
  language: [createJsReader(), createTsReader()],
  host: [],
  test: [createGoodEnoughTestsReader()],
  driver: [],
})
