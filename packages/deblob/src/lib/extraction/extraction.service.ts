import { relative, resolve, sep } from "node:path"

import type {
  ImportEdge,
  ImportGraph,
  ModuleNode,
  UnresolvedImport,
  EdgeTarget,
} from "./graph.model.ts"
import type { ExtractionEngine } from "./ports/extraction.port.ts"
import type { FlavorResolver } from "./ports/flavor.port.ts"

/**
 * Bare-specifier package name (`zod`, `@scope/name`, `node:path`); `null` for
 * relative/absolute specifiers.
 */
const packageNameOf = (specifier: string): string | null => {
  if (/^[./]/.test(specifier)) return null
  const nameStart = specifier.startsWith("@") ? specifier.indexOf("/") + 1 : 0
  const slash = specifier.indexOf("/", nameStart)
  return slash === -1 ? specifier : specifier.slice(0, slash)
}

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
  }: {
    root: string
    /** Coverage set: paths relative to `root`, POSIX-style. */
    files: readonly string[]
    /**
     * Assembly designation — ORs on top of the flavor's own classification
     * (which grants assembly to test naming only, rule 16). The escape hatch
     * for exotic naming; absent = the flavor's word is final.
     */
    isAssembly?: (path: string) => boolean
  }): ImportGraph => {
    const classifications = flavor.classify(files)
    const fileSet = new Set(files)
    const modules = new Map<string, ModuleNode>()
    const edges = new Map<string, ImportEdge>()
    const unresolved: UnresolvedImport[] = []

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
      })

      if (!extraction) continue

      for (const record of extraction.imports) {
        if (!record.literal) {
          unresolved.push({
            from: file,
            specifier: record.specifier,
            reason: "non-literal import expression",
          })
          continue
        }

        const resolution = engine.resolve(absolutePath, record.specifier)

        if (resolution.kind === "unresolved") {
          unresolved.push({
            from: file,
            specifier: record.specifier,
            reason: resolution.reason,
          })
          continue
        }

        let target: EdgeTarget
        if (resolution.kind === "builtin") {
          // package carries the resolver's normalized name (`path` →
          // `node:path`) so downstream classification matches one form
          target = {
            type: "external",
            specifier: record.specifier,
            package: resolution.specifier,
          }
        } else {
          const path = toPosix(relative(root, resolution.path))
          target = fileSet.has(path)
            ? { type: "module", path }
            : {
                type: "external",
                specifier: record.specifier,
                package: packageNameOf(record.specifier),
              }
        }

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
