import type { Clock } from "../ports/clock.port.ts"

/** The machine's clock. */
export const createSystemClock = (): Clock => ({
  now: () => new Date().toISOString(),
})
