/**
 * The verdict markers a case writes in its source, and the match against what
 * the checks reported. A line that must be red carries `// red <slug>` at its
 * end — several slugs comma-separated, an optional `: why` for the reader,
 * never compared. A tree with no marker claims green everywhere: the match
 * lists what was marked and not reported, and what was reported and not marked.
 * A violation without a line (today's edge-level ones) matches its file's
 * markers by slug alone, consuming one; the outside rules carry lines.
 */

import type { RuleId } from "../../check/rule.model.ts"
import { RULE_IDS } from "../../check/rule.model.ts"
import type { Violation } from "../../check/violation.model.ts"
import type { CheckName } from "../../cli/cli.model.ts"

/** A tree of strings under a config, the checks to run over it. */
export type Case = {
  /** Root-relative path → source; a `package.json` is the surface's claim. */
  files: Readonly<Record<string, string>>
  /** The raw config, as a `deblob.config.ts` would export it. */
  config?: unknown
  /** The checks to run; every check when absent. */
  checks?: readonly CheckName[]
}

/** A row of the corpus: a case with the sentence the reviewer reads. */
export type Row = Case & { name: string }

export type Marker = {
  file: string
  line: number
  slug: RuleId
  /** Prose for the reviewer, kept for the listing, never matched. */
  why: string | null
}

/** What a check reported, reduced to what a marker can claim. */
export type Reported = {
  file: string
  line: number | null
  slugs: readonly RuleId[]
}

export type VerdictMatch = {
  /** Marked, not reported: `file:line slug`. */
  missing: string[]
  /** Reported, not marked: `file:line slug`, or `file slug` without a line. */
  unexpected: string[]
}

/** The match a row asserts: as marked, nothing more, nothing less. */
export const AS_MARKED: VerdictMatch = { missing: [], unexpected: [] }

const MARKER =
  /\/\/\s*red\s+([A-Za-z0-9-]+(?:\s*,\s*[A-Za-z0-9-]+)*)(?::\s*(.*?))?\s*$/

const isRuleId = (value: string): value is RuleId =>
  (RULE_IDS as readonly string[]).includes(value)

/** The markers of one file, top to bottom; an unknown slug is loud. */
export const markersOf = (file: string, source: string): Marker[] =>
  source.split("\n").flatMap((text, index) => {
    const match = MARKER.exec(text)
    if (match === null) return []
    const why = match[2] === undefined ? null : match[2]
    return (match[1] as string).split(",").map((raw) => {
      const slug = raw.trim()
      if (!isRuleId(slug)) {
        throw new Error(
          `${file}:${index + 1}: marker names no rule: ${slug} (rules: ${RULE_IDS.join(", ")})`,
        )
      }
      return { file, line: index + 1, slug, why }
    })
  })

/** The source with its markers removed — the same tree, claiming green. */
export const stripMarkers = (source: string): string =>
  source
    .split("\n")
    .map((text) => text.replace(MARKER, "").trimEnd())
    .join("\n")

/**
 * A violation's files: the one it names; for a cycle, every file that closes it
 * — a service cycle's hops by their importing file, a module cycle's files.
 */
export const reportedOf = (violation: Violation): Reported[] => {
  const files =
    violation.check !== "dag"
      ? [violation.file]
      : violation.shape === "service-cycle"
        ? violation.hops.map((hop) => hop.via.from)
        : violation.files
  return files.map((file) => ({ file, line: null, slugs: violation.rules }))
}

const key = (file: string, line: number | null, slug: string): string =>
  line === null ? `${file} ${slug}` : `${file}:${line} ${slug}`

/** Every marker against every report, both directions, sorted for the diff. */
export const matchVerdicts = (
  markers: readonly Marker[],
  reported: readonly Reported[],
): VerdictMatch => {
  const open = new Map<string, Marker>(
    markers.map((marker) => [
      key(marker.file, marker.line, marker.slug),
      marker,
    ]),
  )
  const unexpected: string[] = []
  for (const report of reported) {
    for (const slug of report.slugs) {
      if (report.line !== null) {
        const exact = key(report.file, report.line, slug)
        if (open.delete(exact)) continue
        unexpected.push(exact)
        continue
      }
      // no line to match on: the first open marker of that file and slug
      const found = [...open.entries()].find(
        ([, marker]) => marker.file === report.file && marker.slug === slug,
      )
      if (found) open.delete(found[0])
      else unexpected.push(key(report.file, null, slug))
    }
  }
  return { missing: [...open.keys()].sort(), unexpected: unexpected.sort() }
}
