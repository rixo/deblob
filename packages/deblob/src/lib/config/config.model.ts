/**
 * Config vocabulary and defaults — the port-free half of the config surface:
 * error type, coverage constants, teaching messages. Resolution (which holds a
 * live `FlavorResolver`, a port shape) lives one layer out in
 * `config.service.ts` — the model may not know port shapes, rule 1 applied to
 * ourselves by our own check.
 */

/** Config failures are teaching errors — never violations, never warnings. */
export class ConfigError extends Error {
  override name = "ConfigError"
}

/**
 * The runner's catch filter: config errors are handled (message + exit code),
 * anything else is a bug and keeps flying.
 */
export const asConfigError = (error: unknown): ConfigError => {
  if (error instanceof ConfigError) return error
  throw error
}

export const STOCK_FLAVOR_NAME = "ts-suffixes-factories"

export const DEFAULT_INCLUDE: readonly string[] = ["**"]

/**
 * Non-removable: user `exclude` appends, never replaces — re-including
 * `node_modules` in the graph is not a flavor. A measured list, honestly open:
 * a generator not on it enters coverage until excluded by hand. Dot-dir members
 * are already dead via the hidden-path rule; listed for explicitness.
 */
export const EXCLUDE_BASELINE: readonly string[] = [
  "**/node_modules/**",
  "**/.git/**",
  "**/dist/**",
  "**/build/**",
  "**/coverage/**",
  "**/.svelte-kit/**",
  "**/.next/**",
  "**/.nuxt/**",
]

/**
 * The extensions coverage can meaningfully node — `.svelte`/`.vue` enter as
 * `parsed: false` nodes until their extractors land. A constant, not a config
 * key; presets are the future home of extending it.
 */
export const COVERAGE_EXTENSIONS: readonly string[] = [
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
  ".svelte",
  ".vue",
]

export const hasCoverageExtension = (path: string): boolean =>
  COVERAGE_EXTENSIONS.some((extension) => path.endsWith(extension))

export const configImportErrorMessage = (
  error: unknown,
  configPath: string,
): string =>
  (error as { code?: unknown } | null | undefined)?.code ===
  "ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX"
    ? `${configPath} uses non-erasable TypeScript syntax (enum, namespace, parameter properties) — ` +
      `Node loads configs by stripping types only; keep the config erasable`
    : `failed to load ${configPath}`
