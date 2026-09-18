/**
 * The resolver over the real disk: oxc-resolver, with the project's tsconfig
 * `paths` and config aliases. It reads the disk itself and cannot be handed the
 * fs port — which is why resolution is a port of its own.
 */

import { dirname } from "node:path"

import { ResolverFactory } from "oxc-resolver"

import type { Resolution, Resolver } from "../ports/resolver.port.ts"

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
