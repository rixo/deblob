/**
 * The readers a run reads with, one array per concern, in the order written —
 * readers of one group stack on a file. The config's `readers` key is this
 * shape, partial; assembly fills the groups left out with the defaults.
 */

import type { DriverReader } from "./driver-reader.model.ts"
import type { HostReader } from "./host-reader.model.ts"
import type { LanguageReader } from "./language-reader.model.ts"
import type { TestReader } from "./test-reader.model.ts"

export type ReaderGroups = {
  readonly language: readonly LanguageReader[]
  readonly host: readonly HostReader[]
  readonly test: readonly TestReader[]
  readonly driver: readonly DriverReader[]
}
