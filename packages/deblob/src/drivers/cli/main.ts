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
import { dirname, relative, resolve } from "node:path"
import { fileURLToPath } from "node:url"

import { checkBarrels } from "../../lib/check/barrels.model.ts"
import { checkLayers } from "../../lib/check/layers.model.ts"
import { checkPorts } from "../../lib/check/ports.model.ts"
import { checkPrivate } from "../../lib/check/private.model.ts"
import type { Violation } from "../../lib/check/violation.model.ts"
import type { CheckName, ParsedCli } from "../../lib/cli/cli.model.ts"
import {
  parseCli,
  rulesForTopic,
  KNOWN_CHECKS,
} from "../../lib/cli/cli.model.ts"
import {
  ANSI_COLORS,
  CHECK_HELP,
  HELP,
  NO_COLORS,
  blobPercentOf,
  provenanceOf,
  renderBareStatus,
  renderCheckResults,
  renderExplain,
} from "../../lib/cli/render.model.ts"
import type { Colors } from "../../lib/cli/render.model.ts"
import { asConfigError } from "../../lib/config/config.model.ts"
import { resolveConfig } from "../../lib/config/config.service.ts"
import type { ResolvedConfig } from "../../lib/config/config.service.ts"
import {
  discoverConfig,
  explicitConfigPath,
  importConfigDefault,
} from "../../lib/config/adapters/loader.adapter.ts"
import {
  scanCoverage,
  statSizes,
} from "../../lib/config/adapters/scan.adapter.ts"
import { readExplainEntries } from "../../lib/explain/adapters/content.adapter.ts"
import { createOxcEngine } from "../../lib/extraction/adapters/oxc-extraction.adapter.ts"
import { STOCK_FLAVORS } from "../../lib/extraction/adapters/ts-suffixes-factories-flavor.adapter.ts"
import { createExtraction } from "../../lib/extraction/extraction.service.ts"
import type { ImportGraph } from "../../lib/extraction/graph.model.ts"
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

const colorsFor = (io: MainIo, noColor: boolean): Colors => {
  if (noColor || (io.env["NO_COLOR"] ?? "") !== "") return NO_COLORS
  if ((io.env["FORCE_COLOR"] ?? "") !== "") return ANSI_COLORS
  return io.stdout.isTTY === true ? ANSI_COLORS : NO_COLORS
}

const DETECTORS: Record<
  CheckName,
  (graph: ImportGraph, config: ResolvedConfig) => Violation[]
> = {
  layers: (graph, config) =>
    checkLayers(graph, {
      pureLibs: config.pureLibs,
      typeOnlyExempt: config.typeOnlyExempt,
    }),
  private: (graph) => checkPrivate(graph),
  barrels: (graph) => checkBarrels(graph),
  ports: (graph) => checkPorts(graph),
}

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
  const serviceRoots = new Set(
    files
      .map((path) => classificationOf(path).serviceRoot)
      .filter((root) => root !== null),
  )
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
          fileCount: files.length,
          totalBytes: sizes.reduce((sum, entry) => sum + entry.size, 0),
          blobPercent: blobPercentOf(
            sizes.map(({ path, size }) => ({ size, blob: isBlob(path) })),
          ),
          serviceCount: serviceRoots.size,
        },
      },
      colors,
    ),
  )
  return 0
}

const runCheck = async (
  io: MainIo,
  parsed: ParsedCli,
  action: Extract<ParsedCli["action"], { command: "check" }>,
  colors: Colors,
): Promise<number> => {
  let config: ResolvedConfig
  try {
    config = await loadFor(io, parsed)
  } catch (error) {
    io.stderr.write(`${asConfigError(error).message}\n`)
    return 2
  }

  const files = await scanCoverage(config)
  const { extractGraph } = createExtraction({
    engine: createOxcEngine(),
    flavor: config.flavor,
  })
  const graph = extractGraph({
    root: config.root,
    files,
    isAssembly: config.isAssembly,
  })
  const violations = action.checks.flatMap((check) =>
    DETECTORS[check](graph, config),
  )
  const stats = { files: graph.modules.size, edges: graph.edges.length }

  const listing = renderCheckResults(violations, stats, colors)
  const firedRules = [...new Set(violations.flatMap((v) => v.rules))].sort(
    (a, b) => a - b,
  )
  const explanations =
    (action.explain || action.explainOnly) && firedRules.length > 0
      ? renderExplain(
          readExplainEntries({
            contentRoot: CONTENT_ROOT,
            rules: firedRules,
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
      const rules = rulesForTopic(action.topic)
      if (rules === null) {
        io.stderr.write(
          `unknown topic "${action.topic}" — a rule (rule-4 or plain 4) or a check name: ${KNOWN_CHECKS.join(", ")}\n`,
        )
        return 2
      }
      io.stdout.write(
        renderExplain(
          readExplainEntries({
            contentRoot: CONTENT_ROOT,
            rules,
          }),
          colors,
        ),
      )
      return 0
    }
  }
}
