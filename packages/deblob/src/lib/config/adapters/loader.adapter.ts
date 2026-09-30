/**
 * Config loading — the filesystem walk over the fs port, plus the platform
 * calls no port reads: native `import()` of the config and local files (Node
 * strips types from `.ts` ones; erasable syntax only) and the `stat` that tells
 * an edited file from an unchanged one. Two ports: the config files (the config
 * service's load use cases pipe what they find through `resolveConfig`; the
 * adapter never sees the resolution) and the manifest.
 */

import { stat } from "node:fs/promises"
import { dirname, join, resolve } from "node:path"
import { pathToFileURL } from "node:url"

import { exportsSubpathsOf } from "../../extraction/exports-map.model.ts"
import type { Fs } from "../../fs/fs.port.ts"
import type { PackageSurface } from "../config.model.ts"
import { ConfigError, configImportErrorMessage } from "../config.model.ts"
import type {
  ConfigFiles,
  DiscoveredConfig,
} from "../ports/config-files.port.ts"
import type { Manifest } from "../ports/manifest.port.ts"

const CONFIG_FILENAMES: readonly string[] = [
  "deblob.config.ts",
  "deblob.config.mts",
  "deblob.config.js",
  "deblob.config.mjs",
]

/** The machine-local overlay, beside the config — never committed. */
const LOCAL_FILENAMES = [
  "deblob.local.ts",
  "deblob.local.mts",
  "deblob.local.js",
  "deblob.local.mjs",
] as const

/**
 * The fs-reading half over the fs port; `importConfigDefault`, a platform call
 * no port reads, joins it on the config files' port.
 */
export const createConfigLoader = ({
  fs,
}: {
  fs: Pick<Fs, "exists" | "readFile">
}): ConfigFiles & Manifest => {
  /**
   * The one file of `names` in `dir`, or null; two or more is ambiguity, not
   * precedence — `what` names the kind in the message.
   */
  const oneOf = async (
    dir: string,
    names: readonly string[],
    what: string,
  ): Promise<string | null> => {
    const found = await Promise.all(
      names.map((name) => fs.exists(join(dir, name))),
    )
    const present = names.filter((_, index) => found[index])
    if (present.length > 1) {
      throw new ConfigError(
        `${dir} contains ${present.join(" and ")} — keep exactly one ${what} per directory`,
      )
    }
    const [single] = present
    return single === undefined ? null : join(dir, single)
  }

  /** The overlay beside a config file, when present. */
  const localConfigBeside = (dir: string): Promise<string | null> =>
    oneOf(dir, LOCAL_FILENAMES, "deblob local file")

  /**
   * The config in one directory, exactly — no walk: a directory that is a
   * project by declaration (a viewer's listed project, a script's cwd) is its
   * own root, its own files or nothing, never an ancestor's.
   */
  const configAt = async (dir: string): Promise<DiscoveredConfig | null> => {
    const root = resolve(dir)
    const configPath = await oneOf(root, CONFIG_FILENAMES, "deblob config")
    const localPath = await localConfigBeside(root)
    if (!configPath && !localPath) return null
    return { root, configPath, localPath }
  }

  /**
   * Upward walk from `cwd`, nearest wins — placement freedom with the
   * no-inheritance ban intact: one directory, never a stack. The walk stops at
   * the first directory holding a config file or a local file: a lone local
   * file is a configless project with an overlay, never ignored. Two config
   * files, or two local files, in one directory is ambiguity, not precedence.
   */
  const discoverConfig = async (
    cwd: string,
  ): Promise<DiscoveredConfig | null> => {
    for (let dir = resolve(cwd); ;) {
      const found = await configAt(dir)
      if (found !== null) return found
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
   * The package.json at `root`, parsed — `null` when there is none; a manifest
   * that does not parse fails naming it. The one read both manifest readers
   * share.
   */
  const readManifest = async (
    root: string,
  ): Promise<Record<string, unknown> | null> => {
    const manifestPath = join(root, "package.json")
    const text = await fs.readFile(manifestPath)
    if (text === null) return null
    let parsed: unknown
    try {
      parsed = JSON.parse(text)
    } catch (error) {
      throw new ConfigError(`failed to parse ${manifestPath}`, { cause: error })
    }
    return typeof parsed === "object" && parsed !== null
      ? (parsed as Record<string, unknown>)
      : {}
  }

  /**
   * The package's `name` at `root` — what a project is called when it is a
   * package; `null` without a manifest or without a string name.
   */
  const readPackageName = async (root: string): Promise<string | null> => {
    const name = (await readManifest(root))?.["name"]
    return typeof name === "string" ? name : null
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
    const manifest = await readManifest(root)
    if (manifest === null) return null
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
    configAt,
    discoverConfig,
    explicitConfigPath,
    importConfigDefault,
    readPackageName,
    readPackageSurface,
  }
}

/**
 * Native import of a config or local file; returns its default export, raw. The
 * URL carries the file's mtime: Node caches a module by URL, so an edited file
 * is a new URL and imports fresh, an unchanged one answers from the cache. Only
 * the file itself: a module it imports stays cached.
 */
export const importConfigDefault = async (
  configPath: string,
): Promise<unknown> => {
  let module: Record<string, unknown>
  try {
    // nanoseconds, an integer: a fractional ms (`?v=…042.0232`) reads as a file
    // extension to Vite's transform, which then parses a .ts config as JS
    const { mtimeNs } = await stat(configPath, { bigint: true })
    const url = `${pathToFileURL(configPath).href}?v=${mtimeNs}`
    module = (await import(url)) as Record<string, unknown>
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
