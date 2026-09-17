import type { Reader } from "../ports/reader.port.ts"

/**
 * The plain-TypeScript reader: what canon calls a plain-TypeScript driver, any
 * technology reached through imports and the host. Binds every script file and
 * reads the assembly, driver and boot files among them — the kind comes from
 * the suffix or a designation, the wide binding is harmless elsewhere. Claims
 * no package of its own — concrete builtins and host globals are tech by the
 * reading's table, third-party packages by the project's `driverTech` — and
 * exempts nothing.
 */
export const createPlainTsReader = (): Reader => ({
  name: "plain-ts",
  files: ["**/*.{ts,tsx,mts,cts,js,jsx,mjs,cjs}"],
  kinds: ["assembly", "driver", "boot"],
  claims: () => false,
  exempts: [],
})
