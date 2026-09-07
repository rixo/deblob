/**
 * `check surface` — the producer's own gate over its declared exports surface.
 * The `deblob` package.json field is a checked claim, not marketing: an exports
 * subpath whose tail names a layer must front a file of that layer, and a
 * subpath naming nothing must not front a composition unit or adapter —
 * directly, or through a re-export chain (the laundering shape an `assembly`
 * entry designation would otherwise wave through). No field, no claim, no
 * check: `surface: null` yields nothing — declaring is opting in.
 *
 * Every module target is resolved to the graph's word: a source target by its
 * own path, a built target through the build mirror (output root swapped for
 * its source root, extensions stripped, exactly one covered module). No
 * basename fallback — a name in `dist` is not a fact about a layer. A target
 * the graph cannot reach is an unverified claim: reported, never judged (no
 * rule was broken; the run just cannot certify). A pattern entry (`"./*"`) is
 * expanded the way Node resolves it, over the source side of the mirror — the
 * mirror is the producer's promise that the build is one-to-one, and the
 * expansion holds it to that. Subpaths the producer disclosed in `blob` are the
 * field's own carve-outs and are not checked. Pure: classified graph + parsed
 * surface in, violations + unverified out.
 */

import type {
  FlavorLayer,
  ImportGraph,
  Layer,
} from "../extraction/graph.model.ts"
import { exportsKeyFor } from "../extraction/exports-map.model.ts"
import type { SurfaceViolation } from "./violation.model.ts"

/** The package's own exports map and field, parsed by the loader adapter. */
export type PackageSurface = {
  /** Subpaths with their target paths — root-relative, conditions flattened. */
  subpaths: readonly {
    subpath: string
    targets: readonly string[]
  }[]
  /** The field's `blob` carve-outs — subpath patterns, as written. */
  blob: readonly string[]
}

export type CheckSurfaceOptions = {
  /**
   * The stock naming rule over a subpath tail — injected: the field claims the
   * stock rule, whatever flavor the package runs internally.
   */
  classifyEntry: (subpath: string) => FlavorLayer | null
  /** Build mirror: output root → source root, root-relative, no trailing `/`. */
  mirror: Readonly<Record<string, string>>
  /** Compiled `blob` — a disclosed subpath is the field's own carve-out. */
  disclosed: (subpath: string) => boolean
}

/** One module target of a subpath the graph could not reach, and why. */
export type UnverifiedTarget = {
  /** The exports target as written, `./` stripped. */
  target: string
  /** The extensionless path the lookup tried. */
  mapped: string
  /** The mirror that produced `mapped`; `null` = looked up as itself. */
  mirror: { root: string; source: string } | null
  /**
   * Covered modules at `mapped` — empty when none, two or more when the stem is
   * ambiguous (`src/x.ts` beside `src/x.js`): the mirror cannot pick.
   */
  candidates: readonly string[]
}

/**
 * An exports subpath the graph could not reach through any of its module
 * targets — a claim the run cannot certify. A subpath is one claim: one
 * reaching target (the declarations of a hybrid build, say) verifies it, so an
 * entry lists every target only when every target missed.
 */
export type UnverifiedEntry = {
  subpath: string
  targets: readonly UnverifiedTarget[]
}

export type SurfaceReport = {
  violations: SurfaceViolation[]
  unverified: UnverifiedEntry[]
}

/**
 * What an exports target can be for this check to have a word: a module in
 * source or built form. Declaration forms first — `.d.ts` must strip whole.
 */
const MODULE_EXTENSIONS: readonly string[] = [
  ".d.ts",
  ".d.mts",
  ".d.cts",
  ".ts",
  ".tsx",
  ".mts",
  ".cts",
  ".js",
  ".jsx",
  ".mjs",
  ".cjs",
]

const DECLARATION = /\.d\.[mc]?ts$/

const moduleExtensionOf = (path: string): string | undefined =>
  MODULE_EXTENSIONS.find((extension) => path.endsWith(extension))

const stripExtension = (path: string): string => {
  const extension = moduleExtensionOf(path)
  return extension === undefined ? path : path.slice(0, -extension.length)
}

const COMPOSITION: ReadonlySet<Layer> = new Set(["service", "adapters"])

export const checkSurface = (
  graph: ImportGraph,
  surface: PackageSurface | null,
  options: CheckSurfaceOptions,
): SurfaceReport => {
  if (surface === null) return { violations: [], unverified: [] }
  const { classifyEntry, mirror, disclosed } = options
  const violations: SurfaceViolation[] = []
  const unverified: UnverifiedEntry[] = []

  // covered modules by extensionless path — the lookup the mirror lands in
  const byStem = new Map<string, string[]>()
  for (const path of graph.modules.keys()) {
    const stem = stripExtension(path)
    byStem.set(stem, [...(byStem.get(stem) ?? []), path])
  }

  // longest mirror root prefixing the target wins
  const roots = Object.keys(mirror).sort((a, b) => b.length - a.length)
  const mirrorOf = (target: string): UnverifiedTarget["mirror"] => {
    const root = roots.find((r) => target === r || target.startsWith(`${r}/`))
    return root === undefined ? null : { root, source: mirror[root] as string }
  }

  /**
   * The target carried to the source side: output root swapped for its source
   * root (or the target as itself under no root), extension stripped.
   */
  const mirrored = (
    target: string,
  ): { through: UnverifiedTarget["mirror"]; mapped: string } => {
    const through = mirrorOf(target)
    const mapped = stripExtension(
      through === null
        ? target
        : `${through.source}${target.slice(through.root.length)}`,
    )
    return { through, mapped }
  }

  /** The covered module an exports target reaches, or why it reaches none. */
  const reach = (
    target: string,
  ): { path: string } | { unverified: UnverifiedTarget } => {
    const { through, mapped } = mirrored(target)
    const hits = byStem.get(mapped) ?? []
    // a declaration file describes its sibling module, it is not a second
    // source: `src/x.d.ts` beside `src/x.js` reaches the `.js`. Alone it is
    // the module (a types-only entry); two non-declaration files at one stem
    // are the ambiguity the mirror cannot settle.
    const modules = hits.filter((path) => !DECLARATION.test(path))
    const picked =
      modules.length === 1 ? modules[0] : hits.length === 1 ? hits[0] : null
    return picked !== undefined && picked !== null
      ? { path: picked }
      : { unverified: { target, mapped, mirror: through, candidates: hits } }
  }

  // re-export adjacency, in-coverage only — the closure never parses outward
  const reExports = new Map<string, string[]>()
  for (const edge of graph.edges) {
    if (!edge.reExport || edge.to.type !== "module") continue
    const list = reExports.get(edge.from) ?? []
    reExports.set(edge.from, list)
    list.push(edge.to.path)
  }

  /**
   * Composition units reachable from `start` through re-export chains — the
   * fronting closure. Traversal stops at each composition unit found (its own
   * re-exports are its own, in-set-policed business); the lexicographically
   * smallest hit keeps the finding deterministic.
   */
  const frontedThrough = (
    start: string,
  ): { path: string; layer: Layer } | null => {
    const seen = new Set([start])
    const queue = [start]
    const fronted: { path: string; layer: Layer }[] = []
    for (const from of queue) {
      for (const path of reExports.get(from) ?? []) {
        if (seen.has(path)) continue
        seen.add(path)
        // every module edge target is a graph node — extraction's contract
        const layer = (graph.modules.get(path) as { layer: Layer }).layer
        if (COMPOSITION.has(layer)) {
          fronted.push({ path, layer })
        } else {
          queue.push(path)
        }
      }
    }
    fronted.sort((a, b) => (a.path < b.path ? -1 : 1))
    return fronted[0] ?? null
  }

  // Node's key resolution over the map: a file reachable through two keys
  // belongs to exactly one of them and is judged once, under the key Node picks
  const keyFor = exportsKeyFor(surface.subpaths.map((entry) => entry.subpath))

  const stems = [...byStem.keys()].sort()

  /**
   * A pattern entry (`"./*": "./dist/*.js"`) expanded the way Node resolves it
   * — the star is a substitution, one string bound in key and target alike —
   * over the source side of the mirror: every covered stem matching the
   * mirrored target pattern binds the star and yields one concrete entry, kept
   * when Node would route that subpath to this key. Nothing matched: the
   * pattern itself is unverified.
   */
  const expand = (
    subpath: string,
    target: string,
  ):
    | { entries: { subpath: string; target: string }[] }
    | { unverified: UnverifiedTarget } => {
    const { through, mapped } = mirrored(target)
    const star = mapped.indexOf("*")
    const base = mapped.slice(0, star)
    const trailer = mapped.slice(star + 1)
    const entries: { subpath: string; target: string }[] = []
    for (const stem of stems) {
      if (
        stem.length <= base.length + trailer.length ||
        !stem.startsWith(base) ||
        !stem.endsWith(trailer)
      ) {
        continue
      }
      const bound = stem.slice(base.length, stem.length - trailer.length)
      const concrete = subpath.replace("*", () => bound)
      if (keyFor(concrete) !== subpath) continue
      entries.push({
        subpath: concrete,
        target: target.replace(/\*/g, () => bound),
      })
    }
    return entries.length > 0
      ? { entries }
      : { unverified: { target, mapped, mirror: through, candidates: [] } }
  }

  /** The verdict on one concrete entry reaching a covered module. */
  const judge = (subpath: string, exported: string, path: string): void => {
    const claimed = classifyEntry(subpath)
    // every covered path is a graph node — extraction's contract
    const node = graph.modules.get(path) as {
      layer: Layer
      serviceRoot: string | null
    }
    const base = {
      check: "surface" as const,
      ruleset: "arch" as const,
      file: path,
      serviceRoot: node.serviceRoot,
      subpath,
      exported,
    }
    if (claimed !== null) {
      if (node.layer !== claimed) {
        violations.push({
          ...base,
          rules: [3],
          shape: "claim-mismatch",
          claimed,
          actual: node.layer,
        })
      }
      return
    }
    if (COMPOSITION.has(node.layer)) {
      violations.push({
        ...base,
        rules: [2],
        shape: "unlabeled-front",
        fronts: path,
        frontLayer: node.layer,
      })
      return
    }
    const front = frontedThrough(path)
    if (front) {
      violations.push({
        ...base,
        rules: [2],
        shape: "unlabeled-front",
        fronts: front.path,
        frontLayer: front.layer,
      })
    }
  }

  for (const { subpath, targets } of surface.subpaths) {
    // a key with two stars never matches in Node — no consumer reaches it,
    // nothing to certify (the non-module case again)
    if (subpath.indexOf("*") !== subpath.lastIndexOf("*")) continue
    // a key disclosed as written is retracted whole — a pattern key under a
    // `**` disclosure never expands, so it cannot land unverified for matching
    // nothing (a literal key is caught here too, before any lookup)
    if (disclosed(subpath)) continue
    // package.json, stylesheets: not modules, nothing to say either way —
    // except a target ending in the star (`./dist/*`): the consumer supplies
    // the extension, the verdict is the same whichever it is
    const moduleTargets = [...new Set(targets)].filter(
      (target) =>
        moduleExtensionOf(target) !== undefined || target.endsWith("*"),
    )
    // concrete subpath → its module targets (a literal key is its own concrete
    // subpath; a pattern key contributes what each pattern target expands to);
    // a pattern target expanding to nothing is a miss for the key itself
    const concrete = new Map<string, string[]>()
    const keyMisses: UnverifiedTarget[] = []
    for (const target of moduleTargets) {
      if (subpath.includes("*") && target.includes("*")) {
        const expanded = expand(subpath, target)
        if ("unverified" in expanded) {
          keyMisses.push(expanded.unverified)
          continue
        }
        for (const entry of expanded.entries) {
          concrete.set(entry.subpath, [
            ...(concrete.get(entry.subpath) ?? []),
            entry.target,
          ])
        }
      } else {
        concrete.set(subpath, [...(concrete.get(subpath) ?? []), target])
      }
    }
    if (concrete.size === 0 && keyMisses.length > 0) {
      unverified.push({ subpath, targets: keyMisses })
    }
    // one verdict per concrete subpath: judged once per module any of its
    // targets reaches (conditions are one claim in several build forms — the
    // first target reaching a module names it); unverified only when every
    // target missed
    for (const [entrySubpath, entryTargets] of concrete) {
      if (disclosed(entrySubpath)) continue
      const reached = new Map<string, string>()
      const misses: UnverifiedTarget[] = []
      for (const target of entryTargets) {
        const result = reach(target)
        if ("unverified" in result) {
          misses.push(result.unverified)
        } else if (!reached.has(result.path)) {
          reached.set(result.path, target)
        }
      }
      if (reached.size === 0) {
        unverified.push({ subpath: entrySubpath, targets: misses })
        continue
      }
      for (const [path, target] of reached) judge(entrySubpath, target, path)
    }
  }

  return { violations, unverified }
}
