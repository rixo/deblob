import { relative, resolve, sep } from "node:path"

import type {
  ImportEdge,
  ImportGraph,
  Layer,
  ModuleNode,
  UnresolvedImport,
  EdgeTarget,
} from "./graph.model.ts"
import { packageNameOf } from "./graph.model.ts"
import type { ExtractionEngine } from "./ports/extraction.port.ts"
import type { FlavorResolver } from "./ports/flavor.port.ts"

const toPosix = (path: string): string => path.split(sep).join("/")

const targetKey = (target: EdgeTarget): string =>
  target.type === "module"
    ? `module:${target.path}`
    : `external:${target.specifier}`

export const createExtraction = ({
  engine,
  flavor,
}: {
  engine: ExtractionEngine
  flavor: FlavorResolver
}) => {
  const extractGraph = ({
    root,
    files,
    isAssembly,
    external,
    externalLayerOf,
  }: {
    root: string
    /** Coverage set: paths relative to `root`, POSIX-style. */
    files: readonly string[]
    /**
     * Assembly designation — ORs on top of the flavor's own classification
     * (which grants assembly to test naming only, `test-setup-assembly`). The
     * escape hatch for exotic naming; absent = the flavor's word is final.
     */
    isAssembly?: (path: string) => boolean
    /**
     * Declared externals — returns the matching declared pattern, or `null`. A
     * hit is a leaf known by declaration (the environment provides it, nothing
     * on disk) and never reaches the resolver; the pattern becomes the leaf's
     * purity identity. Absent = nothing is declared.
     */
    external?: (specifier: string) => string | null
    /**
     * The crossed layer identity of an external leaf — composed by assembly
     * from the consumer's `externalLayers` patch and producer `deblob` fields.
     * Consulted uniformly for every external leaf, declared ones included;
     * absent = no claims, every leaf stays `layer: null`.
     */
    externalLayerOf?: (specifier: string) => Layer | null
  }): ImportGraph => {
    const classifications = flavor.classify(files)
    const fileSet = new Set(files)
    const modules = new Map<string, ModuleNode>()
    const edges = new Map<string, ImportEdge>()
    const unresolved: UnresolvedImport[] = []

    /** Where a literal specifier lands: a target, or the resolver's reason. */
    const targetOf = (
      fromAbsolutePath: string,
      specifier: string,
    ): { target: EdgeTarget } | { reason: string } => {
      const layer = () => externalLayerOf?.(specifier) ?? null
      const pattern = external?.(specifier) ?? null
      if (pattern !== null) {
        return {
          target: {
            type: "external",
            specifier,
            package: pattern,
            declared: true,
            layer: layer(),
          },
        }
      }
      const resolution = engine.resolve(fromAbsolutePath, specifier)
      if (resolution.kind === "unresolved") return { reason: resolution.reason }
      if (resolution.kind === "builtin") {
        // package carries the resolver's normalized name (`path` →
        // `node:path`) so downstream classification matches one form
        return {
          target: {
            type: "external",
            specifier,
            package: resolution.specifier,
            declared: false,
            layer: layer(),
          },
        }
      }
      const path = toPosix(relative(root, resolution.path))
      return {
        target: fileSet.has(path)
          ? { type: "module", path }
          : {
              type: "external",
              specifier,
              package: packageNameOf(specifier),
              declared: false,
              layer: layer(),
            },
      }
    }

    for (const file of files) {
      const classification = classifications.get(file)
      if (!classification) {
        throw new Error(
          `flavor broke its contract: no classification for ${file} (classify must be total)`,
        )
      }

      const absolutePath = resolve(root, file)
      const extraction = engine.extract(absolutePath)

      modules.set(file, {
        path: file,
        layer: isAssembly?.(file) ? "assembly" : classification.layer,
        serviceRoot: classification.serviceRoot,
        isPrivate: classification.isPrivate,
        parsed: extraction !== null,
        runtimeContent: extraction ? extraction.runtimeContent : [],
      })

      if (!extraction) continue

      for (const record of extraction.imports) {
        if (!record.literal) {
          unresolved.push({
            from: file,
            specifier: record.specifier,
            reason: "non-literal import expression",
            literal: false,
          })
          continue
        }

        const outcome = targetOf(absolutePath, record.specifier)
        if ("reason" in outcome) {
          unresolved.push({
            from: file,
            specifier: record.specifier,
            reason: outcome.reason,
            literal: true,
          })
          continue
        }
        const { target } = outcome

        const key = `${file}\0${targetKey(target)}`
        const existing = edges.get(key)
        const kind = record.typeOnly ? "type" : "runtime"
        if (!existing) {
          edges.set(key, {
            from: file,
            to: target,
            kind,
            form: record.form,
            reExport: record.reExport,
          })
        } else {
          // one edge per (from, target); runtime wins the kind merge, and
          // reExport ORs across occurrences independently of it
          const runtimeWins = existing.kind === "type" && kind === "runtime"
          edges.set(key, {
            from: file,
            to: target,
            kind: runtimeWins ? kind : existing.kind,
            form: runtimeWins ? record.form : existing.form,
            reExport: existing.reExport || record.reExport,
          })
        }
      }
    }

    return { root, modules, edges: [...edges.values()], unresolved }
  }

  return { extractGraph }
}
