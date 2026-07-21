/**
 * Config loading — the one concrete tech here is the platform itself:
 * filesystem walk + native `import()` (Node strips types from `.ts` configs;
 * erasable syntax only). Not behind a port: config crosses into the core as
 * data, and reading it is assembly's job — this adapter is what assembly
 * calls.
 */

import { existsSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import {
  ConfigError,
  configImportErrorMessage,
  resolveConfig,
} from "../config.model.ts"
import type { FlavorRegistry, ResolvedConfig } from "../config.model.ts"

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

export const loadConfig = async ({
  cwd,
  flavors,
}: {
  cwd: string
  flavors: FlavorRegistry
}): Promise<ResolvedConfig> => {
  const configPath = discoverConfig(cwd)
  if (configPath === null) {
    return resolveConfig({}, { root: resolve(cwd), configPath: null, flavors })
  }

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

  return resolveConfig(module["default"], {
    root: dirname(configPath),
    configPath,
    flavors,
  })
}
