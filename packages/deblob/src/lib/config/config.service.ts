/**
 * Config resolution — `deblob.config.ts` as data, validated loudly and turned
 * into everything a run consumes. Service layer, not model: `ResolvedConfig`
 * holds a live `FlavorResolver` (a port shape the model may not know — rule 1,
 * surfaced by our own first self-check). Pure all the same: raw value in,
 * resolved value out, `ConfigError` with teaching messages. Loading (discovery
 * walk, native import) and scanning stay in the adapters; assembly owns the
 * load → resolve sequence (arch §Assembly, literally) and injects the stock
 * flavor registry — a flavor is an adapter, and neither this service nor
 * another adapter may import one.
 */

import { resolve } from "node:path"

import picomatch from "picomatch"

import type { FlavorResolver } from "../extraction/ports/flavor.port.ts"
import { STOCK_FLAVOR_NAME } from "../extraction/stock-flavor.model.ts"
import {
  ConfigError,
  DEFAULT_INCLUDE,
  EXCLUDE_BASELINE,
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
   * Assembly designation — globs (root-relative POSIX) whose matches wear the
   * assembly hat: their row in the matrix, nothing else. Privilege is per-edge,
   * never transitive. Default: `[]` — no designation; an undeclared composition
   * root classifies blob and its service imports fire rule 6.
   */
  assembly?: readonly string[]
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
   * Rule-4 allowlist: package names and builtin specifiers whose imports count
   * as pure. Unlisted third-party imported from a pure layer fires as
   * unclassified — purity is declared, not presumed. Default: `[]`.
   */
  pureLibs?: readonly string[]
  /**
   * Rule-8 stance override: `false` = strict, type-only imports lose their
   * exemption. Default comes from the flavor (absent = `true`, canon).
   */
  typeOnlyExempt?: boolean
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
   * identity, so listing the same pattern in `pureLibs` ratifies it pure.
   * Default: `[]`.
   */
  external?: readonly string[]
}

/** Identity — the typing channel for `deblob.config.ts` authors. */
export const defineConfig = (config: DeblobConfig): DeblobConfig => config

/** Everything a run consumes, resolved — config as data across the boundary. */
export type ResolvedConfig = {
  root: string
  /** `null` for a configless run — provenance the runner surfaces. */
  configPath: string | null
  flavor: FlavorResolver
  /**
   * Provenance label: the stock name, or `"custom"` for a config-supplied
   * resolver.
   */
  flavorName: string
  isAssembly: (path: string) => boolean
  include: readonly string[]
  exclude: readonly string[]
  pureLibs: readonly string[]
  typeOnlyExempt: boolean
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
}

/** Stock flavors, name → factory — injected by assembly (flavors are adapters). */
export type FlavorRegistry = Readonly<Record<string, () => FlavorResolver>>

const KNOWN_KEYS = [
  "flavor",
  "assembly",
  "include",
  "exclude",
  "pureLibs",
  "typeOnlyExempt",
  "tsconfig",
  "alias",
  "external",
] as const

const isStringArray = (value: unknown): value is readonly string[] =>
  Array.isArray(value) && value.every((entry) => typeof entry === "string")

const stringArrayKey = (
  raw: Record<string, unknown>,
  key: "assembly" | "include" | "exclude" | "pureLibs" | "external",
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

/**
 * Specifier pattern → anchored regex. Not picomatch: its `**` only crosses `/`
 * as a whole path segment, so `$theme:**` silently degrades to `$theme:*` and
 * misses `$theme:a/b.scss` (field-measured). A specifier is one string, not a
 * path — here `**` is any run of characters and `*` any run without `/`.
 */
const specifierPattern = (pattern: string): RegExp =>
  new RegExp(
    `^${pattern
      .split("**")
      .map((piece) =>
        piece
          .split("*")
          .map((literal) => literal.replace(/[.+?^${}()|[\]\\/]/g, "\\$&"))
          .join("[^/]*"),
      )
      .join(".*")}$`,
  )

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
    flavors: FlavorRegistry
  },
): ResolvedConfig => {
  if (typeof raw !== "object" || raw === null || Array.isArray(raw)) {
    throw new ConfigError(
      `deblob config must be an object (the default export of deblob.config.ts)`,
    )
  }
  const record = raw as Record<string, unknown>

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

  const { flavor, name: flavorName } = flavorOf(
    record["flavor"],
    context.flavors,
  )
  const assembly = stringArrayKey(record, "assembly") ?? []
  const include = stringArrayKey(record, "include") ?? DEFAULT_INCLUDE
  const exclude = [
    ...EXCLUDE_BASELINE,
    ...(stringArrayKey(record, "exclude") ?? []),
  ]
  const pureLibs = stringArrayKey(record, "pureLibs") ?? []
  const typeOnlyExempt =
    (record["typeOnlyExempt"] as boolean | undefined) ??
    flavor.typeOnlyExempt ??
    true

  return {
    root: context.root,
    configPath: context.configPath,
    flavor,
    flavorName,
    isAssembly: assembly.length > 0 ? picomatch([...assembly]) : () => false,
    include,
    exclude,
    pureLibs,
    typeOnlyExempt,
    tsconfig: tsconfigOf(record["tsconfig"], context.root),
    alias: aliasOf(record["alias"], context.root),
    external: externalMatcherOf(stringArrayKey(record, "external") ?? []),
  }
}
