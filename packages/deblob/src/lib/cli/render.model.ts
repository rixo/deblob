/**
 * Text rendering — the fiction as code. Pure: violation values, status numbers,
 * and shipped content in; the exact strings the goldens pin out. The help
 * screens live here as literals so README-driven docs cannot drift from the
 * binary.
 */

import type { EdgeTarget } from "../extraction/graph.model.ts"
import type {
  DagViolation,
  LayersViolation,
  PortsViolation,
  Violation,
} from "../check/violation.model.ts"
import type { ExplainEntry } from "../explain/rule-content.model.ts"
import { KNOWN_CHECKS } from "./cli.model.ts"

/** Everything but dag renders as service → file → tagged message lines. */
type FileViolation = Exclude<Violation, DagViolation>

/** Output width the fiction wraps at. */
const WIDTH = 72
/** Violation lines: 4-space indent + check tag padded to this field. */
const TAG_FIELD = 9
const CONTINUATION = " ".repeat(4 + TAG_FIELD)

export type Colors = {
  strong: (text: string) => string
  dim: (text: string) => string
  accent: (text: string) => string
}

export const NO_COLORS: Colors = {
  strong: (text) => text,
  dim: (text) => text,
  accent: (text) => text,
}

export const ANSI_COLORS: Colors = {
  strong: (text) => `\u001b[1m${text}\u001b[22m`,
  dim: (text) => `\u001b[2m${text}\u001b[22m`,
  accent: (text) => `\u001b[36m${text}\u001b[39m`,
}

/** `1872` → `1,872` — fixed grouping, never locale-dependent. */
const formatCount = (count: number): string =>
  count.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",")

const plural = (count: number, noun: string): string =>
  `${formatCount(count)} ${noun}${count === 1 ? "" : "s"}`

/**
 * A rule citation is one token — `(rule 5)` split across a wrap orphans the
 * number, and `grep "rule 5"` on the output stops matching. Merges the split
 * words back: `rule`/`rules` (with or without the paren) swallows the numbers
 * that follow, riding their commas.
 */
const mergeCiteTokens = (words: readonly string[]): string[] => {
  const merged: string[] = []
  for (let index = 0; index < words.length; index += 1) {
    let word = words[index] as string
    if (/^\(?rules?$/.test(word)) {
      while (
        index + 1 < words.length &&
        /^\d+[,;.)]*$/.test(words[index + 1] as string)
      ) {
        index += 1
        word += ` ${words[index] as string}`
        if (!(words[index] as string).endsWith(",")) break
      }
    }
    merged.push(word)
  }
  return merged
}

/** Greedy word wrap; continuation lines get the hanging indent. */
const wrap = (
  first: string,
  text: string,
  hang: string = CONTINUATION,
): string[] => {
  const lines: string[] = []
  let line = first
  for (const word of mergeCiteTokens(text.split(" "))) {
    const candidate =
      line === first || line === hang ? line + word : `${line} ${word}`
    if (candidate.length > WIDTH && line !== first && line !== hang) {
      lines.push(line)
      line = hang + word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

const targetLabel = (target: EdgeTarget, prefix: string): string =>
  target.type === "module" ? prefix + target.path : target.specifier

const ruleCite = (rules: readonly number[]): string =>
  rules.length === 1 ? `rule ${rules[0]}` : `rules ${rules.join(", ")}`

const layersMessage = (violation: LayersViolation, prefix: string): string => {
  const target = targetLabel(violation.target, prefix)
  if (violation.shape === "unclassified-lib") {
    return `imports ${target} — unclassified third-party in a pure layer; declare it in pureLibs if it qualifies`
  }
  const { rules, importerLayer } = violation
  // rule 8 in the citation = this cell's type variant is exempt (06 ruling)
  const hint = rules.includes(8) ? "; import type is fine" : ""
  if (rules.includes(6) || rules.includes(7)) {
    const suffix = rules.includes(6) ? ".service.ts" : ".adapter.ts"
    return `imports ${target} — ${suffix} is assembly-only${hint}`
  }
  if (rules.includes(5)) {
    return `imports ${target} — only assembly may import blob; extract what you need`
  }
  if (rules.includes(4)) {
    return importerLayer === "service"
      ? `imports ${target} — service layer cannot depend on concrete${hint}`
      : `imports ${target} — ${importerLayer} must stay pure${hint}`
  }
  if (importerLayer === "model") {
    return `imports ${target} — model may only import model${hint}`
  }
  if (importerLayer === "ports") {
    return `imports ${target} — ports may only import model and ports${hint}`
  }
  return `imports ${target} — ${importerLayer} may not import ${violation.targetClass}${hint}`
}

const portsMessage = (violation: PortsViolation, prefix: string): string => {
  if (violation.shape === "runtime-export") {
    const { form, name, exported } = violation
    const label = name === null ? form : `${form} ${name}`
    const lead =
      form === "statement"
        ? "contains a runtime statement"
        : `${exported ? "exports" : "contains"} ${label}`
    return `${lead} — ports are types only; runtime belongs in an adapter or model`
  }
  const target = targetLabel(violation.target, prefix)
  return violation.shape === "runtime-import"
    ? `imports ${target} at runtime — a port needs no runtime imports; add the type keyword or move the code`
    : `imports ${target} at runtime — a types-only file supplies no runtime binding; add the type keyword`
}

const messageOf = (violation: FileViolation, prefix: string): string => {
  switch (violation.check) {
    case "layers":
      return layersMessage(violation, prefix)
    case "private":
      return `imports ${targetLabel(violation.target, prefix)} — private/ is sealed outside its service`
    case "barrels":
      return violation.shape === "barrel-file"
        ? `re-exports ${targetLabel(violation.target, prefix)} — no index.ts indirection; the layer must be visible in the import path`
        : `imports ${targetLabel(violation.target, prefix)} — import the layered file directly`
    case "ports":
      return portsMessage(violation, prefix)
  }
}

/** Dag blocks: 2-space indent + tag; continuation under the head. */
const DAG_CONTINUATION = " ".repeat(2 + TAG_FIELD)

const baseOf = (root: string): string => {
  const slash = root.lastIndexOf("/")
  return slash === -1 ? root : root.slice(slash + 1)
}

const cycleHead = (nodes: readonly string[]): string =>
  nodes.length === 2
    ? `${nodes[0]} ⇄ ${nodes[1]}`
    : [...nodes, nodes[0]].join(" → ")

/**
 * One cycle finding as a block: tag + witness head, hop lines quoting the
 * carrying edges (service cycles), the remedy line, and an entanglement note
 * when the SCC exceeds the witness.
 */
const dagBlock = (
  violation: DagViolation,
  colors: Colors,
  prefix: string,
): string[] => {
  const lines: string[] = []
  const push = (text: string) => {
    lines.push(...wrap(DAG_CONTINUATION, text, DAG_CONTINUATION))
  }
  const witness =
    violation.shape === "service-cycle" ? violation.services : violation.files
  const tag = "dag".padEnd(TAG_FIELD)
  const [head, ...headRest] = wrap(
    `  ${tag}`,
    cycleHead(witness.map((node) => prefix + node)),
    DAG_CONTINUATION,
  )
  lines.push((head as string).replace(tag, colors.accent(tag)), ...headRest)
  if (violation.shape === "service-cycle") {
    for (const hop of violation.hops) {
      const flags = `${hop.typeOnly ? " (type-only)" : ""}${hop.wiring ? " (wiring)" : ""}`
      push(
        `${baseOf(hop.from)} → ${baseOf(hop.to)} (${prefix}${hop.via.from} → ${prefix}${hop.via.to})${flags}`,
      )
    }
    const wiring = violation.hops.some((hop) => hop.wiring)
    push(
      `services must form a DAG (rule 13); see the sharing progression${
        wiring
          ? " — (wiring): use a fixture adapter, or move the wiring outside the service tree"
          : ""
      }`,
    )
  } else {
    push(
      "runtime module cycle (rule 14) — works in dev, silently fails minified",
    )
  }
  const entangled = violation.members.length - new Set(witness).size
  if (entangled > 0) {
    lines.push(
      DAG_CONTINUATION +
        colors.dim(
          `entangled with ${entangled} more — break this cycle and rerun`,
        ),
    )
  }
  return lines
}

export type GraphStats = { files: number; edges: number }

const summaryLine = (
  violations: readonly Violation[],
  stats: GraphStats,
): string => {
  const trailer = `${plural(stats.files, "file")} · ${plural(stats.edges, "edge")}`
  if (violations.length === 0) return `0 violations · ${trailer}`
  const counts = KNOWN_CHECKS.flatMap((check) => {
    const count = violations.filter(
      (violation) => violation.check === check,
    ).length
    return count > 0 ? [`${count} ${check}`] : []
  })
  return `${plural(violations.length, "violation")} (${counts.join(", ")}) · ${trailer}`
}

/**
 * The check output: grouped service → file → tagged lines, cycle findings as
 * blocks in their bucket — `cross-service` after the named services, `blob`
 * last (findings on unlabeled files, the flagship term on first contact) — then
 * summary and one footer hint to the teaching channel. Fully deterministic —
 * goldens and CI diffs stay stable. Every path prints whole under `pathPrefix`
 * (the runner's cwd → config-root hop, `""` when they coincide) so terminal
 * ctrl+click resolves from where the user ran the command.
 */
export const renderCheckResults = (
  violations: readonly Violation[],
  stats: GraphStats,
  colors: Colors,
  pathPrefix: string = "",
): string => {
  const lines: string[] = []

  const services = new Map<string | null, Map<string, FileViolation[]>>()
  const dagByService = new Map<string, DagViolation[]>()
  const dagCross: DagViolation[] = []
  const dagBlob: DagViolation[] = []
  for (const violation of violations) {
    if (violation.check === "dag") {
      const { group } = violation
      if (group.kind === "cross-service") {
        dagCross.push(violation)
      } else if (group.kind === "blob") {
        dagBlob.push(violation)
      } else {
        const list = dagByService.get(group.root) ?? []
        dagByService.set(group.root, list)
        list.push(violation)
      }
      continue
    }
    const files =
      services.get(violation.serviceRoot) ?? new Map<string, FileViolation[]>()
    services.set(violation.serviceRoot, files)
    const list = files.get(violation.file) ?? []
    files.set(violation.file, list)
    list.push(violation)
  }

  // rule number first (13 before 14), then membership — stable block order
  const dagOrder = (list: readonly DagViolation[]): DagViolation[] =>
    [...list].sort((a, b) => {
      const keyA = `${a.rules[0]} ${a.members.join(" ")}`
      const keyB = `${b.rules[0]} ${b.members.join(" ")}`
      return keyA < keyB ? -1 : 1
    })

  const pushFileGroups = (root: string | null) => {
    const files = services.get(root)
    if (files === undefined) return
    for (const file of [...files.keys()].sort()) {
      // whole path, not basename — the line is a ctrl+click target
      lines.push(`  ${pathPrefix}${file}`)
      const sorted = (files.get(file) as FileViolation[])
        .map((violation) => ({
          violation,
          message: `${messageOf(violation, pathPrefix)} (${ruleCite(violation.rules)})`,
        }))
        // check name, then rendered message — full output determinism
        .map((entry) => ({
          ...entry,
          key: `${entry.violation.check}\u0000${entry.message}`,
        }))
        .sort((a, b) => (a.key < b.key ? -1 : 1))
      for (const { violation, message } of sorted) {
        const tag = colors.accent(violation.check.padEnd(TAG_FIELD))
        const [head, ...rest] = wrap(
          `    ${violation.check.padEnd(TAG_FIELD)}`,
          message,
        )
        lines.push(
          (head as string).replace(violation.check.padEnd(TAG_FIELD), tag),
          ...rest,
        )
      }
    }
  }

  const named = [
    ...new Set([
      ...[...services.keys()].filter((root): root is string => root !== null),
      ...dagByService.keys(),
    ]),
  ].sort()

  for (const root of named) {
    lines.push(colors.strong(pathPrefix + root))
    pushFileGroups(root)
    for (const violation of dagOrder(dagByService.get(root) ?? [])) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  if (dagCross.length > 0) {
    lines.push(colors.strong("cross-service"))
    for (const violation of dagOrder(dagCross)) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  if (services.has(null) || dagBlob.length > 0) {
    lines.push(colors.strong("blob"))
    pushFileGroups(null)
    for (const violation of dagOrder(dagBlob)) {
      lines.push(...dagBlock(violation, colors, pathPrefix))
    }
    lines.push("")
  }

  lines.push(summaryLine(violations, stats))

  if (violations.length > 0) {
    const rules = [...new Set(violations.flatMap((v) => v.rules))].sort(
      (a, b) => a - b,
    )
    lines.push(
      colors.dim(
        // pasteable as-is — the observed reflex is copying the whole list
        `why: deblob explain ${rules.join(" ")} · or rerun with --explain`,
      ),
    )
  }

  return `${lines.join("\n")}\n`
}

/** `deblob.config.ts (flavor: ts-suffixes-factories)` / `no config (defaults)` */
export const provenanceOf = (
  configPath: string | null,
  flavorName: string,
): string =>
  configPath === null
    ? "no config (defaults)"
    : `${configPath} (flavor: ${flavorName})`

/** `125952` → `123kb`, `5242880` → `5mb` — the headline's size unit. */
export const formatSize = (bytes: number): string => {
  const kb = bytes / 1024
  return kb >= 1000
    ? `${(kb / 1024).toFixed(1).replace(/\.0$/, "")}mb`
    : `${Math.round(kb)}kb`
}

/** Size-weighted blob share — blob is uncharacterized mass, all of it counts. */
export const blobPercentOf = (
  entries: readonly { size: number; blob: boolean }[],
): number => {
  const total = entries.reduce((sum, entry) => sum + entry.size, 0)
  if (total === 0) return 0
  const blob = entries.reduce(
    (sum, entry) => sum + (entry.blob ? entry.size : 0),
    0,
  )
  return Math.round((blob / total) * 100)
}

export type BareStatus = {
  version: string
  provenance: string
  /** `null` = the config broke: the lines needing it are skipped, exit stays 0. */
  stats: {
    fileCount: number
    /** Total covered bytes — shown so blob % reads as size-computed. */
    totalBytes: number
    blobPercent: number
    serviceCount: number
  } | null
}

/** Bare `deblob` — status + discovery, never diagnosis. Exit 0 territory. */
export const renderBareStatus = (status: BareStatus, colors: Colors): string =>
  [
    `deblob ${status.version} · ${status.provenance}`,
    "",
    ...(status.stats === null
      ? []
      : [
          colors.strong(
            `  ${plural(status.stats.fileCount, "file")} · ${formatSize(status.stats.totalBytes)} · ${status.stats.blobPercent}% blob`,
          ),
          `  ${plural(status.stats.serviceCount, "service")}`,
          "",
        ]),
    "Commands",
    "  deblob check [what...]      run architecture checks",
    `                              (${KNOWN_CHECKS.join(" · ")})`,
    "  deblob explain <topic...>   explain rules or checks",
    "  deblob --help               full help",
    "",
  ].join("\n")

/** Plain wrap at the output width, no indent. */
const wrapPlain = (text: string): string[] => {
  const lines: string[] = []
  let line = ""
  for (const word of mergeCiteTokens(text.split(" "))) {
    const candidate = line === "" ? word : `${line} ${word}`
    if (candidate.length > WIDTH && line !== "") {
      lines.push(line)
      line = word
    } else {
      line = candidate
    }
  }
  lines.push(line)
  return lines
}

const lowerFirst = (text: string): string =>
  text.charAt(0).toLowerCase() + text.slice(1)

/**
 * The teaching channel: per rule, the summary excerpt, the mapped knowledge
 * card(s) verbatim, the canonical URL. A card cited by several explained rules
 * prints once — later citations point up.
 */
export const renderExplain = (
  entries: readonly ExplainEntry[],
  colors: Colors,
): string => {
  const lines: string[] = []
  const shown = new Set<string>()
  for (const entry of entries) {
    if (lines.length > 0) lines.push("", "···", "")
    lines.push(
      colors.strong(`rule ${entry.rule} — ${lowerFirst(entry.title)}`),
      "",
      ...wrapPlain(entry.body),
    )
    for (const card of entry.cards) {
      lines.push("")
      if (shown.has(card.slug)) {
        lines.push(colors.dim(`card: ${card.slug} — shown above`))
        continue
      }
      shown.add(card.slug)
      lines.push(colors.accent(`card: ${card.slug}`), "", card.text.trimEnd())
    }
    lines.push("", "full text:", colors.dim(entry.url))
  }
  return `${lines.join("\n")}\n`
}

export const HELP = `deblob — machine-checkable hexagonal architecture for TypeScript/ESM

Usage
  deblob                       project status + discovery
  deblob check [what...]       run architecture checks (default: all)
  deblob explain <topic...>    explain rules or checks (4, layers, ...)

Checks
  dag        service dependencies form a DAG; no module-level runtime
             cycles (rules 13, 14)
  layers     dependency matrix by layer suffix; type-only imports exempt
             by default (rules 1, 4-9)
  private    private/ is sealed outside its service (rule 12)
  barrels    the layer is visible in the import path — no index.ts
             indirection (rule 2)
  ports      port files are types only, no runtime exports (rule 10)

Options
  -c, --config <path>    config file (default: nearest deblob.config.ts)
  --no-color             plain output (NO_COLOR is honored too)
  -h, --help             show this help
  -v, --version          print version

Exit codes
  0  clean    1  violations found    2  usage or config error

deblob detects; it never moves code. Why each rule exists:
https://github.com/rixo/deblob/blob/main/docs/architecture.md
`

export const CHECK_HELP = `Usage
  deblob check              run all checks
  deblob check dag layers   run only the named checks

Options
  --explain        append explanations of every rule that fired
  --explain-only   print only those explanations, skip the violations

All checks run over one shared import graph — naming several costs one
extraction. A violation prints the file, the offending import, and the
broken rule:

  layers  src/invoice/pdf-render.service.ts
    imports node:fs — the service layer cannot depend on concrete
    implementations (rule 4)

Type-only imports (import type / { type X }) are exempt from composition
rules by default (rule 8) — a flavor axis: strict flavors opt out in
deblob.config.ts. Unsuffixed files are blob: legal, unchecked except for
cycles — labeling is adoption, not a prerequisite (rule 5 guards the
boundary: only assembly may import blob).
`
