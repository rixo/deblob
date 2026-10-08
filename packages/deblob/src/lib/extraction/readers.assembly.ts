import { createGenericTestApiReader } from "./generic-test-api-reader.model.ts"
import { createJsReader } from "./js-reader.model.ts"
import { createTsReader } from "./ts-reader.model.ts"
import type { ReaderGroups } from "./readers.model.ts"

/**
 * The default readers, one place for every run that reads a project (the CLI,
 * the viewer's server, the corpus): the language (`js`, `ts`) and the generic
 * test reader (GUESS: R4). No host, no driver reader: premises the project
 * states.
 */
export const createDefaultReaders = (): ReaderGroups => ({
  language: [createJsReader(), createTsReader()],
  host: [],
  test: [createGenericTestApiReader()],
  driver: [],
})
