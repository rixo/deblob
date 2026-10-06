import { createGoodEnoughTestsReader } from "./good-enough-tests-reader.model.ts"
import { createJsReader } from "./js-reader.model.ts"
import { createTsReader } from "./ts-reader.model.ts"
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
