/**
 * Use-case levels — the annotation, never a violation: a use case reached from
 * a driver's hook is primary on that channel; everything else on a service's
 * API is instrumental by complement. Pure over the graph's readings. A use case
 * traces to its service through the instance's origin: a service factory
 * directly, or an assembly's returned record entry by entry, as far as the
 * records are literal. Test hooks never label (canon: test edges never count
 * for use-case level).
 */

import type {
  ArgValue,
  ImportGraph,
  InstanceOrigin,
  ModuleNode,
  ReadCall,
  ReadHook,
  ReadStatement,
  Span,
} from "./graph.model.ts"

export type PrimaryUseCase = {
  /** The service file whose factory built the instance. */
  service: string
  /** The member called on it, as a path when the API nests. */
  member: string
  /** The driver whose hook made the call. */
  driver: string
  span: Span
}

/** A use case a hook calls on an instance the reading cannot trace. */
export type UnresolvedUseCase = { driver: string; member: string; span: Span }

export type UseCaseLevels = {
  primary: readonly PrimaryUseCase[]
  unresolved: readonly UnresolvedUseCase[]
}

const callsOf = (statements: readonly ReadStatement[]): ReadCall[] =>
  statements.flatMap((statement) =>
    statement.kind === "call"
      ? [statement.call]
      : statement.kind === "control"
        ? statement.arms.flatMap(callsOf)
        : [],
  )

/** Every hook, nested ones included. */
const hooksOf = (hooks: readonly ReadHook[]): ReadHook[] =>
  hooks.flatMap((hook) => [hook, ...hooksOf(hook.hooks)])

/**
 * The returned record of an exported function, entry by key; `null` if none is
 * literal.
 */
const returnedRecordOf = (
  node: ModuleNode | undefined,
  name: string,
): ReadonlyMap<string, ArgValue> | null => {
  const fn = node?.reading?.functions.find(
    (candidate) => (candidate.name ?? "default") === name,
  )
  if (!fn) return null
  const records = fn.body.flatMap((statement) =>
    statement.kind === "return" && statement.record !== null
      ? [statement.record]
      : [],
  )
  // one literal record, or nothing to trace through
  const [record] = records
  if (record === undefined || records.length > 1) return null
  return new Map(record.map((entry) => [entry.key, entry.value]))
}

export const useCaseLevels = (graph: ImportGraph): UseCaseLevels => {
  const primary: PrimaryUseCase[] = []
  const unresolved: UnresolvedUseCase[] = []

  /**
   * Follow the origin down the member path: to a service (primary), to an
   * adapter or blob instance (not a use case — the driver rules' business,
   * skipped here), or nowhere (unresolved).
   */
  const trace = (
    origin: InstanceOrigin,
    path: readonly string[],
  ): { service: string; member: string } | "not-a-service" | null => {
    if (origin.layer === "service") {
      return path.length === 0
        ? null
        : { service: origin.path, member: path.join(".") }
    }
    if (origin.layer !== "assembly") return "not-a-service"
    const [key, ...rest] = path
    if (key === undefined) return null
    const entry = returnedRecordOf(
      graph.modules.get(origin.path),
      origin.name,
    )?.get(key)
    // an entry with no origin is not an instance: nothing to follow
    if (entry === undefined || entry.origin === null) return null
    return trace(entry.origin, [...entry.path, ...rest])
  }

  for (const node of graph.modules.values()) {
    if (node.layer !== "driver" || node.reading === null) continue
    const hooks = hooksOf([
      ...node.reading.hooks,
      ...node.reading.functions.flatMap((fn) => fn.hooks),
    ])
    for (const hook of hooks) {
      for (const call of callsOf(hook.body)) {
        if (call.callee.kind !== "use-case") continue
        // a use case is a member called on an instance, and an instance always
        // has the factory call it came from
        const traced = trace(
          call.callee.origin as InstanceOrigin,
          call.callee.member.split("."),
        )
        if (traced === "not-a-service") continue
        if (traced === null) {
          unresolved.push({
            driver: node.path,
            member: call.callee.member,
            span: call.span,
          })
        } else {
          primary.push({ ...traced, driver: node.path, span: call.span })
        }
      }
    }
  }

  return { primary, unresolved }
}
