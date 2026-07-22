/**
 * The command surface as data — argv in, dispatch decision out. Pure:
 * `parseArgs` computes, never touches the process (the dogfood config declares
 * `node:util` in `pureLibs` — deterministic, string-only). Usage errors are
 * values with teaching messages; exit codes and IO belong to the driver.
 */

import { parseArgs } from "node:util"

import { RULE_COUNT } from "../explain/rule-content.model.ts"

/** V0 checks, help order = run order. `dag` joins with its step. */
export const KNOWN_CHECKS = ["layers", "private", "barrels", "ports"] as const

export type CheckName = (typeof KNOWN_CHECKS)[number]

/**
 * The rules each check cites — `explain <check>` resolves through this, and the
 * PLAN's coverage table made code. Mirrors the citations the detectors can emit
 * (pinned against them in the spec).
 */
export const CHECK_RULES: Readonly<Record<CheckName, readonly number[]>> = {
  layers: [1, 4, 5, 6, 7, 8, 9],
  private: [12],
  barrels: [2],
  ports: [10],
}

export type CliAction =
  | { command: "status" }
  | { command: "help" }
  | { command: "check-help" }
  | { command: "version" }
  | {
      command: "check"
      checks: readonly CheckName[]
      explain: boolean
      explainOnly: boolean
    }
  | { command: "explain"; topic: string }

export type ParsedCli = {
  /** Explicit config path (`-c`); `null` = discovery walk. */
  config: string | null
  noColor: boolean
  action: CliAction
}

export type UsageError = { error: string }

const COMMANDS = ["check", "explain"] as const

const isKnownCheck = (name: string): name is CheckName =>
  (KNOWN_CHECKS as readonly string[]).includes(name)

/**
 * Explain topics: `rule-N`, bare `N` (the check footer cites bare numbers), or
 * a check name → the rules it cites. `null` = unknown topic.
 */
export const rulesForTopic = (topic: string): readonly number[] | null => {
  const match = /^(?:rule-)?([1-9][0-9]*)$/.exec(topic)
  if (match) {
    const rule = Number(match[1])
    return rule >= 1 && rule <= RULE_COUNT ? [rule] : null
  }
  return isKnownCheck(topic) ? CHECK_RULES[topic] : null
}

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

  const explainFlags = (allowed: boolean): UsageError | null => {
    if (allowed && values.explain && values["explain-only"]) {
      return {
        error:
          "--explain and --explain-only contradict — the first appends explanations, the second replaces the listing; pick one",
      }
    }
    if (!allowed) {
      for (const flag of ["explain", "explain-only"] as const) {
        if (values[flag]) {
          return {
            error: `--${flag} rides deblob check only (it explains the rules that fired)`,
          }
        }
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
    const flagError = explainFlags(false)
    if (flagError) return flagError
    return withAction({ command: "status" })
  }

  if (command === "check") {
    const flagError = explainFlags(true)
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
      explain: values.explain ?? false,
      explainOnly: values["explain-only"] ?? false,
    })
  }

  if (command === "explain") {
    const flagError = explainFlags(false)
    if (flagError) return flagError
    const topics = positionals.slice(1)
    if (topics.length === 0) {
      return {
        error:
          "explain needs a topic — a rule (rule-4) or a check name (layers)",
      }
    }
    if (topics.length > 1) {
      return {
        error: `explain takes one topic — got ${topics.join(", ")}`,
      }
    }
    return withAction({ command: "explain", topic: topics[0] as string })
  }

  return {
    error: `unknown command "${command}" — commands: ${COMMANDS.join(", ")} (bare deblob prints project status)`,
  }
}
