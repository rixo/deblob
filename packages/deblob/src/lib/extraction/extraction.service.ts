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
  World,
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
import type { Reader } from "./ports/reader.port.ts"
import type { Resolver } from "./ports/resolver.port.ts"
import type { ImportTargetKind } from "./reading.model.ts"
import { readModule } from "./reading.model.ts"
import type { Designations } from "./recognition.model.ts"
import { createRecognition } from "./recognition.model.ts"

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

const sameArgs = (a: readonly ArgValue[], b: readonly ArgValue[]): boolean =>
  a.length === b.length && a.every((arg, index) => sameArg(arg, b[index]!))

/**
 * The worlds the call sites open: file → one world per exported function and
 * distinct argument vector, in site order, the first site of a vector kept as
 * the inducing one. Only an assembly function or a driver's wiring function is
 * a target — the two exports the outside kinds call across files; a site in the
 * target's own file binds nothing (a second function there is the rules'
 * business before its body is). A site in a test file does not bind: a test
 * hands fakes, no evidence of what production hands. Sites are read off every
 * world of the calling file, since an argument can be that file's own bound
 * parameter handed on.
 */
const worldsOf = (
  modules: ReadonlyMap<string, ModuleNode>,
): Map<string, World[]> => {
  const worlds = new Map<string, World[]>()
  for (const [from, node] of modules) {
    if (node.reading === null || node.layer === "test") continue
    const readings = [node.reading, ...node.readings.map((r) => r.reading)]
    for (const call of readings.flatMap(readingCalls)) {
      const { callee } = call
      const target =
        callee.kind === "wiring" ||
        (callee.kind === "factory" && callee.layer === "assembly")
          ? { path: callee.path, name: callee.name }
          : null
      if (target === null || target.path === from) continue
      const known = worlds.get(target.path) ?? []
      worlds.set(target.path, known)
      if (
        known.some(
          (world) =>
            world.name === target.name && sameArgs(world.args, call.args),
        )
      )
        continue
      known.push({
        name: target.name,
        site: { path: from, span: call.span },
        args: call.args,
      })
    }
  }
  return worlds
}

/**
 * One reading's bindings: every function from its first world, the named one
 * from the given world.
 */
const paramKindsOf = (
  worlds: readonly World[],
  bound?: World,
): Map<string, readonly ArgValue[]> => {
  const byName = new Map<string, readonly ArgValue[]>()
  for (const world of worlds)
    if (!byName.has(world.name)) byName.set(world.name, world.args)
  if (bound) byName.set(bound.name, bound.args)
  return byName
}

export const createExtraction = ({
  engine,
  resolver,
  flavor,
  readers = [],
}: {
  engine: ExtractionEngine
  resolver: Resolver
  flavor: FlavorResolver
  /**
   * The readers, one per technology, in precedence order (config's bindings
   * first, then the stock ones): the first whose binding matches a file and
   * whose kinds hold its kind reads it. None = every outside-kind file is
   * recognized and open.
   */
  readers?: readonly Reader[]
}) => {
  const extractGraph = async ({
    root,
    files,
    isAssembly,
    isDriver,
    isBoot,
    external,
    externalLayerOf,
    pure = [],
    driverTech = () => false,
    configLoads = [],
  }: Designations & {
    root: string
    /** Coverage set: paths relative to `root`, POSIX-style. */
    files: readonly string[]
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
    externalLayerOf?: (
      specifier: string,
    ) => Layer | null | Promise<Layer | null>
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
  }): Promise<ImportGraph> => {
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

    const recognition = createRecognition({
      readers,
      ...(isAssembly ? { isAssembly } : {}),
      ...(isDriver ? { isDriver } : {}),
      ...(isBoot ? { isBoot } : {}),
    })
    /**
     * The file's kind: a reader's designation, then the config's, then the
     * flavor.
     */
    const layerOf = recognition.kindOf

    /** What an import lands on, for the reader: the target's kind, or the claim. */
    const importTargetKindOf = (
      tech: Reader | null,
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
      paramKinds?: ReadonlyMap<string, readonly ArgValue[]>,
    ): FileReading | null => {
      const tech = recognition.readerOf(file, layer)
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
    const targetOf = async (
      fromAbsolutePath: string,
      specifier: string,
    ): Promise<{ target: EdgeTarget } | { reason: string }> => {
      const layer = async () => (await externalLayerOf?.(specifier)) ?? null
      const pattern = external?.(specifier) ?? null
      if (pattern !== null) {
        return {
          target: {
            type: "external",
            specifier,
            package: pattern,
            declared: true,
            layer: await layer(),
          },
        }
      }
      const resolution = await resolver.resolve(fromAbsolutePath, specifier)
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
            layer: await layer(),
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
              layer: await layer(),
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
      const extraction = await engine.extract(absolutePath)
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

        const outcome = await targetOf(absolutePath, record.specifier)
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
        readings: [],
      })
    }

    // the graph pass: parameters are bound at their call sites, one world
    // per distinct argument vector. An assembly function or a sub-driver's
    // wiring function called from another outside-kind file is read once per
    // world, its parameters' kinds that world's arguments (a test's fakes
    // open nothing) — the tree parsed again rather than kept; `reading` binds
    // every function from its first world. A binding can make another site's
    // argument known (a root assembly's parameter handed on to a group
    // assembly), so the pass runs to a fixed point: one round per level of
    // the call chain, at most one per file.
    let previous = ""
    for (let round = 0; round < modules.size; round += 1) {
      const worlds = worldsOf(modules)
      const current = JSON.stringify([...worlds])
      if (current === previous) break
      previous = current
      for (const [file, fileWorlds] of worlds) {
        // a bound file is an assembly or a driver, so the node and its landed
        // imports exist; one no reader covers (a designated `+page.svelte`,
        // unparsed or unbound) has no reading in any world — recognized and
        // open, its callers' worlds notwithstanding
        const node = modules.get(file) as ModuleNode
        if (node.reading === null) continue
        const landed = landedByFile.get(file) as ReadonlyMap<
          string,
          EdgeTarget | null
        >
        const read = async (bound?: World): Promise<FileReading> =>
          readingOf(
            file,
            node.layer,
            (await engine.extract(resolve(root, file))) as FileExtraction,
            landed,
            paramKindsOf(fileWorlds, bound),
          ) as FileReading
        const readings: { world: World; reading: FileReading }[] = []
        for (const world of fileWorlds)
          readings.push({ world, reading: await read(world) })
        modules.set(file, { ...node, reading: await read(), readings })
      }
    }

    return { root, modules, edges: [...edges.values()], unresolved }
  }

  return { extractGraph }
}
