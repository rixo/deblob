import type { ReaderBinding } from "./recognition.model.ts"
import type { DriverReader } from "./driver-reader.model.ts"

/**
 * A driver whose tech is the host alone — a plain Node CLI on `process.argv`
 * and `process.on`, a worker on `self.onmessage`. Claims no package of its own:
 * the host readers bound to the file claim its tech, and the stock cut reads
 * it. Shipped, never defaulted: the project binds it, so every driver read this
 * way is written down (GUESS: D7 — who reads a host-only driver). Bound by
 * default to every file the flavor names a driver.
 */
export const createHostDriverReader = (
  binding: ReaderBinding = {},
): DriverReader => ({
  name: "host-driver",
  ...binding,
  tech: [],
})
