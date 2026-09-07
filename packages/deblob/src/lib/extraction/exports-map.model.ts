/**
 * The package.json exports map as a surface — pure knowledge of Node's shape
 * and resolution, shared by the three readers of a surface: the producer's
 * loader (flattening its own map), the producer's `surface` check (routing a
 * concrete subpath to the key Node would pick), and the consumer's meta reader
 * (is this specifier on the provider's surface at all). One reading, so a claim
 * is verified and consumed over the same set of subpaths.
 */

export type ExportsSubpath = {
  /** The key as written: `.`, `./checkout.service`, `./*`. */
  subpath: string
  /** Every string target under it — conditions flattened, `./` stripped. */
  targets: readonly string[]
}

/** Every string leaf of an exports value — conditions flattened, depth-first. */
const stringLeaves = (value: unknown, out: string[]): void => {
  if (typeof value === "string") {
    out.push(value)
    return
  }
  if (Array.isArray(value)) {
    for (const entry of value) stringLeaves(entry, out)
    return
  }
  if (typeof value === "object" && value !== null) {
    for (const entry of Object.values(value)) stringLeaves(entry, out)
  }
  // null and anything else: not a target
}

const normalizeTarget = (target: string): string =>
  target.startsWith("./") ? target.slice(2) : target

/**
 * The exports map flattened to subpath → targets. A string is the root; a
 * dot-keyed object is a subpath map; any other object is the root's condition
 * tree (Node's own disambiguation rule); a scalar that is not a path has no
 * entries (Node would not resolve it either).
 */
export const exportsSubpathsOf = (
  exports: unknown,
): readonly ExportsSubpath[] => {
  if (typeof exports === "string") {
    return [{ subpath: ".", targets: [normalizeTarget(exports)] }]
  }
  if (typeof exports !== "object" || exports === null) return []
  const record = exports as Record<string, unknown>
  const keys = Object.keys(record)
  if (keys.some((key) => key.startsWith("."))) {
    return keys
      .filter((key) => key.startsWith("."))
      .map((subpath) => {
        const targets: string[] = []
        stringLeaves(record[subpath], targets)
        return { subpath, targets: targets.map(normalizeTarget) }
      })
  }
  const targets: string[] = []
  stringLeaves(record, targets)
  return [{ subpath: ".", targets: targets.map(normalizeTarget) }]
}

/** A key with exactly one star — Node's subpath pattern; two stars never match. */
const isPattern = (key: string): boolean =>
  key.includes("*") && key.indexOf("*") === key.lastIndexOf("*")

/**
 * Node's pattern match: the star binds a non-empty string, slashes included.
 * `subpath.length >= key.length` is the non-emptiness (the key holds the
 * star).
 */
const patternMatches = (key: string, subpath: string): boolean => {
  const star = key.indexOf("*")
  return (
    subpath.length >= key.length &&
    subpath.startsWith(key.slice(0, star)) &&
    subpath.endsWith(key.slice(star + 1))
  )
}

/**
 * Node's key resolution over a map's keys: an exact literal key wins, else the
 * matching pattern with the longest base, then the longest key; `null` when the
 * subpath is off the surface. The one function that decides "which entry does
 * this subpath belong to" — a subpath belongs to exactly one key or none.
 */
export const exportsKeyFor = (
  keys: readonly string[],
): ((subpath: string) => string | null) => {
  const literal = new Set(keys.filter((key) => !key.includes("*")))
  const patterns = keys.filter(isPattern)
  return (subpath) => {
    if (literal.has(subpath)) return subpath
    let best: string | null = null
    for (const key of patterns) {
      if (!patternMatches(key, subpath)) continue
      if (
        best === null ||
        key.indexOf("*") > best.indexOf("*") ||
        (key.indexOf("*") === best.indexOf("*") && key.length > best.length)
      ) {
        best = key
      }
    }
    return best
  }
}
