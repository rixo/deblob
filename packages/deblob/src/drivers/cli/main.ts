/**
 * The CLI composition root — assembly: reads config, instantiates adapters,
 * wires them, renders, returns the exit code. Takes its world as a value (argv,
 * cwd, streams, env) so the whole surface is testable in-process; the bin shim
 * owns the only `process` glue.
 *
 * Exit contract: 0 clean, 1 violations found, 2 usage or config error. Bare
 * `deblob` is informational by contract — always 0, even over a broken config.
 */

import { readFileSync } from "node:fs"
import { dirname, join, relative, resolve, sep } from "node:path"
import { fileURLToPath } from "node:url"

import { checkBarrels } from "../../lib/check/barrels.model.ts"
import { checkDag } from "../../lib/check/dag.model.ts"
import { checkLayers } from "../../lib/check/layers.model.ts"
import { checkPorts } from "../../lib/check/ports.model.ts"
import { checkPrivate } from "../../lib/check/private.model.ts"
import { checkSurface, tallySurface } from "../../lib/check/surface.model.ts"
import type {
  PackageSurface,
  ResolveSurfaceOptions,
  SurfaceReport,
} from "../../lib/check/surface.model.ts"
import type { RuleId } from "../../lib/check/rule.model.ts"
import { ruleOrder } from "../../lib/check/rule.model.ts"
import type { Violation } from "../../lib/check/violation.model.ts"
import type { CheckName, ParsedCli } from "../../lib/cli/cli.model.ts"
import {
  isRuleNumber,
  parseCli,
  rulesForTopic,
  KNOWN_CHECKS,
} from "../../lib/cli/cli.model.ts"
import {
  ANSI_COLORS,
  CHECK_HELP,
  HELP,
  NO_COLORS,
  provenanceOf,
  renderBareStatus,
  renderCheckResults,
  renderExplain,
  renderUnresolved,
  renderUnverified,
  sizeStatsOf,
  SURFACE_NOT_CLAIMED,
} from "../../lib/cli/render.model.ts"
import type { Colors, GraphStats } from "../../lib/cli/render.model.ts"
import { asConfigError } from "../../lib/config/config.model.ts"
import { resolveConfig } from "../../lib/config/config.service.ts"
import type { ResolvedConfig } from "../../lib/config/config.service.ts"
import {
  discoverConfig,
  explicitConfigPath,
  importConfigDefault,
  readPackageSurface,
  tsconfigPathOf,
} from "../../lib/config/adapters/loader.adapter.ts"
import {
  scanCoverage,
  statSizes,
} from "../../lib/config/adapters/scan.adapter.ts"
import { readExplainEntries } from "../../lib/explain/adapters/content.adapter.ts"
import { createOxcEngine } from "../../lib/extraction/adapters/oxc-extraction.adapter.ts"
import { createPackageMetaReader } from "../../lib/extraction/adapters/package-meta.adapter.ts"
import {
  classifyStockEntry,
  STOCK_FLAVORS,
} from "../../lib/extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "../../lib/extraction/extraction.service.ts"
import { specifierMatcher } from "../../lib/extraction/graph.model.ts"
import type {
  ImportGraph,
  ModuleNode,
} from "../../lib/extraction/graph.model.ts"
import type { FlavorClassification } from "../../lib/extraction/ports/flavor.port.ts"

const VERSION = (
  JSON.parse(
    readFileSync(new URL("../../../package.json", import.meta.url), "utf8"),
  ) as { version: string }
).version

/**
 * Where build-content puts the cards — anchored at the package root, so the
 * same relative hop works compiled (dist/drivers/cli) and source-run
 * (src/drivers/cli, tests build dist/content first).
 */
const CONTENT_ROOT = fileURLToPath(
  new URL("../../../dist/content", import.meta.url),
)

type Writer = { write(chunk: string): unknown; isTTY?: boolean }

export type MainIo = {
  argv: readonly string[]
  cwd: string
  stdout: Writer
  stderr: Writer
  env: Readonly<Record<string, string | undefined>>
}

/** The sort wherever output orders rules — the summary's display order. */
const byRuleOrder = (a: RuleId, b: RuleId): number =>
  ruleOrder(a) - ruleOrder(b)

const colorsFor = (io: MainIo, noColor: boolean): Colors => {
  if (noColor || (io.env["NO_COLOR"] ?? "") !== "") return NO_COLORS
  if ((io.env["FORCE_COLOR"] ?? "") !== "") return ANSI_COLORS
  return io.stdout.isTTY === true ? ANSI_COLORS : NO_COLORS
}

const DETECTORS: Record<
  Exclude<CheckName, "surface">,
  (graph: ImportGraph, config: ResolvedConfig) => Violation[]
> = {
  dag: (graph) => checkDag(graph),
  layers: (graph, config) =>
    checkLayers(graph, {
      pure: config.pure,
      typeOnlyExempt: config.typeOnlyExempt,
    }),
  private: (graph) => checkPrivate(graph),
  barrels: (graph) => checkBarrels(graph),
  ports: (graph) => checkPorts(graph),
}

/**
 * `surface` stands apart: it reports unverified entries next to violations —
 * claims the run cannot certify, the exit-2 lane. No field, no claim, no check
 * — a null surface yields nothing (additive).
 */
const runSurface = (
  graph: ImportGraph,
  config: ResolvedConfig,
  surface: PackageSurface | null,
): SurfaceReport =>
  checkSurface(graph, surface, {
    classifyEntry: classifyStockEntry,
    ...resolveOptionsFor(config, surface),
  })

/** The reach half of the surface options — what bare tallies with. */
const resolveOptionsFor = (
  config: ResolvedConfig,
  surface: PackageSurface | null,
): ResolveSurfaceOptions => ({
  mirror: config.mirror,
  // both carve-outs: retracted and designated-wiring subpaths alike
  disclosed: specifierMatcher([
    ...(surface?.blob ?? []),
    ...(surface?.assembly ?? []),
  ]),
})

/** Distinct service roots over the covered set — what the layer rules govern. */
const serviceCountOf = (roots: Iterable<string | null>): number =>
  new Set([...roots].filter((root) => root !== null)).size

/**
 * The load → resolve sequence — assembly's own job (arch §Assembly: read
 * config, instantiate, wire), composed here from the loader adapter and the
 * config service.
 */
const loadFor = async (
  io: MainIo,
  parsed: ParsedCli,
): Promise<ResolvedConfig> => {
  const configPath =
    parsed.config === null
      ? discoverConfig(io.cwd)
      : explicitConfigPath(io.cwd, parsed.config)
  if (configPath === null) {
    return resolveConfig(
      {},
      { root: resolve(io.cwd), configPath: null, flavors: STOCK_FLAVORS },
    )
  }
  return resolveConfig(await importConfigDefault(configPath), {
    root: dirname(configPath),
    configPath,
    flavors: STOCK_FLAVORS,
  })
}

const runStatus = async (io: MainIo, parsed: ParsedCli, colors: Colors) => {
  let config: ResolvedConfig
  try {
    config = await loadFor(io, parsed)
  } catch (error) {
    io.stderr.write(`${asConfigError(error).message}\n`)
    io.stdout.write(
      renderBareStatus(
        {
          version: VERSION,
          provenance: "config error (details on stderr)",
          stats: null,
        },
        colors,
      ),
    )
    return 0
  }

  const files = await scanCoverage(config)
  // classify is total by contract — extraction throws on a gap; bare trusts it
  const classifications = config.flavor.classify(files)
  const classificationOf = (path: string) =>
    classifications.get(path) as FlavorClassification
  const isBlob = (path: string): boolean =>
    !config.isAssembly(path) && classificationOf(path).layer === "blob"
  const sizes = statSizes(config.root, files)
  // the field's claim, tallied at scan speed — no parse; a field this version
  // cannot read teaches on stderr and the segment is skipped: bare stays 0
  let surface: PackageSurface | null
  try {
    surface = readPackageSurface(config.root)
  } catch (error) {
    io.stderr.write(`${asConfigError(error).message}\n`)
    surface = null
  }
  io.stdout.write(
    renderBareStatus(
      {
        version: VERSION,
        provenance: provenanceOf(
          config.configPath === null
            ? null
            : relative(io.cwd, config.configPath),
          config.flavorName,
        ),
        stats: {
          files: files.length,
          ...sizeStatsOf(
            sizes.map(({ path, size }) => ({ size, blob: isBlob(path) })),
          ),
          services: serviceCountOf(
            files.map((path) => classificationOf(path).serviceRoot),
          ),
          surface:
            surface === null
              ? null
              : tallySurface(
                  surface,
                  files,
                  resolveOptionsFor(config, surface),
                ),
        },
      },
      colors,
    ),
  )
  return 0
}

/**
 * Graph paths are config-root-relative; the terminal resolves clicks from cwd.
 * This is the hop between the two — `""` when they coincide (the common run).
 */
const pathPrefixOf = (cwd: string, root: string): string => {
  const hop = relative(resolve(cwd), root)
  return hop === "" ? "" : `${hop.split(sep).join("/")}/`
}

const runCheck = async (
  io: MainIo,
  parsed: ParsedCli,
  action: Extract<ParsedCli["action"], { command: "check" }>,
  colors: Colors,
): Promise<number> => {
  let config: ResolvedConfig
  let tsconfigPath: string | null
  let surface: PackageSurface | null
  try {
    config = await loadFor(io, parsed)
    tsconfigPath = tsconfigPathOf(config)
    surface = readPackageSurface(config.root)
  } catch (error) {
    io.stderr.write(`${asConfigError(error).message}\n`)
    return 2
  }

  const files = await scanCoverage(config)
  const engine = createOxcEngine({
    ...(tsconfigPath === null ? {} : { tsconfigPath }),
    alias: config.alias,
  })
  const { extractGraph } = createExtraction({ engine, flavor: config.flavor })
  const packageMeta = createPackageMetaReader({
    resolve: engine.resolve,
    anchor: join(config.root, "package.json"),
    classifyEntry: classifyStockEntry,
  })
  const graph = extractGraph({
    root: config.root,
    files,
    isAssembly: config.isAssembly,
    external: config.external,
    // the consumer patch wins over producer fields — reviewer of record
    externalLayerOf: (specifier) =>
      config.externalLayers(specifier) ?? packageMeta.layerOf(specifier),
  })
  const surfaceRan = action.checks.includes("surface")
  const surfaceReport: SurfaceReport = surfaceRan
    ? runSurface(graph, config, surface)
    : { violations: [], unverified: [], checked: 0, disclosed: 0 }
  const violations = action.checks.flatMap((check) =>
    check === "surface"
      ? surfaceReport.violations
      : DETECTORS[check](graph, config),
  )
  const sizes = statSizes(config.root, files)
  const stats: GraphStats = {
    files: graph.modules.size,
    ...sizeStatsOf(
      sizes.map(({ path, size }) => ({
        size,
        // every covered file is a graph node — extraction's contract
        blob: (graph.modules.get(path) as ModuleNode).layer === "blob",
      })),
    ),
    services: serviceCountOf(
      [...graph.modules.values()].map((node) => node.serviceRoot),
    ),
    imports: graph.edges.length,
    // the segment exists iff a claim was checked — its absence is the signal
    surface:
      surfaceRan && surface !== null
        ? { checked: surfaceReport.checked, disclosed: surfaceReport.disclosed }
        : null,
  }

  const listing = renderCheckResults(
    violations,
    stats,
    colors,
    pathPrefixOf(io.cwd, config.root),
  )
  const firedRules = [...new Set(violations.flatMap((v) => v.rules))].sort(
    byRuleOrder,
  )
  const explanations =
    (action.explain || action.explainOnly) && firedRules.length > 0
      ? renderExplain(
          readExplainEntries({
            contentRoot: CONTENT_ROOT,
            rules: firedRules,
            version: VERSION,
          }),
          colors,
        )
      : ""

  if (action.explainOnly) {
    io.stdout.write(explanations === "" ? listing : explanations)
  } else {
    io.stdout.write(
      explanations === "" ? listing : `${listing}\n${explanations}`,
    )
  }
  // `surface` named by hand, nothing to check: say so, never a silent pass
  if (action.explicit && surfaceRan && surface === null) {
    io.stderr.write(SURFACE_NOT_CLAIMED)
  }
  // the uncertifiable lanes — both print when both apply, exit 2
  const prefix = pathPrefixOf(io.cwd, config.root)
  const fatalUnresolved = graph.unresolved.filter((entry) => entry.literal)
  if (fatalUnresolved.length > 0) {
    io.stderr.write(renderUnresolved(fatalUnresolved, colors, prefix))
  }
  if (surfaceReport.unverified.length > 0) {
    io.stderr.write(renderUnverified(surfaceReport.unverified, colors, prefix))
  }
  if (fatalUnresolved.length > 0 || surfaceReport.unverified.length > 0) {
    return 2
  }
  return violations.length > 0 ? 1 : 0
}

export const main = async (io: MainIo): Promise<number> => {
  const parsed = parseCli(io.argv)
  if ("error" in parsed) {
    io.stderr.write(`${parsed.error}\n`)
    return 2
  }
  const colors = colorsFor(io, parsed.noColor)
  const { action } = parsed

  switch (action.command) {
    case "help":
      io.stdout.write(HELP)
      return 0
    case "check-help":
      io.stdout.write(CHECK_HELP)
      return 0
    case "version":
      io.stdout.write(`deblob ${VERSION}\n`)
      return 0
    case "status":
      return runStatus(io, parsed, colors)
    case "check":
      return runCheck(io, parsed, action, colors)
    case "explain": {
      const rules = new Set<RuleId>()
      const unknown = action.topics.filter((topic) => {
        const topicRules = rulesForTopic(topic)
        if (topicRules === null) return true
        for (const rule of topicRules) rules.add(rule)
        return false
      })
      if (unknown.length > 0) {
        // a number is a 0.0.4-era citation: refused like any unknown topic,
        // with the line that says where the names are
        const numbered = unknown.some(isRuleNumber)
        io.stderr.write(
          `unknown ${unknown.length === 1 ? "topic" : "topics"} ${unknown.map((topic) => `"${topic}"`).join(", ")} — rule names (service-purity) or check names: ${KNOWN_CHECKS.join(", ")}${numbered ? "\nrule numbers are gone since 0.0.5: rules are named — deblob check prints the names, deblob explain <check> lists a check's" : ""}\n`,
        )
        return 2
      }
      io.stdout.write(
        renderExplain(
          readExplainEntries({
            contentRoot: CONTENT_ROOT,
            rules: [...rules].sort(byRuleOrder),
            version: VERSION,
          }),
          colors,
        ),
      )
      return 0
    }
  }
}
