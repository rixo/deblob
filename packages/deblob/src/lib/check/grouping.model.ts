/**
 * Violations grouped by fix. The checks report atomic facts, one violation per
 * clause a statement breaks; a fix may remove several at once. A violation
 * whose subject is the result of a call judged red rides with that call's
 * violation — removing the call removes it — and the call's violation leads.
 * The one input is `cause`: what a violation derives from. Stated over every
 * violation, not per shape: one without a cause, or whose cause no violation
 * has for subject, leads its own group of one.
 *
 * Pure: violations in, groups out, in the order each group is first met.
 */

import type { Violation } from "./violation.model.ts"

/** One fix: the violation to fix, and those the fix removes with it. */
export type ViolationGroup = {
  lead: Violation
  riders: readonly Violation[]
}

type Caused = Extract<Violation, { cause: unknown }>

const hasSubject = (violation: Violation): violation is Caused =>
  "subject" in violation

/** Groups violations by fix: a chain of causes leads at its root. */
export const groupByFix = (
  violations: readonly Violation[],
): ViolationGroup[] => {
  const bySubject = new Map<string, Caused>()
  const subjectKey = (file: string, span: { start: number; end: number }) =>
    `${file}:${span.start}-${span.end}`
  for (const violation of violations) {
    if (!hasSubject(violation)) continue
    const key = subjectKey(violation.file, violation.subject)
    // two violations on one subject: a cause names the first
    if (!bySubject.has(key)) bySubject.set(key, violation)
  }
  // the violation a cause names; causes nest strictly inside the calls they
  // come out of, so the chain ends
  const causeOf = (violation: Violation): Violation | null =>
    hasSubject(violation) && violation.cause !== null
      ? (bySubject.get(subjectKey(violation.file, violation.cause)) ?? null)
      : null
  const leadOf = (violation: Violation): Violation => {
    let lead = violation
    for (let next = causeOf(lead); next !== null; next = causeOf(lead))
      lead = next
    return lead
  }
  const groups = new Map<Violation, Violation[]>()
  for (const violation of violations) {
    const lead = leadOf(violation)
    const riders = groups.get(lead) ?? []
    groups.set(lead, riders)
    if (lead !== violation) riders.push(violation)
  }
  return [...groups].map(([lead, riders]) => ({ lead, riders }))
}
