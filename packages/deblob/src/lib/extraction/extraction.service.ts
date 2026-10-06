import { join, relative, resolve, sep } from "node:path"

import type { Node } from "@oxc-project/types"

import type {
  BrokenSite,
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
import type { DriverReader } from "./ports/driver-reader.port.ts"
import type { HostReader } from "./ports/host-reader.port.ts"
import type { ReaderGroups } from "./ports/readers.port.ts"
import type { TestReader } from "./ports/test-reader.port.ts"
import type { PackageClaims } from "./ports/package-claims.port.ts"
import type { Resolvers } from "./ports/resolver.port.ts"
import type { ImportTargetKind } from "./reading.model.ts"
import { brokenLinesOf, readModule } from "./reading.model.ts"
import { isTechFile, isTechPackage } from "./tech.model.ts"
import type { CutAnswer, CutContext } from "./cut.model.ts"
import { createTrace } from "./trace.model.ts"
import { answerCallbacks } from "./cut.model.ts"
import { symbolLevelOf } from "./symbols.model.ts"
import type { Designations } from "./recognition.model.ts"
import { knowledgeOf } from "./knowledge.model.ts"
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

/**
 * The tech an assembly or a boot is read with: the core's, no reader bound
 * (canon: read by the flavor's kind) — nothing claimed, nothing exempt.
 */
const CORE_TECH = { name: "core", exempts: [], cut: answerCallbacks } as const

/** Readers stacked on one file: names joined, exemptions unioned, first role. */
const stackedTech = (readers: readonly (DriverReader | TestReader)[]) => ({
  name: readers.map((reader) => reader.name).join("+"),
  exempts: [...new Set(readers.flatMap((reader) => reader.exempts ?? []))],
  roleOf: (chain: readonly string[]) => {
    for (const reader of readers) {
      const role = "roleOf" in reader ? reader.roleOf({ chain }) : null
      if (role !== null) return role
    }
    return null
  },
  // every reader's cut that answers, with what that reader claims; the
  // default cut last
  cut: (node: Node, about: CutContext): CutAnswer[] => [
    ...readers.flatMap((reader) => {
      const cut =
        "cut" in reader
          ? (reader.cut?.({ node, context: about }) ?? null)
          : null
      return cut === null
        ? []
        : [
            {
              cut,
              claims: (target: string) =>
                isTechPackage(reader.tech, target) ||
                isTechFile(reader.tech, target),
            },
          ]
    }),
    ...answerCallbacks(node, about),
  ],
})

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
  a.package === b.package &&
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
      // a crossed claim's function sits in a package: nothing here reads it
      if (target === null || target.path === from || !modules.has(target.path))
        continue
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

/**
 * A config's reading part — what extraction reads off a resolved config; the
 * resolved config satisfies it whole. Per call: the service is built once and
 * serves every config (the placement recut).
 */
export type ExtractionConfig = Designations & {
  root: string
  flavor: FlavorResolver
  /**
   * The readers by group, defaults already filled: a driver or test file is
   * read by every reader of its group whose binding reads it, and by none is
   * unread (`driver-reader`); language and host readers give the knowledge.
   */
  readers: ReaderGroups
  /** Declared tsconfig (`false` = none, absent = discover at the root). */
  tsconfig?: string | false | undefined
  /** Resolution aliases, absolute. */
  alias?: Readonly<Record<string, readonly string[]>>
  /**
   * Declared externals — returns the matching declared pattern, or `null`. A
   * hit is a leaf known by declaration (the environment provides it, nothing on
   * disk) and never reaches the resolver; the pattern becomes the leaf's purity
   * identity. Absent = nothing is declared.
   */
  external?: (specifier: string) => string | null
  /**
   * The consumer's `externalLayers` patch: the crossed layer of an external
   * leaf, winning over the producer's own `deblob` field (read through the
   * package claims). Absent = no patch.
   */
  externalLayers?: (specifier: string) => Layer | null
  /**
   * `pure` entries, the bound host readers' pure builtins folded in — model to
   * the reader, red in a driver.
   */
  pure?: readonly string[]
  /**
   * The declared config loads, split: the file must be covered — a load names a
   * service file of this project, a miss is a config mistake.
   */
  configLoads?: readonly { file: string; name: string }[]
}

export const createExtraction = ({
  engine,
  resolvers,
  packageClaims,
}: {
  engine: ExtractionEngine
  /** A resolver per config: its tsconfig and aliases. */
  resolvers: Resolvers
  /**
   * The producers' own `deblob` fields, read through the run's resolver; absent
   * = no producer claims, only the consumer's patch.
   */
  packageClaims?: PackageClaims
}) => {
  const extractGraph = async ({
    config,
    files,
  }: {
    config: ExtractionConfig
    /** Coverage set: paths relative to the config root, POSIX-style. */
    files: readonly string[]
  }): Promise<ImportGraph> => {
    const {
      root,
      flavor,
      readers,
      isAssembly,
      isBoot,
      external,
      pure = [],
      configLoads = [],
    } = config
    const resolver = await resolvers.resolverFor({
      root,
      tsconfig: config.tsconfig,
      alias: config.alias ?? {},
    })
    const claims = packageClaims?.readerFor({
      resolve: resolver.resolve,
      anchor: join(root, "package.json"),
    })
    // the consumer patch wins over producer fields — reviewer of record
    const externalLayerOf = async (specifier: string): Promise<Layer | null> =>
      config.externalLayers?.(specifier) ??
      (await claims?.layerOf(specifier)) ??
      null
    const pureSet = new Set(pure)
    const classifications = flavor.classify({ files })
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
    const { trace } = createTrace(modules)
    const edges = new Map<string, ImportEdge>()
    const unresolved: UnresolvedImport[] = []
    const broken: BrokenSite[] = []

    const recognition = createRecognition({
      driver: readers.driver,
      test: readers.test,
      ...(isAssembly ? { isAssembly } : {}),
      ...(isBoot ? { isBoot } : {}),
    })
    /** The file's kind: the flavor's name, else a binding or a designation. */
    const layerOf = recognition.kindOf

    /** A driver or test file's own readers: its group's, bound to it. */
    const ownReadersOf = (
      file: string,
    ): readonly (DriverReader | TestReader)[] => {
      const flavorLayer = (classifications.get(file) as FlavorClassification)
        .layer
      return [
        ...recognition.driverReadersOf(file, flavorLayer),
        ...recognition.testReadersOf(file, flavorLayer),
      ]
    }

    /**
     * Who claims an external import, for the file importing it: its own reader,
     * then purity (`pure`, a host's pure builtin), then a bound host's builtin;
     * nobody else — a concrete import no reader claims is not tech by default
     * (04/07 ruling 8; GUESS: D2 — a declared external or a file outside
     * coverage alike).
     */
    const claimOf = (
      own: readonly (DriverReader | TestReader)[],
      hosts: readonly HostReader[],
      target: Extract<EdgeTarget, { type: "external" }>,
      specifier: string,
    ): "reader" | "tech" | "model" | "unclaimed" => {
      if (own.some((reader) => isTechPackage(reader.tech, specifier)))
        return "reader"
      if (externalPurityOf(target, pureSet) === "pure") return "model"
      const name = target.package ?? specifier
      if (
        !target.declared &&
        hosts.some(
          (host) =>
            host.claims({ specifier: name }) || host.claims({ specifier }),
        )
      )
        return "tech"
      return "unclaimed"
    }

    // the first pass: every file parsed, its symbol level known before any
    // file is read — a reading asks what an import's target exports
    const extractedByFile = new Map<
      string,
      Awaited<ReturnType<ExtractionEngine["extract"]>>
    >()
    for (const file of files)
      extractedByFile.set(file, await engine.extract(resolve(root, file)))
    const symbolsByFile = new Map(
      [...extractedByFile].map(([file, extracted]) => [
        file,
        extracted !== null && !("unparsed" in extracted)
          ? symbolLevelOf(extracted)
          : { symbols: [], internalDeclarations: 0 },
      ]),
    )
    /**
     * The declared form of a covered module's export (`const`, `function`, …),
     * `null` for a name it does not declare.
     */
    const exportFormOf = (path: string, name: string): string | null =>
      symbolsByFile.get(path)?.symbols.find((symbol) => symbol.name === name)
        ?.form ?? null

    /** What an import lands on, for the reader: the target's kind, or the claim. */
    const importTargetKindOf = (
      own: readonly (DriverReader | TestReader)[],
      hosts: readonly HostReader[],
      target: EdgeTarget | null,
      specifier: string,
    ): ImportTargetKind => {
      if (target === null) return { kind: "unresolved" }
      if (target.type === "module") {
        // a project file the importer's own reader claims is its tech, read
        // as a claimed package is (GUESS: D4)
        if (own.some((reader) => isTechFile(reader.tech, target.path)))
          return {
            kind: "external",
            package: target.path,
            layer: null,
            claim: "reader",
          }
        // a covered module: classify is total, the flavor's word is there
        const classification = classifications.get(
          target.path,
        ) as FlavorClassification
        return {
          kind: "module",
          path: target.path,
          layer: layerOf(target.path, classification.layer),
          exportForm: (name) => exportFormOf(target.path, name),
        }
      }
      return {
        kind: "external",
        package: target.package,
        layer: target.layer,
        claim: claimOf(own, hosts, target, specifier),
      }
    }

    /**
     * The file's reading: with its tech for an outside kind — an assembly or a
     * boot the core's, a driver or test file its bound readers', stacked; none,
     * or a reader counting it as blob, means unread, `null` — root statements
     * only for an inside kind.
     */
    const readingOf = (
      file: string,
      layer: Layer,
      extraction: FileExtraction,
      landed: ReadonlyMap<string, EdgeTarget | null>,
      paramKinds?: ReadonlyMap<string, readonly ArgValue[]>,
      receiving = false,
    ): FileReading | null => {
      const own = ownReadersOf(file)
      const read = layer === "driver" || layer === "test"
      if (read && (own.length === 0 || own.some((reader) => reader.blob)))
        return null
      const hosts = recognition.boundOf(readers.host, file)
      // every literal specifier the reader can ask about is an import the
      // engine listed — a miss is an unresolved one
      const targetOfSpecifier = (specifier: string): EdgeTarget | null =>
        landed.get(specifier) ?? null
      return readModule({
        program: extraction.program,
        source: extraction.source,
        layer,
        tech: !OUTSIDE_KINDS.has(layer)
          ? null
          : read
            ? stackedTech(own)
            : CORE_TECH,
        importTargetOf: (specifier) =>
          importTargetKindOf(
            own,
            hosts,
            targetOfSpecifier(specifier),
            specifier,
          ),
        knowledge: knowledgeOf(
          recognition.boundOf(readers.language, file),
          hosts,
        ),
        // the flavor's word on export names, plain data; a flavor without the
        // rule names nothing
        isFactory: (name) => flavor.isFactory?.({ name }) ?? false,
        ...(paramKinds ? { paramKinds } : {}),
        // what an assembly handed the file is its reader's tech when the
        // factory behind it is in a file the reader claims
        ...(receiving
          ? {
              handedOverOf: (origin, path) => {
                const traced = trace(origin, path)
                return traced !== null &&
                  own.some((reader) =>
                    isTechFile(reader.tech, traced.origin.path),
                  )
                  ? { package: traced.origin.path, path: traced.path }
                  : null
              },
            }
          : {}),
        configLoads,
      })
    }

    /** A file whose reader claims a project file: it may be handed that tech. */
    const receives = (file: string): boolean =>
      ownReadersOf(file).some((reader) =>
        reader.tech.some((entry) => entry.startsWith("./")),
      )

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
      const extracted = extractedByFile.get(file) ?? null
      // a file that does not parse is a place deblob cannot read: listed,
      // then a node with nothing read, as one no engine supports
      if (extracted !== null && "unparsed" in extracted)
        broken.push({ file, line: null, reason: extracted.unparsed })
      const extraction =
        extracted !== null && "unparsed" in extracted ? null : extracted
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
        const named = record.name === null ? [] : [record.name]
        if (!existing) {
          edges.set(key, {
            from: file,
            to: target,
            kind,
            form: record.form,
            reExport: record.reExport,
            names: named,
          })
        } else {
          // one edge per (from, target); runtime wins the kind merge, and
          // reExport ORs across occurrences independently of it; the names
          // are every occurrence's
          const runtimeWins = existing.kind === "type" && kind === "runtime"
          edges.set(key, {
            from: file,
            to: target,
            kind: runtimeWins ? kind : existing.kind,
            form: runtimeWins ? record.form : existing.form,
            reExport: existing.reExport || record.reExport,
            names: [...existing.names, ...named],
          })
        }
      }

      if (layer === "assembly" || layer === "driver")
        landedByFile.set(file, landed)
      const reading = extraction
        ? readingOf(file, layer, extraction, landed)
        : null
      for (const { line, reason } of brokenLinesOf(reading?.root ?? []))
        broken.push({ file, line, reason })
      modules.set(file, {
        path: file,
        layer,
        serviceRoot: classification.serviceRoot,
        isPrivate: classification.isPrivate,
        parsed: extraction !== null,
        runtimeContent: extraction ? extraction.runtimeContent : [],
        ...(symbolsByFile.get(file) as ReturnType<typeof symbolLevelOf>),
        reading,
        readings: [],
        ...(ownReadersOf(file).some((reader) => reader.blob)
          ? { asBlob: true as const }
          : {}),
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
    //
    // The same pass tells a driver what an assembly handed it: a file whose
    // reader claims a project file is read again each round, once the
    // assemblies are read, until its reading settles too.
    const receivers = [...modules]
      .filter(
        ([file, node]) =>
          (node.layer === "driver" || node.layer === "test") &&
          node.reading !== null &&
          receives(file),
      )
      .map(([file]) => file)
    let previous = ""
    for (let round = 0; round <= modules.size; round += 1) {
      const worlds = worldsOf(modules)
      const current = JSON.stringify([
        [...worlds],
        receivers.map((file) => modules.get(file)?.reading),
      ])
      if (current === previous) break
      previous = current
      for (const file of new Set([...worlds.keys(), ...receivers])) {
        const fileWorlds = worlds.get(file) ?? []
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
            true,
          ) as FileReading
        const readings: { world: World; reading: FileReading }[] = []
        for (const world of fileWorlds)
          readings.push({ world, reading: await read(world) })
        modules.set(file, { ...node, reading: await read(), readings })
      }
    }

    /**
     * An edge's claim, for its importer: an external one's, whoever claims it;
     * a project file's only when the importer's own reader claims it (GUESS:
     * D4). None otherwise.
     */
    const claimOnEdge = (
      from: string,
      to: ImportEdge["to"],
    ): Pick<ImportEdge, "claim"> => {
      if (to.type === "external")
        return {
          claim: claimOf(
            ownReadersOf(from),
            recognition.boundOf(readers.host, from),
            to,
            to.specifier,
          ),
        }
      return ownReadersOf(from).some((reader) =>
        isTechFile(reader.tech, to.path),
      )
        ? { claim: "reader" }
        : {}
    }

    return {
      root,
      modules,
      // each name once, sorted: occurrences repeat and come in any order
      // an external edge carries who claims it, for its importer: the
      // premise the layer cells judge a driver's import by
      edges: [...edges.values()].map((edge) => ({
        ...edge,
        names: [...new Set(edge.names)].sort(),
        ...claimOnEdge(edge.from, edge.to),
      })),
      unresolved,
      broken,
    }
  }

  return { extractGraph }
}
