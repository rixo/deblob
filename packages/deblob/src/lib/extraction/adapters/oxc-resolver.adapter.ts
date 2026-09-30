/**
 * The resolver over the real disk: oxc-resolver, with the project's tsconfig
 * `paths` and config aliases. It reads the disk itself and cannot be handed the
 * fs port — which is why resolution is a port of its own.
 */

import { dirname, join } from "node:path"

import { ResolverFactory } from "oxc-resolver"

import { ExtractionError } from "../graph.model.ts"
import type { Fs } from "../../fs/fs.port.ts"
import type { Resolution, Resolver, Resolvers } from "../ports/resolver.port.ts"

export const createOxcResolver = ({
  tsconfigPath,
  alias,
}: {
  tsconfigPath?: string
  alias?: Readonly<Record<string, readonly string[]>>
} = {}): Resolver => {
  // JS-oriented defaults silently misresolve TS — conditionNames and
  // extensionAlias are always set, never left to the resolver's defaults.
  const resolver = new ResolverFactory({
    conditionNames: ["import", "require", "node", "default"],
    extensions: [
      ".ts",
      ".tsx",
      ".mts",
      ".cts",
      ".js",
      ".jsx",
      ".mjs",
      ".cjs",
      ".json",
    ],
    extensionAlias: {
      ".js": [".ts", ".tsx", ".js"],
      ".jsx": [".tsx", ".jsx"],
      ".mjs": [".mts", ".mjs"],
      ".cjs": [".cts", ".cjs"],
    },
    builtinModules: true,
    // never `tsconfig: "auto"` — probed nonfunctional for paths mapping
    // (11.24.2, 2026-08-27): a knob that silently resolves nothing is worse
    // than none. Explicit configFile (wired from deblob's own root/config by
    // assembly) or tsconfig-less.
    ...(tsconfigPath
      ? { tsconfig: { configFile: tsconfigPath, references: "auto" as const } }
      : {}),
    ...(alias
      ? {
          alias: Object.fromEntries(
            Object.entries(alias).map(([key, targets]) => [key, [...targets]]),
          ),
        }
      : {}),
  })

  const resolve = async (
    fromAbsolutePath: string,
    specifier: string,
  ): Promise<Resolution> => {
    const result = await resolver.async(dirname(fromAbsolutePath), specifier)
    if (result.builtin)
      return { kind: "builtin", specifier: result.builtin.resolved }
    if (result.path) return { kind: "file", path: result.path }
    // the resolver always sets `error` when it yields neither path nor
    // builtin — the fallback exists for the optional type only
    /* v8 ignore next */
    return { kind: "unresolved", reason: result.error ?? "unresolved" }
  }

  return { resolve }
}

/**
 * The tsconfig feeding resolution — a filesystem fact: an explicit path must
 * exist (declared means load-bearing), `false` disables, `undefined` discovers
 * `tsconfig.json` at the config root; `null` = the resolver runs tsconfig-less.
 * A declared one missing is the config's mistake, raised where resolution needs
 * it — as a `configLoads` file outside coverage is.
 */
export const createTsconfigLocator = ({ fs }: { fs: Pick<Fs, "exists"> }) => ({
  tsconfigPathOf: async ({
    root,
    tsconfig,
  }: {
    root: string
    tsconfig: string | false | undefined
  }): Promise<string | null> => {
    if (tsconfig === false) return null
    if (typeof tsconfig === "string") {
      if (!(await fs.exists(tsconfig))) {
        throw new ExtractionError(
          "tsconfig-missing",
          `config key "tsconfig" points at ${tsconfig}, which does not exist`,
        )
      }
      return tsconfig
    }
    const fallback = join(root, "tsconfig.json")
    return (await fs.exists(fallback)) ? fallback : null
  },
})

/** A resolver per config over the real disk: its tsconfig, its aliases. */
export const createOxcResolvers = ({
  fs,
}: {
  fs: Pick<Fs, "exists">
}): Resolvers => {
  const { tsconfigPathOf } = createTsconfigLocator({ fs })
  return {
    resolverFor: async ({ root, tsconfig, alias }) => {
      const tsconfigPath = await tsconfigPathOf({ root, tsconfig })
      return createOxcResolver({
        ...(tsconfigPath === null ? {} : { tsconfigPath }),
        alias,
      })
    },
  }
}
