import type { Tech } from "../ports/tech.port.ts"

/**
 * The plain-TypeScript tech: what canon calls a plain-TypeScript driver, any
 * technology reached through imports and the host. Reads assembly, driver and
 * boot files. Claims no package of its own — concrete builtins and host globals
 * are tech by the reader's table, third-party packages by the project's
 * `driverTech` — and exempts nothing.
 */
export const createPlainTsTech = (): Tech => ({
  name: "plain-ts",
  kinds: ["assembly", "driver", "boot"],
  claims: () => false,
  exempts: [],
})
