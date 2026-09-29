import { packageNameOf } from "../graph.model.ts"
import type { ReaderBinding } from "../recognition.model.ts"
import type { DriverReader } from "../ports/driver-reader.port.ts"

/**
 * The cac command-line parser as a driver's tech: `cac` claimed, the stock cut
 * — `.action(cb)` hands the callback to the parser, a hook (GUESS: D1, no cut
 * of its own). Bound by default to every file the flavor names a driver; a CLI
 * entry the flavor leaves blob (`src/cli.ts`) is bound by `include`, which
 * makes it a driver.
 */
export const createCacReader = (binding: ReaderBinding = {}): DriverReader => ({
  name: "cac",
  ...binding,
  claims: (specifier) => packageNameOf(specifier) === "cac",
})
