/**
 * The verdict markers a case writes in its source, and the match against what
 * the checks reported. A marker is `// red: <slug>[, <slug>]* [-- <why>]`: one
 * violation per slug, a slug repeated is two violations, the why is for the
 * reader and never compared. Slugs joined by `+` are one group, one fix: `//
 * red: stable-root + stable-root` is a red and a violation riding with it, the
 * first slug the lead, whose verdict the marker's word states; `,` separates
 * groups. The match is over groups: a group reported with riders its marker
 * does not list, or listed as separate groups, is a mismatch. At a line's end a
 * marker claims that line. Alone on its line it claims the next code line, so
 * several stacked above one line claim it each with its own why; alone at the
 * end of the file it claims the file — the form for a violation that carries no
 * line (today's edge-level ones). A tree with no marker claims green
 * everywhere: the match lists what was marked and not reported, and what was
 * reported and not marked, counted, and strict both ways — a violation with a
 * line never satisfies a file claim, nor the reverse.
 *
 * A red can be triggered from elsewhere: a helper's tech call is red at its own
 * line, but it runs on import because a root statement calls the helper. Each
 * such trigger line carries `// via: <slug>`, same form, and matches an entry
 * of a reported violation's `via` list. A `via` marker names the slug, not the
 * red it triggers: two reds of one slug in one file, each with its own
 * triggers, cannot be told apart by the markers.
 *
 * A row states the right verdict; where the reader cannot deliver it yet, the
 * line marks an expected failure instead of pinning the wrong verdict. `//
 * false red: <slug> -- <why>`: the reader reports it there, wrongly — the right
 * verdict is green. `// missed red: <slug> -- <why>`: it is red there, the
 * reader misses it. `false via` and `missed via` the same; the why is required,
 * placement is any marker's. Counted per slug like the plain claims, which take
 * a report first. An expected failure still failing is listed and fails
 * nothing; one that passes is an unexpected pass, and the row fails until the
 * marker goes — `unittest`'s and pytest's terms (`xfail`, strict `XPASS`).
 *
 * A red is proven or unknown — the reader could prove the line neither right
 * nor wrong — and a plain `red` claims a proven one only. `// stubborn unknown:
 * <slug> -- <why>` claims an unknown: a limit we tried to lift and kept, the
 * why naming it. `// false unknown: <slug> -- <why>` is the expected failure:
 * the reader answers unknown, wrongly. Alone, the truth is green; stacked with
 * a plain `red` on the same line and slug, the truth is red, and that `red` is
 * not counted while the unknown holds. `// missed unknown: <slug> -- <why>` is
 * the other expected failure: the truth is an unknown the reader does not
 * report — a rule written red first, its check not built. There is no bare
 * `unknown`: every unknown marker says which it is. `via` markers match a
 * report's triggers whether the report is proven or unknown.
 *
 * A comment that looks like a marker (`// red`, `// via`, `// false`, `//
 * missed`, `// stubborn`, `// unknown`, any case) and fails the grammar is
 * loud, and so is a marker after another comment on its line: a malformed
 * marker read as nothing would pass its row green.
 */

import type { RuleId } from "../../check/rule.model.ts"
import { RULE_IDS } from "../../check/rule.model.ts"
import type { ViolationGroup } from "../../check/grouping.model.ts"
import type { Violation } from "../../check/violation.model.ts"
import type { BrokenSite } from "../../extraction/graph.model.ts"
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

/**
 * A marker: a verdict claimed on a line or a file, or a place deblob cannot
 * read.
 */
export type Marker = VerdictMarker | BrokenMarker

export type VerdictMarker = {
  /**
   * `red`: this line is the violation, proven; `unknown`: the reader answers
   * unknown here (plain: `stubborn unknown`); `via`: this line triggers one.
   */
  kind: "red" | "unknown" | "via"
  /**
   * How this claim is expected to fail: `false` — the reader reports it,
   * wrongly; `missed` — the reader does not report it. Absent on a plain
   * claim.
   */
  expectedFailure?: ExpectedFailure
  file: string
  /** The line claimed; `null` claims the file. */
  line: number | null
  slug: RuleId
  /**
   * The slugs joined to `slug` by `+`: the violations its fix removes with it.
   * Absent on a group of one, and on a `via`.
   */
  riders?: readonly RuleId[]
  /** Prose for the reviewer, kept for the listing, never matched. */
  why: string | null
}

/**
 * `// broken -- <why>`: deblob cannot read this line (the file, alone at its
 * end, for a file that does not parse). No slug: broken is no rule's. The rest
 * of the row is judged as ever — a broken run still reports every verdict it
 * reaches; it only declines to certify.
 */
export type BrokenMarker = {
  kind: "broken"
  file: string
  line: number | null
  why: string
}

/** A place in the tree: a trigger of a red, in any file. */
export type Site = { file: string; line: number }

/** What a check reported, reduced to what a marker can claim: one group. */
export type Reported = {
  file: string
  line: number | null
  /** The lead's rules. */
  slugs: readonly RuleId[]
  /**
   * The riders' rules, as a marker writes them; a rider on another line than
   * the lead's carries it, `stable-root (line 7)`, which no marker writes.
   * Absent on a group of one.
   */
  riders?: readonly string[]
  /** The lines that trigger this red from elsewhere; empty when none. */
  via: readonly Site[]
  /** Present when the lead is a red the reader could not prove: an unknown. */
  unknown?: true
}

export type ExpectedFailure = "false" | "missed"

export type VerdictMatch = {
  /**
   * Marked, not reported: `file:line slug`, `file slug` for a file claim, or
   * `file:line via slug`; a key marked twice and reported once is listed once.
   */
  missing: string[]
  /**
   * Reported, not marked: `file:line slug`, `file slug` without a line, or
   * `file:line via slug`.
   */
  unexpected: string[]
  /**
   * An expected failure that passes, the reader now right: `file:line false red
   * slug — remove the marker`, and the same for `missed` and `via`.
   */
  unexpectedPasses: string[]
}

/** The match, and the expected failures — reported, never failing a row. */
export type Verdict = VerdictMatch & {
  /**
   * The expected failures still failing, as the marker reads: `file:line missed
   * red slug -- why`.
   */
  expectedFailures: string[]
}

/** The match a row asserts: as marked, nothing more, nothing less. */
export const AS_MARKED: VerdictMatch = {
  missing: [],
  unexpected: [],
  unexpectedPasses: [],
}

/** Anything a reader would take for a marker, well-formed or not. */
const LOOKS_LIKE_MARKER =
  /\/\/\s*(?:red|via|false|missed|stubborn|unknown|broken)\b/i

const MARKER =
  /^\/\/ (?:(false|missed|stubborn) )?(red|via|unknown): ([a-z]+(?:-[a-z]+)*(?:(?:, | \+ )[a-z]+(?:-[a-z]+)*)*)(?: -- (\S.*))?$/

const BROKEN = /^\/\/ broken -- (\S.*)$/

const GRAMMAR =
  "`// red: <slug>[ + <slug>]*[, <slug>[ + <slug>]*]* [-- <why>]`, `// via: <slug>[, <slug>]*`, either as an expected failure (`// false red: <slug> -- <why>`, `// missed red:`), an unknown (`// stubborn unknown: <slug> -- <why>`, `// false unknown:`, `// missed unknown:`), or `// broken -- <why>`"

const isRuleId = (value: string): value is RuleId =>
  (RULE_IDS as readonly string[]).includes(value)

type LineMarkers = {
  /** Where the marker starts: the code before it stays. */
  at: number
  /** Nothing but the marker on the line. */
  alone: boolean
  kind: Marker["kind"]
  expectedFailure: ExpectedFailure | null
  /** One entry per group: its lead's slug first, then its riders'. */
  groups: RuleId[][]
  why: string | null
}

/** One line's marker, `null` when it has none; loud when malformed. */
const lineMarkersOf = (
  file: string,
  text: string,
  line: number,
): LineMarkers | null => {
  const found = LOOKS_LIKE_MARKER.exec(text)
  if (found === null) return null
  const where = `${file}:${line}`
  const before = text.slice(0, found.index)
  if (before.includes("//")) {
    throw new Error(`${where}: a marker after a comment: ${text.trim()}`)
  }
  const marker = text.slice(found.index).trimEnd()
  const malformed = () =>
    new Error(
      `${where}: malformed marker: ${text.trim()} (expected ${GRAMMAR})`,
    )
  if (/^\/\/\s*broken\b/i.test(marker)) {
    const broken = BROKEN.exec(marker)
    if (broken === null) throw malformed()
    return {
      at: found.index,
      alone: before.trim() === "",
      kind: "broken",
      expectedFailure: null,
      groups: [],
      why: broken[1] as string,
    }
  }
  const match = MARKER.exec(marker)
  const prefix = match?.[1]
  const kind = match?.[2]
  // an expected failure says what it waits for, a stubborn unknown what it
  // kept: without its why, malformed; `stubborn` is for an unknown only, and
  // an unknown is always `stubborn`, `false` or `missed`; a trigger names
  // the slug of the red it triggers, never a group
  if (
    match === null ||
    (prefix !== undefined && match[4] === undefined) ||
    (prefix === "stubborn" && kind !== "unknown") ||
    (kind === "unknown" && prefix === undefined) ||
    (kind === "via" && (match[3] as string).includes(" + "))
  ) {
    throw malformed()
  }
  const groups = (match[3] as string)
    .split(", ")
    .map((group) => group.split(" + "))
  for (const slug of groups.flat()) {
    if (!isRuleId(slug)) {
      throw new Error(
        `${where}: marker names no rule: ${slug} (rules: ${RULE_IDS.join(", ")})`,
      )
    }
  }
  return {
    at: found.index,
    alone: before.trim() === "",
    kind: kind as Marker["kind"],
    expectedFailure:
      prefix === undefined || prefix === "stubborn"
        ? null
        : (prefix as ExpectedFailure),
    groups: groups as RuleId[][],
    why: match[4] ?? null,
  }
}

/** Not a line a marker above can claim: blank, or a comment. */
const isCodeLine = (text: string): boolean => {
  const trimmed = text.trim()
  return trimmed !== "" && !trimmed.startsWith("//")
}

/**
 * The markers of one file, top to bottom. A marker alone on its line claims the
 * next code line, or the file when no code follows.
 */
export const markersOf = (file: string, source: string): Marker[] => {
  const lines = source.split("\n")
  return lines.flatMap((text, index): Marker[] => {
    const found = lineMarkersOf(file, text, index + 1)
    if (found === null) return []
    let line: number | null = index + 1
    if (found.alone) {
      const next = lines.findIndex(
        (other, at) => at > index && isCodeLine(other),
      )
      line = next === -1 ? null : next + 1
    }
    if (found.kind === "broken")
      return [{ kind: "broken" as const, file, line, why: found.why as string }]
    return found.groups.map(([slug, ...riders]) => ({
      kind: found.kind as VerdictMarker["kind"],
      ...(found.expectedFailure === null
        ? {}
        : { expectedFailure: found.expectedFailure }),
      file,
      line,
      slug: slug as RuleId,
      ...(riders.length === 0 ? {} : { riders }),
      why: found.why,
    }))
  })
}

/**
 * The source with its markers removed — the same tree, claiming green. A marker
 * alone on its line leaves the line blank, so line numbers hold.
 */
export const stripMarkers = (source: string): string =>
  source
    .split("\n")
    .map((text, index) => {
      const found = lineMarkersOf("source", text, index + 1)
      return found === null ? text : text.slice(0, found.at).trimEnd()
    })
    .join("\n")

/** A violation's line, when it names one: the outside rules judge statements. */
const lineOf = (violation: Violation): number | null =>
  "line" in violation ? violation.line : null

/**
 * A group's files: the one its lead names; for a cycle, every file that closes
 * it — a service cycle's hops by their importing file, a module cycle's files.
 * The group's triggers are its members'.
 */
export const reportedOf = ({
  lead: violation,
  riders,
}: ViolationGroup): Reported[] => {
  const files =
    violation.check !== "dag"
      ? [violation.file]
      : violation.shape === "service-cycle"
        ? violation.hops.map((hop) => hop.via.from)
        : violation.files
  // the outside rules judge statements, so they name a line and match on it;
  // the edge-level checks have none and match a file claim
  const line = lineOf(violation)
  const via = [violation, ...riders].flatMap((member) =>
    "via" in member ? member.via : [],
  )
  const riderSlugs = riders.flatMap((rider) =>
    rider.rules.map((slug) =>
      lineOf(rider) === line ? slug : `${slug} (line ${lineOf(rider)})`,
    ),
  )
  const unknown =
    "unknown" in violation && violation.unknown !== null
      ? { unknown: true as const }
      : {}
  return files.map((file) => ({
    file,
    line,
    slugs: violation.rules,
    ...(riderSlugs.length === 0 ? {} : { riders: riderSlugs }),
    via,
    ...unknown,
  }))
}

const key = (file: string, line: number | null, slug: string): string =>
  line === null ? `${file} ${slug}` : `${file}:${line} ${slug}`

const viaKey = (site: Site, slug: string): string =>
  key(site.file, site.line, `via ${slug}`)

/** A group as a marker writes it, riders sorted: `stable-root + stable-root`. */
const groupText = (slug: string, riders: readonly string[] = []): string =>
  [slug, ...[...riders].sort()].join(" + ")

const markerKey = (marker: VerdictMarker): string => {
  const group = groupText(marker.slug, marker.riders)
  return key(
    marker.file,
    marker.line,
    marker.kind === "red" ? group : `${marker.kind} ${group}`,
  )
}

/** An expected failure as its marker reads: `file:line false red slug`. */
const expectedFailureOf = (marker: VerdictMarker): string =>
  key(
    marker.file,
    marker.line,
    `${marker.expectedFailure} ${marker.kind} ${groupText(marker.slug, marker.riders)}`,
  )

/**
 * Every marker against every report, both directions, counted — a key marked
 * twice needs two reports — and sorted for the diff. A report goes to a plain
 * claim first, then to a `false` expected failure (still failing), then to a
 * `missed` one (an unexpected pass); a `false` left over is an unexpected pass,
 * a `missed` left over still failing. An unknown report keys apart from a
 * proven one, so each matches its own markers; a `false unknown` still failing
 * holds back one plain `red` of its slug on its line, the verdict to come.
 */
export const matchVerdicts = (
  markers: readonly Marker[],
  reported: readonly Reported[],
  broken: readonly BrokenSite[] = [],
): Verdict => {
  const open = new Map<string, number>()
  // the expected failures the markers declare, by kind, then by key
  const declared = {
    false: new Map<string, VerdictMarker[]>(),
    missed: new Map<string, VerdictMarker[]>(),
  }
  const verdicts = markers.filter(
    (marker): marker is VerdictMarker => marker.kind !== "broken",
  )
  for (const marker of markers) {
    if (marker.kind !== "broken") continue
    const at = key(marker.file, marker.line, "broken")
    open.set(at, (open.get(at) ?? 0) + 1)
  }
  for (const marker of verdicts) {
    const at = markerKey(marker)
    if (marker.expectedFailure === undefined) {
      open.set(at, (open.get(at) ?? 0) + 1)
    } else {
      const byKey = declared[marker.expectedFailure]
      byKey.set(at, [...(byKey.get(at) ?? []), marker])
    }
  }
  const unexpected: string[] = []
  const unexpectedPasses: string[] = []
  const expectedFailures: string[] = []
  const passUnexpectedly = (marker: VerdictMarker): void => {
    unexpectedPasses.push(`${expectedFailureOf(marker)} — remove the marker`)
  }
  // the plain reds a `false unknown` still failing holds back, by their key
  const held = new Map<string, number>()
  const failAsExpected = (marker: VerdictMarker): void => {
    expectedFailures.push(`${expectedFailureOf(marker)} -- ${marker.why}`)
    if (marker.kind === "unknown" && marker.expectedFailure === "false") {
      const red = key(
        marker.file,
        marker.line,
        groupText(marker.slug, marker.riders),
      )
      held.set(red, (held.get(red) ?? 0) + 1)
    }
  }
  const claim = (at: string): void => {
    const left = open.get(at) ?? 0
    if (left > 0) {
      open.set(at, left - 1)
      return
    }
    const falseRed = declared.false.get(at)?.shift()
    const missedRed =
      falseRed === undefined ? declared.missed.get(at)?.shift() : undefined
    if (falseRed !== undefined) failAsExpected(falseRed)
    else if (missedRed !== undefined) passUnexpectedly(missedRed)
    else unexpected.push(at)
  }
  // a trigger shared by two reds of one slug is one marker: judged once
  const triggers = new Set<string>()
  for (const report of reported) {
    for (const slug of report.slugs) {
      for (const site of report.via) {
        const trigger = viaKey(site, slug)
        if (triggers.has(trigger)) continue
        triggers.add(trigger)
        claim(trigger)
      }
      const group = groupText(slug, report.riders)
      claim(
        key(
          report.file,
          report.line,
          report.unknown === true ? `unknown ${group}` : group,
        ),
      )
    }
  }
  for (const site of broken) claim(key(site.file, site.line, "broken"))
  for (const left of declared.false.values()) left.forEach(passUnexpectedly)
  for (const left of declared.missed.values()) left.forEach(failAsExpected)
  const missing = [...open].flatMap(([at, left]) =>
    Array.from({ length: Math.max(0, left - (held.get(at) ?? 0)) }, () => at),
  )
  return {
    missing: missing.sort(),
    unexpected: unexpected.sort(),
    unexpectedPasses: unexpectedPasses.sort(),
    expectedFailures: expectedFailures.sort(),
  }
}
