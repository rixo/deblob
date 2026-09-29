/**
 * Config resolution — `deblob.config.ts` as data, validated loudly and turned
 * into everything a run consumes. Service layer, not model: `ResolvedConfig`
 * holds a live `FlavorResolver` (a port shape the model may not know —
 * `inward-deps`, surfaced by our own first self-check). Pure all the same: raw
 * value in, resolved value out, `ConfigError` with teaching messages. Loading
 * (discovery walk, native import) and scanning stay in the adapters; assembly
 * owns the load → resolve sequence (arch §Assembly, literally) and injects the
 * stock flavor registry — a flavor is an adapter, and neither this service nor
 * another adapter may import one.
 */

import { resolve } from "node:path"

import picomatch from "picomatch"

import type { Layer } from "../extraction/graph.model.ts"
import {
  LAYERS,
  specifierMatcher,
  specifierPattern,
} from "../extraction/graph.model.ts"
import type { FlavorResolver } from "../extraction/ports/flavor.port.ts"
import type { Reader } from "../extraction/ports/reader.port.ts"
import { STOCK_FLAVOR_NAME } from "../extraction/stock-flavor.model.ts"
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
   * Reader bindings — reader name → globs (root-relative POSIX) for files a
   * stock reader reads on top of its builtin binding; a configured binding
   * comes before every builtin one. A reader of one kind designates that kind
   * by binding: `{ "good-enough-tests": ["e2e/**"] }` makes the e2e tree test
   * files, read with the runner's exemptions, next to the `*.spec.*` naming the
   * runner binds by itself. Default: `{}`.
   */
  readers?: Readonly<Record<string, readonly string[]>>
  /**
   * The config loads: the use cases an assembly may await, `"<file>#<name>"` —
   * the service file whose factory built the instance, root-relative, and the
   * member called on it. One or a list. By default an assembly makes no
   * use-case call; a declared load is the exception, a use case the graph
   * itself depends on, its result a tech value from then on. Default: `[]`.
   */
  configLoads?: string | readonly string[]
  /**
   * The driver's tech beyond what the stock techs claim: specifier patterns
   * (same two-wildcard grammar as `external`) over packages a driver may import
   * as the technology it listens to — a parser, a server, a framework no
   * reading knows yet. Only widens the driver's import right: a service
   * importing the same package is red as ever. Default: `[]`.
   */
  driverTech?: readonly string[]
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
  isDriver: (path: string) => boolean
  isBoot: (path: string) => boolean
  /**
   * The readers in precedence order: the configured bindings first, each a
   * stock reader over the config's globs, then every stock reader as shipped.
   */
  readers: readonly Reader[]
  /**
   * Coverage's gate, applied to what `include`/`exclude` yield: a script
   * extension, or a designation glob, or a reader binding — a file of an
   * unruled tech that nothing names is outside the graph, not blob.
   */
  covers: (path: string) => boolean
  /** Normalized `configLoads`: one entry per declared load. */
  configLoads: readonly { file: string; name: string }[]
  /** Compiled `driverTech` matcher — any declared pattern matches. */
  driverTech: (specifier: string) => boolean
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
 * Stock readers, name → factory, in the order they bind by default — injected
 * by assembly like the flavors (readers are adapters).
 */
export type ReaderRegistry = Readonly<Record<string, () => Reader>>

const KNOWN_KEYS = [
  "flavor",
  "assembly",
  "drivers",
  "boot",
  "readers",
  "configLoads",
  "driverTech",
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
  key:
    | "assembly"
    | "drivers"
    | "boot"
    | "driverTech"
    | "include"
    | "exclude"
    | "pure"
    | "external",
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

/**
 * `readers` validated and composed: each configured binding is the named stock
 * reader over the config's globs, in written order, then every stock reader as
 * shipped — precedence is position.
 */
const readersOf = (value: unknown, registry: ReaderRegistry): Reader[] => {
  const stock = Object.values(registry).map((factory) => factory())
  if (value === undefined) return stock
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    throw new ConfigError(
      `config key "readers" must be an object of reader name → array of globs`,
    )
  }
  const configured = Object.entries(value).map(([name, globs]) => {
    const factory = registry[name]
    if (!factory) {
      throw new ConfigError(
        `unknown reader "${name}" under config key "readers" — known readers: ${Object.keys(registry).join(", ")}`,
      )
    }
    if (!isStringArray(globs)) {
      throw new ConfigError(
        `config key "readers" entry "${name}" must be an array of strings (globs)`,
      )
    }
    return { ...factory(), files: globs }
  })
  return [...configured, ...stock]
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
    readers: ReaderRegistry
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
      `config key "tests" is gone — a test file is one the test reader's binding names (*.spec.*, *.test.*, __tests__/); bind other paths with readers: { "good-enough-tests": [...] }`,
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
  const pure = stringArrayKey(record, "pure") ?? []
  const typeOnlyExempt =
    (record["typeOnlyExempt"] as boolean | undefined) ??
    flavor.typeOnlyExempt ??
    true
  const isAssembly = designationOf(stringArrayKey(record, "assembly") ?? [])
  const isDriver = designationOf(stringArrayKey(record, "drivers") ?? [])
  const isBoot = designationOf(stringArrayKey(record, "boot") ?? [])
  const readers = readersOf(record["readers"], context.readers)
  const bound = picomatch(readers.flatMap((reader) => [...reader.files]))

  return {
    root: context.root,
    configPath: context.configPath,
    localPath: context.localPath,
    flavor,
    flavorName,
    isAssembly,
    isDriver,
    isBoot,
    readers,
    covers: (path) =>
      hasCoverageExtension(path) ||
      isAssembly(path) ||
      isDriver(path) ||
      isBoot(path) ||
      bound(path),
    configLoads: configLoadsOf(record["configLoads"]),
    driverTech: specifierMatcher(stringArrayKey(record, "driverTech") ?? []),
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
