/**
 * Config loading — the one concrete tech here is the platform itself:
 * filesystem walk + native `import()` (Node strips types from `.ts` configs;
 * erasable syntax only). Not behind a port: config crosses into the core as
 * data, and reading it is assembly's job — assembly (CLI main) calls these and
 * pipes the raw value through `resolveConfig` itself; the adapter never sees
 * the resolution.
 */

import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { ConfigError, configImportErrorMessage } from "../config.model.ts"

const CONFIG_FILENAMES = [
  "deblob.config.ts",
  "deblob.config.js",
  "deblob.config.mjs",
]

/**
 * Upward walk from `cwd`, nearest config wins — placement freedom with the
 * no-inheritance ban intact: one config, never a stack. Two config files in one
 * directory is ambiguity, not precedence.
 */
export const discoverConfig = (cwd: string): string | null => {
  for (let dir = resolve(cwd); ;) {
    const present = CONFIG_FILENAMES.filter((name) =>
      existsSync(join(dir, name)),
    )
    const [single] = present
    if (present.length > 1) {
      throw new ConfigError(
        `${dir} contains ${present.join(" and ")} — keep exactly one deblob config per directory`,
      )
    }
    if (single) return join(dir, single)
    const parent = dirname(dir)
    if (parent === dir) return null
    dir = parent
  }
}

/** `-c/--config`: exact file, discovery walk skipped; missing = teaching error. */
export const explicitConfigPath = (cwd: string, path: string): string => {
  const configPath = resolve(cwd, path)
  if (!existsSync(configPath)) {
    throw new ConfigError(
      `--config points at ${path}, which does not exist (resolved from ${cwd})`,
    )
  }
  return configPath
}

/** Native import of the config file; returns its default export, raw. */
export const importConfigDefault = async (
  configPath: string,
): Promise<unknown> => {
  let module: Record<string, unknown>
  try {
    module = (await import(pathToFileURL(configPath).href)) as Record<
      string,
      unknown
    >
  } catch (error) {
    throw new ConfigError(configImportErrorMessage(error, configPath), {
      cause: error,
    })
  }

  if (module["default"] === undefined) {
    throw new ConfigError(
      `${configPath} has no default export — export default defineConfig({ ... })`,
    )
  }

  return module["default"]
}
