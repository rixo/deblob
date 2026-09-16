/**
 * The command surface as data — argv in, dispatch decision out. Pure:
 * `parseArgs` computes, never touches the process (the dogfood config declares
 * `node:util` in `pure` — deterministic, string-only). Usage errors are values
 * with teaching messages; exit codes and IO belong to the driver.
 */

import { parseArgs } from "node:util"

import type { RuleId } from "../check/rule.model.ts"
import { isRuleId } from "../check/rule.model.ts"

/** Checks, help order = run order. */
export const KNOWN_CHECKS = [
  "dag",
  "layers",
  "private",
  "barrels",
  "ports",
  "surface",
  "modules",
] as const

export type CheckName = (typeof KNOWN_CHECKS)[number]

/**
 * The rules each check cites — `explain <check>` resolves through this, and the
 * PLAN's coverage table made code. Mirrors the citations the detectors can emit
 * (pinned against them in the spec).
 */
export const CHECK_RULES: Readonly<Record<CheckName, readonly RuleId[]>> = {
  dag: ["no-service-cycle", "no-runtime-cycle"],
  layers: [
    "inward-deps",
    "service-purity",
    "blob-quarantine",
    "service-assembly-only",
    "adapter-assembly-only",
    "runtime-import",
    "public-unit",
  ],
  private: ["private-sealed"],
  barrels: ["layer-in-path"],
  ports: ["ports-types-only"],
  surface: ["layer-in-path", "chain-purity"],
  modules: ["stable-root"],
}

export type CliAction =
  | { command: "status" }
  | { command: "help" }
  | { command: "check-help" }
  | { command: "version" }
  | {
      command: "check"
      checks: readonly CheckName[]
      /**
       * Check names were passed on the command line; `false` = none given,
       * `checks` is the full default set.
       */
      explicit: boolean
      explain: boolean
      explainOnly: boolean
    }
  | { command: "explain"; topics: readonly string[] }
  | {
      command: "view"
      /** `null` = the default port; the projects come from config, never here. */
      port: number | null
    }

export type ParsedCli = {
  /** Explicit config path (`-c`); `null` = discovery walk. */
  config: string | null
  noColor: boolean
  action: CliAction
}

export type UsageError = { error: string }

const COMMANDS = ["check", "explain", "view"] as const

/** The port `deblob view` serves on when the line does not say. */
export const DEFAULT_VIEW_PORT = 3615

const MAX_PORT = 65535

const isKnownCheck = (name: string): name is CheckName =>
  (KNOWN_CHECKS as readonly string[]).includes(name)

/**
 * Explain topics: a check name → the rules it cites, or a rule slug (the check
 * footer prints them). Check names resolve first; the spec forbids a slug from
 * colliding with one. `null` = unknown topic.
 */
export const rulesForTopic = (topic: string): readonly RuleId[] | null => {
  if (isKnownCheck(topic)) return CHECK_RULES[topic]
  return isRuleId(topic) ? [topic] : null
}

/**
 * A topic shaped like a 0.0.2–0.0.4 citation (`4`, `rule-4`): unknown like any
 * other, but its refusal teaches that rules are named now. Old logs and specs
 * are the only source of such a topic — a number never resolves.
 */
export const isRuleNumber = (topic: string): boolean =>
  /^(?:rule-)?[0-9]+$/.test(topic)

export const parseCli = (argv: readonly string[]): ParsedCli | UsageError => {
  let parsed
  try {
    parsed = parseArgs({
      args: [...argv],
      strict: true,
      allowPositionals: true,
      options: {
        config: { type: "string", short: "c" },
        help: { type: "boolean", short: "h" },
        version: { type: "boolean", short: "v" },
        "no-color": { type: "boolean" },
        explain: { type: "boolean" },
        "explain-only": { type: "boolean" },
        port: { type: "string" },
      },
    })
  } catch (error) {
    return { error: (error as Error).message }
  }

  const { values, positionals } = parsed
  const config = values.config ?? null
  const noColor = values["no-color"] ?? false
  const command = positionals[0]
  const withAction = (action: CliAction): ParsedCli => ({
    config,
    noColor,
    action,
  })

  /**
   * Flags that ride one command only: used anywhere else they teach instead of
   * being ignored — a flag that does nothing is a lie about the run. `null` is
   * a command none of them rides.
   */
  const strayFlags = (verb: "check" | "view" | null): UsageError | null => {
    if (verb === "check" && values.explain && values["explain-only"]) {
      return {
        error:
          "--explain and --explain-only contradict — the first appends explanations, the second replaces the listing; pick one",
      }
    }
    if (verb !== "check") {
      for (const flag of ["explain", "explain-only"] as const) {
        if (values[flag]) {
          return {
            error: `--${flag} rides deblob check only (it explains the rules that fired)`,
          }
        }
      }
    }
    if (verb !== "view" && values.port !== undefined) {
      return {
        error:
          "--port rides deblob view only (it is the port the viewer is served on)",
      }
    }
    return null
  }

  // help and version win over everything else on the line — standard practice
  if (values.help) {
    return withAction({
      command: command === "check" ? "check-help" : "help",
    })
  }

  if (values.version) {
    return withAction({ command: "version" })
  }

  if (command === undefined) {
    const flagError = strayFlags(null)
    if (flagError) return flagError
    return withAction({ command: "status" })
  }

  if (command === "check") {
    const flagError = strayFlags("check")
    if (flagError) return flagError
    const names = positionals.slice(1)
    for (const name of names) {
      if (!isKnownCheck(name)) {
        return {
          error: `unknown check "${name}" — known checks: ${KNOWN_CHECKS.join(", ")}`,
        }
      }
    }
    return withAction({
      command: "check",
      checks: names.length > 0 ? (names as CheckName[]) : KNOWN_CHECKS,
      explicit: names.length > 0,
      explain: values.explain ?? false,
      explainOnly: values["explain-only"] ?? false,
    })
  }

  if (command === "explain") {
    const flagError = strayFlags(null)
    if (flagError) return flagError
    const topics = positionals.slice(1)
    if (topics.length === 0) {
      return {
        error:
          "explain needs a topic — rule names (service-purity, as the check footer prints them) or check names (layers)",
      }
    }
    return withAction({ command: "explain", topics })
  }

  if (command === "view") {
    const flagError = strayFlags("view")
    if (flagError) return flagError
    const extra = positionals.slice(1)
    if (extra.length > 0) {
      return {
        error: `view takes no arguments (got "${extra[0]}") — the projects it shows come from config, key view.projects`,
      }
    }
    if (values.port === undefined) {
      return withAction({ command: "view", port: null })
    }
    // digits only: `Number("")` is 0 and `Number(" 80 ")` is 80 — neither is a
    // port somebody typed. 0 itself is the OS's "any free port": unusual on a
    // command line, not wrong.
    const port = Number(values.port)
    if (!/^[0-9]+$/.test(values.port) || port > MAX_PORT) {
      return {
        error: `--port wants a whole number from 0 to ${MAX_PORT} (0 = any free port) — got "${values.port}"`,
      }
    }
    return withAction({ command: "view", port })
  }

  return {
    error: `unknown command "${command}" — commands: ${COMMANDS.join(", ")} (bare deblob prints project status)`,
  }
}
