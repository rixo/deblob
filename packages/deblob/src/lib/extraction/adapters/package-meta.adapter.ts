/**
 * Producer-field lookup — the IO half of cross-package layer identity: resolve
 * the owning package.json of a bare specifier, read its `deblob` field, cache
 * per package name. A stranger's package.json must never break a consumer's
 * run: anything short of a readable claim (unresolvable specifier, malformed
 * manifest, absent field, malformed `blob`) reads as "no claim", never as an
 * error. The claim is trusted the way the code is — trust is the dependency
 * model; the consumer's `externalLayers` is the override.
 */

import { existsSync, readFileSync } from "node:fs"
import { dirname, join } from "node:path"

import type { FlavorLayer } from "../graph.model.ts"
import { exportsKeyFor, exportsSubpathsOf } from "../exports-map.model.ts"
import { packageNameOf, specifierMatcher } from "../graph.model.ts"
import type { ExtractionEngine } from "../ports/extraction.port.ts"

/**
 * A readable claim: the field is present; `keyFor` is the exports surface it
 * covers (Node's key resolution), `disclosed` its `blob`, `wiring` its
 * `assembly`.
 */
type Claim = {
  keyFor: (subpath: string) => string | null
  disclosed: (subpath: string) => boolean
  wiring: (subpath: string) => boolean
}

/** A pattern list of the field, read leniently: anything but strings drops. */
const patternsIn = (field: Record<string, unknown>, key: string): string[] => {
  const value = field[key]
  return Array.isArray(value)
    ? value.filter((entry): entry is string => typeof entry === "string")
    : []
}

export const createPackageMetaReader = ({
  resolve,
  anchor,
  classifyEntry,
}: {
  /** The engine's resolver — the same lens extraction sees packages through. */
  resolve: ExtractionEngine["resolve"]
  /** Absolute file path resolution anchors at (the consumer's root). */
  anchor: string
  /** The stock naming rule — the field claims it, whatever flavor is local. */
  classifyEntry: (subpath: string) => FlavorLayer | null
}): { layerOf: (specifier: string) => FlavorLayer | null } => {
  /** Package name → its claim, `null` for none. */
  const claims = new Map<string, Claim | null>()

  /**
   * The field's `blob` and `assembly`, read leniently: keys this version does
   * not understand are ignored and a malformed value reads as absent — a newer
   * producer stays readable by an older consumer, a broken one never breaks the
   * run. A field without an exports map is the provider's error (its own gate
   * rejects it): no surface, no claim.
   */
  const claimOf = (manifest: Record<string, unknown>): Claim | null => {
    const field = manifest["deblob"]
    if (typeof field !== "object" || field === null || Array.isArray(field)) {
      return null
    }
    const exports = manifest["exports"]
    if (exports === undefined || exports === null) return null
    const record = field as Record<string, unknown>
    return {
      keyFor: exportsKeyFor(
        exportsSubpathsOf(exports).map((entry) => entry.subpath),
      ),
      disclosed: specifierMatcher(patternsIn(record, "blob")),
      wiring: specifierMatcher(patternsIn(record, "assembly")),
    }
  }

  /**
   * Nearest manifest up from the resolved file — the owning package under node
   * layouts (pnpm store included). Nameless type-marker package.json files
   * (`{"type":"module"}` in dist/) are stepped over. `undefined` = no manifest
   * was reached (the specifier did not resolve to a file, or nothing named sits
   * above it): nothing was learned about the package, so nothing is cached — a
   * declared-external or stray subpath seen first must not blank the package's
   * claim for the subpaths that follow.
   */
  const probe = (specifier: string): Claim | null | undefined => {
    const resolution = resolve(anchor, specifier)
    if (resolution.kind !== "file") return undefined
    for (let dir = dirname(resolution.path); ;) {
      const manifestPath = join(dir, "package.json")
      if (existsSync(manifestPath)) {
        let parsed: unknown
        try {
          parsed = JSON.parse(readFileSync(manifestPath, "utf8"))
        } catch {
          // a stranger's broken manifest carries no readable claim — degrade
          // to unlabeled, never break the consumer's run
          return null
        }
        const manifest =
          typeof parsed === "object" && parsed !== null
            ? (parsed as Record<string, unknown>)
            : null
        if (manifest !== null && typeof manifest["name"] === "string") {
          return claimOf(manifest)
        }
      }
      const parent = dirname(dir)
      if (parent === dir) return undefined
      dir = parent
    }
  }

  const layerOf = (specifier: string): FlavorLayer | null => {
    const name = packageNameOf(specifier)
    if (name === null || name.startsWith("node:")) return null
    let claim = claims.get(name)
    if (claim === undefined) {
      claim = probe(specifier)
      if (claim !== undefined) claims.set(name, claim)
    }
    if (claim === null || claim === undefined) return null
    // the tail after the package name — "" for the bare root, which the
    // naming rule maps to no claim; the exports subpath is the surface key
    const tail = specifier.slice(name.length + 1)
    const subpath = tail === "" ? "." : `./${tail}`
    // off the exports surface (a deep import around the map, an alias into
    // source): the field never claimed it, the producer's gate never saw it
    if (claim.keyFor(subpath) === null) return null
    // blob retracts before anything else is read; assembly is the producer's
    // designation and beats the tail — both trusted as the code is
    if (claim.disclosed(subpath)) return null
    if (claim.wiring(subpath)) return "assembly"
    return classifyEntry(tail)
  }

  return { layerOf }
}
