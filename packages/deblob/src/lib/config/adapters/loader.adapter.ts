/**
 * Config loading — the filesystem walk over the fs port, plus the one platform
 * call no port reads: native `import()` of the config file (Node strips types
 * from `.ts` configs; erasable syntax only). Assembly (CLI main) calls these
 * and pipes the raw value through `resolveConfig` itself; the adapter never
 * sees the resolution.
 */

import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import type { PackageSurface } from "../../check/surface.model.ts"
import { exportsSubpathsOf } from "../../extraction/exports-map.model.ts"
import type { Fs } from "../../fs/fs.port.ts"
import { ConfigError, configImportErrorMessage } from "../config.model.ts"

const CONFIG_FILENAMES = [
  "deblob.config.ts",
  "deblob.config.mts",
  "deblob.config.js",
  "deblob.config.mjs",
]

/** The machine-local overlay, beside the config — never committed. */
const LOCAL_FILENAME = "deblob.local.json"

/** What discovery found in one directory: at least one of the two files. */
export type DiscoveredConfig = {
  /** The directory holding the files — the config root. */
  root: string
  configPath: string | null
  localPath: string | null
}

/**
 * The fs-reading half, over the port. `importConfigDefault` stays outside: a
 * platform call, no port reads it.
 */
export const createConfigLoader = ({
  fs,
}: {
  fs: Pick<Fs, "exists" | "readFile">
}) => {
  /** The overlay beside a config file, when present. */
  const localConfigBeside = async (dir: string): Promise<string | null> => {
    const localPath = join(dir, LOCAL_FILENAME)
    return (await fs.exists(localPath)) ? localPath : null
  }

  /**
   * Upward walk from `cwd`, nearest wins — placement freedom with the
   * no-inheritance ban intact: one directory, never a stack. The walk stops at
   * the first directory holding a config file or a `deblob.local.json`: a lone
   * local file is a configless project with an overlay, never ignored. Two
   * config files in one directory is ambiguity, not precedence.
   */
  const discoverConfig = async (
    cwd: string,
  ): Promise<DiscoveredConfig | null> => {
    for (let dir = resolve(cwd); ;) {
      const found = await Promise.all(
        CONFIG_FILENAMES.map((name) => fs.exists(join(dir, name))),
      )
      const present = CONFIG_FILENAMES.filter((_, index) => found[index])
      const [single] = present
      if (present.length > 1) {
        throw new ConfigError(
          `${dir} contains ${present.join(" and ")} — keep exactly one deblob config per directory`,
        )
      }
      const localPath = await localConfigBeside(dir)
      if (single || localPath) {
        return {
          root: dir,
          configPath: single ? join(dir, single) : null,
          localPath,
        }
      }
      const parent = dirname(dir)
      if (parent === dir) return null
      dir = parent
    }
  }

  /**
   * `-c/--config`: exact file, discovery walk skipped; missing = teaching
   * error. The overlay is still looked up beside it.
   */
  const explicitConfigPath = async (
    cwd: string,
    path: string,
  ): Promise<DiscoveredConfig> => {
    const configPath = resolve(cwd, path)
    if (!(await fs.exists(configPath))) {
      throw new ConfigError(
        `--config points at ${path}, which does not exist (resolved from ${cwd})`,
      )
    }
    const root = dirname(configPath)
    return { root, configPath, localPath: await localConfigBeside(root) }
  }

  /**
   * The overlay's JSON, raw; unparseable fails loud with the path — and so does
   * one gone since discovery, read as the empty text it now is.
   */
  const readLocalConfig = async (localPath: string): Promise<unknown> => {
    const text = await fs.readFile(localPath)
    try {
      return JSON.parse(text ?? "")
    } catch (error) {
      throw new ConfigError(`failed to parse ${localPath}`, { cause: error })
    }
  }

  /**
   * The tsconfig feeding resolution — a filesystem fact, resolved here, not in
   * the pure config service. Explicit path must exist (declared means
   * load-bearing), `false` disables, `undefined` discovers `tsconfig.json` at
   * the config root. `null` = the resolver runs tsconfig-less.
   */
  const tsconfigPathOf = async (config: {
    root: string
    tsconfig: string | false | undefined
  }): Promise<string | null> => {
    if (config.tsconfig === false) return null
    if (typeof config.tsconfig === "string") {
      if (!(await fs.exists(config.tsconfig))) {
        throw new ConfigError(
          `config key "tsconfig" points at ${config.tsconfig}, which does not exist`,
        )
      }
      return config.tsconfig
    }
    const fallback = join(config.root, "tsconfig.json")
    return (await fs.exists(fallback)) ? fallback : null
  }

  /** The field's two pattern lists: `blob` retracts, `assembly` seals. */
  const HONORED_FIELD_KEYS = ["blob", "assembly"] as const

  const isSubpathPattern = (value: unknown): value is string =>
    typeof value === "string" && (value === "." || value.startsWith("./"))

  /**
   * One of the field's pattern lists, validated — the claim is load-bearing at
   * home.
   */
  const patternsOf = (
    field: Record<string, unknown>,
    key: (typeof HONORED_FIELD_KEYS)[number],
  ): readonly string[] => {
    const value = field[key]
    if (value === undefined) return []
    const bad = Array.isArray(value)
      ? value.find((entry) => !isSubpathPattern(entry))
      : value
    if (!Array.isArray(value) || bad !== undefined) {
      throw new ConfigError(
        `package.json "deblob".${key} must be an array of subpath patterns ("." or "./…", wildcards * and **) — ${JSON.stringify(bad)} is not`,
      )
    }
    return value as string[]
  }

  /**
   * The package's own surface claim — package.json at the config root: `deblob`
   * field presence, its `blob` carve-outs and `assembly` designations, plus the
   * exports map flattened to subpath → target paths. `null` = no package.json
   * or no field: no claim, no check. The claim is load-bearing at home — a key
   * this version cannot honor fails loud, never silent, and a field without an
   * exports map is a provider error: the exports map is the surface the field
   * claims.
   */
  const readPackageSurface = async (
    root: string,
  ): Promise<PackageSurface | null> => {
    const manifestPath = join(root, "package.json")
    const text = await fs.readFile(manifestPath)
    if (text === null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
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
          )} — this deblob version honors "blob" and "assembly" only; a key expecting behavior it lacks must not fail silent`,
      )
    }
    const exports = manifest["exports"]
    if (exports === undefined || exports === null) {
      throw new ConfigError(
        `package.json declares "deblob" but no "exports" map — the exports map is the surface the field claims; declare one`,
      )
    }
    const record = field as Record<string, unknown>
    return {
      subpaths: exportsSubpathsOf(exports),
      blob: patternsOf(record, "blob"),
      assembly: patternsOf(record, "assembly"),
    }
  }

  return {
    discoverConfig,
    explicitConfigPath,
    readLocalConfig,
    tsconfigPathOf,
    readPackageSurface,
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
