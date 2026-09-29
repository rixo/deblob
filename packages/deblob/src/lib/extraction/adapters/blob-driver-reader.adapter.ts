import type { ReaderBinding } from "../recognition.model.ts"
import type { DriverReader } from "../ports/driver-reader.port.ts"

/**
 * The stock silencer: a driver the project counts as blob on purpose — legacy,
 * a framework no reader knows yet. Nothing inside is judged, the file is
 * counted as blob in the report, and it keeps the driver's inbound seal
 * (nothing imports a driver). Binds nothing by default: the project names the
 * files, so every silenced driver is written down.
 */
export const createBlobDriverReader = (
  binding: ReaderBinding = {},
): DriverReader => ({
  name: "blob-driver",
  include: [],
  ...binding,
  claims: () => false,
  blob: true,
})
