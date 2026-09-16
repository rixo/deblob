import { relative, resolve, sep } from "node:path"

import type {
  ArgValue,
  FileReading,
  ImportEdge,
  ImportGraph,
  Layer,
  ModuleNode,
  ReadCall,
  ReadHook,
  ReadStatement,
  UnresolvedImport,
  EdgeTarget,
} from "./graph.model.ts"
import {
  ExtractionError,
  externalPurityOf,
  packageNameOf,
} from "./graph.model.ts"
import type {
  ExtractionEngine,
  FileExtraction,
} from "./ports/extraction.port.ts"
import type {
  FlavorClassification,
  FlavorResolver,
} from "./ports/flavor.port.ts"
import type { Tech } from "./ports/tech.port.ts"
import type { ImportTargetKind } from "./reader.model.ts"
import { readModule } from "./reader.model.ts"

const toPosix = (path: string): string => path.split(sep).join("/")

const targetKey = (target: EdgeTarget): string =>
  target.type === "module"
    ? `module:${target.path}`
    : `external:${target.specifier}`

const OUTSIDE_KINDS: ReadonlySet<Layer> = new Set([
  "assembly",
  "driver",
  "boot",
  "test",
])

/** Every call in a reading, hooks and arms included. */
const callsOf = (statements: readonly ReadStatement[]): ReadCall[] =>
  statements.flatMap((statement) =>
    statement.kind === "call"
      ? [statement.call]
      : statement.kind === "control"
        ? statement.arms.flatMap(callsOf)
        : [],
  )

const hookCalls = (hooks: readonly ReadHook[]): ReadCall[] =>
  hooks.flatMap((hook) => [...callsOf(hook.body), ...hookCalls(hook.hooks)])

const readingCalls = (reading: FileReading): ReadCall[] => [
  ...callsOf(reading.root),
  ...hookCalls(reading.hooks),
  ...reading.functions.flatMap((fn) => [
    ...callsOf(fn.body),
    ...hookCalls(fn.hooks),
  ]),
]

const sameArg = (a: ArgValue, b: ArgValue): boolean =>
  a.kind === b.kind &&
  a.origin?.path === b.origin?.path &&
  a.origin?.name === b.origin?.name &&
  a.path.join(".") === b.path.join(".")

/**
 * The parameter bindings the call sites give: file → exported function →
 * argument per position, `null` where two sites disagree or one is short. Only
 * an assembly function or a driver's wiring function is a target — the two
 * exports the outside kinds call across files. A site in a test file does not
 * bind: a test hands fakes, no evidence of what production hands.
 */
const paramBindingsOf = (
  modules: ReadonlyMap<string, ModuleNode>,
): Map<string, Map<string, (ArgValue | null)[]>> => {
  const bindings = new Map<string, Map<string, (ArgValue | null)[]>>()
  for (const [from, node] of modules) {
    if (node.reading === null || node.layer === "test") continue
    for (const call of readingCalls(node.reading)) {
      const { callee } = call
      const target =
        callee.kind === "wiring" ||
        (callee.kind === "factory" && callee.layer === "assembly")
          ? { path: callee.path, name: callee.name }
          : null
      if (target === null || target.path === from) continue
      const byName =
        bindings.get(target.path) ?? new Map<string, (ArgValue | null)[]>()
      bindings.set(target.path, byName)
      const seen = byName.get(target.name)
      if (seen === undefined) {
        byName.set(target.name, [...call.args])
        continue
      }
      // a later site: agree or fall to unknown, position by position
      const width = Math.max(seen.length, call.args.length)
      for (let index = 0; index < width; index += 1) {
        const known = seen[index]
        const arg = call.args[index]
        seen[index] =
          known !== undefined &&
          known !== null &&
          arg !== undefined &&
          sameArg(known, arg)
            ? known
            : null
      }
    }
  }
  return bindings
}

export const createExtraction = ({
  engine,
  flavor,
  techs = [],
}: {
  engine: ExtractionEngine
  flavor: FlavorResolver
  /**
   * The techs, one adapter per technology: the first whose kinds hold a file's
   * reads it. None = every outside-kind file is recognized and open.
   */
  techs?: readonly Tech[]
}) => {
  const extractGraph = ({
    root,
    files,
    isAssembly,
    isDriver,
    isBoot,
    isTest,
    external,
    externalLayerOf,
    pure = [],
    driverTech = () => false,
    configLoads = [],
  }: {
    root: string
    /** Coverage set: paths relative to `root`, POSIX-style. */
    files: readonly string[]
    /**
     * The designations — the config's globs for the kinds a framework names
     * itself. Recognition, most specific claim first: test naming or `isTest`
     * makes a test file wherever it sits; then one designation wins over the
     * flavor's word; two designations on one file is a config error, thrown
     * here with the file and both keys named. Absent = the flavor's word is
     * final.
     */
    isAssembly?: (path: string) => boolean
    isDriver?: (path: string) => boolean
    isBoot?: (path: string) => boolean
    isTest?: (path: string) => boolean
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
    /**
     * `pure` entries — a pure package or builtin is model to the reader, red in
     * a driver; a concrete one is the driver's tech.
     */
    pure?: readonly string[]
    /** The project's `driverTech` matcher: packages a driver may import as tech. */
    driverTech?: (specifier: string) => boolean
    /**
     * The declared config loads, split: the file must be covered — a load names
     * a service file of this project, a miss is a config mistake.
     */
    configLoads?: readonly { file: string; name: string }[]
  }): ImportGraph => {
    const pureSet = new Set(pure)
    const classifications = flavor.classify(files)
    const fileSet = new Set(files)
    for (const load of configLoads) {
      if (!fileSet.has(load.file)) {
        throw new ExtractionError(
          "load-file-not-covered",
          `configLoads names ${load.file}#${load.name}, but ${load.file} is not a covered file — the service file whose factory builds the instance, root-relative`,
        )
      }
    }
    const modules = new Map<string, ModuleNode>()
    const edges = new Map<string, ImportEdge>()
    const unresolved: UnresolvedImport[] = []

    const designations: readonly (readonly [
      key: string,
      layer: Layer,
      matches: ((path: string) => boolean) | undefined,
    ])[] = [
      ["assembly", "assembly", isAssembly],
      ["drivers", "driver", isDriver],
      ["boot", "boot", isBoot],
    ]

    /** The file's kind: test first, then one designation, then the flavor. */
    const layerOf = (file: string, flavorLayer: Layer): Layer => {
      if (flavorLayer === "test" || isTest?.(file)) return "test"
      const designated = designations.filter(([, , matches]) => matches?.(file))
      if (designated.length > 1) {
        // a config mistake found where the file set is — extraction's own
        // failure, actionable, presented by the driver
        throw new ExtractionError(
          "designation-conflict",
          `${file} is designated ${designated.map(([key]) => `"${key}"`).join(" and ")} in deblob config — a file has one kind; narrow the globs`,
        )
      }
      return designated[0]?.[1] ?? flavorLayer
    }

    /** What an import lands on, for the reader: the target's kind, or the claim. */
    const importTargetKindOf = (
      tech: Tech | null,
      target: EdgeTarget | null,
      specifier: string,
    ): ImportTargetKind => {
      if (target === null) return { kind: "unresolved" }
      if (target.type === "module") {
        // a covered module: classify is total, the flavor's word is there
        const classification = classifications.get(
          target.path,
        ) as FlavorClassification
        return {
          kind: "module",
          path: target.path,
          layer: layerOf(target.path, classification.layer),
        }
      }
      // a tech's claim first, then the project's; then purity says model,
      // concrete says tech (a builtin, a declared external, a file outside
      // coverage), unclassified says declare it
      const claimed = tech?.claims(specifier) === true || driverTech(specifier)
      const purity = externalPurityOf(target, pureSet)
      return {
        kind: "external",
        package: target.package,
        claim: claimed
          ? "tech"
          : purity === "pure"
            ? "model"
            : purity === "concrete"
              ? "tech"
              : "unclaimed",
      }
    }

    /**
     * The file's reading: with its tech for an outside kind — none means
     * recognized and open, `null` — root statements only for an inside kind.
     */
    const readingOf = (
      file: string,
      layer: Layer,
      extraction: FileExtraction,
      landed: ReadonlyMap<string, EdgeTarget | null>,
      paramKinds?: ReadonlyMap<string, readonly (ArgValue | null)[]>,
    ): FileReading | null => {
      const tech =
        techs.find((candidate) => candidate.kinds.includes(layer)) ?? null
      if (OUTSIDE_KINDS.has(layer) && tech === null) return null
      // every literal specifier the reader can ask about is an import the
      // engine listed — a miss is an unresolved one
      const targetOfSpecifier = (specifier: string): EdgeTarget | null =>
        landed.get(specifier) ?? null
      return readModule({
        program: extraction.program,
        source: extraction.source,
        layer,
        tech:
          tech === null || !OUTSIDE_KINDS.has(layer)
            ? null
            : { name: tech.name, exempts: tech.exempts },
        importTargetOf: (specifier) =>
          importTargetKindOf(tech, targetOfSpecifier(specifier), specifier),
        // the flavor's word on export names, plain data; a flavor without the
        // rule names nothing
        isFactory: (name) => flavor.isFactory?.(name) ?? false,
        ...(paramKinds ? { paramKinds } : {}),
        configLoads,
      })
    }

    /** What the graph pass needs to read a file again: where its imports landed. */
    const landedByFile = new Map<
      string,
      ReadonlyMap<string, EdgeTarget | null>
    >()

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
      const layer = layerOf(file, classification.layer)
      /** Where each of this file's specifiers landed — the reader asks again. */
      const landed = new Map<string, EdgeTarget | null>()

      for (const record of extraction?.imports ?? []) {
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
          landed.set(record.specifier, null)
          unresolved.push({
            from: file,
            specifier: record.specifier,
            reason: outcome.reason,
            literal: true,
          })
          continue
        }
        const { target } = outcome
        landed.set(record.specifier, target)

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

      if (layer === "assembly" || layer === "driver")
        landedByFile.set(file, landed)
      modules.set(file, {
        path: file,
        layer,
        serviceRoot: classification.serviceRoot,
        isPrivate: classification.isPrivate,
        parsed: extraction !== null,
        runtimeContent: extraction ? extraction.runtimeContent : [],
        reading: extraction ? readingOf(file, layer, extraction, landed) : null,
      })
    }

    // the graph pass: parameters are bound at their call sites. An assembly
    // function or a sub-driver's wiring function called from another
    // outside-kind file takes its parameters' kinds from the arguments,
    // joined over every production site (a test's fakes bind nothing) — the
    // files that gained a binding are read again with it, the tree parsed
    // again rather than kept. A binding can make another site's argument
    // known (a root assembly's parameter handed on to a group assembly), so
    // the pass runs to a fixed point: one round per level of the call chain,
    // at most one per file.
    let previous = ""
    for (let round = 0; round < modules.size; round += 1) {
      const bindings = paramBindingsOf(modules)
      const current = JSON.stringify(
        [...bindings].map(([file, byName]) => [file, [...byName]]),
      )
      if (current === previous) break
      previous = current
      for (const [file, paramKinds] of bindings) {
        // a bound file is an assembly or a driver that parsed: both exist
        const node = modules.get(file) as ModuleNode
        const landed = landedByFile.get(file) as ReadonlyMap<
          string,
          EdgeTarget | null
        >
        const extraction = engine.extract(resolve(root, file)) as FileExtraction
        modules.set(file, {
          ...node,
          reading: readingOf(file, node.layer, extraction, landed, paramKinds),
        })
      }
    }

    return { root, modules, edges: [...edges.values()], unresolved }
  }

  return { extractGraph }
}
