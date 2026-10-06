/**
 * The CLI's front service: one use case per command, each taking the command
 * line as the router handed it — parsed here, run, rendered, its exit code set.
 * The router's word picked the use case; the line is read again whole
 * (`parseCli`), and a line whose grammar names another command is a usage error
 * (GUESS: C1 — only a value spelling a command gets there, `-c check`).
 *
 * Exit contract: 0 clean, 1 violations found, 2 usage or config error. Bare
 * `deblob` is informational by contract — always 0, even over a broken config.
 */

import { join, relative, resolve, sep } from "node:path"

import type { Judge, Judgement } from "../../lib/check/check.service.ts"
import { KNOWN_CHECKS } from "../../lib/check/checks.model.ts"
import { groupByFix } from "../../lib/check/grouping.model.ts"
import type { RuleId } from "../../lib/check/rule.model.ts"
import { ruleOrder } from "../../lib/check/rule.model.ts"
import {
  surfaceOptionsFor,
  tallySurface,
} from "../../lib/check/surface.model.ts"
import type { PackageSurface } from "../../lib/config/config.model.ts"
import {
  asConfigErrorOrRethrow,
  isConfigError,
} from "../../lib/config/config.model.ts"
import type {
  ConfigService,
  ResolvedConfig,
} from "../../lib/config/config.service.ts"
import type { Coverage } from "../../lib/config/ports/coverage.port.ts"
import type { Manifest } from "../../lib/config/ports/manifest.port.ts"
import type { ContentReader } from "../../lib/explain/content.port.ts"
import { asExtractionError } from "../../lib/extraction/graph.model.ts"
import type { ModuleNode } from "../../lib/extraction/graph.model.ts"
import { bindPlugins } from "../../lib/extraction/plugins.model.ts"
import type { Fs } from "../../lib/fs/fs.port.ts"
import {
  ANSI_COLORS,
  NO_COLORS,
  provenanceOf,
  renderBareStatus,
  renderBroken,
  renderCheckResults,
  renderExplain,
  renderUnresolved,
  renderUnverified,
  serviceCountOf,
  sizeStatsOf,
  SURFACE_NOT_CLAIMED,
} from "../../lib/report/render.model.ts"
import type { Colors, GraphStats } from "../../lib/report/render.model.ts"
import type { Terminal } from "../../lib/terminal/terminal.port.ts"
import { INDEX as VIEWER_INDEX } from "../../lib/view/bundle.model.ts"
import type { CliAction, ParsedCli } from "./cli.model.ts"
import {
  DEFAULT_VIEW_PORT,
  isRuleNumber,
  parseCli,
  rulesForTopic,
} from "./cli.model.ts"
import { CHECK_HELP, HELP } from "./help.model.ts"
import type { Install } from "./install.port.ts"
import type { Viewer } from "../../lib/view/ports/viewer.port.ts"

/** The sort wherever output orders rules — the summary's display order. */
const byRuleOrder = (a: RuleId, b: RuleId): number =>
  ruleOrder(a) - ruleOrder(b)

/**
 * Graph paths are config-root-relative; the terminal resolves clicks from cwd.
 * This is the hop between the two — `""` when they coincide (the common run).
 */
const pathPrefixOf = (cwd: string, root: string): string => {
  const hop = relative(resolve(cwd), root)
  return hop === "" ? "" : `${hop.split(sep).join("/")}/`
}

/**
 * An error the user must fix — extraction's, or a config's (the manifest's
 * claim and the tsconfig are read with the graph) — to present; anything else
 * is a bug and keeps flying.
 */
const asUserError = (error: unknown): Error =>
  isConfigError(error) ? error : asExtractionError(error)

type ActionOf<C extends CliAction["command"]> = Extract<
  CliAction,
  { command: C }
>

type Line = readonly string[]

export const createCli = ({
  terminal,
  config: configs,
  judge,
  coverage,
  manifest,
  content,
  install,
  fs,
  viewer,
}: {
  terminal: Terminal
  config: Pick<ConfigService, "loadConfig" | "loadConfigNamed">
  judge: Pick<Judge, "judge">
  /** Bare status reads coverage and sizes without extracting. */
  coverage: Pick<Coverage, "scanCoverage" | "statSizes">
  manifest: Pick<Manifest, "readPackageSurface">
  content: ContentReader
  install: Install
  fs: Pick<Fs, "exists">
  viewer: Viewer
}) => {
  const colorsFor = (noColor: boolean): Colors => {
    if (noColor || (terminal.env("NO_COLOR") ?? "") !== "") return NO_COLORS
    if ((terminal.env("FORCE_COLOR") ?? "") !== "") return ANSI_COLORS
    return terminal.interactive ? ANSI_COLORS : NO_COLORS
  }

  /**
   * The line as one of the use case's own commands — a usage error is told, and
   * so is a line whose grammar names another command than the router's word
   * (only a value spelling a command: `-c check`).
   */
  const actionOf = <C extends CliAction["command"]>(
    line: Line,
    commands: readonly C[],
  ): { parsed: ParsedCli; action: ActionOf<C> } | null => {
    const parsed = parseCli(line)
    if ("error" in parsed) {
      terminal.err(`${parsed.error}\n`)
      return null
    }
    if (!(commands as readonly string[]).includes(parsed.action.command)) {
      terminal.err(
        `a value on the line spells a command — the router read "${commands.join(" / ")}", the options "${parsed.action.command}"; write it --config=<path>\n`,
      )
      return null
    }
    return { parsed, action: parsed.action as ActionOf<C> }
  }

  const loadFor = (parsed: ParsedCli): Promise<ResolvedConfig> =>
    parsed.config === null
      ? configs.loadConfig(terminal.cwd)
      : configs.loadConfigNamed(terminal.cwd, parsed.config)

  const explanationsOf = async (
    rules: Iterable<RuleId>,
    colors: Colors,
  ): Promise<string> =>
    renderExplain(
      await content.readExplainEntries({
        contentRoot: install.contentRoot,
        rules: [...rules].sort(byRuleOrder),
        version: await install.version(),
      }),
      colors,
    )

  /** `--help`, `-h`, `--version`, `-v`: the screen the line asks for. */
  const runScreen = async (line: Line): Promise<number> => {
    const found = actionOf(line, ["help", "check-help", "version"])
    if (found === null) return 2
    const { command } = found.action
    terminal.out(
      command === "help"
        ? HELP
        : command === "check-help"
          ? CHECK_HELP
          : `deblob ${await install.version()}\n`,
    )
    return 0
  }

  const runStatus = async (line: Line): Promise<number> => {
    const found = actionOf(line, ["status"])
    if (found === null) return 2
    const { parsed } = found
    const colors = colorsFor(parsed.noColor)
    const version = await install.version()
    const unreadable = (message: string) => {
      terminal.err(`${message}\n`)
      terminal.out(
        renderBareStatus(
          {
            version,
            provenance: "config error (details on stderr)",
            stats: null,
          },
          colors,
        ),
      )
      return 0
    }
    let config: ResolvedConfig
    try {
      config = await loadFor(parsed)
    } catch (error) {
      return unreadable(asConfigErrorOrRethrow(error).message)
    }

    const files = await coverage.scanCoverage(config)
    // the run's plugins bound as extraction binds them, so bare and check
    // count one way; its one failure (a file under two designation keys) is
    // the user's, told on stderr like a config error — bare stays 0
    const plugins = bindPlugins(config, files)
    let blobByPath: ReadonlyMap<string, boolean>
    try {
      blobByPath = new Map(
        files.map((path) => [path, plugins.kindOf(path) === "blob"]),
      )
    } catch (error) {
      return unreadable(asExtractionError(error).message)
    }
    const isBlob = (path: string): boolean => blobByPath.get(path) === true
    const sizes = await coverage.statSizes(config.root, files)
    // the field's claim, tallied at scan speed — no parse; a field this version
    // cannot read teaches on stderr and the segment is skipped: bare stays 0
    let surface: PackageSurface | null
    try {
      surface = await manifest.readPackageSurface(config.root)
    } catch (error) {
      terminal.err(`${asConfigErrorOrRethrow(error).message}\n`)
      surface = null
    }
    terminal.out(
      renderBareStatus(
        {
          version,
          provenance: provenanceOf(
            {
              configPath:
                config.configPath === null
                  ? null
                  : relative(terminal.cwd, config.configPath),
              localPath:
                config.localPath === null
                  ? null
                  : relative(terminal.cwd, config.localPath),
            },
            config.flavorName,
          ),
          stats: {
            files: files.length,
            ...sizeStatsOf(
              sizes.map(({ path, size }) => ({ size, blob: isBlob(path) })),
            ),
            services: serviceCountOf(
              files.map((path) => plugins.classificationOf(path).serviceRoot),
            ),
            surface:
              surface === null
                ? null
                : tallySurface(
                    surface,
                    files,
                    surfaceOptionsFor(config, surface),
                  ),
          },
        },
        colors,
      ),
    )
    return 0
  }

  const runCheck = async (line: Line): Promise<number> => {
    const found = actionOf(line, ["check"])
    if (found === null) return 2
    const { parsed, action } = found
    const colors = colorsFor(parsed.noColor)
    let config: ResolvedConfig
    try {
      config = await loadFor(parsed)
    } catch (error) {
      terminal.err(`${asConfigErrorOrRethrow(error).message}\n`)
      return 2
    }
    let judged: Judgement
    try {
      judged = await judge.judge(config, action.checks)
    } catch (error) {
      terminal.err(`${asUserError(error).message}\n`)
      return 2
    }
    const { files, graph, surface, surfaceReport, violations } = judged
    const surfaceRan = action.checks.includes("surface")
    const sizes = await coverage.statSizes(config.root, files)
    const stats: GraphStats = {
      files: graph.modules.size,
      ...sizeStatsOf(
        sizes.map(({ path, size }) => ({
          size,
          // every covered file is a graph node — extraction's contract
          blob:
            (graph.modules.get(path) as ModuleNode).layer === "blob" ||
            (graph.modules.get(path) as ModuleNode).asBlob === true,
        })),
      ),
      services: serviceCountOf(
        [...graph.modules.values()].map((node) => node.serviceRoot),
      ),
      imports: graph.edges.length,
      // the segment exists iff a claim was checked — its absence is the signal
      surface:
        surfaceRan && surface !== null
          ? {
              checked: surfaceReport.checked,
              disclosed: surfaceReport.disclosed,
            }
          : null,
    }

    const prefix = pathPrefixOf(terminal.cwd, config.root)
    const listing = renderCheckResults(
      groupByFix(violations),
      stats,
      colors,
      prefix,
    )
    const firedRules = new Set(violations.flatMap((v) => v.rules))
    const explanations =
      (action.explain || action.explainOnly) && firedRules.size > 0
        ? await explanationsOf(firedRules, colors)
        : ""

    if (action.explainOnly) {
      terminal.out(explanations === "" ? listing : explanations)
    } else {
      terminal.out(
        explanations === "" ? listing : `${listing}\n${explanations}`,
      )
    }
    // `surface` named by hand, nothing to check: say so, never a silent pass
    if (action.explicit && surfaceRan && surface === null) {
      terminal.err(SURFACE_NOT_CLAIMED)
    }
    // the uncertifiable lanes — each prints when it applies, exit 2
    const fatalUnresolved = graph.unresolved.filter((entry) => entry.literal)
    if (fatalUnresolved.length > 0) {
      terminal.err(renderUnresolved(fatalUnresolved, colors, prefix))
    }
    if (graph.broken.length > 0) {
      terminal.err(renderBroken(graph.broken, colors, prefix))
    }
    if (surfaceReport.unverified.length > 0) {
      terminal.err(renderUnverified(surfaceReport.unverified, colors, prefix))
    }
    if (
      fatalUnresolved.length > 0 ||
      graph.broken.length > 0 ||
      surfaceReport.unverified.length > 0
    ) {
      return 2
    }
    return violations.length > 0 ? 1 : 0
  }

  const runExplain = async (line: Line): Promise<number> => {
    const found = actionOf(line, ["explain"])
    if (found === null) return 2
    const { parsed, action } = found
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
      terminal.err(
        `unknown ${unknown.length === 1 ? "topic" : "topics"} ${unknown.map((topic) => `"${topic}"`).join(", ")} — rule names (service-purity) or check names: ${KNOWN_CHECKS.join(", ")}${numbered ? "\nrule numbers are gone since 0.0.6: rules are named — deblob check prints the names, deblob explain <check> lists a check's" : ""}\n`,
      )
      return 2
    }
    terminal.out(await explanationsOf(rules, colorsFor(parsed.noColor)))
    return 0
  }

  /**
   * The viewer, served with the data half over one port, until the user stops
   * it. The config is not read here: the server reads it to list the projects,
   * and a project that cannot be read is the CLI's error to present — the same
   * line `check` prints, exit 2, nothing listening.
   */
  const runView = async (line: Line): Promise<number> => {
    const found = actionOf(line, ["view"])
    if (found === null) return 2
    const bundle = install.bundleRoot
    if (!(await fs.exists(join(bundle, VIEWER_INDEX)))) {
      terminal.err(
        `the viewer bundle is missing at ${bundle} — this install cannot serve the page\n`,
      )
      return 2
    }
    let close: () => Promise<void>
    try {
      ;({ close } = await viewer.serve({
        cwd: terminal.cwd,
        port: found.action.port ?? DEFAULT_VIEW_PORT,
        bundle,
        stdout: { write: terminal.out },
        stderr: { write: terminal.err },
      }))
    } catch (error) {
      terminal.err(`${asConfigErrorOrRethrow(error).message}\n`)
      return 2
    }
    await terminal.stopped()
    await close()
    return 0
  }

  /** A use case: its run's answer is the exit code. */
  const exiting =
    (run: (line: Line) => Promise<number>) =>
    async (line: Line): Promise<void> => {
      terminal.exit(await run(line))
    }

  return {
    help: exiting(runScreen),
    version: exiting(runScreen),
    /** Bare `deblob`, and a line no command word picks: an unknown one told. */
    status: exiting(runStatus),
    check: exiting(runCheck),
    explain: exiting(runExplain),
    view: exiting(runView),
  }
}

export type Cli = ReturnType<typeof createCli>
