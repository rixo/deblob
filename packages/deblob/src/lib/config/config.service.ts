/**
 * Config resolution — `deblob.config.ts` as data, validated loudly and turned
 * into everything a run consumes. Service layer, not model: `ResolvedConfig`
 * holds a live `FlavorResolver` (a port shape the model may not know —
 * `inward-deps`, surfaced by our own first self-check). Pure all the same: raw
 * value in, resolved value out, `ConfigError` with teaching messages. Loading
 * is this unit's use case too (`createConfigService`): the files found and
 * imported through the `ConfigFiles` port, the raw value resolved here. It
 * lived in assembly until the placement recut — once per caller, and the copies
 * drifted. Assembly injects the stock flavor registry and the default readers —
 * a flavor is an adapter, and neither this service nor another adapter may
 * import one.
 */

import { resolve } from "node:path"

import picomatch from "picomatch"

import type { Layer } from "../extraction/graph.model.ts"
import { LAYERS, specifierPattern } from "../extraction/graph.model.ts"
import type { FlavorResolver } from "../extraction/flavor.model.ts"
import type { ReaderGroups } from "../extraction/readers.model.ts"
import { STOCK_FLAVOR_NAME } from "../extraction/stock-flavor.model.ts"
import type {
  ConfigFiles,
  DiscoveredConfig,
} from "./ports/config-files.port.ts"
import {
  ConfigError,
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
  hasCoverageExtension,
} from "./config.model.ts"

/** All optional; defaults documented on each key. */
export type DeblobConfig = {
  /**
   * Architecture style — one, exclusive. A stock flavor name, or a custom
   * `FlavorResolver` implementation exported straight from the config (no CLI
   * release needed). Default: `"ts-suffixes-factories"`.
   */
  flavor?: string | FlavorResolver
  /**
   * Assembly designation — globs (root-relative POSIX) whose matches are
   * assembly files on top of the flavor's `.assembly.ts` naming: their row in
   * the matrix and, once the outside rules land, their calls read as an
   * assembly's. Default: `[]` — an undeclared composition root classifies blob
   * and its service imports fire `service-assembly-only`.
   */
  assembly?: readonly string[]
  /**
   * Driver designation — globs for the driver files a framework names itself
   * (`+page.svelte`, route files); plain-TypeScript drivers carry `.driver.ts`
   * regardless. Default: `[]`.
   */
  drivers?: readonly string[]
  /**
   * Boot designation — globs for entry files a framework names itself;
   * `.boot.ts` is recognized regardless. Default: `[]`.
   */
  boot?: readonly string[]
  /**
   * The readers, by concern: `language` (default `[js(), ts()]`), `host`
   * (default `[]` — `node()` is shipped, bound by the project), `test` (default
   * `[goodEnoughTests()]`), `driver` (default `[]`). Each entry is a reader
   * instance — a stock factory called, or an inline object of the group's
   * interface — bound by `include`/`exclude`. A group written replaces its
   * defaults whole; readers of one group stack on a file, the first written
   * winning a role.
   */
  readers?: Partial<ReaderGroups>
  /**
   * The config loads: the use cases an assembly may await, `"<file>#<name>"` —
   * the service file whose factory built the instance, root-relative, and the
   * member called on it. One or a list. By default an assembly makes no
   * use-case call; a declared load is the exception, a use case the graph
   * itself depends on, its result a tech value from then on. Default: `[]`.
   */
  configLoads?: string | readonly string[]
  /**
   * Coverage globs, root-relative. Full-scan model: every covered file is a
   * graph node, orphans included. Default: `["**"]` — under-coverage is a
   * silent hole; tighten to `["src/**"]` and friends per repo.
   */
  include?: readonly string[]
  /**
   * Appended to the non-removable baseline (`node_modules`, generated trees);
   * never replaces it. Default: `[]`.
   */
  exclude?: readonly string[]
  /**
   * `service-purity` allowlist: package names and builtin specifiers whose
   * imports count as pure. Unlisted third-party imported from a pure layer
   * fires as unclassified — purity is declared, not presumed. Default: `[]`.
   */
  pure?: readonly string[]
  /**
   * Type-only stance override (`runtime-import`): `false` = strict, type-only
   * imports lose their exemption. Default comes from the flavor (absent =
   * `true`, canon).
   */
  typeOnlyExempt?: boolean
  /**
   * `stable-root`, the readonly half: by default every module-level binding
   * must be readonly-typed where the reader can see it (`as const`, a literal,
   * `Object.freeze`, a `Readonly*` or primitive annotation). `true` says module
   * state may be mutable-typed — the escape for a codebase without the types.
   * Default: `false`. The other halves (a root factory call, a root call into
   * tech) are not affected.
   */
  mutableModuleState?: boolean
  /**
   * The tsconfig feeding resolution (`paths` aliases) — path relative to the
   * config file's directory. Default: `tsconfig.json` at the config root when
   * present. `false` disables discovery. A declared path that does not exist
   * fails loud — declared means load-bearing.
   */
  tsconfig?: string | false
  /**
   * Resolver aliases living outside tsconfig (bundler config). Value: target
   * specifier or path (`.`-prefixed paths resolve against the config root),
   * string or array. Teaches resolution — never suppresses failures.
   */
  alias?: Readonly<Record<string, string | readonly string[]>>
  /**
   * Declared externals — specifiers the environment provides with nothing on
   * disk to resolve: bundler virtual modules (`$theme:**`), runtime-provided
   * modules (`cloudflare:*`), URL/`npm:` specifiers. Patterns over the raw
   * specifier as written, never a path. Two wildcards, glued anywhere: `**` =
   * any characters, `/` included; `*` = any characters but `/`; a specifier is
   * one string, so `$theme:**` means the whole namespace. A match is a leaf
   * known by declaration: never resolved, never a failure. Resolvable packages
   * need no entry. Concrete by default; the matched pattern is the leaf's
   * identity, so listing the same pattern in `pure` ratifies it pure. Default:
   * `[]`.
   */
  external?: readonly string[]
  /**
   * Consumer patch for cross-package layer identity: specifier pattern → layer,
   * same two-wildcard patterns as `external`, first declaration-order match
   * wins. Wins over a producer's `deblob` field (the consumer is the reviewer
   * of record for their own run) — `blob` is the revoke: the target is back to
   * unlabeled and the purity trichotomy decides. Default: `{}`.
   */
  externalLayers?: Readonly<Record<string, Layer>>
  /**
   * The build mirror feeding `check surface`: which output directory mirrors
   * `src/` one-to-one, so an exports target under it (`dist/index.js`) reaches
   * its source module (`src/index.ts`) — extensions stripped, exact match only.
   * A string names the output root (`"dist"`, `"build"`); the full form maps
   * several roots to their source roots (`{ mirror: { "dist/esm": "src",
   * "dist/cjs": "src" } }`), longest root winning. `false` declares no mirror.
   * An exports target the mirror cannot reach is an unverified claim: exit 2
   * until mapped or disclosed in the manifest's `deblob.blob`. Default:
   * `"dist"`.
   */
  build?: string | false | { mirror: Readonly<Record<string, string>> }
  /**
   * The viewer's projects: directories, each a deblob project of its own
   * (config discovery starts there), paths relative to the declaring file's
   * directory. Committed, a monorepo root lists the projects its viewer shows;
   * in `deblob.local.ts` beside the config, one machine lists its checkouts.
   * Default: `{ projects: [] }` — the viewer shows the current project alone.
   */
  view?: { projects?: readonly string[] }
}

/** Identity — the typing channel for `deblob.config.ts` authors. */
export const defineConfig = (config: DeblobConfig): DeblobConfig => config

/** Everything a run consumes, resolved — config as data across the boundary. */
export type ResolvedConfig = {
  root: string
  /** `null` for a configless run — provenance the runner surfaces. */
  configPath: string | null
  /**
   * The `deblob.local.{ts,mts,js,mjs}` overlaid on the config; `null` when
   * none.
   */
  localPath: string | null
  flavor: FlavorResolver
  /**
   * Provenance label: the stock name, or `"custom"` for a config-supplied
   * resolver.
   */
  flavorName: string
  /**
   * The designation matchers, one per config key; each matches nothing by
   * default.
   */
  isAssembly: (path: string) => boolean
  isBoot: (path: string) => boolean
  /** The readers by group, each group the config's or the defaults. */
  readers: ReaderGroups
  /**
   * Coverage's gate, applied to what `include`/`exclude` yield: a script
   * extension, or a designation glob, or a reader binding — a file of an
   * unruled tech that nothing names is outside the graph, not blob.
   */
  covers: (path: string) => boolean
  /** Normalized `configLoads`: one entry per declared load. */
  configLoads: readonly { file: string; name: string }[]
  include: readonly string[]
  exclude: readonly string[]
  pure: readonly string[]
  typeOnlyExempt: boolean
  mutableModuleState: boolean
  /**
   * Declared tsconfig: absolute path, `false` = disabled, `undefined` =
   * discover `tsconfig.json` at the root (existence is a filesystem fact — the
   * loader adapter's job, not this service's).
   */
  tsconfig: string | false | undefined
  /** Normalized: every value an array, path-like entries absolute. */
  alias: Readonly<Record<string, readonly string[]>>
  /**
   * Compiled `external` matcher: the first declared pattern matching the raw
   * specifier, `null` for none.
   */
  external: (specifier: string) => string | null
  /**
   * Compiled `externalLayers` matcher: the layer of the first declared pattern
   * matching the raw specifier, `null` for none.
   */
  externalLayers: (specifier: string) => Layer | null
  /**
   * Normalized build mirror: output root → source root, both root-relative
   * without trailing slash; `{}` = no mirror.
   */
  mirror: Readonly<Record<string, string>>
  /** The viewer's projects, absolute paths; `[]` = the current project alone. */
  view: { projects: readonly string[] }
}

/** Stock flavors, name → factory — injected by assembly (flavors are adapters). */
export type FlavorRegistry = Readonly<Record<string, () => FlavorResolver>>

/**
 * The default readers, one array per group — injected by assembly like the
 * flavors (readers are adapters).
 */
export type DefaultReaders = ReaderGroups

const KNOWN_KEYS = [
  "flavor",
  "assembly",
  "boot",
  "readers",
  "configLoads",
  "include",
  "exclude",
  "pure",
  "typeOnlyExempt",
  "mutableModuleState",
  "tsconfig",
  "alias",
  "external",
  "externalLayers",
  "build",
  "view",
] as const

const VIEW_KEYS = ["projects"] as const

const DEFAULT_MIRROR: Readonly<Record<string, string>> = { dist: "src" }

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")

const stringArrayKey = (
  raw: Record<string, unknown>,
  key: "assembly" | "boot" | "include" | "exclude" | "pure" | "external",
): readonly string[] | undefined => {
  const value = raw[key]
  if (value === undefined) return undefined
  if (!isStringArray(value)) {
    throw new ConfigError(
      `config key "${key}" must be an array of strings (root-relative globs or names)`,
    )
  }
  return value
}

/** A designation key compiled to its matcher — nothing declared matches nothing. */
const designationOf = (
  globs: readonly string[],
): ((path: string) => boolean) =>
  globs.length > 0 ? picomatch([...globs]) : () => false

const READER_GROUPS = ["language", "host", "test", "driver"] as const

/**
 * `readers` validated and composed: an object of the four groups, each an array
 * of reader instances; a group written replaces its defaults, one left out
 * keeps them. A reader is checked for its name only — the config is TypeScript,
 * each group typed by its interface.
 */
const readersOf = (value: unknown, defaults: DefaultReaders): ReaderGroups => {
  if (value === undefined) return defaults
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `config key "readers" must be an object of reader groups — { language, host, test, driver }, each an array of readers (node(), goodEnoughTests(), …)`,
    )
  }
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!(READER_GROUPS as readonly string[]).includes(key)) {
      throw new ConfigError(
        `unknown reader group "${key}" under config key "readers" — groups: ${READER_GROUPS.join(", ")}`,
      )
    }
  }
  const groupOf = <G extends keyof ReaderGroups>(group: G): ReaderGroups[G] => {
    const entries = record[group]
    if (entries === undefined) return defaults[group]
    if (
      !Array.isArray(entries) ||
      !entries.every(
        (entry) =>
          typeof entry === "object" &&
          entry !== null &&
          typeof (entry as { name?: unknown }).name === "string",
      )
    ) {
      throw new ConfigError(
        `config key "readers.${group}" must be an array of readers — a stock factory called (node(), goodEnoughTests()) or an object with a name`,
      )
    }
    if (group === "driver" || group === "test") {
      for (const entry of entries as { name: string; tech?: unknown }[]) {
        if (!isStringArray(entry.tech)) {
          throw new ConfigError(
            `reader "${entry.name}" under "readers.${group}": tech must be an array of strings — package names, and project files as "./path" — a declaration, not a function`,
          )
        }
      }
    }
    return entries as ReaderGroups[G]
  }
  return {
    language: groupOf("language"),
    host: groupOf("host"),
    test: groupOf("test"),
    driver: groupOf("driver"),
  }
}

/**
 * `configLoads` validated and normalized: `"<file>#<name>"`, one or a list.
 * Whether the file is covered is extraction's to say — it has the file set.
 */
const configLoadsOf = (
  value: unknown,
): readonly { file: string; name: string }[] => {
  if (value === undefined) return []
  const entries = typeof value === "string" ? [value] : value
  if (!isStringArray(entries)) {
    throw new ConfigError(
      `config key "configLoads" must be a "<file>#<name>" string or an array of them`,
    )
  }
  return entries.map((entry) => {
    const hash = entry.indexOf("#")
    const file = hash === -1 ? "" : entry.slice(0, hash)
    const name = hash === -1 ? "" : entry.slice(hash + 1)
    if (file === "" || name === "" || name.includes("#")) {
      throw new ConfigError(
        `config key "configLoads": ${JSON.stringify(entry)} is not "<file>#<name>" — the service file (root-relative) and the use case called on its instance`,
      )
    }
    return { file, name }
  })
}

/** First declared pattern matching the specifier, declaration order. */
const externalMatcherOf = (
  patterns: readonly string[],
): ((specifier: string) => string | null) => {
  const compiled = patterns.map((pattern) => {
    const regex = specifierPattern(pattern)
    return [pattern, (specifier: string) => regex.test(specifier)] as const
  })
  return (specifier) =>
    compiled.find(([, matches]) => matches(specifier))?.[0] ?? null
}

/** `externalLayers` validated and compiled — declaration order, first wins. */
const externalLayersOf = (
  value: unknown,
): ((specifier: string) => Layer | null) => {
  if (value === undefined) return () => null
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `config key "externalLayers" must be an object mapping specifier pattern → layer name`,
    )
  }
  const compiled = Object.entries(value as Record<string, unknown>).map(
    ([pattern, layer]) => {
      if (!(LAYERS as readonly unknown[]).includes(layer)) {
        throw new ConfigError(
          `config key "externalLayers": "${pattern}" maps to ${JSON.stringify(layer)} — layers: ${LAYERS.join(", ")}`,
        )
      }
      const regex = specifierPattern(pattern)
      return [layer as Layer, (s: string) => regex.test(s)] as const
    },
  )
  return (specifier) =>
    compiled.find(([, matches]) => matches(specifier))?.[0] ?? null
}

/** A root-relative directory: no scheme, no leading `/` or `.`, no `..` hop. */
const isRootRelativeDir = (value: unknown): value is string =>
  typeof value === "string" &&
  value !== "" &&
  !value.startsWith("/") &&
  !value.startsWith(".") &&
  value.split("/").every((segment) => segment !== "" && segment !== "..")

const mirrorEntry = (root: unknown, source: unknown): [string, string] => {
  for (const dir of [root, source]) {
    if (!isRootRelativeDir(dir)) {
      throw new ConfigError(
        `config key "build": mirror roots are root-relative directories — ${JSON.stringify(dir)} is not`,
      )
    }
  }
  return [root as string, source as string]
}

/** `build` validated and normalized to the mirror record. */
const mirrorOf = (value: unknown): Readonly<Record<string, string>> => {
  if (value === undefined) return DEFAULT_MIRROR
  if (value === false) return {}
  if (typeof value === "string") {
    return Object.fromEntries([mirrorEntry(value, "src")])
  }
  const mirror =
    typeof value === "object" && value !== null && !Array.isArray(value)
      ? (value as { mirror?: unknown }).mirror
      : undefined
  if (
    typeof mirror !== "object" ||
    mirror === null ||
    Array.isArray(mirror) ||
    Object.keys(value as object).some((key) => key !== "mirror")
  ) {
    throw new ConfigError(
      `config key "build" must be an output directory ("dist"), false, or { mirror: { "<output dir>": "<source dir>" } } — got ${JSON.stringify(value)}`,
    )
  }
  return Object.fromEntries(
    Object.entries(mirror as Record<string, unknown>).map(([root, source]) =>
      mirrorEntry(root, source),
    ),
  )
}

const tsconfigOf = (
  value: unknown,
  root: string,
): string | false | undefined => {
  if (value === undefined || value === false) return value
  if (typeof value === "string") return resolve(root, value)
  throw new ConfigError(
    `config key "tsconfig" must be a path string or false (there is no true — presence of the default file already opts in)`,
  )
}

const aliasOf = (
  value: unknown,
  root: string,
): Readonly<Record<string, readonly string[]>> => {
  if (value === undefined) return {}
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `config key "alias" must be an object mapping alias → target specifier(s)`,
    )
  }
  return Object.fromEntries(
    Object.entries(value as Record<string, unknown>).map(([key, target]) => {
      const targets = typeof target === "string" ? [target] : target
      if (!isStringArray(targets)) {
        throw new ConfigError(
          `config key "alias": "${key}" must map to a string or an array of strings`,
        )
      }
      return [
        key,
        targets.map((entry) =>
          entry.startsWith(".") ? resolve(root, entry) : entry,
        ),
      ] as const
    }),
  )
}

/** `view` validated and its project paths made absolute. */
const viewOf = (
  value: unknown,
  root: string,
): { projects: readonly string[] } => {
  if (value === undefined) return { projects: [] }
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `config key "view" must be an object ({ projects: [...] })`,
    )
  }
  const record = value as Record<string, unknown>
  for (const key of Object.keys(record)) {
    if (!(VIEW_KEYS as readonly string[]).includes(key)) {
      throw new ConfigError(
        `unknown key "${key}" in config key "view" — valid keys: ${VIEW_KEYS.join(", ")}`,
      )
    }
  }
  const projects = record["projects"]
  if (projects === undefined) return { projects: [] }
  if (!isStringArray(projects)) {
    throw new ConfigError(
      `config key "view.projects" must be an array of directory paths (relative to the config file)`,
    )
  }
  return { projects: projects.map((entry) => resolve(root, entry)) }
}

/**
 * The local file's default export over the config: per top-level key, local
 * wins, arrays and objects replace. The local value must be an object of known
 * keys; a failure names the local file, since the merged value cannot. The
 * result is a raw config for `resolveConfig`, which validates every key's
 * shape.
 */
export const overlayLocalConfig = (
  base: unknown,
  local: unknown,
  localPath: string,
): unknown => {
  if (typeof base !== "object" || base === null || Array.isArray(base)) {
    throw new ConfigError(
      `deblob config must be an object (the default export of deblob.config.ts)`,
    )
  }
  if (typeof local !== "object" || local === null || Array.isArray(local)) {
    throw new ConfigError(
      `${localPath} must export an object — the same keys as deblob.config.ts`,
    )
  }
  for (const key of Object.keys(local)) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      throw new ConfigError(
        `unknown key "${key}" in ${localPath} — valid keys: ${KNOWN_KEYS.join(", ")}`,
      )
    }
  }
  return { ...base, ...local }
}

const flavorOf = (
  value: unknown,
  flavors: FlavorRegistry,
): { flavor: FlavorResolver; name: string } => {
  if (value === undefined) {
    const stock = flavors[STOCK_FLAVOR_NAME]
    if (!stock) {
      throw new ConfigError(
        `flavor registry lacks the stock flavor "${STOCK_FLAVOR_NAME}" — assembly wired the resolver wrong`,
      )
    }
    return { flavor: stock(), name: STOCK_FLAVOR_NAME }
  }
  if (typeof value === "string") {
    const factory = flavors[value]
    if (!factory) {
      throw new ConfigError(
        `unknown flavor "${value}" — known flavors: ${Object.keys(flavors).join(", ")}. ` +
          `A custom flavor is a FlavorResolver implementation exported from deblob.config.ts.`,
      )
    }
    return { flavor: factory(), name: value }
  }
  if (
    typeof value === "object" &&
    value !== null &&
    typeof (value as { classify?: unknown }).classify === "function"
  ) {
    return { flavor: value as FlavorResolver, name: "custom" }
  }
  throw new ConfigError(
    `config key "flavor" must be a stock flavor name or a FlavorResolver implementation (an object with a classify function)`,
  )
}

export const resolveConfig = (
  raw: unknown,
  context: {
    root: string
    configPath: string | null
    localPath: string | null
    flavors: FlavorRegistry
    readers: DefaultReaders
  },
): ResolvedConfig => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ConfigError(
      `deblob config must be an object (the default export of deblob.config.ts)`,
    )
  }
  const record = raw as Record<string, unknown>

  // the one renamed key (0.0.6): a stale config fails loud with the new name —
  // never silently accepted under the old one
  if ("pureLibs" in record) {
    throw new ConfigError(
      `config key "pureLibs" was renamed "pure" in 0.0.6 — same values, new name`,
    )
  }
  if ("tests" in record) {
    throw new ConfigError(
      `config key "tests" is gone — the flavor names test files (*.spec.*, *.test.*, *.e2e.*); bind other paths with readers: { test: [goodEnoughTests({ include: [...] })] }`,
    )
  }
  if ("driverTech" in record || "drivers" in record) {
    throw new ConfigError(
      `config keys "drivers" and "driverTech" are gone — a driver's tech is what a driver reader bound to it claims; bind one under readers: { driver: [...] }`,
    )
  }

  for (const key of Object.keys(record)) {
    if (!(KNOWN_KEYS as readonly string[]).includes(key)) {
      throw new ConfigError(
        `unknown key "${key}" in deblob config — valid keys: ${KNOWN_KEYS.join(", ")}`,
      )
    }
  }

  if (
    record["typeOnlyExempt"] !== undefined &&
    typeof record["typeOnlyExempt"] !== "boolean"
  ) {
    throw new ConfigError(`config key "typeOnlyExempt" must be a boolean`)
  }
  if (
    record["mutableModuleState"] !== undefined &&
    typeof record["mutableModuleState"] !== "boolean"
  ) {
    throw new ConfigError(`config key "mutableModuleState" must be a boolean`)
  }

  const { flavor, name: flavorName } = flavorOf(
    record["flavor"],
    context.flavors,
  )
  const include = stringArrayKey(record, "include") ?? DEFAULT_INCLUDE
  const exclude = [
    ...EXCLUDE_BASELINE,
    ...(stringArrayKey(record, "exclude") ?? []),
  ]
  const readers = readersOf(record["readers"], context.readers)
  // a bound host's pure builtins are pure like a `pure` entry (GUESS: R5)
  const pure = [
    ...(stringArrayKey(record, "pure") ?? []),
    ...readers.host.flatMap((host) => host.pure ?? []),
  ]
  const typeOnlyExempt =
    (record["typeOnlyExempt"] as boolean | undefined) ??
    flavor.typeOnlyExempt ??
    true
  const isAssembly = designationOf(stringArrayKey(record, "assembly") ?? [])
  const isBoot = designationOf(stringArrayKey(record, "boot") ?? [])
  // a driver or test reader's written binding names files of its own —
  // `.svelte` pages under a framework's reader
  const bound = designationOf(
    [...readers.driver, ...readers.test].flatMap((reader) => [
      ...(reader.include ?? []),
    ]),
  )

  return {
    root: context.root,
    configPath: context.configPath,
    localPath: context.localPath,
    flavor,
    flavorName,
    isAssembly,
    isBoot,
    readers,
    covers: (path) =>
      hasCoverageExtension(path) ||
      isAssembly(path) ||
      isBoot(path) ||
      bound(path),
    configLoads: configLoadsOf(record["configLoads"]),
    include,
    exclude,
    pure,
    typeOnlyExempt,
    mutableModuleState:
      (record["mutableModuleState"] as boolean | undefined) ?? false,
    tsconfig: tsconfigOf(record["tsconfig"], context.root),
    alias: aliasOf(record["alias"], context.root),
    external: externalMatcherOf(stringArrayKey(record, "external") ?? []),
    externalLayers: externalLayersOf(record["externalLayers"]),
    mirror: mirrorOf(record["build"]),
    view: viewOf(record["view"], context.root),
  }
}

/**
 * Loading a config, the use cases every run starts with: the files found — a
 * walk up, one directory exactly, a file named — imported, the local overlay
 * applied, the value resolved; the defaults rooted at the directory when no
 * file is found. And a config given as a value (the corpus rows), resolved at a
 * root with no file behind it.
 */
export const createConfigService = ({
  files,
  flavors,
  readers,
}: {
  files: ConfigFiles
  flavors: FlavorRegistry
  readers: DefaultReaders
}) => {
  const resolveAt = (
    raw: unknown,
    at: Omit<DiscoveredConfig, "root"> & { root: string },
  ): ResolvedConfig => resolveConfig(raw, { ...at, flavors, readers })

  /** What was found, loaded and resolved — or the defaults rooted at `dir`. */
  const configFrom = async (
    found: DiscoveredConfig | null,
    dir: string,
  ): Promise<ResolvedConfig> => {
    if (found === null)
      return resolveAt(
        {},
        { root: resolve(dir), configPath: null, localPath: null },
      )
    const { configPath, localPath } = found
    const base =
      configPath === null ? {} : await files.importConfigDefault(configPath)
    const raw =
      localPath === null
        ? base
        : overlayLocalConfig(
            base,
            await files.importConfigDefault(localPath),
            localPath,
          )
    return resolveAt(raw, found)
  }

  return {
    /** The project containing `dir`: the nearest config walking up. */
    loadConfig: async (dir: string): Promise<ResolvedConfig> =>
      configFrom(await files.discoverConfig(dir), dir),
    /**
     * The project at `root` exactly — never an ancestor's (rixo, 2026-09-16: a
     * listed directory is the project, discovery stops at it).
     */
    loadConfigAt: async (root: string): Promise<ResolvedConfig> =>
      configFrom(await files.configAt(root), root),
    /** The config file at `path` (`-c`), resolved from `cwd`. */
    loadConfigNamed: async (
      cwd: string,
      path: string,
    ): Promise<ResolvedConfig> =>
      configFrom(await files.explicitConfigPath(cwd, path), cwd),
    /** A config given as a value, rooted at `root`, no file behind it. */
    resolve: (raw: unknown, root: string): ResolvedConfig =>
      resolveAt(raw, { root, configPath: null, localPath: null }),
  }
}

export type ConfigService = ReturnType<typeof createConfigService>
