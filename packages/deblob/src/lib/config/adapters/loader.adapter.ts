/**
 * Config loading — the one concrete tech here is the platform itself:
 * filesystem walk + native `import()` (Node strips types from `.ts` configs;
 * erasable syntax only). Not behind a port: config crosses into the core as
 * data, and reading it is assembly's job — assembly (CLI main) calls these and
 * pipes the raw value through `resolveConfig` itself; the adapter never sees
 * the resolution.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import type { PackageSurface } from "../../check/surface.model.ts"
import { exportsSubpathsOf } from "../../extraction/exports-map.model.ts"
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

/**
 * The tsconfig feeding resolution — a filesystem fact, resolved here, not in
 * the pure config service. Explicit path must exist (declared means
 * load-bearing), `false` disables, `undefined` discovers `tsconfig.json` at the
 * config root. `null` = the resolver runs tsconfig-less.
 */
export const tsconfigPathOf = (config: {
  root: string
  tsconfig: string | false | undefined
}): string | null => {
  if (config.tsconfig === false) return null
  if (typeof config.tsconfig === "string") {
    if (!existsSync(config.tsconfig)) {
      throw new ConfigError(
        `config key "tsconfig" points at ${config.tsconfig}, which does not exist`,
      )
    }
    return config.tsconfig
  }
  const fallback = join(config.root, "tsconfig.json")
  return existsSync(fallback) ? fallback : null
}

const HONORED_FIELD_KEYS = ["blob"] as const

const isSubpathPattern = (value: unknown): value is string =>
  typeof value === "string" && (value === "." || value.startsWith("./"))

/** The field's `blob` carve-outs, validated — the claim is load-bearing at home. */
const blobOf = (field: Record<string, unknown>): readonly string[] => {
  const blob = field["blob"]
  if (blob === undefined) return []
  const bad = Array.isArray(blob)
    ? blob.find((entry) => !isSubpathPattern(entry))
    : blob
  if (!Array.isArray(blob) || bad !== undefined) {
    throw new ConfigError(
      `package.json "deblob".blob must be an array of subpath patterns ("." or "./…", wildcards * and **) — ${JSON.stringify(bad)} is not`,
    )
  }
  return blob as string[]
}

/**
 * The package's own surface claim — package.json at the config root: `deblob`
 * field presence, its `blob` carve-outs, plus the exports map flattened to
 * subpath → target paths. `null` = no package.json or no field: no claim, no
 * check. The claim is load-bearing at home — a key this version cannot honor
 * fails loud, never silent, and a field without an exports map is a provider
 * error: the exports map is the surface the field claims.
 */
export const readPackageSurface = (root: string): PackageSurface | null => {
  const manifestPath = join(root, "package.json")
  if (!existsSync(manifestPath)) return null
  let parsed: unknown
  try {
    parsed = JSON.parse(readFileSync(manifestPath, "utf8"))
  } catch (error) {
    throw new ConfigError(`failed to parse ${manifestPath}`, { cause: error })
  }
  const manifest =
    typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  const field = manifest["deblob"]
  if (field === undefined) return null
  if (typeof field !== "object" || field === null || Array.isArray(field)) {
    throw new ConfigError(
      `package.json "deblob" field must be an object — presence is the claim: "deblob": {}`,
    )
  }
  const unknown = Object.keys(field).filter(
    (key) => !(HONORED_FIELD_KEYS as readonly string[]).includes(key),
  )
  if (unknown.length > 0) {
    throw new ConfigError(
      `package.json "deblob" field carries ${unknown
        .map((key) => `"${key}"`)
        .join(
          ", ",
        )} — this deblob version honors "blob" only; a key expecting behavior it lacks must not fail silent`,
    )
  }
  const exports = manifest["exports"]
  if (exports === undefined || exports === null) {
    throw new ConfigError(
      `package.json declares "deblob" but no "exports" map — the exports map is the surface the field claims; declare one`,
    )
  }
  return {
    subpaths: exportsSubpathsOf(exports),
    blob: blobOf(field as Record<string, unknown>),
  }
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
